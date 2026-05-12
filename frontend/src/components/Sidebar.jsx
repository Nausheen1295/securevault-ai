import { useEffect, useState } from "react";
import {
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  isEnrolled,
  enrollBiometric,
  unenrollBiometric,
} from "../utils/webauthn";

const NAV = [
  { id: "encrypt",    icon: "🔐", label: "Encrypt / Decrypt", sub: "AES-256-GCM" },
  { id: "ai",         icon: "🤖", label: "AI Threat Scanner", sub: "VirusTotal Engine" },
  { id: "blockchain", icon: "⛓️",  label: "Blockchain Vault",  sub: "Key Storage" },
  { id: "share",      icon: "🔗", label: "Zero-K Share",      sub: "ZK Encryption" },
  { id: "analytics",  icon: "📊", label: "Security Analytics",sub: "Risk Dashboard" },
];

export default function Sidebar({ active, onChange, user, onLogout, onOpenProfile, theme, onToggleTheme }) {
  const [bioAvailable, setBioAvailable] = useState(false);
  const [enrolled,     setEnrolled]     = useState(false);
  const [working,      setWorking]      = useState(false);
  const [bioMsg,       setBioMsg]       = useState("");

  useEffect(() => {
    if (!isBiometricSupported()) { setBioAvailable(false); return; }
    isPlatformAuthenticatorAvailable().then(setBioAvailable);
  }, []);

  useEffect(() => {
    setEnrolled(user?.email ? isEnrolled(user.email) : false);
  }, [user?.email]);

  const handleEnroll = async () => {
    if (!user?.email) return;
    setBioMsg(""); setWorking(true);
    try {
      await enrollBiometric(user.email);
      setEnrolled(true);
      setBioMsg("✅ Biometric enabled for this device.");
    } catch (err) {
      setBioMsg(`❌ ${err.message || "Could not enroll."}`);
    } finally {
      setWorking(false);
    }
  };

  const handleUnenroll = () => {
    unenrollBiometric(user.email);
    setEnrolled(false);
    setBioMsg("Biometric disabled.");
  };

  return (
    <aside style={styles.sidebar}>
      {/* Brand */}
      <div style={styles.brand}>
        <div style={styles.brandIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <div style={styles.brandName}>
            SecureVault <span style={{ color: "var(--accent-cyan)" }}>AI</span>
          </div>
          <div style={styles.brandSub}>Next-Gen Cloud Security</div>
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
          <span style={styles.statusLabel}>THREAT LEVEL</span>
          <span className="badge badge-green">LOW</span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: "18%", background: "var(--accent-green)" }} />
        </div>
        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>SECURITY SCORE</span>
          <span style={styles.scoreNum}>94/100</span>
        </div>
      </div>

      {/* Biometric enrollment */}
      {bioAvailable && (
        <div style={styles.bioBox}>
          <div style={styles.bioBoxHeader}>
            <span style={styles.statusLabel}>BIOMETRIC LOGIN</span>
            <span className={`badge ${enrolled ? "badge-green" : "badge-amber"}`}>
              {enrolled ? "Enabled" : "Off"}
            </span>
          </div>
          {enrolled
            ? <button onClick={handleUnenroll} style={styles.bioBtnGhost}>Disable biometric</button>
            : <button onClick={handleEnroll} disabled={working} style={styles.bioBtnCyan}>
                {working ? "Awaiting device…" : "👆 Enable biometric"}
              </button>
          }
          {bioMsg && <div style={styles.bioMsg}>{bioMsg}</div>}
        </div>
      )}

      {/* Theme toggle */}
      <button className="theme-toggle" onClick={onToggleTheme}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
        <span className="toggle-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
      </button>

      {/* User box — click to open Profile */}
      <button onClick={onOpenProfile}
        style={{ ...styles.userBox, ...(active === "profile" ? styles.userBoxActive : {}) }}
        title="Open profile">
        <div style={styles.avatar}>{user?.name?.[0]?.toUpperCase() ?? "U"}</div>
        <div style={{ flex: 1, overflow: "hidden", textAlign: "left" }}>
          <div style={styles.userName}>{user?.name ?? "User"}</div>
          <div style={styles.userEmail}>{user?.email ?? ""}</div>
        </div>
        <span style={styles.userChevron}>›</span>
      </button>

      {/* Log out — clearly visible, hover shows tooltip */}
      <button onClick={onLogout} style={styles.signOutBtn} title="Log out">
        <span style={{ fontSize: 16 }}>⎋</span>
        Log Out
      </button>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 288,
    background: "var(--bg-secondary)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    flexShrink: 0,
    gap: 4,
  },
  brand: {
    display: "flex", alignItems: "center", gap: 14,
    marginBottom: 28, paddingLeft: 6,
  },
  brandIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(167,139,250,0.18))",
    border: "1px solid rgba(34,211,238,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  brandName: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 19, fontWeight: 700,
    color: "var(--text-primary)", letterSpacing: "-0.02em",
  },
  brandSub: {
    fontSize: 12, color: "var(--text-muted)",
    letterSpacing: "0.06em", fontWeight: 500, marginTop: 2,
  },
  nav: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  navSection: {
    fontSize: 11, letterSpacing: "0.12em",
    color: "var(--text-muted)", padding: "0 12px 10px",
    fontWeight: 700,
  },
  navItem: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "12px 14px", borderRadius: "var(--radius-md)",
    border: "1px solid transparent", background: "transparent",
    cursor: "pointer", width: "100%", textAlign: "left",
    position: "relative", transition: "background 0.15s, border-color 0.15s",
    color: "var(--text-secondary)",
  },
  navActive: {
    background: "rgba(34,211,238,0.08)",
    borderColor: "rgba(34,211,238,0.25)",
  },
  navIcon:   { fontSize: 20, flexShrink: 0, lineHeight: 1 },
  navLabels: { display: "flex", flexDirection: "column", gap: 2 },
  navLabel:  { fontSize: 14, color: "var(--text-primary)", fontWeight: 600 },
  navSub:    { fontSize: 12, color: "var(--text-muted)", fontWeight: 500 },
  activeDot: {
    position: "absolute", right: 12,
    width: 7, height: 7, borderRadius: "50%",
    background: "var(--accent-cyan)",
    boxShadow: "0 0 8px var(--accent-cyan)",
  },
  statusBox: {
    margin: "10px 0 8px",
    padding: 16,
    background: "var(--bg-card)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
    display: "flex", flexDirection: "column", gap: 10,
  },
  statusRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statusLabel: {
    fontSize: 11, color: "var(--text-secondary)",
    fontWeight: 700, letterSpacing: "0.06em",
  },
  scoreNum: {
    color: "var(--accent-cyan)", fontSize: 14, fontWeight: 700,
    fontFamily: "JetBrains Mono, monospace",
  },
  progressTrack: { height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 3 },

  bioBox: {
    margin: "0 0 8px",
    padding: 14,
    background: "var(--bg-card)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
    display: "flex", flexDirection: "column", gap: 10,
  },
  bioBoxHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  bioBtnCyan: {
    padding: "9px 12px", borderRadius: 8,
    background: "rgba(34,211,238,0.10)",
    border: "1.5px solid var(--accent-cyan)",
    color: "var(--accent-cyan)",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  },
  bioBtnGhost: {
    padding: "9px 12px", borderRadius: 8,
    background: "transparent",
    border: "1.5px solid var(--border-bright)",
    color: "var(--text-secondary)",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  },
  bioMsg: { fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 },

  userBox: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px",
    background: "var(--bg-card)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
    marginTop: 8,
    cursor: "pointer",
    width: "100%",
    transition: "border-color 0.15s, background 0.15s",
  },
  userBoxActive: {
    borderColor: "var(--accent-cyan)",
    background: "rgba(34,211,238,0.06)",
  },
  userChevron: {
    fontSize: 20, color: "var(--text-secondary)",
    flexShrink: 0, paddingRight: 4,
  },
  avatar: {
    width: 38, height: 38, borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 15, fontWeight: 700, color: "white", flexShrink: 0,
  },
  userName: {
    fontSize: 14, color: "var(--text-primary)", fontWeight: 600,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  userEmail: {
    fontSize: 12, color: "var(--text-muted)",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    marginTop: 1,
  },

  signOutBtn: {
    marginTop: 8,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    padding: "12px",
    background: "rgba(248,113,113,0.10)",
    border: "1.5px solid rgba(248,113,113,0.35)",
    borderRadius: "var(--radius-md)",
    color: "var(--accent-red)",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    transition: "background 0.15s, transform 0.1s",
  },
};
