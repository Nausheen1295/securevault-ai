import { useState, useEffect } from "react";
import { decryptFile } from "../utils/crypto";

function b64UrlToBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const b   = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function formatBytes(b) {
  if (b < 1024)    return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
}

export default function ZKReceive({ theme, onToggleTheme }) {
  const [parseError,   setParseError]   = useState("");
  const [meta,         setMeta]         = useState(null);
  const [blob,         setBlob]         = useState(null);
  const [password,     setPassword]     = useState("");
  const [showPw,       setShowPw]       = useState(false);
  const [decrypting,   setDecrypting]   = useState(false);
  const [done,         setDone]         = useState(false);
  const [decryptError, setDecryptError] = useState("");

  // Parse the URL fragment exactly once on mount
  useEffect(() => {
    try {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) {
        setParseError("This link is missing its data payload. Make sure you copied the full URL — everything after the # is required.");
        return;
      }
      const params = new URLSearchParams(hash);
      const d = params.get("d");
      const m = params.get("m");
      if (!d || !m) {
        setParseError("This share link is malformed. Ask the sender to regenerate it and re-send.");
        return;
      }

      const metaJson = atob(m.replace(/-/g, "+").replace(/_/g, "/"));
      const metadata = JSON.parse(metaJson);

      if (metadata.exp && Date.now() > metadata.exp) {
        const when = new Date(metadata.exp).toLocaleString();
        setParseError(`This link expired on ${when}. Ask the sender for a fresh one.`);
        return;
      }

      const bytes = b64UrlToBytes(d);
      setMeta(metadata);
      setBlob(new Blob([bytes], { type: "application/octet-stream" }));
    } catch (err) {
      setParseError("Couldn't read the share link. It may be corrupted or truncated by your email/messaging app — try opening it from where the sender originally pasted it.");
    }
  }, []);

  const handleDecrypt = async (e) => {
    e?.preventDefault();
    if (!blob || !password) return;
    setDecryptError("");
    setDecrypting(true);
    try {
      const fileLike = new File([blob], meta?.name ? `${meta.name}.svault` : "shared.svault");
      const result   = await decryptFile(fileLike, password);
      downloadBlob(result.blob, meta?.name || result.name);
      setDone(true);
    } catch (err) {
      setDecryptError("Incorrect password — or the file has been tampered with. Try again, and double-check the password the sender gave you.");
    }
    setDecrypting(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.grid} />
      <div style={{ ...styles.orb, top: "10%", left: "12%", background: "radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)" }} />
      <div style={{ ...styles.orb, bottom: "12%", right: "10%", background: "radial-gradient(circle, rgba(34,211,238,0.14) 0%, transparent 70%)" }} />

      <button onClick={onToggleTheme} style={styles.themeFloat}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <div style={styles.card} className="fade-up">
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <div style={styles.logoName}>SecureVault <span style={{ color: "var(--accent-cyan)" }}>AI</span></div>
            <div style={styles.logoSub}>Encrypted file delivery</div>
          </div>
        </div>

        <div style={styles.divider} />

        {parseError && (
          <div style={styles.errorBox}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>⚠️</div>
            <h2 style={styles.errorTitle}>Can't open this link</h2>
            <p style={styles.errorMsg}>{parseError}</p>
            <a href="/" style={styles.homeLink}>← Return to SecureVault AI</a>
          </div>
        )}

        {!parseError && !done && meta && blob && (
          <>
            <h2 style={styles.title}>You've received an encrypted file</h2>
            <div style={styles.fileMeta}>
              <div style={styles.fileMetaRow}>
                <span style={styles.metaLabel}>File</span>
                <span style={styles.metaValue}>{meta.name || "encrypted-file"}</span>
              </div>
              <div style={styles.fileMetaRow}>
                <span style={styles.metaLabel}>Size</span>
                <span style={styles.metaValue}>{formatBytes(blob.size)}</span>
              </div>
              {meta.exp && (
                <div style={styles.fileMetaRow}>
                  <span style={styles.metaLabel}>Expires</span>
                  <span style={styles.metaValue}>{new Date(meta.exp).toLocaleString()}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleDecrypt} style={styles.form}>
              <label style={styles.label}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showPw ? "text" : "password"}
                  placeholder="The password the sender gave you"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoFocus
                  style={{ paddingRight: 56 }} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={styles.eyeBtn}
                  title={showPw ? "Hide" : "Show"}>
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>

              {decryptError && (
                <div style={styles.inlineError}>{decryptError}</div>
              )}

              <p style={styles.privacyNote}>
                🔒 The password is used only in your browser. Nothing is sent to any server —
                this entire page works offline.
              </p>

              <button className="btn btn-primary" type="submit"
                disabled={!password || decrypting}
                style={{ width: "100%", justifyContent: "center", padding: 14 }}>
                {decrypting
                  ? <><span style={styles.spinner} /> Decrypting…</>
                  : "🔓 Decrypt & Download"}
              </button>
            </form>
          </>
        )}

        {done && (
          <div style={styles.successBox}>
            <div style={{ fontSize: 56 }}>✅</div>
            <h2 style={styles.title}>Decrypted successfully</h2>
            <p style={styles.successMsg}>
              Your file <strong>{meta?.name}</strong> has been downloaded.
            </p>
            <button className="btn btn-ghost" onClick={() => { setDone(false); setPassword(""); }}
              style={{ marginTop: 14 }}>
              Decrypt again
            </button>
          </div>
        )}

        <div style={styles.footer}>
          🔒 Zero-knowledge · No server ever sees the file or password
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh", display: "flex",
    alignItems: "center", justifyContent: "center",
    background: "var(--bg-primary)", position: "relative", overflow: "hidden",
  },
  grid: {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
    backgroundSize: "44px 44px",
    opacity: 0.22,
  },
  orb: { position: "absolute", width: 440, height: 440, borderRadius: "50%", pointerEvents: "none" },
  themeFloat: {
    position: "absolute", top: 24, right: 28,
    width: 44, height: 44, borderRadius: 12,
    background: "var(--bg-card)", border: "1px solid var(--border-bright)",
    color: "var(--text-primary)", fontSize: 18,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "var(--shadow-md)",
  },
  card: {
    position: "relative", width: 480,
    background: "var(--bg-card)",
    border: "1px solid var(--border-bright)",
    borderRadius: "var(--radius-xl)",
    padding: "36px",
    boxShadow: "var(--shadow-md), 0 0 80px rgba(0,0,0,0.35)",
  },
  logo: { display: "flex", alignItems: "center", gap: 16, marginBottom: 22 },
  logoIcon: {
    width: 52, height: 52, borderRadius: 14,
    background: "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(167,139,250,0.20))",
    border: "1px solid rgba(34,211,238,0.30)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoName: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 22, fontWeight: 700,
    color: "var(--text-primary)", letterSpacing: "-0.02em",
  },
  logoSub: { fontSize: 13, color: "var(--text-secondary)", letterSpacing: "0.06em", marginTop: 2 },
  divider: { height: 1, background: "var(--border)", marginBottom: 22 },

  title: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 22, fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: 14,
  },
  fileMeta: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: 16,
    marginBottom: 20,
    display: "flex", flexDirection: "column", gap: 8,
  },
  fileMetaRow: { display: "flex", justifyContent: "space-between" },
  metaLabel: {
    fontSize: 12, color: "var(--text-secondary)",
    letterSpacing: "0.06em", fontWeight: 600,
  },
  metaValue: {
    fontSize: 14, color: "var(--text-primary)",
    fontWeight: 600,
    maxWidth: "60%",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },

  form: { display: "flex", flexDirection: "column", gap: 14 },
  label: { fontSize: 12, letterSpacing: "0.08em", color: "var(--text-secondary)", fontWeight: 700 },
  eyeBtn: {
    position: "absolute", top: 0, right: 0, height: "100%", width: 48,
    background: "transparent", border: "none", cursor: "pointer",
    fontSize: 16, color: "var(--text-secondary)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  inlineError: {
    padding: "12px 14px", borderRadius: "var(--radius-sm)",
    background: "rgba(248,113,113,0.10)",
    border: "1px solid rgba(248,113,113,0.30)",
    color: "var(--accent-red)", fontSize: 13, fontWeight: 500, lineHeight: 1.5,
  },
  privacyNote: {
    fontSize: 12, color: "var(--text-secondary)",
    background: "var(--bg-secondary)",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    lineHeight: 1.55,
  },

  errorBox: {
    textAlign: "center",
    padding: "16px 8px 8px",
  },
  errorTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 20, fontWeight: 700,
    color: "var(--accent-red)",
    marginBottom: 10,
  },
  errorMsg: {
    fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6,
    marginBottom: 18,
  },
  homeLink: {
    display: "inline-block",
    color: "var(--accent-cyan)", textDecoration: "none",
    fontSize: 13, fontWeight: 600,
    padding: "8px 14px", borderRadius: 8,
    border: "1.5px solid rgba(34,211,238,0.3)",
  },

  successBox: { textAlign: "center", padding: "12px 0" },
  successMsg: { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55 },

  spinner: {
    width: 14, height: 14, border: "2px solid rgba(255,255,255,0.25)",
    borderTopColor: "white", borderRadius: "50%",
    display: "inline-block", animation: "spin 0.7s linear infinite",
  },
  footer: {
    textAlign: "center", fontSize: 12, color: "var(--text-secondary)",
    marginTop: 22, letterSpacing: "0.04em", fontWeight: 500,
  },
};
