import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { encryptFile } from "../utils/crypto";
import { auth, logSecurityEvent } from "../utils/firebase";

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

// Convert a Uint8Array to base64url (in chunks to avoid call-stack overflow on big arrays)
function bytesToB64Url(bytes) {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function jsonToB64Url(obj) {
  return btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const MOCK_LINKS = [
  { id: 1, name: "Q4_Report.pdf", token: "abc123xyz", expires: "2025-03-15", views: 2, maxViews: 5, status: "ACTIVE" },
  { id: 2, name: "DesignAssets.zip", token: "def456uvw", expires: "2025-03-10", views: 5, maxViews: 5, status: "EXPIRED" },
];

export default function ZeroKnowledgeShare() {
  const [files, setFiles]     = useState([]);
  const [password, setPassword] = useState("");
  const [expiry, setExpiry]   = useState(24);
  const [maxViews, setMaxViews] = useState(10);

  const sliderFill = (val, min, max) => {
    const pct = ((val - min) / (max - min)) * 100;
    return `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`;
  };

  const formatExpiry = (h) => {
    if (h < 24)     return `${h} hour${h === 1 ? "" : "s"}`;
    const days = Math.floor(h / 24);
    const rem  = h % 24;
    if (rem === 0)  return `${days} day${days === 1 ? "" : "s"}`;
    return `${days}d ${rem}h`;
  };
  const formatViews = (v) => v === 1 ? "1 (one-time)" : v >= 100 ? "Unlimited" : `${v} views`;
  const [links, setLinks]     = useState(MOCK_LINKS);
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied]   = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showPw, setShowPw]   = useState(true);
  const [copiedPw, setCopiedPw] = useState(false);

  // Render the QR locally whenever a new link is generated.
  // Skip if the URL is too long for QR encoding.
  useEffect(() => {
    if (!generatedLink?.fullLink || generatedLink.qrTooLarge) { setQrDataUrl(""); return; }
    QRCode.toDataURL(generatedLink.fullLink, {
      width: 180, margin: 1,
      errorCorrectionLevel: "L",
      color: { dark: "#22d3eeff", light: "#0d152500" },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [generatedLink]);

  // URL fragments don't get sent to servers — perfect for zero-knowledge delivery.
  // Browsers handle a few MB of URL fine, but QR codes can only encode ~2-3 KB,
  // so anything larger gracefully drops the QR.
  const URL_SIZE_LIMIT  = 2 * 1024 * 1024;  // 2 MB encrypted ≈ 2.7 MB URL — soft cap
  const QR_SIZE_LIMIT   = 2200;             // characters

  const handleGenerate = async () => {
    if (!files.length || !password) return;
    setGenerating(true);
    setGeneratedLink(null);

    const originalName = files[0].name;
    const usedPassword = password;
    const expiresAt    = Date.now() + expiry * 3600000;

    // Encrypt the file
    const result = await encryptFile(files[0], usedPassword);

    if (result.size > URL_SIZE_LIMIT) {
      setGenerating(false);
      alert(`File is too large (${(result.size / 1024 / 1024).toFixed(1)} MB encrypted) to embed in a self-contained link. The largest supported size is about 2 MB. Use the regular 🔐 Encrypt / Decrypt feature and send the .svault file as an attachment.`);
      return;
    }

    // Auto-download the encrypted .svault so the sender keeps a copy
    downloadBlob(result.blob, result.name);

    // Build the share link: data + metadata in the URL fragment.
    // Fragments are NEVER sent to the server, so this stays zero-knowledge.
    const encryptedBytes = new Uint8Array(await result.blob.arrayBuffer());
    const dataB64 = bytesToB64Url(encryptedBytes);
    const metaB64 = jsonToB64Url({
      name:     originalName,
      exp:      expiresAt,
      maxViews,
      checksum: result.checksum,
      v: 1,
    });

    const fullLink = `${window.location.origin}/zk#d=${dataB64}&m=${metaB64}`;

    const newLink = {
      id: Date.now(),
      name: originalName,
      svaultName: result.name,
      token: dataB64.slice(0, 8),
      expires: new Date(expiresAt).toISOString().split("T")[0],
      views: 0,
      maxViews,
      status: "ACTIVE",
      fullLink,
      checksum: result.checksum,
      password: usedPassword,
      blob: result.blob,
      qrTooLarge: fullLink.length > QR_SIZE_LIMIT,
    };

    setLinks(p => [{ ...newLink, password: undefined, blob: undefined, fullLink: undefined }, ...p]);
    setGeneratedLink(newLink);
    // Log a share event (no password, no blob, no link — just metadata)
    if (auth?.currentUser) {
      logSecurityEvent(auth.currentUser.uid, {
        type:   "share",
        detail: `Generated ZK share for ${originalName}`,
        risk:   "SAFE",
      }).catch(() => {});
    }
    setFiles([]);
    setPassword("");
    setGenerating(false);
  };

  const downloadEncryptedAgain = () => {
    if (generatedLink?.blob) downloadBlob(generatedLink.blob, generatedLink.svaultName);
  };

  const copySharePassword = async () => {
    if (!generatedLink?.password) return;
    try {
      await navigator.clipboard.writeText(generatedLink.password);
      setCopiedPw(true);
      setTimeout(() => setCopiedPw(false), 2200);
    } catch { /* ignore */ }
  };

  const copyLink = async (link) => {
    if (!link?.fullLink) return;
    try {
      await navigator.clipboard.writeText(link.fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may be unavailable in some contexts */ }
  };

  const revokeLink = (id) => {
    setLinks(p => p.map(l => l.id === id ? { ...l, status: "REVOKED" } : l));
  };

  return (
    <div style={styles.page} className="fade-up">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🔗 Zero-Knowledge Share</h2>
          <p style={styles.sub}>Encrypted sharing · Password never in URL · Server never sees your data</p>
        </div>
        <span className="badge badge-violet">ZK Protocol</span>
      </div>

      {/* ZK explanation */}
      <div style={styles.explainer}>
        {[
          { icon: "🔐", label: "You encrypt the file locally" },
          { icon: "🔗", label: "Share link contains NO password" },
          { icon: "📤", label: "Send password separately (e.g. SMS)" },
          { icon: "🛡️", label: "Even if link is intercepted, file is safe" },
        ].map((s, i) => (
          <div key={i} style={styles.step}>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={styles.grid}>
        {/* Left — Create link */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 style={styles.sectionTitle}>Create Secure Share Link</h3>

          <div
            style={styles.dropzone}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setFiles(Array.from(e.dataTransfer.files).slice(0,1)); }}
            onClick={() => document.getElementById("zk-input").click()}
          >
            <input id="zk-input" type="file" hidden onChange={e => setFiles(Array.from(e.target.files).slice(0,1))} />
            {files.length === 0
              ? <><div style={{ fontSize: 28 }}>📎</div><div style={{ fontSize: 12, marginTop: 6, color: "var(--text-muted)" }}>Select one file to share</div></>
              : <><div style={{ fontSize: 28 }}>📄</div><div style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}>{files[0].name}</div><button onClick={e => { e.stopPropagation(); setFiles([]); }} style={{ marginTop: 4, background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", fontSize: 11 }}>Remove</button></>
            }
          </div>

          <div>
            <label style={styles.label}>ENCRYPTION PASSWORD</label>
            <input className="input" type="password" placeholder="Share this password out-of-band"
              value={password} onChange={e => setPassword(e.target.value)} />
            <p style={{ fontSize: 10, color: "var(--accent-amber)", marginTop: 4 }}>
              ⚠️ Send this password via a different channel (SMS, phone call, etc.)
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={styles.label}>
                LINK EXPIRES IN
                <span style={{ float: "right", color: "var(--accent-cyan)", fontFamily: "JetBrains Mono, monospace", letterSpacing: 0 }}>
                  {formatExpiry(expiry)}
                </span>
              </label>
              <input className="slider" type="range" min={1} max={168} value={expiry}
                style={{ background: sliderFill(expiry, 1, 168) }}
                onChange={e => setExpiry(+e.target.value)} />
            </div>
            <div>
              <label style={styles.label}>
                MAX VIEWS
                <span style={{ float: "right", color: "var(--accent-cyan)", fontFamily: "JetBrains Mono, monospace", letterSpacing: 0 }}>
                  {formatViews(maxViews)}
                </span>
              </label>
              <input className="slider" type="range" min={1} max={100} value={maxViews}
                style={{ background: sliderFill(maxViews, 1, 100) }}
                onChange={e => setMaxViews(+e.target.value)} />
            </div>
          </div>

          <button className="btn btn-primary"
            style={{ justifyContent: "center", padding: 13 }}
            disabled={!files.length || !password || generating}
            onClick={handleGenerate}>
            {generating ? "Generating secure link..." : "🔗 Generate ZK Share Link"}
          </button>

          {/* Generated package */}
          {generatedLink && (
            <div style={styles.linkBox}>
              <div style={styles.linkBoxHeader}>
                <span className="badge badge-green">✅ Encrypted & Ready to Share</span>
              </div>

              {/* Encrypted file */}
              <div style={styles.itemRow}>
                <div style={styles.itemLabel}>
                  <span style={{ fontSize: 18 }}>📦</span>
                  <div>
                    <div style={styles.itemTitle}>Encrypted file</div>
                    <div style={styles.itemSub}>{generatedLink.svaultName} — downloaded to your device</div>
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={downloadEncryptedAgain}
                  style={{ padding: "6px 14px", fontSize: 12 }}>
                  ⬇ Re-download
                </button>
              </div>

              {/* Password — the critical bit */}
              <div style={styles.pwBox}>
                <div style={styles.pwBoxTop}>
                  <span style={{ fontSize: 18 }}>🔑</span>
                  <span style={styles.pwBoxTitle}>Encryption Password</span>
                </div>
                <p style={styles.pwWarning}>
                  ⚠️ <strong>Save this password.</strong> The recipient needs it to decrypt the file — and so do you if you ever need to open it again.
                </p>
                <div style={styles.pwRow}>
                  <input className="input" readOnly
                    type={showPw ? "text" : "password"}
                    value={generatedLink.password || ""}
                    style={{
                      flex: 1, fontFamily: "JetBrains Mono, monospace",
                      letterSpacing: showPw ? "0.04em" : "0.1em",
                      color: "var(--accent-cyan)", fontSize: 15, fontWeight: 600,
                    }} />
                  <button onClick={() => setShowPw(s => !s)} style={styles.iconBtn}
                    title={showPw ? "Hide" : "Show"}>
                    {showPw ? "🙈" : "👁️"}
                  </button>
                  <button onClick={copySharePassword}
                    style={{ ...styles.pwCopyBtn, ...(copiedPw ? styles.pwCopyBtnDone : {}) }}>
                    {copiedPw ? "✓ Copied" : "📋 Copy"}
                  </button>
                </div>
              </div>

              {/* Share link */}
              <div style={styles.linkPreview}>
                <span style={styles.linkText}>
                  {window.location.origin}/zk#…{generatedLink.token}…
                  &nbsp;<span style={{ color: "var(--text-muted)" }}>
                    ({(generatedLink.fullLink.length / 1024).toFixed(1)} KB link)
                  </span>
                </span>
                <button className="btn btn-cyan" style={{ padding: "5px 14px", fontSize: 12 }}
                  onClick={() => copyLink(generatedLink)}>
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
              {qrDataUrl && (
                <div style={styles.qrWrap}>
                  <img src={qrDataUrl} alt="ZK share link QR" style={styles.qrImg} />
                  <div style={styles.qrCaption}>
                    📱 Scan to open the link on another device.<br/>
                    <span style={{ color: "var(--accent-amber)" }}>
                      Then text or call the password — never include both in the same message.
                    </span>
                  </div>
                </div>
              )}
              {generatedLink.qrTooLarge && (
                <div style={styles.qrTooBig}>
                  ℹ️ Link is too long for a QR code. Copy the link instead and paste it into a message.
                </div>
              )}

              {/* Sender + recipient instructions */}
              <div style={styles.howto}>
                <div style={styles.howtoTitle}>📨 How to share with the recipient</div>
                <ol style={styles.howtoList}>
                  <li>
                    Send the <strong>{generatedLink.svaultName}</strong> file via your normal channel
                    (email, WhatsApp, USB stick, etc.).
                  </li>
                  <li>
                    Send the <strong>password</strong> through a <em>different</em> channel — text it,
                    call them, or use a different app. Don't put it in the same message as the file.
                  </li>
                  <li>
                    Tell them to open <strong>SecureVault AI</strong> →{" "}
                    <span style={{ color: "var(--accent-cyan)" }}>🔐 Encrypt / Decrypt</span> →{" "}
                    switch to <strong>🔓 Decrypt</strong>, drop the <code style={styles.codeChip}>.svault</code> file
                    in, paste the password, and click <strong>Decrypt & Download</strong>.
                  </li>
                </ol>
                <div style={styles.checksumRow}>
                  Checksum (optional integrity check): <code style={styles.codeChip}>{generatedLink.checksum?.slice(0,24)}…</code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — Active links */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={styles.sectionTitle}>Active Share Links</h3>
            <span className="badge badge-cyan">{links.filter(l=>l.status==="ACTIVE").length} Active</span>
          </div>
          <div style={styles.linksList}>
            {links.map(l => (
              <div key={l.id} style={styles.linkCard}>
                <div style={styles.linkCardTop}>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      Token: {l.token}... · Expires: {l.expires}
                    </div>
                  </div>
                  <span className={`badge ${l.status === "ACTIVE" ? "badge-green" : l.status === "EXPIRED" ? "badge-red" : "badge-amber"}`}>
                    {l.status}
                  </span>
                </div>

                {/* Views progress */}
                <div style={styles.viewsRow}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    Views: {l.views}/{l.maxViews}
                  </span>
                  <div style={{ flex: 1, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(l.views/l.maxViews)*100}%`, background: l.views >= l.maxViews ? "var(--accent-red)" : "var(--accent-cyan)", borderRadius: 2 }} />
                  </div>
                </div>

                {l.status === "ACTIVE" && (
                  <div style={styles.linkActions}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
                      Link content kept only in the success panel — generate a new one if you need to resend.
                    </span>
                    <button onClick={() => revokeLink(l.id)}
                      style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      Revoke
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:   { maxWidth: 1100 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title:  { fontFamily: "Space Grotesk, sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 },
  sub:    { fontSize: 14, color: "var(--text-secondary)" },
  explainer: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28, padding: 20, background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.18)", borderRadius: "var(--radius-lg)" },
  step:   { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  grid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  sectionTitle: { fontFamily: "Space Grotesk, sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 0 },
  label:  { fontSize: 12, letterSpacing: "0.08em", color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 },
  dropzone: { border: "2px dashed var(--border-bright)", borderRadius: "var(--radius-lg)", padding: "32px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: "var(--bg-card)" },
  optionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  linkBox: { padding: 18, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.22)", borderRadius: "var(--radius-md)" },
  linkBoxHeader: { marginBottom: 10 },
  linkPreview: { display: "flex", alignItems: "center", gap: 10, background: "var(--bg-secondary)", padding: "10px 14px", borderRadius: "var(--radius-sm)" },
  linkText: { flex: 1, fontSize: 13, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "JetBrains Mono, monospace" },
  linksList: { display: "flex", flexDirection: "column", gap: 12, maxHeight: 560, overflowY: "auto" },
  linkCard: { padding: 18, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" },
  linkCardTop: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  viewsRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  linkActions: { display: "flex", gap: 10, alignItems: "center" },
  qrWrap: {
    display: "flex", alignItems: "center", gap: 14, marginTop: 12,
    padding: 12, background: "rgba(0,229,255,0.04)",
    border: "1px solid rgba(0,229,255,0.15)", borderRadius: "var(--radius-md)",
  },
  qrImg: {
    width: 120, height: 120, flexShrink: 0,
    background: "var(--bg-secondary)", borderRadius: 8, padding: 6,
    boxShadow: "0 0 24px rgba(0,229,255,0.25)",
  },
  qrCaption: { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 },

  itemRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 14px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    marginTop: 14,
  },
  itemLabel: { display: "flex", alignItems: "center", gap: 12 },
  itemTitle: { fontSize: 14, fontWeight: 600, color: "var(--text-primary)" },
  itemSub:   { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },

  pwBox: {
    marginTop: 14,
    padding: 16,
    background: "rgba(251,191,36,0.06)",
    border: "1.5px solid rgba(251,191,36,0.35)",
    borderRadius: "var(--radius-md)",
    display: "flex", flexDirection: "column", gap: 10,
  },
  pwBoxTop:   { display: "flex", alignItems: "center", gap: 10 },
  pwBoxTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 16, fontWeight: 700,
    color: "var(--accent-amber)",
  },
  pwWarning: { fontSize: 13, color: "var(--text-primary)", lineHeight: 1.55 },
  pwRow:     { display: "flex", gap: 8 },
  iconBtn: {
    width: 44, padding: 0,
    background: "var(--bg-secondary)",
    border: "1.5px solid var(--border-bright)", borderRadius: "var(--radius-sm)",
    color: "var(--text-secondary)", fontSize: 16,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  pwCopyBtn: {
    padding: "0 18px",
    background: "var(--accent-cyan)", color: "var(--bg-primary)",
    border: "none", borderRadius: "var(--radius-sm)",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    minWidth: 100,
  },
  pwCopyBtnDone: { background: "var(--accent-green)" },

  howto: {
    marginTop: 16,
    padding: 16,
    background: "rgba(34,211,238,0.05)",
    border: "1px solid rgba(34,211,238,0.20)",
    borderRadius: "var(--radius-md)",
  },
  howtoTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 15, fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: 10,
  },
  howtoList: {
    paddingLeft: 22,
    display: "flex", flexDirection: "column", gap: 8,
    fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
  },
  codeChip: {
    background: "var(--bg-card)",
    padding: "2px 6px", borderRadius: 4,
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 12, color: "var(--accent-cyan)",
  },
  checksumRow: {
    marginTop: 12, paddingTop: 12,
    borderTop: "1px solid var(--border)",
    fontSize: 12, color: "var(--text-secondary)",
  },
  qrTooBig: {
    marginTop: 12,
    padding: "10px 14px",
    fontSize: 13,
    color: "var(--text-secondary)",
    background: "rgba(251,191,36,0.06)",
    border: "1px solid rgba(251,191,36,0.25)",
    borderRadius: "var(--radius-sm)",
    lineHeight: 1.55,
  },
};