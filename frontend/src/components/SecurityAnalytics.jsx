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
  const [monthRange, setMonthRange] = useState(6);
  const overallScore = Math.round(SCORE_BREAKDOWN.reduce((s, i) => s + i.score, 0) / SCORE_BREAKDOWN.length);

  const visibleHistory = THREAT_HISTORY.slice(-monthRange);
  const sliderFill = (val, min, max) => {
    const pct = ((val - min) / (max - min)) * 100;
    return `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`;
  };

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
            <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.04em" }}>SECURITY SCORE</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-green)", marginTop: 2 }}>Excellent</div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 24, flexWrap: "wrap" }}>
              <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                Threats Detected & Blocked (Last {monthRange} Month{monthRange === 1 ? "" : "s"})
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 240 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Range</span>
                <input className="slider" type="range" min={1} max={6} value={monthRange}
                  style={{ background: sliderFill(monthRange, 1, 6), flex: 1 }}
                  onChange={e => setMonthRange(+e.target.value)} />
                <span className="slider-value" style={{ minWidth: 64 }}>{monthRange}mo</span>
              </div>
            </div>
            <div style={styles.chart}>
              {visibleHistory.map((t, i) => (
                <div key={i} style={styles.chartCol}>
                  <div style={styles.chartBars}>
                    <div style={{
                      width: 20, borderRadius: "3px 3px 0 0",
                      height: `${(t.threats / maxThreats) * 140}px`,
                      background: "rgba(255,59,107,0.3)",
                      border: "1px solid rgba(255,59,107,0.5)",
                      display: "flex", alignItems: "flex-start", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 11, color: "var(--accent-red)", marginTop: 4, fontWeight: 600 }}>{t.threats}</span>
                    </div>
                    <div style={{
                      width: 20, borderRadius: "3px 3px 0 0",
                      height: `${(t.blocked / maxThreats) * 140}px`,
                      background: "rgba(0,255,136,0.3)",
                      border: "1px solid rgba(0,255,136,0.5)",
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8, fontWeight: 600 }}>{t.month}</span>
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
              <span style={{ fontSize: 32, fontFamily: "Space Grotesk", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--accent-red)" }}>34</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Total Threats</span>
            </div>
            <div style={styles.threatStat}>
              <span style={{ fontSize: 32, fontFamily: "Space Grotesk", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--accent-green)" }}>33</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Auto-Blocked</span>
            </div>
            <div style={styles.threatStat}>
              <span style={{ fontSize: 32, fontFamily: "Space Grotesk", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--accent-cyan)" }}>97%</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Block Rate</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page:   { maxWidth: 1100 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  title:  { fontFamily: "Space Grotesk, sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 },
  sub:    { fontSize: 14, color: "var(--text-secondary)" },
  scoreBadge: { display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: "var(--bg-card)", border: "1px solid var(--border-bright)", borderRadius: "var(--radius-lg)" },
  scoreRing: {
    width: 60, height: 60, borderRadius: "50%",
    background: "conic-gradient(var(--accent-green) 0% 94%, var(--border) 94%)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  scoreNum: { fontSize: 17, fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", color: "var(--accent-green)" },
  tabs:     { display: "flex", gap: 10, marginBottom: 24 },
  tab:      { padding: "11px 20px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border-bright)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14, fontFamily: "Inter, sans-serif", fontWeight: 600 },
  tabActive: { borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)", background: "rgba(34,211,238,0.10)" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 },
  metricCard: { padding: 22, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", textAlign: "center" },
  metricValue: { fontFamily: "Space Grotesk, sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" },
  metricLabel: { fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4, fontWeight: 500 },
  scoreSection: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 24 },
  sectionTitle: { fontFamily: "Space Grotesk, sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 18 },
  scoreList: { display: "flex", flexDirection: "column", gap: 14 },
  scoreRow:  { display: "flex", alignItems: "center", gap: 12 },
  scoreLabel: { fontSize: 14, color: "var(--text-primary)", width: 200, flexShrink: 0, fontWeight: 500 },
  scoreBarWrap: { flex: 1 },
  scoreTrack: { height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" },
  eventList: { display: "flex", flexDirection: "column", gap: 4 },
  eventRow:  { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", marginBottom: 8 },
  eventDot:  { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  eventText: { fontSize: 14, fontWeight: 500 },
  eventTime: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  chartCard: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 24, marginBottom: 18 },
  chart:     { display: "flex", gap: 24, alignItems: "flex-end", height: 180, paddingBottom: 22, borderBottom: "1px solid var(--border)", marginTop: 18 },
  chartCol:  { display: "flex", flexDirection: "column", alignItems: "center", flex: 1 },
  chartBars: { display: "flex", gap: 5, alignItems: "flex-end" },
  legend:    { display: "flex", gap: 20, marginTop: 14 },
  legendItem:{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" },
  threatSummary: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  threatStat: { padding: 24, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" },
};