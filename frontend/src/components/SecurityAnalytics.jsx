import { useState } from "react";

const SCORE_BREAKDOWN = [
  { label: "Encryption Strength",   score: 98, max: 100, color: "var(--accent-green)",  icon: "🔐" },
  { label: "Key Management",        score: 88, max: 100, color: "var(--accent-cyan)",   icon: "🔑" },
  { label: "Sharing Practices",     score: 92, max: 100, color: "var(--accent-cyan)",   icon: "🔗" },
  { label: "Biometric Auth",        score: 95, max: 100, color: "var(--accent-green)",  icon: "👆" },
  { label: "Blockchain Integrity",  score: 100,max: 100, color: "var(--accent-green)",  icon: "⛓️" },
  { label: "AI Threat Response",    score: 82, max: 100, color: "var(--accent-amber)",  icon: "🤖" },
];

const RECENT_EVENTS = [
  { time: "2 min ago",  event: "File encrypted: ProjectDocs.pdf",       type: "encrypt",   risk: "SAFE" },
  { time: "14 min ago", event: "AI scan: threat detected in test.exe",  type: "threat",    risk: "HIGH" },
  { time: "1 hr ago",   event: "Biometric login: face ID verified",     type: "auth",      risk: "SAFE" },
  { time: "3 hr ago",   event: "ZK link created: DesignAssets.zip",     type: "share",     risk: "SAFE" },
  { time: "5 hr ago",   event: "Blockchain key stored: Q4_Financials",  type: "blockchain",risk: "SAFE" },
  { time: "1 day ago",  event: "Failed decrypt: wrong password ×3",     type: "auth",      risk: "MEDIUM" },
  { time: "2 days ago", event: "ZK link expired: Report_Oct.docx",      type: "share",     risk: "INFO" },
];

const THREAT_HISTORY = [
  { month: "Oct", threats: 2,  blocked: 2  },
  { month: "Nov", threats: 5,  blocked: 5  },
  { month: "Dec", threats: 3,  blocked: 3  },
  { month: "Jan", threats: 8,  blocked: 7  },
  { month: "Feb", threats: 12, blocked: 12 },
  { month: "Mar", threats: 4,  blocked: 4  },
];

const EVENT_COLORS = {
  encrypt:    { color: "var(--accent-cyan)",   icon: "🔐" },
  threat:     { color: "var(--accent-red)",    icon: "🚨" },
  auth:       { color: "var(--accent-violet)", icon: "🔑" },
  share:      { color: "var(--accent-amber)",  icon: "🔗" },
  blockchain: { color: "#a78bfa",              icon: "⛓️" },
};

const maxThreats = Math.max(...THREAT_HISTORY.map(t => t.threats));

export default function SecurityAnalytics() {
  const [tab, setTab] = useState("overview");
  const overallScore = Math.round(SCORE_BREAKDOWN.reduce((s, i) => s + i.score, 0) / SCORE_BREAKDOWN.length);

  return (
    <div style={styles.page} className="fade-up">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📊 Security Analytics</h2>
          <p style={styles.sub}>Real-time threat intelligence · Risk scoring · Audit trail</p>
        </div>
        <div style={styles.scoreBadge}>
          <div style={styles.scoreRing}>
            <span style={styles.scoreNum}>{overallScore}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>SECURITY SCORE</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-green)" }}>Excellent</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {["overview","events","threats"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}>
            {t === "overview" ? "📈 Overview" : t === "events" ? "📋 Event Log" : "🚨 Threat History"}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div>
          {/* Top metrics */}
          <div style={styles.metricsGrid}>
            {[
              { label: "Files Encrypted This Month",  value: "284",  icon: "🔐", color: "var(--accent-cyan)"   },
              { label: "Threats Blocked",             value: "47",   icon: "🛡️", color: "var(--accent-red)"    },
              { label: "Avg Encryption Time",         value: "0.4s", icon: "⚡", color: "var(--accent-green)"  },
              { label: "Data Protected",              value: "12 GB",icon: "💾", color: "var(--accent-amber)"  },
            ].map((m, i) => (
              <div key={i} style={styles.metricCard}>
                <div style={{ fontSize: 24 }}>{m.icon}</div>
                <div style={{ ...styles.metricValue, color: m.color }}>{m.value}</div>
                <div style={styles.metricLabel}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Score breakdown */}
          <div style={styles.scoreSection}>
            <h3 style={styles.sectionTitle}>Score Breakdown</h3>
            <div style={styles.scoreList}>
              {SCORE_BREAKDOWN.map((s, i) => (
                <div key={i} style={styles.scoreRow}>
                  <span style={{ fontSize: 14 }}>{s.icon}</span>
                  <span style={styles.scoreLabel}>{s.label}</span>
                  <div style={styles.scoreBarWrap}>
                    <div style={styles.scoreTrack}>
                      <div style={{ width: `${(s.score/s.max)*100}%`, height: "100%", background: s.color, borderRadius: 2, transition: "width 1s ease" }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.color, width: 32, textAlign: "right" }}>{s.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Event Log ── */}
      {tab === "events" && (
        <div style={styles.eventList}>
          {RECENT_EVENTS.map((e, i) => {
            const cfg = EVENT_COLORS[e.type] || { color: "var(--text-secondary)", icon: "•" };
            return (
              <div key={i} style={styles.eventRow}>
                <div style={{ ...styles.eventDot, background: cfg.color }} />
                <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={styles.eventText}>{e.event}</div>
                  <div style={styles.eventTime}>{e.time}</div>
                </div>
                <span className={`badge ${e.risk === "SAFE" ? "badge-green" : e.risk === "HIGH" ? "badge-red" : e.risk === "MEDIUM" ? "badge-amber" : "badge-cyan"}`}>
                  {e.risk}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Threat History ── */}
      {tab === "threats" && (
        <div>
          <div style={styles.chartCard}>
            <h3 style={styles.sectionTitle}>Threats Detected & Blocked (Last 6 Months)</h3>
            <div style={styles.chart}>
              {THREAT_HISTORY.map((t, i) => (
                <div key={i} style={styles.chartCol}>
                  <div style={styles.chartBars}>
                    <div style={{
                      width: 20, borderRadius: "3px 3px 0 0",
                      height: `${(t.threats / maxThreats) * 140}px`,
                      background: "rgba(255,59,107,0.3)",
                      border: "1px solid rgba(255,59,107,0.5)",
                      display: "flex", alignItems: "flex-start", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 9, color: "var(--accent-red)", marginTop: 3 }}>{t.threats}</span>
                    </div>
                    <div style={{
                      width: 20, borderRadius: "3px 3px 0 0",
                      height: `${(t.blocked / maxThreats) * 140}px`,
                      background: "rgba(0,255,136,0.3)",
                      border: "1px solid rgba(0,255,136,0.5)",
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>{t.month}</span>
                </div>
              ))}
            </div>
            <div style={styles.legend}>
              <div style={styles.legendItem}><div style={{ width: 12, height: 12, background: "rgba(255,59,107,0.4)", borderRadius: 2 }} /><span>Detected</span></div>
              <div style={styles.legendItem}><div style={{ width: 12, height: 12, background: "rgba(0,255,136,0.4)", borderRadius: 2 }} /><span>Blocked</span></div>
            </div>
          </div>

          <div style={styles.threatSummary}>
            <div style={styles.threatStat}>
              <span style={{ fontSize: 28, fontFamily: "Syne", fontWeight: 800, color: "var(--accent-red)" }}>34</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Total Threats</span>
            </div>
            <div style={styles.threatStat}>
              <span style={{ fontSize: 28, fontFamily: "Syne", fontWeight: 800, color: "var(--accent-green)" }}>33</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Auto-Blocked</span>
            </div>
            <div style={styles.threatStat}>
              <span style={{ fontSize: 28, fontFamily: "Syne", fontWeight: 800, color: "var(--accent-cyan)" }}>97%</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Block Rate</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page:   { maxWidth: 900 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title:  { fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 4 },
  sub:    { fontSize: 12, color: "var(--text-muted)" },
  scoreBadge: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-bright)", borderRadius: "var(--radius-lg)" },
  scoreRing: {
    width: 52, height: 52, borderRadius: "50%",
    background: "conic-gradient(var(--accent-green) 0% 94%, var(--border) 94%)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  scoreNum: { fontSize: 15, fontWeight: 800, fontFamily: "Syne, sans-serif", color: "var(--accent-green)" },
  tabs:     { display: "flex", gap: 8, marginBottom: 20 },
  tab:      { padding: "8px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, fontFamily: "DM Mono, monospace" },
  tabActive: { borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)", background: "rgba(0,229,255,0.06)" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 },
  metricCard: { padding: 16, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", textAlign: "center" },
  metricValue: { fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800 },
  metricLabel: { fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3 },
  scoreSection: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 },
  sectionTitle: { fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 16 },
  scoreList: { display: "flex", flexDirection: "column", gap: 12 },
  scoreRow:  { display: "flex", alignItems: "center", gap: 10 },
  scoreLabel: { fontSize: 12, color: "var(--text-secondary)", width: 180, flexShrink: 0 },
  scoreBarWrap: { flex: 1 },
  scoreTrack: { height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" },
  eventList: { display: "flex", flexDirection: "column", gap: 2 },
  eventRow:  { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", marginBottom: 6 },
  eventDot:  { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  eventText: { fontSize: 12, fontWeight: 500 },
  eventTime: { fontSize: 10, color: "var(--text-muted)", marginTop: 2 },
  chartCard: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 16 },
  chart:     { display: "flex", gap: 20, alignItems: "flex-end", height: 160, paddingBottom: 20, borderBottom: "1px solid var(--border)", marginTop: 16 },
  chartCol:  { display: "flex", flexDirection: "column", alignItems: "center", flex: 1 },
  chartBars: { display: "flex", gap: 4, alignItems: "flex-end" },
  legend:    { display: "flex", gap: 16, marginTop: 12 },
  legendItem:{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" },
  threatSummary: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  threatStat: { padding: 20, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: 4, alignItems: "center" },
};