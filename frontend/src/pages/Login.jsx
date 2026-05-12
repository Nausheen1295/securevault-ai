import { useState, useEffect, useRef } from "react";
import { loginUser, registerUser, logoutUser, isFirebaseConfigured } from "../utils/firebase";
import { checkPwnedPassword } from "../utils/hibp";
import { generatePassword } from "../utils/crypto";
import { generateOtp, sendOtpEmail, isEmailJsConfigured } from "../utils/otp";
import {
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  isEnrolled,
  verifyBiometric,
} from "../utils/webauthn";

const AUTH_ERROR_MESSAGES = {
  "auth/invalid-email":           "That doesn't look like a valid email address.",
  "auth/user-not-found":          "No account exists for that email. Create one below.",
  "auth/wrong-password":          "Incorrect password. Please try again.",
  "auth/invalid-credential":      "Email or password is incorrect.",
  "auth/email-already-in-use":    "An account already exists with this email. Sign in instead.",
  "auth/weak-password":           "Password must be at least 6 characters long.",
  "auth/too-many-requests":       "Too many failed attempts. Wait a minute and try again.",
  "auth/network-request-failed":  "Network error. Check your connection.",
  "auth/operation-not-allowed":   "Email/Password sign-in isn't enabled. Open the Firebase Console → Authentication → Sign-in method.",
  "auth/missing-password":        "Please enter your password.",
};

function lastUserEmail() {
  try { return JSON.parse(localStorage.getItem("svault:lastUser") || "null")?.email || ""; }
  catch { return ""; }
}

export default function Login({ onBiometricLogin, onGuestLogin, theme, onToggleTheme, navigate, initialMode }) {
  // top-level mode
  const [mode, setMode] = useState(initialMode === "signup" ? "signup" : "signin");
  // signin sub-method
  const [signinMethod, setSigninMethod] = useState("password"); // password | biometric

  const [email,    setEmail]    = useState(lastUserEmail());
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [name,     setName]     = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);

  const [bioStep,         setBioStep]         = useState("idle"); // idle | scanning | success | failed
  const [bioAvailable,    setBioAvailable]    = useState(false);
  const [bioEnrolledHere, setBioEnrolledHere] = useState(false);
  const [pwLength, setPwLength] = useState(20);
  const [pwned,    setPwned]    = useState(null);

  // OTP signup state
  const [signupStep,   setSignupStep]   = useState("form");      // form | otp
  const [pendingOtp,   setPendingOtp]   = useState("");          // the true OTP we sent
  const [devOtp,       setDevOtp]       = useState("");          // shown only in dev mode
  const [otpDigits,    setOtpDigits]    = useState(["","","","","",""]);
  const [otpError,     setOtpError]     = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputs = useRef([]);

  // Copy-password feedback
  const [copiedSignupPw, setCopiedSignupPw] = useState(false);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Discover whether the device can do biometric auth at all
  useEffect(() => {
    if (!isBiometricSupported()) { setBioAvailable(false); return; }
    isPlatformAuthenticatorAvailable().then(setBioAvailable);
  }, []);

  // Re-check enrollment when email changes
  useEffect(() => {
    setBioEnrolledHere(isEnrolled(email));
  }, [email]);

  // HIBP breach check (only meaningful while creating an account)
  useEffect(() => {
    if (mode !== "signup" || password.length < 4) { setPwned(null); return; }
    setPwned({ checking: true });
    const t = setTimeout(async () => {
      try {
        const r = await checkPwnedPassword(password);
        setPwned({ count: r.count, checking: false });
      } catch { setPwned(null); }
    }, 500);
    return () => clearTimeout(t);
  }, [password, mode]);

  const sliderFill = (val, min, max) => {
    const pct = ((val - min) / (max - min)) * 100;
    return `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`;
  };

  const friendlyError = (e) => AUTH_ERROR_MESSAGES[e?.code] || e?.message || "Something went wrong.";

  /* ─────────────────── Sign In (password) ─────────────────── */
  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      await loginUser(email.trim(), password);
      // App.jsx auth state will pick this up and route to Dashboard
      setSuccess("Signed in. Loading your vault…");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────── Create Account → send OTP ─────────────────── */
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (password !== confirm)    { setError("Passwords don't match."); return; }
    if (password.length < 8)     { setError("Password must be at least 8 characters."); return; }
    if (pwned?.count > 0)        { setError("This password is in known breach lists. Pick a different one."); return; }
    if (!name.trim())            { setError("Please enter your name."); return; }
    setLoading(true);
    try {
      const otp = generateOtp();
      const send = await sendOtpEmail(email.trim(), otp, name.trim());
      if (!send.ok) {
        setError(send.error || "Couldn't send the OTP email. Try again.");
        setLoading(false); return;
      }
      setPendingOtp(otp);
      setDevOtp(send.dev ? otp : "");
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000); // 10 minutes
      setOtpDigits(["","","","","",""]);
      setOtpError("");
      setResendCooldown(45);
      setSignupStep("otp");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────── Verify OTP → create Firebase account ─────────────────── */
  const verifyOtpAndCreate = async (codeStr) => {
    if (otpVerifying) return;
    setOtpError("");
    if (Date.now() > otpExpiresAt) {
      setOtpError("This code has expired. Tap Resend to get a fresh one.");
      return;
    }
    if (codeStr !== pendingOtp) {
      setOtpError("That code is incorrect. Check your email and try again.");
      return;
    }
    setOtpVerifying(true);
    try {
      await registerUser(email.trim(), password, name.trim());
      // App.jsx's onAuthChange will pick the user up and route them to the dashboard
      setSuccess("Verified. Signing you in…");
      // Clear sensitive transient state
      setPendingOtp(""); setDevOtp(""); setOtpDigits(["","","","","",""]);
    } catch (err) {
      setOtpError(friendlyError(err));
      setOtpVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError("");
    const otp = generateOtp();
    const send = await sendOtpEmail(email.trim(), otp, name.trim());
    if (!send.ok) { setOtpError(send.error || "Couldn't resend."); return; }
    setPendingOtp(otp);
    setDevOtp(send.dev ? otp : "");
    setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
    setResendCooldown(45);
  };

  const onOtpDigit = (i, val) => {
    if (val && !/^\d$/.test(val)) return;
    const next = [...otpDigits];
    next[i] = val.slice(-1);
    setOtpDigits(next);
    if (val && i < 5) otpInputs.current[i + 1]?.focus();
    if (next.every(d => d !== "")) verifyOtpAndCreate(next.join(""));
  };
  const onOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0) otpInputs.current[i - 1]?.focus();
  };
  const onOtpPaste = (e) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (txt.length === 6) {
      const next = txt.split("");
      setOtpDigits(next);
      verifyOtpAndCreate(txt);
      e.preventDefault();
    }
  };

  const copySignupPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedSignupPw(true);
      setTimeout(() => setCopiedSignupPw(false), 2200);
    } catch { /* ignore */ }
  };

  /* ─────────────────── Biometric Sign In ─────────────────── */
  const handleBiometric = async () => {
    setError(""); setSuccess("");
    if (!email.trim()) { setError("Enter your email above first."); return; }
    if (!bioAvailable) { setError("This device doesn't support biometric authentication."); return; }
    if (!isEnrolled(email)) {
      setError("Biometric isn't set up for this account on this device. Sign in with your password first, then enable biometric from the sidebar.");
      return;
    }
    setBioStep("scanning");
    try {
      await verifyBiometric(email);
      setBioStep("success");
      // Read cached profile (saved on last successful sign-in via App.jsx)
      let lastProfile = null;
      try { lastProfile = JSON.parse(localStorage.getItem("svault:lastUser") || "null"); } catch {}
      setTimeout(() => onBiometricLogin({
        email: email.trim(),
        name:  lastProfile?.name || email.split("@")[0],
        uid:   lastProfile?.uid  || `bio-${btoa(email).slice(0,16)}`,
      }), 600);
    } catch (err) {
      setBioStep("failed");
      setError(err.message || "Biometric verification failed.");
    }
  };

  /* ─────────────────── Render ─────────────────── */
  return (
    <div style={styles.page}>
      <div style={styles.grid} />
      <div style={{ ...styles.orb, top: "10%", left: "15%", background: "radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)" }} />
      <div style={{ ...styles.orb, bottom: "15%", right: "10%", background: "radial-gradient(circle, rgba(34,211,238,0.14) 0%, transparent 70%)" }} />

      {/* Floating top-right controls */}
      <div style={styles.topRightControls}>
        {navigate && (
          <button onClick={() => navigate("/")} style={styles.homeFloat} title="Back to home">
            ← Home
          </button>
        )}
        <button onClick={onToggleTheme} style={styles.themeFloat} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      <div style={styles.card} className="fade-up">
        {/* Logo — clickable, navigates home */}
        <button onClick={() => navigate?.("/")} style={styles.logoBtn} title="Back to home">
          <div style={styles.logoIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={styles.logoName}>SecureVault <span style={{ color: "var(--accent-cyan)" }}>AI</span></div>
            <div style={styles.logoSub}>Next-Gen Cloud Security</div>
          </div>
        </button>

        <div style={styles.divider} />

        {/* Sign In | Create Account */}
        <div style={styles.tabs}>
          {[["signin","Sign In"], ["signup","Create Account"]].map(([m, label]) => (
            <button key={m}
              onClick={() => { setMode(m); setError(""); setSuccess(""); setBioStep("idle"); }}
              style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Sign In ── */}
        {mode === "signin" && (
          <>
            {/* method sub-tabs */}
            <div style={styles.subTabs}>
              {[["password","🔑 Password"], ["biometric","🔐 Biometric"]].map(([m, label]) => (
                <button key={m}
                  onClick={() => { setSigninMethod(m); setError(""); setSuccess(""); setBioStep("idle"); }}
                  style={{ ...styles.subTab, ...(signinMethod === m ? styles.subTabActive : {}) }}>
                  {label}
                </button>
              ))}
            </div>

            {signinMethod === "password" && (
              <form onSubmit={handlePasswordSignIn} style={styles.form}>
                <Field label="EMAIL">
                  <input className="input" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </Field>
                <Field label="PASSWORD">
                  <PasswordInput value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw(s => !s)} placeholder="Your password" />
                </Field>

                {error   && <Banner kind="error">{error}</Banner>}
                {success && <Banner kind="success">{success}</Banner>}

                <button className="btn btn-primary" type="submit" disabled={loading || !email || !password}
                  style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                  {loading ? <><span style={styles.spinner} /> Signing in…</> : "Sign In →"}
                </button>
              </form>
            )}

            {signinMethod === "biometric" && (
              <div style={styles.bioPanel}>
                <Field label="EMAIL">
                  <input className="input" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </Field>

                {/* Biometric status line */}
                <div style={styles.bioStatus}>
                  {!bioAvailable && (
                    <span style={{ color: "var(--accent-amber)" }}>
                      ⚠️ This device / browser doesn't expose a platform authenticator.
                    </span>
                  )}
                  {bioAvailable && !email && (
                    <span style={{ color: "var(--text-secondary)" }}>
                      Enter your email to check biometric status.
                    </span>
                  )}
                  {bioAvailable && email && bioEnrolledHere && (
                    <span style={{ color: "var(--accent-green)" }}>
                      ✅ Biometric is enrolled for {email} on this device.
                    </span>
                  )}
                  {bioAvailable && email && !bioEnrolledHere && (
                    <span style={{ color: "var(--accent-amber)" }}>
                      ⚠️ No biometric enrolled for this account on this device. Sign in with password first to enable it.
                    </span>
                  )}
                </div>

                {bioStep === "idle" && (
                  <div style={styles.bioButtons}>
                    <button className="btn btn-cyan" onClick={handleBiometric}
                      disabled={!bioAvailable || !bioEnrolledHere || !email}
                      style={{ flex: 1, justifyContent: "center" }}>
                      👆 Verify with Biometric
                    </button>
                  </div>
                )}
                {bioStep === "scanning" && (
                  <div style={styles.scanBox}>
                    <div style={styles.scanRing}>
                      <div style={styles.scanLine} />
                    </div>
                    <p style={{ color: "var(--accent-cyan)", fontSize: 14, marginTop: 14, fontWeight: 600 }}>
                      Waiting for biometric verification…
                    </p>
                  </div>
                )}
                {bioStep === "success" && (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ fontSize: 56 }}>✅</div>
                    <p style={{ color: "var(--accent-green)", marginTop: 10, fontWeight: 600 }}>
                      Identity verified
                    </p>
                  </div>
                )}
                {bioStep === "failed" && (
                  <div style={{ textAlign: "center", padding: "12px 0" }}>
                    <div style={{ fontSize: 48 }}>❌</div>
                    <button className="btn btn-ghost" onClick={() => { setBioStep("idle"); setError(""); }} style={{ marginTop: 14 }}>
                      Try Again
                    </button>
                  </div>
                )}

                {error && bioStep !== "scanning" && <Banner kind="error">{error}</Banner>}
              </div>
            )}
          </>
        )}

        {/* ── Create Account ── */}
        {mode === "signup" && signupStep === "form" && (
          <form onSubmit={handleSignUp} style={styles.form}>
            <Field label="NAME">
              <input className="input" type="text" placeholder="Your name"
                value={name} onChange={e => setName(e.target.value)} required />
            </Field>
            <Field label="EMAIL">
              <input className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </Field>

            <Field label={
              <>
                MASTER PASSWORD
                <button type="button" title="Generate strong password"
                  onClick={() => { const p = generatePassword(pwLength); setPassword(p); setConfirm(p); }}
                  style={styles.diceBtn}>🎲 Generate ({pwLength})</button>
              </>
            }>
              <div className="slider-row">
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Length</span>
                <input className="slider" type="range" min={8} max={64} value={pwLength}
                  style={{ background: sliderFill(pwLength, 8, 64) }}
                  onChange={e => setPwLength(+e.target.value)} />
                <span className="slider-value">{pwLength}</span>
              </div>
              <PasswordInput value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw(s => !s)} placeholder="At least 8 characters" />
              {password && (
                <div style={styles.saveReminder}>
                  <div style={styles.saveReminderTop}>
                    <span style={{ fontSize: 14 }}>💡</span>
                    <span style={styles.saveReminderText}>
                      <strong>Save this password.</strong> You'll need it to sign in next time.
                      Click 👁️ to reveal, then copy it somewhere safe (password manager, notes app).
                    </span>
                  </div>
                  <button type="button" onClick={copySignupPassword}
                    style={{ ...styles.saveCopyBtn, ...(copiedSignupPw ? styles.saveCopyBtnDone : {}) }}>
                    {copiedSignupPw ? "✓ Copied" : "📋 Copy password"}
                  </button>
                </div>
              )}
              {pwned && (
                <div style={styles.pwnedRow}>
                  {pwned.checking
                    ? <span style={{ color: "var(--text-muted)" }}>🔍 Checking breach database…</span>
                    : pwned.count > 0
                      ? <span style={{ color: "var(--accent-red)" }}>⚠️ Found in {pwned.count.toLocaleString()} known data breaches — pick a different one</span>
                      : <span style={{ color: "var(--accent-green)" }}>✅ Not seen in any known breach</span>
                  }
                </div>
              )}
            </Field>

            <Field label="CONFIRM PASSWORD">
              <PasswordInput value={confirm} onChange={setConfirm} show={showPw} onToggle={() => setShowPw(s => !s)} placeholder="Repeat password" />
              {confirm && password !== confirm && (
                <span style={{ fontSize: 12, color: "var(--accent-red)", marginTop: 4 }}>Passwords don't match</span>
              )}
            </Field>

            {error   && <Banner kind="error">{error}</Banner>}
            {success && <Banner kind="success">{success}</Banner>}

            <button className="btn btn-primary" type="submit"
              disabled={loading || !email || !password || !name || password !== confirm}
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              {loading ? <><span style={styles.spinner} /> Sending code…</> : "Send Verification Code →"}
            </button>

            <p style={styles.disclaimer}>
              We'll email you a <strong>6-digit code</strong>. Enter it on the next screen to verify your email and finish creating your account.
            </p>
          </form>
        )}

        {/* ── OTP Verification ── */}
        {mode === "signup" && signupStep === "otp" && (
          <div style={styles.form}>
            <h3 style={styles.otpTitle}>Enter the 6-digit code</h3>
            <p style={styles.otpHint}>
              We sent it to <strong style={{ color: "var(--accent-cyan)" }}>{email}</strong>.
              Check your inbox (and spam folder). The code expires in 10 minutes.
            </p>

            {devOtp && (
              <div style={styles.devBanner}>
                🛠️ <strong>Dev mode</strong> — EmailJS isn't configured, so no email was sent.
                Your code for testing: <strong style={styles.devOtpCode}>{devOtp}</strong>
                <br/>
                <span style={{ fontSize: 12 }}>
                  To send real emails, add <code style={styles.codeChip}>VITE_EMAILJS_*</code> values to <code style={styles.codeChip}>.env</code>.
                </span>
              </div>
            )}

            <div style={styles.otpRow} onPaste={onOtpPaste}>
              {otpDigits.map((d, i) => (
                <input key={i}
                  ref={el => otpInputs.current[i] = el}
                  type="text" inputMode="numeric" pattern="\d*"
                  maxLength={1}
                  value={d}
                  disabled={otpVerifying}
                  onChange={e => onOtpDigit(i, e.target.value)}
                  onKeyDown={e => onOtpKey(i, e)}
                  style={styles.otpBox} />
              ))}
            </div>

            {otpError && <Banner kind="error">{otpError}</Banner>}
            {otpVerifying && (
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--accent-cyan)" }}>
                <span style={styles.spinner} /> Creating your account…
              </div>
            )}

            <div style={styles.otpActions}>
              <button type="button" onClick={() => setSignupStep("form")}
                style={styles.linkBtnPlain}>
                ← Back
              </button>
              <button type="button" onClick={handleResendOtp} disabled={resendCooldown > 0}
                style={{ ...styles.linkBtnPlain, opacity: resendCooldown > 0 ? 0.45 : 1 }}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {onGuestLogin && (
          <button onClick={onGuestLogin} style={styles.guestLink} type="button">
            → Or continue as guest (no signup needed)
          </button>
        )}

        <div style={styles.footer}>
          🔒 Zero-knowledge encryption · Your keys never leave your device
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Tiny presentational helpers ─────────────────── */
function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, show, onToggle, placeholder }) {
  return (
    <div style={{ position: "relative" }}>
      <input className="input" type={show ? "text" : "password"} placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)} required
        style={{ paddingRight: 56 }} />
      <button type="button" onClick={onToggle}
        title={show ? "Hide password" : "Show password"}
        style={styles.eyeBtn}>
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

function Banner({ kind, children }) {
  const color = kind === "error" ? "var(--accent-red)" : "var(--accent-green)";
  const bg    = kind === "error"
    ? "rgba(248,113,113,0.10)"
    : "rgba(52,211,153,0.10)";
  const br    = kind === "error"
    ? "rgba(248,113,113,0.30)"
    : "rgba(52,211,153,0.30)";
  return (
    <div style={{
      padding: "12px 16px", borderRadius: "var(--radius-sm)",
      background: bg, border: `1px solid ${br}`,
      color, fontSize: 13, fontWeight: 500, lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

/* ─────────────────── Styles ─────────────────── */
const styles = {
  page: {
    minHeight: "100vh", display: "flex",
    alignItems: "center", justifyContent: "center",
    background: "var(--bg-primary)", position: "relative", overflow: "hidden",
  },
  grid: {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
    backgroundSize: "44px 44px",
    opacity: 0.25,
  },
  orb: { position: "absolute", width: 440, height: 440, borderRadius: "50%", pointerEvents: "none" },
  topRightControls: {
    position: "absolute", top: 24, right: 28,
    display: "flex", gap: 10, zIndex: 10,
  },
  homeFloat: {
    height: 44, padding: "0 16px", borderRadius: 12,
    background: "var(--bg-card)", border: "1px solid var(--border-bright)",
    color: "var(--text-primary)", fontSize: 14, fontWeight: 600,
    cursor: "pointer", display: "flex", alignItems: "center",
    boxShadow: "var(--shadow-md)",
    fontFamily: "Inter, sans-serif",
  },
  themeFloat: {
    width: 44, height: 44, borderRadius: 12,
    background: "var(--bg-card)", border: "1px solid var(--border-bright)",
    color: "var(--text-primary)", fontSize: 18,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "var(--shadow-md)",
  },
  card: {
    position: "relative", width: 480,
    background: "var(--bg-card)",
    border: "1px solid var(--border-bright)",
    borderRadius: "var(--radius-xl)",
    padding: "36px 36px 28px",
    boxShadow: "var(--shadow-md), 0 0 80px rgba(0,0,0,0.35)",
  },
  logoBtn: {
    display: "flex", alignItems: "center", gap: 16, marginBottom: 22,
    background: "transparent", border: "none", cursor: "pointer",
    padding: 0, fontFamily: "Inter, sans-serif",
  },
  logoIcon: {
    width: 52, height: 52, borderRadius: 14,
    background: "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(167,139,250,0.20))",
    border: "1px solid rgba(34,211,238,0.30)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoName: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 22, fontWeight: 700,
    color: "var(--text-primary)", letterSpacing: "-0.02em",
  },
  logoSub: { fontSize: 13, color: "var(--text-secondary)", letterSpacing: "0.06em", marginTop: 2 },
  divider: { height: 1, background: "var(--border)", marginBottom: 20 },

  tabs: { display: "flex", gap: 8, marginBottom: 18 },
  tab: {
    flex: 1, padding: "12px", borderRadius: "var(--radius-md)",
    border: "1.5px solid var(--border-bright)", background: "transparent",
    color: "var(--text-secondary)", cursor: "pointer",
    fontSize: 14, fontWeight: 600, fontFamily: "Inter, sans-serif",
    transition: "all 0.2s",
  },
  tabActive: {
    borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)",
    background: "rgba(34,211,238,0.10)",
  },

  subTabs: { display: "flex", gap: 6, marginBottom: 18, padding: 4, background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" },
  subTab:  {
    flex: 1, padding: "8px 12px", borderRadius: 8,
    border: "none", background: "transparent",
    color: "var(--text-secondary)", cursor: "pointer",
    fontSize: 13, fontWeight: 600,
  },
  subTabActive: { background: "var(--bg-card)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },

  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 12, letterSpacing: "0.08em", color: "var(--text-secondary)", fontWeight: 700 },

  eyeBtn: {
    position: "absolute", top: 0, right: 0, height: "100%", width: 48,
    background: "transparent", border: "none", cursor: "pointer",
    fontSize: 16, color: "var(--text-secondary)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  bioPanel: { display: "flex", flexDirection: "column", gap: 16 },
  bioStatus: {
    padding: "12px 14px", borderRadius: "var(--radius-sm)",
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    fontSize: 13, fontWeight: 500, lineHeight: 1.5,
  },
  bioButtons: { display: "flex", gap: 12 },
  scanBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" },
  scanRing: {
    width: 100, height: 100, borderRadius: "50%",
    border: "2px solid rgba(34,211,238,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", overflow: "hidden",
    animation: "pulse-glow 1.5s ease-in-out infinite",
  },
  scanLine: {
    position: "absolute", left: 0, right: 0, height: 2,
    background: "linear-gradient(90deg, transparent, var(--accent-cyan), transparent)",
    animation: "scan 1.5s linear infinite",
  },

  diceBtn: {
    float: "right", background: "transparent",
    border: "1.5px solid rgba(34,211,238,0.4)", borderRadius: 6,
    color: "var(--accent-cyan)", fontSize: 11, padding: "3px 10px",
    cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600,
  },
  pwnedRow: { fontSize: 13, marginTop: 6, fontWeight: 500 },

  spinner: {
    width: 14, height: 14, border: "2px solid rgba(255,255,255,0.25)",
    borderTopColor: "white", borderRadius: "50%",
    display: "inline-block", animation: "spin 0.7s linear infinite",
  },

  linkBtn: {
    background: "transparent", border: "none", color: "var(--accent-cyan)",
    cursor: "pointer", fontSize: 13, fontWeight: 600, marginLeft: 8,
    padding: 0, textDecoration: "underline",
  },

  disclaimer: {
    fontSize: 12, color: "var(--text-muted)", textAlign: "center",
    marginTop: -4, lineHeight: 1.5,
  },
  footer: {
    textAlign: "center", fontSize: 12, color: "var(--text-muted)",
    marginTop: 14, letterSpacing: "0.04em", fontWeight: 500,
  },
  guestLink: {
    display: "block", width: "100%",
    background: "transparent", border: "none",
    color: "var(--text-secondary)",
    fontSize: 13, fontWeight: 500, cursor: "pointer",
    padding: "14px 0 4px",
    marginTop: 16,
    borderTop: "1px solid var(--border)",
    fontFamily: "Inter, sans-serif",
    textAlign: "center",
  },

  saveReminder: {
    padding: 12,
    background: "rgba(251,191,36,0.06)",
    border: "1px solid rgba(251,191,36,0.30)",
    borderRadius: "var(--radius-sm)",
    display: "flex", flexDirection: "column", gap: 10,
  },
  saveReminderTop: { display: "flex", gap: 10, alignItems: "flex-start" },
  saveReminderText: {
    fontSize: 13, color: "var(--text-primary)", lineHeight: 1.55,
  },
  saveCopyBtn: {
    alignSelf: "flex-start",
    padding: "8px 16px",
    background: "var(--accent-cyan)", color: "var(--bg-primary)",
    border: "none", borderRadius: "var(--radius-sm)",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  },
  saveCopyBtnDone: { background: "var(--accent-green)" },

  otpTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 20, fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: 6,
  },
  otpHint: { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 },
  otpRow: { display: "flex", gap: 10, justifyContent: "center", margin: "8px 0" },
  otpBox: {
    width: 48, height: 56,
    textAlign: "center",
    fontSize: 24, fontWeight: 700,
    fontFamily: "JetBrains Mono, monospace",
    background: "var(--bg-secondary)",
    border: "1.5px solid var(--border-bright)",
    borderRadius: "var(--radius-sm)",
    color: "var(--accent-cyan)",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  otpActions: { display: "flex", justifyContent: "space-between", marginTop: 4 },
  linkBtnPlain: {
    background: "transparent", border: "none", color: "var(--accent-cyan)",
    cursor: "pointer", fontSize: 13, fontWeight: 600,
    padding: 6, fontFamily: "Inter, sans-serif",
  },
  devBanner: {
    padding: "12px 14px",
    background: "rgba(167,139,250,0.10)",
    border: "1px solid rgba(167,139,250,0.30)",
    borderRadius: "var(--radius-sm)",
    fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6,
  },
  devOtpCode: {
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 18, color: "var(--accent-violet)",
    letterSpacing: "0.15em",
  },
  codeChip: {
    background: "var(--bg-card)",
    padding: "1px 6px", borderRadius: 4,
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 12, color: "var(--accent-cyan)",
  },
};
