const STATS = [
  { label: "Files Encrypted", value: "1,284", delta: "+12 today",    color: "var(--accent-cyan)",   icon: "🔐" },
  { label: "Threats Blocked", value: "47",    delta: "+3 this week", color: "var(--accent-red)",    icon: "🛡️" },
  { label: "Blockchain Keys", value: "8",     delta: "Active",       color: "var(--accent-violet)", icon: "⛓️" },
  { label: "ZK Links Active", value: "3",     delta: "Expires soon", color: "var(--accent-amber)",  icon: "🔗" },
];

export default function StatsBar() {
  return (
    <div style={styles.bar}>
      {STATS.map((s, i) => (
        <div key={i} style={styles.card} className={`fade-up-${i + 1}`}>
          <div style={styles.top}>
            <span style={styles.icon}>{s.icon}</span>
            <span style={{ ...styles.value, color: s.color }}>{s.value}</span>
          </div>
          <div style={styles.label}>{s.label}</div>
          <div style={{ ...styles.delta, color: s.color }}>{s.delta}</div>
          <div style={{ ...styles.glow, background: s.color }} />
        </div>
      ))}
    </div>
  );
}

const styles = {
  bar: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    padding: "24px 40px 0",
  },
  card: {
    padding: "20px 22px",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    position: "relative",
    overflow: "hidden",
    boxShadow: "var(--shadow-md)",
    transition: "border-color 0.2s, transform 0.2s",
    cursor: "default",
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  icon:  { fontSize: 22 },
  value: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  label: {
    fontSize: 13,
    color: "var(--text-secondary)",
    marginBottom: 4,
    letterSpacing: "0.03em",
    fontWeight: 600,
  },
  delta: { fontSize: 12, fontWeight: 600 },
  glow: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 2,
    opacity: 0.45,
  },
};
