import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { encryptFile } from "../utils/crypto";

const MOCK_LINKS = [
  { id: 1, name: "Q4_Report.pdf", token: "abc123xyz", expires: "2025-03-15", views: 2, maxViews: 5, status: "ACTIVE" },
  { id: 2, name: "DesignAssets.zip", token: "def456uvw", expires: "2025-03-10", views: 5, maxViews: 5, status: "EXPIRED" },
];

export default function ZeroKnowledgeShare() {
  const [files, setFiles]     = useState([]);
  const [password, setPassword] = useState("");
  const [expiry, setExpiry]   = useState("24");
  const [maxViews, setMaxViews] = useState("10");
  const [links, setLinks]     = useState(MOCK_LINKS);
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied]   = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Render the QR locally whenever a new link is generated
  useEffect(() => {
    if (!generatedLink?.fullLink) { setQrDataUrl(""); return; }
    QRCode.toDataURL(generatedLink.fullLink, {
      width: 180, margin: 1,
      color: { dark: "#00e5ffff", light: "#0d152500" }, // cyan on transparent
    }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [generatedLink]);

  const handleGenerate = async () => {
    if (!files.length || !password) return;
    setGenerating(true);
    setGeneratedLink(null);

    // Encrypt the file
    const result = await encryptFile(files[0], password);

    // Generate ZK share token — password NOT included
    const token = btoa(JSON.stringify({
      checksum: result.checksum,
      exp: Date.now() + parseInt(expiry) * 3600000,
      maxViews: parseInt(maxViews),
      v: 1,
    })).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");

    const shareLink = `${window.location.origin}/zk/${token}`;
    const newLink = {
      id: Date.now(),
      name: files[0].name,
      token: token.slice(0, 8),
      expires: new Date(Date.now() + parseInt(expiry) * 3600000).toISOString().split("T")[0],
      views: 0,
      maxViews: parseInt(maxViews),
      status: "ACTIVE",
      fullLink: shareLink,
      checksum: result.checksum,
    };

    setLinks(p => [newLink, ...p]);
    setGeneratedLink(newLink);
    setFiles([]);
    setPassword("");
    setGenerating(false);
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link.fullLink || `${window.location.origin}/zk/${link.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <span style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center" }}>{s.label}</span>
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

          <div style={styles.optionsGrid}>
            <div>
              <label style={styles.label}>LINK EXPIRES IN</label>
              <select className="input" value={expiry} onChange={e => setExpiry(e.target.value)}
                style={{ cursor: "pointer" }}>
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="72">3 days</option>
                <option value="168">7 days</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>MAX VIEWS</label>
              <select className="input" value={maxViews} onChange={e => setMaxViews(e.target.value)}
                style={{ cursor: "pointer" }}>
                <option value="1">1 (one-time)</option>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="100">Unlimited</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary"
            style={{ justifyContent: "center", padding: 13 }}
            disabled={!files.length || !password || generating}
            onClick={handleGenerate}>
            {generating ? "Generating secure link..." : "🔗 Generate ZK Share Link"}
          </button>

          {/* Generated link */}
          {generatedLink && (
            <div style={styles.linkBox}>
              <div style={styles.linkBoxHeader}>
                <span className="badge badge-green">✅ Link Generated</span>
              </div>
              <div style={styles.linkPreview}>
                <span style={styles.linkText}>
                  {window.location.origin}/zk/{generatedLink.token}...
                </span>
                <button className="btn btn-cyan" style={{ padding: "5px 12px", fontSize: 11 }}
                  onClick={() => copyLink(generatedLink)}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              {qrDataUrl && (
                <div style={styles.qrWrap}>
                  <img src={qrDataUrl} alt="ZK share link QR" style={styles.qrImg} />
                  <div style={styles.qrCaption}>
                    📱 Scan to open the link on another device.<br/>
                    <span style={{ color: "var(--accent-amber)" }}>
                      Remember: send the password separately.
                    </span>
                  </div>
                </div>
              )}
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                Checksum: {generatedLink.checksum?.slice(0,24)}...
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
                    <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }}
                      onClick={() => copyLink(l)}>📋 Copy Link</button>
                    <button onClick={() => revokeLink(l.id)}
                      style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", fontSize: 11 }}>
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
  page:   { maxWidth: 900 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title:  { fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 4 },
  sub:    { fontSize: 12, color: "var(--text-muted)" },
  explainer: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24, padding: 16, background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: "var(--radius-lg)" },
  step:   { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  grid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  sectionTitle: { fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 0 },
  label:  { fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 },
  dropzone: { border: "2px dashed var(--border-bright)", borderRadius: "var(--radius-lg)", padding: "24px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" },
  optionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  linkBox: { padding: 14, background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: "var(--radius-md)" },
  linkBoxHeader: { marginBottom: 8 },
  linkPreview: { display: "flex", alignItems: "center", gap: 8, background: "var(--bg-secondary)", padding: "8px 10px", borderRadius: "var(--radius-sm)" },
  linkText: { flex: 1, fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "DM Mono, monospace" },
  linksList: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 480, overflowY: "auto" },
  linkCard: { padding: 14, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" },
  linkCardTop: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  viewsRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  linkActions: { display: "flex", gap: 8, alignItems: "center" },
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
  qrCaption: { fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.55 },
};