import { useState, useCallback } from "react";
import { fullScan } from "../utils/aiScanner";

const RISK_CONFIG = {
  HIGH:   { color: "var(--accent-red)",   bg: "rgba(255,59,107,0.08)",   badge: "badge-red",   icon: "🚨" },
  MEDIUM: { color: "var(--accent-amber)", bg: "rgba(255,176,32,0.08)",   badge: "badge-amber", icon: "⚠️" },
  LOW:    { color: "var(--accent-cyan)",  bg: "rgba(0,229,255,0.06)",    badge: "badge-cyan",  icon: "ℹ️" },
  CLEAN:  { color: "var(--accent-green)", bg: "rgba(0,255,136,0.06)",    badge: "badge-green", icon: "✅" },
};

export default function AIThreatScanner() {
  const [files, setFiles]     = useState([]);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [currentFile, setCurrentFile] = useState("");
  const [progress, setProgress] = useState(0);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setFiles(Array.from(e.dataTransfer.files));
    setResults([]);
  }, []);

  const handleScan = async () => {
    if (!files.length) return;
    setScanning(true);
    setResults([]);
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setCurrentFile(f.name);
      setProgress(Math.round(((i) / files.length) * 100));
      const result = await fullScan(f);
      out.push(result);
      setResults([...out]);
    }
    setProgress(100);
    setCurrentFile("");
    setScanning(false);
  };

  const summary = {
    HIGH:   results.filter(r => r.risk === "HIGH").length,
    MEDIUM: results.filter(r => r.risk === "MEDIUM").length,
    CLEAN:  results.filter(r => r.risk === "CLEAN").length,
  };

  return (
    <div style={styles.page} className="fade-up">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🤖 AI Threat Scanner</h2>
          <p style={styles.sub}>Machine learning analysis · Entropy detection · Signature matching</p>
        </div>
        <span className="badge badge-violet">TensorFlow.js Engine</span>
      </div>

      <div style={styles.grid}>
        {/* Left — Drop + scan */}
        <div>
          <div
            style={styles.dropzone}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("ai-file-input").click()}
          >
            <input id="ai-file-input" type="file" multiple hidden
              onChange={e => { setFiles(Array.from(e.target.files)); setResults([]); }} />
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Drop files to scan</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>AI-powered malware & anomaly detection</div>
          </div>

          {files.length > 0 && (
            <div style={styles.fileQueue}>
              {files.map((f, i) => (
                <div key={i} style={styles.queueItem}>
                  <span style={{ fontSize: 16 }}>📄</span>
                  <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  {scanning && currentFile === f.name && <span style={styles.scanningDot} />}
                  {results[i] && (
                    <span className={`badge badge-${results[i].risk === "CLEAN" ? "green" : results[i].risk === "HIGH" ? "red" : "amber"}`}>
                      {results[i].risk}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {scanning && (
            <div style={styles.scanProgress}>
              <div style={styles.scanLabel}>
                <span style={{ fontSize: 12, color: "var(--accent-cyan)" }}>Scanning: {currentFile}</span>
                <span style={{ fontSize: 12 }}>{progress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%`, background: "var(--accent-cyan)" }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                Running entropy analysis · Signature matching · Behavioral heuristics
              </div>
            </div>
          )}

          <button className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: 12, marginTop: 14 }}
            disabled={!files.length || scanning}
            onClick={handleScan}>
            {scanning ? <><span style={styles.spinner} /> Scanning {files.length} file(s)...</> : "🤖 Run AI Scan"}
          </button>
        </div>

        {/* Right — Results */}
        <div>
          {results.length === 0 && !scanning && (
            <div style={styles.emptyResults}>
              <div style={{ fontSize: 48, opacity: 0.3 }}>🤖</div>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>Scan results will appear here</p>
            </div>
          )}

          {results.length > 0 && (
            <>
              {/* Summary */}
              <div style={styles.summary}>
                {[["HIGH","🚨 Threats", summary.HIGH], ["MEDIUM","⚠️ Warnings", summary.MEDIUM], ["CLEAN","✅ Clean", summary.CLEAN]].map(([risk, label, count]) => (
                  <div key={risk} style={{ ...styles.summaryCard, background: RISK_CONFIG[risk].bg, borderColor: RISK_CONFIG[risk].color + "33" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: RISK_CONFIG[risk].color, fontFamily: "Syne, sans-serif" }}>{count}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Individual results */}
              <div style={styles.resultsList}>
                {results.map((r, i) => {
                  const cfg = RISK_CONFIG[r.risk];
                  return (
                    <div key={i} style={{ ...styles.resultCard, background: cfg.bg, borderColor: cfg.color + "33" }}>
                      <div style={styles.resultTop}>
                        <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.file.name}</div>
                          <div style={{ fontSize: 10, color: cfg.color }}>{r.type}</div>
                        </div>
                        <span className={`badge ${cfg.badge}`}>{r.risk}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>{r.detail}</p>
                      <div style={styles.resultMeta}>
                        <span>Entropy: <b style={{ color: r.entropy > 7 ? "var(--accent-amber)" : "var(--text-primary)" }}>{r.entropy}</b></span>
                        <span>Confidence: <b style={{ color: cfg.color }}>{r.confidence}%</b></span>
                        {typeof r.vtMalicious === "number" && (
                          <span>VT engines: <b>{r.vtMalicious}/{r.vtTotal}</b></span>
                        )}
                        {r.vtLink && (
                          <a href={r.vtLink} target="_blank" rel="noreferrer"
                            style={{ color: "var(--accent-cyan)", textDecoration: "none" }}>
                            VT report ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:  { maxWidth: 900 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title: { fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 4 },
  sub:   { fontSize: 12, color: "var(--text-muted)" },
  grid:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  dropzone: {
    border: "2px dashed var(--border-bright)", borderRadius: "var(--radius-lg)",
    padding: "32px 20px", textAlign: "center", cursor: "pointer",
    marginBottom: 14, transition: "all 0.2s",
  },
  fileQueue: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 12 },
  queueItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: "1px solid var(--border)", fontSize: 12 },
  scanningDot: {
    width: 8, height: 8, borderRadius: "50%", background: "var(--accent-cyan)",
    animation: "pulse-glow 1s ease-in-out infinite", flexShrink: 0,
  },
  scanProgress: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12 },
  scanLabel: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  spinner: { width: 12, height: 12, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },
  emptyResults: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200 },
  summary: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 },
  summaryCard: { padding: "12px", borderRadius: "var(--radius-md)", border: "1px solid", textAlign: "center" },
  resultsList: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" },
  resultCard: { padding: 12, borderRadius: "var(--radius-md)", border: "1px solid" },
  resultTop: { display: "flex", alignItems: "center", gap: 10 },
  resultMeta: { display: "flex", gap: 16, fontSize: 10, color: "var(--text-muted)", marginTop: 6 },
};