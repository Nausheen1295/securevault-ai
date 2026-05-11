const NAV = [
  { id: "encrypt",    icon: "🔐", label: "Encrypt / Decrypt", sub: "AES-256-GCM" },
  { id: "ai",         icon: "🤖", label: "AI Threat Scanner",  sub: "TensorFlow.js" },
  { id: "blockchain", icon: "⛓️",  label: "Blockchain Vault",   sub: "Key Storage" },
  { id: "share",      icon: "🔗", label: "Zero-K Share",       sub: "ZK Encryption" },
  { id: "analytics",  icon: "📊", label: "Security Analytics", sub: "Risk Dashboard" },
];

export default function Sidebar({ active, onChange, user, onLogout }) {
  return (
    <aside style={styles.sidebar}>
      {/* Brand */}
      <div style={styles.brand}>
        <div style={styles.brandIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div style={styles.brandText}>
          <span style={styles.brandName}>SecureVault</span>
          <span style={{ color: "var(--accent-cyan)" }}> AI</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        <div style={styles.navSection}>FEATURES</div>
        {NAV.map(item => (
          <button key={item.id} onClick={() => onChange(item.id)}
            style={{ ...styles.navItem, ...(active === item.id ? styles.navActive : {}) }}>
            <span style={styles.navIcon}>{item.icon}</span>
            <div style={styles.navLabels}>
              <span style={styles.navLabel}>{item.label}</span>
              <span style={styles.navSub}>{item.sub}</span>
            </div>
            {active === item.id && <div style={styles.activeDot} />}
          </button>
        ))}
      </nav>

      {/* Security status */}
      <div style={styles.statusBox}>
        <div style={styles.statusRow}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>THREAT LEVEL</span>
          <span className="badge badge-green">LOW</span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: "18%", background: "var(--accent-green)" }} />
        </div>
        <div style={styles.statusRow}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>SECURITY SCORE</span>
          <span style={{ color: "var(--accent-cyan)", fontSize: 12, fontWeight: 700 }}>94/100</span>
        </div>
      </div>

      {/* User */}
      <div style={styles.userBox}>
        <div style={styles.avatar}>{user?.name?.[0] ?? "U"}</div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={styles.userName}>{user?.name ?? "User"}</div>
          <div style={styles.userEmail}>{user?.email ?? ""}</div>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn} title="Logout">↩</button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 240,
    background: "var(--bg-secondary)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    padding: "20px 12px",
    flexShrink: 0,
  },
  brand: { 
    display: "flex", 
    alignItems: "center", 
    gap: 10, 
    marginBottom: 28, 
    paddingLeft: 6 
  },
  brandIcon: {
    width: 34, height: 34, borderRadius: 9,
    background: "linear-gradient(135deg, rgba(0,229,255,0.1), rgba(124,58,237,0.15))",
    border: "1px solid rgba(0,229,255,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  brandText: { 
    fontFamily: "Syne, sans-serif", 
    fontSize: 16, 
    fontWeight: 800, 
    color: "var(--text-primary)" 
  },
  brandName: { color: "var(--text-primary)" },
  nav: { 
    flex: 1, 
    display: "flex", 
    flexDirection: "column", 
    gap: 2 
  },
  navSection: { 
    fontSize: 9, 
    letterSpacing: "0.12em", 
    color: "var(--text-muted)", 
    padding: "0 10px 8px", 
    fontWeight: 600 
  },
  navItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 10px", borderRadius: "var(--radius-md)",
    border: "none", background: "transparent",
    cursor: "pointer", width: "100%", textAlign: "left",
    position: "relative", transition: "background 0.15s",
  },
  navActive: { 
    background: "rgba(0,229,255,0.06)", 
    border: "1px solid rgba(0,229,255,0.1)" 
  },
  navIcon: { fontSize: 16, flexShrink: 0 },
  navLabels: { display: "flex", flexDirection: "column", gap: 1 },
  navLabel: { fontSize: 12, color: "var(--text-primary)", fontWeight: 500 },
  navSub:   { fontSize: 10, color: "var(--text-muted)" },
  activeDot: {
    position: "absolute", right: 10,
    width: 6, height: 6, borderRadius: "50%",
    background: "var(--accent-cyan)",
    boxShadow: "0 0 6px var(--accent-cyan)",
  },
  statusBox: {
    margin: "16px 0",
    padding: 12,
    background: "var(--bg-card)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
    display: "flex", flexDirection: "column", gap: 8,
  },
  statusRow: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  progressTrack: { 
    height: 3, 
    background: "var(--border)", 
    borderRadius: 2, 
    overflow: "hidden" 
  },
  progressFill: { height: "100%", borderRadius: 2 },
  userBox: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 8px",
    background: "var(--bg-card)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
  },
  avatar: {
    width: 30, height: 30, borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0,
  },
  userName: { 
    fontSize: 12, 
    color: "var(--text-primary)", 
    fontWeight: 600, 
    whiteSpace: "nowrap", 
    overflow: "hidden", 
    textOverflow: "ellipsis" 
  },
  userEmail: { 
    fontSize: 10, 
    color: "var(--text-muted)", 
    whiteSpace: "nowrap", 
    overflow: "hidden", 
    textOverflow: "ellipsis" 
  },
  logoutBtn: { 
    background: "none", 
    border: "none", 
    color: "var(--text-muted)", 
    cursor: "pointer", 
    fontSize: 16, 
    flexShrink: 0 
  },
};