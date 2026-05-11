import { useState, useRef } from "react";

const DEMO_USER = { name: "Karthikeyan", email: "user@securevault.ai" };

export default function Login({ onLogin }) {
  const [mode, setMode]         = useState("password"); // password | biometric | creating
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [bioStep, setBioStep]   = useState("idle"); // idle | scanning | success | failed
  const videoRef                = useRef(null);

  /* ── Password Login ── */
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    await new Promise(r => setTimeout(r, 900));
    if (email && password.length >= 6) {
      onLogin(DEMO_USER);
    } else {
      setError("Invalid credentials. Try any email + 6+ char password.");
    }
    setLoading(false);
  };

  /* ── WebAuthn Fingerprint ── */
  const handleFingerprint = async () => {
    setError("");
    if (!window.PublicKeyCredential) {
      setError("WebAuthn not supported in this browser.");
      return;
    }
    setBioStep("scanning");
    try {
      // Create a credential (registration/auth)
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "SecureVault AI", id: window.location.hostname },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: "user@securevault.ai",
            displayName: "SecureVault User",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 30000,
        },
      });
      if (credential) {
        setBioStep("success");
        setTimeout(() => onLogin(DEMO_USER), 800);
      }
    } catch (err) {
      // Demo fallback — in real app this would fail gracefully
      setBioStep("success");
      setTimeout(() => onLogin(DEMO_USER), 800);
    }
  };

  /* ── Face ID (camera scan) ── */
  const handleFaceID = async () => {
    setBioStep("scanning");
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      // Simulate face scan for 2.5s
      await new Promise(r => setTimeout(r, 2500));
      stream.getTracks().forEach(t => t.stop());
      setBioStep("success");
      setTimeout(() => onLogin(DEMO_USER), 600);
    } catch {
      setBioStep("failed");
      setError("Camera access denied. Use password instead.");
    }
  };

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.grid} />
      {/* Glow orbs */}
      <div style={{ ...styles.orb, top: "10%", left: "15%", background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)" }} />
      <div style={{ ...styles.orb, bottom: "15%", right: "10%", background: "radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)" }} />

      <div style={styles.card} className="fade-up">
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <div style={styles.logoName}>SecureVault <span style={{ color: "var(--accent-cyan)" }}>AI</span></div>
            <div style={styles.logoSub}>Next-Gen Cloud Security</div>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Mode tabs */}
        <div style={styles.tabs}>
          {["password", "biometric"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setBioStep("idle"); }}
              style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}>
              {m === "password" ? "🔑 Password" : "🔐 Biometric"}
            </button>
          ))}
        </div>

        {/* ── Password Form ── */}
        {mode === "password" && (
          <form onSubmit={handlePasswordLogin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>EMAIL</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>MASTER PASSWORD</label>
              <input className="input" type="password" placeholder="••••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
              {loading ? <span style={styles.spinner} /> : null}
              {loading ? "Authenticating..." : "Sign In →"}
            </button>
          </form>
        )}

        {/* ── Biometric Panel ── */}
        {mode === "biometric" && (
          <div style={styles.bioPanel}>
            {bioStep === "idle" && (
              <>
                <p style={styles.bioHint}>Choose your biometric method</p>
                <div style={styles.bioButtons}>
                  <button className="btn btn-cyan" onClick={handleFingerprint} style={{ flex: 1, justifyContent: "center" }}>
                    👆 Fingerprint
                  </button>
                  <button className="btn btn-ghost" onClick={handleFaceID} style={{ flex: 1, justifyContent: "center" }}>
                    📷 Face ID
                  </button>
                </div>
                {/* Camera preview hidden until face scan */}
                <video ref={videoRef} autoPlay muted style={{ display: "none" }} />
              </>
            )}
            {bioStep === "scanning" && (
              <div style={styles.scanBox}>
                <div style={styles.scanRing}>
                  <div style={styles.scanLine} />
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" opacity="0.6">
                    <path d="M12 2a10 10 0 1 0 10 10"/>
                  </svg>
                </div>
                <p style={{ color: "var(--accent-cyan)", fontSize: 13, marginTop: 12 }}>Scanning biometric...</p>
                <video ref={videoRef} autoPlay muted style={{ width: 120, height: 90, borderRadius: 8, marginTop: 10, objectFit: "cover", border: "1px solid var(--border)" }} />
              </div>
            )}
            {bioStep === "success" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <p style={{ color: "var(--accent-green)", marginTop: 8 }}>Identity Verified</p>
              </div>
            )}
            {bioStep === "failed" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>❌</div>
                <p style={{ color: "var(--accent-red)", marginTop: 8 }}>{error}</p>
                <button className="btn btn-ghost" onClick={() => { setBioStep("idle"); setError(""); }}
                  style={{ marginTop: 12 }}>Try Again</button>
              </div>
            )}
            {error && bioStep === "idle" && <div style={styles.error}>{error}</div>}
          </div>
        )}

        <div style={styles.footer}>
          Zero-knowledge encryption · Your keys never leave your device
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-primary)",
    position: "relative",
    overflow: "hidden",
  },
  grid: {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    opacity: 0.3,
  },
  orb: { position: "absolute", width: 400, height: 400, borderRadius: "50%", pointerEvents: "none" },
  card: {
    position: "relative",
    width: 420,
    background: "var(--bg-card)",
    border: "1px solid var(--border-bright)",
    borderRadius: "var(--radius-xl)",
    padding: "32px",
    boxShadow: "0 0 80px rgba(0,0,0,0.5), 0 0 1px rgba(0,229,255,0.1)",
  },
  logo: { display: "flex", alignItems: "center", gap: 14, marginBottom: 20 },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: "linear-gradient(135deg, rgba(0,229,255,0.1), rgba(124,58,237,0.1))",
    border: "1px solid rgba(0,229,255,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoName: { fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, color: "var(--text-primary)" },
  logoSub: { fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em" },
  divider: { height: 1, background: "var(--border)", marginBottom: 20 },
  tabs: { display: "flex", gap: 8, marginBottom: 24 },
  tab: {
    flex: 1, padding: "8px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)", background: "transparent",
    color: "var(--text-secondary)", cursor: "pointer", fontSize: 12,
    fontFamily: "DM Mono, monospace", transition: "all 0.2s",
  },
  tabActive: {
    borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)",
    background: "rgba(0,229,255,0.06)",
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 600 },
  error: {
    padding: "8px 12px", borderRadius: "var(--radius-sm)",
    background: "rgba(255,59,107,0.08)", border: "1px solid rgba(255,59,107,0.2)",
    color: "var(--accent-red)", fontSize: 12,
  },
  spinner: {
    width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)",
    borderTopColor: "white", borderRadius: "50%",
    display: "inline-block", animation: "spin 0.7s linear infinite",
  },
  bioPanel: { display: "flex", flexDirection: "column", gap: 16, alignItems: "center" },
  bioHint: { color: "var(--text-secondary)", fontSize: 13, textAlign: "center" },
  bioButtons: { display: "flex", gap: 10, width: "100%" },
  scanBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" },
  scanRing: {
    width: 90, height: 90, borderRadius: "50%",
    border: "2px solid rgba(0,229,255,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", overflow: "hidden",
    animation: "pulse-glow 1.5s ease-in-out infinite",
  },
  scanLine: {
    position: "absolute", left: 0, right: 0, height: 2,
    background: "linear-gradient(90deg, transparent, var(--accent-cyan), transparent)",
    animation: "scan 1.5s linear infinite",
  },
  footer: {
    textAlign: "center", fontSize: 10, color: "var(--text-muted)",
    marginTop: 24, letterSpacing: "0.05em",
  },
};