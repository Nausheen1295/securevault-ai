import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ZKReceive from "./pages/ZKReceive";
import { onAuthChange, logoutUser, isFirebaseConfigured } from "./utils/firebase";
import "./index.css";

const THEME_KEY = "svault:theme";

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export default function App() {
  // user: undefined → loading, null → logged out, object → logged in
  const [user,  setUser]  = useState(undefined);
  const [theme, setTheme] = useState(loadTheme);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f6fb" : "#0a0e1a");
  }, [theme]);

  // Subscribe to Firebase auth state — this is the source of truth.
  // A fresh browser sees no session; the user must sign in.
  useEffect(() => {
    if (!isFirebaseConfigured) { setUser(null); return; }
    const unsub = onAuthChange((fbUser) => {
      if (!fbUser) { setUser(null); return; }
      if (!fbUser.emailVerified) { setUser(null); return; }   // block unverified
      setUser({
        uid:   fbUser.uid,
        email: fbUser.email,
        name:  fbUser.displayName || fbUser.email.split("@")[0],
      });
      localStorage.setItem("svault:lastUser", JSON.stringify({ email: fbUser.email }));
    });
    return unsub;
  }, []);

  // Biometric sign-in path — sets user state directly (no Firebase session).
  const handleBiometricLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("svault:lastUser", JSON.stringify({ email: userData.email }));
  };

  const handleLogout = async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    setUser(null);
  };

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  // Recipient page — runs without authentication. Just needs the link.
  if (window.location.pathname.startsWith("/zk")) {
    return <ZKReceive theme={theme} onToggleTheme={toggleTheme} />;
  }

  if (user === undefined) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-secondary)",
      }}>
        Loading…
      </div>
    );
  }

  return user
    ? <Dashboard user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
    : <Login onBiometricLogin={handleBiometricLogin} theme={theme} onToggleTheme={toggleTheme} />;
}
