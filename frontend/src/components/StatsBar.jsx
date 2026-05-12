import { useUserStats } from "../utils/userStats";

const CARDS = [
  {
    key:   "filesEncrypted",
    label: "Files Encrypted",
    icon:  "🔐",
    color: "var(--accent-cyan)",
    explain: "Number of files you've encrypted with SecureVault. Each call to the Encrypt feature increments this.",
  },
  {
    key:   "threatsBlocked",
    label: "Threats Blocked",
    icon:  "🛡️",
    color: "var(--accent-red)",
    explain: "Files the AI Threat Scanner flagged as MEDIUM or HIGH risk. Run a scan in the AI Threat Scanner tab to add to this.",
  },
  {
    key:   "blockchainKeys",
    label: "Blockchain Keys",
    icon:  "⛓️",
    color: "var(--accent-violet)",
    explain: "Encryption-key hashes you've stored on the blockchain. Use the Blockchain Vault tab to store one.",
  },
  {
    key:   "zkLinks",
    label: "ZK Links Created",
    icon:  "🔗",
    color: "var(--accent-amber)",
    explain: "Zero-Knowledge share links you've generated. Use the Zero-K Share tab to create one.",
  },
];

function formatDelta(card, stats) {
  if (stats.isDemo) return "Demo value";
  const v = stats[card.key] || 0;
  if (v === 0) return `Try the ${card.label.split(" ")[0]} tab`;
  switch (card.key) {
    case "filesEncrypted": return v === 1 ? "First file ✨" : `${v} total`;
    case "threatsBlocked": return v === 1 ? "1 flagged"   : `${v} flagged`;
    case "blockchainKeys": return v === 1 ? "1 active"    : `${v} active`;
    case "zkLinks":        return v === 1 ? "1 created"   : `${v} created`;
    default: return "";
  }
}

export default function StatsBar({ user }) {
  const { stats } = useUserStats(user);
  const isDemo = !!stats.isDemo;

  return (
    <div style={styles.wrap}>
      {isDemo && (
        <div style={styles.demoBanner}
          title="You're in guest preview mode. Sign up for a real account to see your own numbers.">
          <span style={styles.demoBadge}>DEMO</span>
          These are example numbers — they don't reflect anything you do in guest mode.
          Each card below explains what it would track for a real account.
        </div>
      )}
      <div style={styles.bar}>
        {CARDS.map((c, i) => {
          const value = stats[c.key] ?? 0;
          return (
            <div key={c.key} style={styles.card} className={`fade-up-${i + 1}`}
              title={c.explain}>
              <div style={styles.top}>
                <span style={styles.icon}>{c.icon}</span>
                {isDemo && <span style={styles.cardDemoPill}>DEMO</span>}
                <span style={{ ...styles.value, color: c.color }}>
                  {value.toLocaleString()}
                </span>
              </div>
              <div style={styles.label}>{c.label}</div>
              <div style={{ ...styles.delta, color: c.color }}>{formatDelta(c, stats)}</div>
              <div style={{ ...styles.glow, background: c.color }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 14, padding: "24px 40px 0" },

  demoBanner: {
    padding: "12px 16px",
    background: "rgba(251,191,36,0.08)",
    border: "1px solid rgba(251,191,36,0.30)",
    borderRadius: "var(--radius-md)",
    fontSize: 13, color: "var(--text-primary)",
    display: "flex", gap: 12, alignItems: "center",
    cursor: "help",
  },
  demoBadge: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
    color: "var(--accent-amber)",
    background: "rgba(251,191,36,0.18)",
    border: "1px solid rgba(251,191,36,0.40)",
    padding: "3px 10px", borderRadius: 100,
    flexShrink: 0,
  },

  bar: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  card: {
    padding: "20px 22px",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    position: "relative",
    overflow: "hidden",
    boxShadow: "var(--card-shadow)",
    cursor: "help",
  },
  top: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 },
  icon: { fontSize: 22 },
  value: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em",
    marginLeft: "auto",
  },
  cardDemoPill: {
    fontSize: 9, fontWeight: 700,
    color: "var(--accent-amber)",
    background: "rgba(251,191,36,0.14)",
    border: "1px solid rgba(251,191,36,0.40)",
    padding: "1px 6px", borderRadius: 100,
    letterSpacing: "0.06em",
  },
  label: {
    fontSize: 13, color: "var(--text-secondary)",
    marginBottom: 4, letterSpacing: "0.03em", fontWeight: 600,
  },
  delta: { fontSize: 12, fontWeight: 600 },
  glow: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: 2, opacity: 0.45,
  },
};
