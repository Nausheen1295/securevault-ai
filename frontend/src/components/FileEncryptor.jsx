import { useState, useRef, useEffect } from "react";
import { encryptFile, decryptFile, passwordStrength, generatePassword } from "../utils/crypto";
import { checkPwnedPassword } from "../utils/hibp";
import { auth, saveFileRecord, logSecurityEvent } from "../utils/firebase";

export default function FileEncryptor() {
  const [files, setFiles]       = useState([]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [dragging, setDragging] = useState(false);
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState("encrypt"); // encrypt | decrypt
  const [pwned, setPwned]       = useState(null);
  const [pwLength, setPwLength] = useState(20);
  const [savedPw, setSavedPw]   = useState("");      // password actually used to encrypt
  const [savedFiles, setSavedFiles] = useState([]);  // [{ svaultName, blob, size }]
  const [showSavedPw, setShowSavedPw] = useState(true);
  const [copiedPw, setCopiedPw] = useState(false);
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const inputRef                = useRef();
  const pw                      = passwordStrength(password);

  const copySavedPw = async () => {
    try {
      await navigator.clipboard.writeText(savedPw);
      setCopiedPw(true);
      setTimeout(() => setCopiedPw(false), 2200);
    } catch { /* ignore */ }
  };

  const sliderFill = (val, min, max) => {
    const pct = ((val - min) / (max - min)) * 100;
    return `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`;
  };

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
    setSavedPw("");
    setSavedFiles([]);
    const out = [];
    const produced = [];
    for (const f of files) {
      try {
        if (mode === "encrypt") {
          const res = await encryptFile(f, password);
          downloadBlob(res.blob, res.name);
          produced.push({ svaultName: res.name, blob: res.blob, size: res.size });
          out.push({ name: f.name, svaultName: res.name, status: "✅ Encrypted", checksum: res.checksum.slice(0,16) + "…", size: formatBytes(res.size) });
          // Persist metadata for the profile page (no blob, no key — just metadata)
          if (auth?.currentUser) {
            const uid = auth.currentUser.uid;
            saveFileRecord(uid, {
              originalName: f.name,
              svaultName:   res.name,
              size:         res.size,
              checksum:     res.checksum,
              mimeType:     f.type || "application/octet-stream",
            }).catch(() => {});
            logSecurityEvent(uid, {
              type: "encrypt",
              detail: `Encrypted ${f.name}`,
              risk: "SAFE",
            }).catch(() => {});
          }
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
    // If encryption succeeded for at least one file, remember the password + outputs
    if (mode === "encrypt" && produced.length > 0) {
      setSavedPw(password);
      setSavedFiles(produced);
      setShowSavedPw(true);
    }
    setLoading(false);
  };

  const redownload = (item) => downloadBlob(item.blob, item.svaultName);

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
                  onClick={() => { const p = generatePassword(pwLength); setPassword(p); setConfirm(p); }}
                  style={styles.diceBtn}>🎲 Generate ({pwLength})</button>
              )}
            </label>
            {mode === "encrypt" && (
              <div className="slider-row">
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Length</span>
                <input className="slider" type="range" min={8} max={64} value={pwLength}
                  style={{ background: sliderFill(pwLength, 8, 64) }}
                  onChange={e => setPwLength(+e.target.value)} />
                <span className="slider-value">{pwLength}</span>
              </div>
            )}
            <div style={styles.inputWrap}>
              <input className="input" type={showPw ? "text" : "password"} placeholder="Enter strong password"
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: 56 }} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                title={showPw ? "Hide password" : "Show password"}
                style={styles.eyeBtn}>
                {showPw ? "🙈" : "👁️"}
              </button>
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
              <div style={styles.inputWrap}>
                <input className="input" type={showConfirm ? "text" : "password"} placeholder="Repeat password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  style={{ paddingRight: 56 }} />
                <button type="button" onClick={() => setShowConfirm(s => !s)}
                  title={showConfirm ? "Hide password" : "Show password"}
                  style={styles.eyeBtn}>
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>
              {confirm && password !== confirm && (
                <span style={{ fontSize: 12, color: "var(--accent-red)", marginTop: 4 }}>Passwords don't match</span>
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

          {/* Password recap — only after a successful encrypt */}
          {mode === "encrypt" && savedPw && (
            <div style={styles.recapCard}>
              <div style={styles.recapHeader}>
                <span style={{ fontSize: 22 }}>🔑</span>
                <span style={styles.recapTitle}>Save This Password</span>
              </div>
              <p style={styles.recapWarning}>
                ⚠️ <strong>Write this down or save it somewhere safe.</strong> You'll need this exact
                password to decrypt the file. We don't store it anywhere — if you lose it, the file
                is permanently unrecoverable.
              </p>

              {/* Saved files list */}
              {savedFiles.length > 0 && (
                <div style={styles.savedFilesBox}>
                  <div style={styles.savedFilesHeader}>
                    <span style={{ fontSize: 16 }}>📦</span>
                    <span style={styles.savedFilesTitle}>
                      Encrypted {savedFiles.length} file{savedFiles.length === 1 ? "" : "s"} — downloaded to your device
                    </span>
                  </div>
                  {savedFiles.map((f, i) => (
                    <div key={i} style={styles.savedFileRow}>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={styles.savedFileName}>{f.svaultName}</div>
                        <div style={styles.savedFileSize}>{formatBytes(f.size)}</div>
                      </div>
                      <button onClick={() => redownload(f)} style={styles.redownloadBtn}
                        title="Re-download this encrypted file">
                        ⬇ Re-download
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.recapPwRow}>
                <input className="input" readOnly
                  type={showSavedPw ? "text" : "password"}
                  value={savedPw}
                  style={{
                    flex: 1, fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: showSavedPw ? "0.04em" : "0.1em",
                    color: "var(--accent-cyan)", fontSize: 15, fontWeight: 600,
                  }} />
                <button type="button" onClick={() => setShowSavedPw(s => !s)}
                  title={showSavedPw ? "Hide password" : "Show password"}
                  style={styles.recapIconBtn}>
                  {showSavedPw ? "🙈" : "👁️"}
                </button>
                <button type="button" onClick={copySavedPw}
                  style={{ ...styles.recapCopyBtn, ...(copiedPw ? styles.recapCopyBtnDone : {}) }}>
                  {copiedPw ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
              <div style={styles.decryptHint}>
                <strong>To decrypt later:</strong> switch to the <span style={{ color: "var(--accent-cyan)" }}>🔓 Decrypt</span> tab above, drop your <code style={styles.codeChip}>.svault</code> file in, and paste this password.
              </div>
            </div>
          )}

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
  page:    { maxWidth: 1100 },
  header:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  title:   { fontFamily: "Space Grotesk, sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 },
  sub:     { fontSize: 14, color: "var(--text-secondary)" },
  modeSwitch: { display: "flex", gap: 8 },
  modeBtn: { padding: "10px 18px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border-bright)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "Inter, sans-serif" },
  modeBtnActive: { borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)", background: "rgba(34,211,238,0.10)" },
  grid:    { display: "grid", gridTemplateColumns: "1fr 400px", gap: 24 },
  dropzone: {
    border: "2px dashed var(--border-bright)",
    borderRadius: "var(--radius-lg)", padding: "52px 24px",
    textAlign: "center", cursor: "pointer",
    transition: "all 0.2s", marginBottom: 16,
    background: "var(--bg-card)",
  },
  dropzoneActive: { borderColor: "var(--accent-cyan)", background: "rgba(34,211,238,0.06)" },
  dropIcon: { fontSize: 44, marginBottom: 12 },
  dropText: { fontSize: 16, fontWeight: 600, marginBottom: 6 },
  dropSub:  { fontSize: 13, color: "var(--text-muted)" },
  fileList: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" },
  fileListHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--border)" },
  fileItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--border)" },
  fileExt:  { fontSize: 11, fontWeight: 700, padding: "3px 8px", background: "var(--bg-secondary)", borderRadius: 5, color: "var(--accent-cyan)", letterSpacing: "0.05em", flexShrink: 0, fontFamily: "JetBrains Mono, monospace" },
  fileName: { fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  fileSize: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  removeBtn: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, flexShrink: 0 },
  rightPanel: { display: "flex", flexDirection: "column", gap: 18 },
  section:  { display: "flex", flexDirection: "column", gap: 8 },
  label:    { fontSize: 12, letterSpacing: "0.08em", color: "var(--text-secondary)", fontWeight: 700 },
  inputWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute", top: 0, right: 0, height: "100%", width: 48,
    background: "transparent", border: "none", cursor: "pointer",
    fontSize: 16, color: "var(--text-secondary)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  strength: { display: "flex", alignItems: "center", gap: 10, marginTop: 6 },
  strengthTrack: { flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" },
  strengthFill:  { height: "100%", borderRadius: 2, transition: "width 0.3s, background 0.3s" },
  infoBox: { background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.18)", borderRadius: "var(--radius-md)", padding: 14, display: "flex", flexDirection: "column", gap: 8 },
  infoRow: { display: "flex", gap: 10, fontSize: 13, color: "var(--text-secondary)" },
  spinner: { width: 14, height: 14, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },
  results: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 240, overflowY: "auto" },
  resultRow: { padding: "12px 14px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" },
  resultName: { fontSize: 14, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  resultHash: { fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontFamily: "JetBrains Mono, monospace" },
  diceBtn: {
    float: "right", background: "transparent",
    border: "1.5px solid rgba(34,211,238,0.4)", borderRadius: 6,
    color: "var(--accent-cyan)", fontSize: 11, padding: "3px 10px",
    cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600,
    letterSpacing: "0.03em",
  },
  recapCard: {
    padding: 20,
    background: "rgba(251,191,36,0.06)",
    border: "1.5px solid rgba(251,191,36,0.35)",
    borderRadius: "var(--radius-lg)",
    display: "flex", flexDirection: "column", gap: 14,
  },
  recapHeader: { display: "flex", alignItems: "center", gap: 12 },
  recapTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 18, fontWeight: 700,
    color: "var(--accent-amber)",
  },
  recapWarning: {
    fontSize: 13, color: "var(--text-primary)",
    lineHeight: 1.55,
  },
  recapPwRow: { display: "flex", gap: 8, alignItems: "stretch" },
  recapIconBtn: {
    width: 44, padding: 0,
    background: "var(--bg-secondary)",
    border: "1.5px solid var(--border-bright)", borderRadius: "var(--radius-sm)",
    color: "var(--text-secondary)", fontSize: 16,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  },
  recapCopyBtn: {
    padding: "0 18px",
    background: "var(--accent-cyan)", color: "var(--bg-primary)",
    border: "none", borderRadius: "var(--radius-sm)",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    minWidth: 100,
  },
  recapCopyBtnDone: { background: "var(--accent-green)" },
  decryptHint: {
    fontSize: 13, color: "var(--text-secondary)",
    background: "var(--bg-secondary)",
    padding: "12px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    lineHeight: 1.55,
  },
  codeChip: {
    background: "var(--bg-card)",
    padding: "2px 6px", borderRadius: 4,
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 12, color: "var(--accent-cyan)",
  },
  savedFilesBox: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: 14,
    display: "flex", flexDirection: "column", gap: 10,
  },
  savedFilesHeader: { display: "flex", alignItems: "center", gap: 10 },
  savedFilesTitle: {
    fontSize: 13, fontWeight: 600,
    color: "var(--text-primary)",
  },
  savedFileRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
  },
  savedFileName: {
    fontSize: 13, fontWeight: 600,
    color: "var(--accent-cyan)",
    fontFamily: "JetBrains Mono, monospace",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  savedFileSize: { fontSize: 11, color: "var(--text-muted)", marginTop: 2 },
  redownloadBtn: {
    padding: "6px 12px",
    background: "transparent",
    border: "1.5px solid var(--border-bright)",
    borderRadius: 6,
    color: "var(--text-secondary)",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    flexShrink: 0,
  },
};