import { useState, useRef, useEffect } from "react";
import { encryptFile, decryptFile, passwordStrength, generatePassword } from "../utils/crypto";
import { checkPwnedPassword } from "../utils/hibp";

export default function FileEncryptor() {
  const [files, setFiles]       = useState([]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [dragging, setDragging] = useState(false);
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState("encrypt"); // encrypt | decrypt
  const [pwned, setPwned]       = useState(null);
  const inputRef                = useRef();
  const pw                      = passwordStrength(password);

  // Only check on encrypt mode (where the user is choosing a new password)
  useEffect(() => {
    if (mode !== "encrypt" || password.length < 4) { setPwned(null); return; }
    setPwned({ checking: true });
    const t = setTimeout(async () => {
      try {
        const r = await checkPwnedPassword(password);
        setPwned({ count: r.count, checking: false });
      } catch { setPwned(null); }
    }, 500);
    return () => clearTimeout(t);
  }, [password, mode]);

  const addFiles = (fl) => setFiles(p => [...p, ...Array.from(fl)]);
  const removeFile = (i) => setFiles(p => p.filter((_, j) => j !== i));

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleAction = async () => {
    if (!files.length || !password) return;
    if (mode === "encrypt" && password !== confirm) return;
    setLoading(true);
    setResults([]);
    const out = [];
    for (const f of files) {
      try {
        if (mode === "encrypt") {
          const res = await encryptFile(f, password);
          downloadBlob(res.blob, res.name);
          out.push({ name: f.name, status: "✅ Encrypted", checksum: res.checksum.slice(0,16) + "…", size: formatBytes(res.size) });
        } else {
          const res = await decryptFile(f, password);
          downloadBlob(res.blob, res.name);
          out.push({ name: f.name, status: "✅ Decrypted", size: formatBytes(res.blob.size) });
        }
      } catch (e) {
        out.push({ name: f.name, status: "❌ " + e.message });
      }
    }
    setResults(out);
    setLoading(false);
  };

  return (
    <div style={styles.page} className="fade-up">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🔐 File Encryption</h2>
          <p style={styles.sub}>AES-256-GCM · PBKDF2 Key Derivation · Local Processing Only</p>
        </div>
        {/* Mode toggle */}
        <div style={styles.modeSwitch}>
          {["encrypt","decrypt"].map(m => (
            <button key={m} onClick={() => { setMode(m); setResults([]); }}
              style={{ ...styles.modeBtn, ...(mode === m ? styles.modeBtnActive : {}) }}>
              {m === "encrypt" ? "🔒 Encrypt" : "🔓 Decrypt"}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.grid}>
        {/* Left — Drop zone + file list */}
        <div>
          <div
            style={{ ...styles.dropzone, ...(dragging ? styles.dropzoneActive : {}) }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            <input ref={inputRef} type="file" multiple hidden onChange={e => addFiles(e.target.files)} />
            <div style={styles.dropIcon}>📁</div>
            <div style={styles.dropText}>Drop files here or click to browse</div>
            <div style={styles.dropSub}>Any file type · Processed entirely in your browser</div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div style={styles.fileList}>
              <div style={styles.fileListHeader}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{files.length} file(s) selected</span>
                <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: 11 }}
                  onClick={() => setFiles([])}>Clear all</button>
              </div>
              {files.map((f, i) => (
                <div key={i} style={styles.fileItem}>
                  <span style={styles.fileExt}>{f.name.split(".").pop().toUpperCase()}</span>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={styles.fileName}>{f.name}</div>
                    <div style={styles.fileSize}>{formatBytes(f.size)}</div>
                  </div>
                  <button onClick={() => removeFile(i)} style={styles.removeBtn}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Password + action */}
        <div style={styles.rightPanel}>
          <div style={styles.section}>
            <label style={styles.label}>
              MASTER PASSWORD
              {mode === "encrypt" && (
                <button type="button" title="Generate strong password"
                  onClick={() => { const p = generatePassword(20); setPassword(p); setConfirm(p); }}
                  style={styles.diceBtn}>🎲 Generate</button>
              )}
            </label>
            <div style={styles.inputWrap}>
              <input className="input" type="password" placeholder="Enter strong password"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {/* Strength meter */}
            {password && (
              <div style={styles.strength}>
                <div style={styles.strengthTrack}>
                  <div style={{ ...styles.strengthFill, width: `${(pw.score / 5) * 100}%`, background: pw.color }} />
                </div>
                <span style={{ color: pw.color, fontSize: 11 }}>{pw.label}</span>
              </div>
            )}
            {/* Breach check */}
            {mode === "encrypt" && pwned && (
              <div style={{ fontSize: 11, marginTop: 4 }}>
                {pwned.checking
                  ? <span style={{ color: "var(--text-muted)" }}>🔍 Checking breach database...</span>
                  : pwned.count > 0
                    ? <span style={{ color: "var(--accent-red)" }}>
                        ⚠️ Found in {pwned.count.toLocaleString()} known breaches
                      </span>
                    : <span style={{ color: "var(--accent-green)" }}>
                        ✅ Not in any known breach
                      </span>
                }
              </div>
            )}
          </div>

          {mode === "encrypt" && (
            <div style={styles.section}>
              <label style={styles.label}>CONFIRM PASSWORD</label>
              <input className="input" type="password" placeholder="Repeat password"
                value={confirm} onChange={e => setConfirm(e.target.value)} />
              {confirm && password !== confirm && (
                <span style={{ fontSize: 11, color: "var(--accent-red)", marginTop: 4 }}>Passwords don't match</span>
              )}
            </div>
          )}

          {/* Security info panel */}
          <div style={styles.infoBox}>
            <div style={styles.infoRow}><span>🔒</span><span>AES-256-GCM encryption</span></div>
            <div style={styles.infoRow}><span>🧂</span><span>Random salt per file</span></div>
            <div style={styles.infoRow}><span>🔑</span><span>PBKDF2 · 310k iterations</span></div>
            <div style={styles.infoRow}><span>📱</span><span>100% local · Zero server contact</span></div>
          </div>

          <button className={`btn btn-${mode === "encrypt" ? "primary" : "cyan"}`}
            style={{ width: "100%", justifyContent: "center", padding: 13 }}
            disabled={!files.length || !password || loading || (mode === "encrypt" && password !== confirm)}
            onClick={handleAction}>
            {loading
              ? <><span style={styles.spinner} /> Processing {files.length} file(s)...</>
              : mode === "encrypt" ? "🔒 Encrypt & Download" : "🔓 Decrypt & Download"}
          </button>

          {/* Results */}
          {results.length > 0 && (
            <div style={styles.results}>
              {results.map((r, i) => (
                <div key={i} style={styles.resultRow}>
                  <div style={styles.resultName}>{r.name}</div>
                  <div style={{ fontSize: 11, color: r.status.startsWith("✅") ? "var(--accent-green)" : "var(--accent-red)" }}>
                    {r.status}
                  </div>
                  {r.checksum && <div style={styles.resultHash}>SHA-256: {r.checksum}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function formatBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
}

const styles = {
  page:    { maxWidth: 900 },
  header:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title:   { fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 4 },
  sub:     { fontSize: 12, color: "var(--text-muted)" },
  modeSwitch: { display: "flex", gap: 6 },
  modeBtn: { padding: "7px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, fontFamily: "DM Mono, monospace" },
  modeBtnActive: { borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)", background: "rgba(0,229,255,0.06)" },
  grid:    { display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 },
  dropzone: {
    border: "2px dashed var(--border-bright)",
    borderRadius: "var(--radius-lg)", padding: "40px 20px",
    textAlign: "center", cursor: "pointer",
    transition: "all 0.2s", marginBottom: 14,
  },
  dropzoneActive: { borderColor: "var(--accent-cyan)", background: "rgba(0,229,255,0.04)" },
  dropIcon: { fontSize: 36, marginBottom: 10 },
  dropText: { fontSize: 14, fontWeight: 600, marginBottom: 4 },
  dropSub:  { fontSize: 11, color: "var(--text-muted)" },
  fileList: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" },
  fileListHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--border)" },
  fileItem: { display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid var(--border)" },
  fileExt:  { fontSize: 9, fontWeight: 700, padding: "2px 6px", background: "var(--bg-secondary)", borderRadius: 4, color: "var(--accent-cyan)", letterSpacing: "0.05em", flexShrink: 0 },
  fileName: { fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  fileSize: { fontSize: 10, color: "var(--text-muted)" },
  removeBtn: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, flexShrink: 0 },
  rightPanel: { display: "flex", flexDirection: "column", gap: 16 },
  section:  { display: "flex", flexDirection: "column", gap: 6 },
  label:    { fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 600 },
  inputWrap: { position: "relative" },
  strength: { display: "flex", alignItems: "center", gap: 8, marginTop: 4 },
  strengthTrack: { flex: 1, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" },
  strengthFill:  { height: "100%", borderRadius: 2, transition: "width 0.3s, background 0.3s" },
  infoBox: { background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: "var(--radius-md)", padding: 12, display: "flex", flexDirection: "column", gap: 6 },
  infoRow: { display: "flex", gap: 8, fontSize: 11, color: "var(--text-secondary)" },
  spinner: { width: 12, height: 12, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },
  results: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" },
  resultRow: { padding: "8px 12px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" },
  resultName: { fontSize: 12, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  resultHash: { fontSize: 10, color: "var(--text-muted)", marginTop: 2, fontFamily: "DM Mono, monospace" },
  diceBtn: {
    float: "right", background: "transparent",
    border: "1px solid rgba(0,229,255,0.25)", borderRadius: 6,
    color: "var(--accent-cyan)", fontSize: 10, padding: "2px 8px",
    cursor: "pointer", fontFamily: "DM Mono, monospace",
    letterSpacing: "0.05em",
  },
};