import { useState, useEffect, useCallback } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Home from "./pages/Home";
import ZKReceive from "./pages/ZKReceive";
import { onAuthChange, logoutUser, isFirebaseConfigured } from "./utils/firebase";
import "./index.css";

const THEME_KEY = "svault:theme";
const GUEST_KEY = "svault:guest";

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function loadGuestSession() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.isGuest ? data : null;
  } catch { return null; }
}

function createGuestUser() {
  const id = "guest-" + Math.random().toString(36).slice(2, 12);
  return {
    uid:       id,
    email:     "guest@securevault.local",
    name:      "Guest User",
    isGuest:   true,
    createdAt: Date.now(),
  };
}

export default function App() {
  // user: undefined → loading, null → logged out, object → logged in
  const [user,  setUser]  = useState(undefined);
  const [theme, setTheme] = useState(loadTheme);

  // Lightweight pathname-based router. No external lib — just enough to switch pages.
  const [pathname, setPathname] = useState(window.location.pathname);
  const [search,   setSearch]   = useState(window.location.search);

  useEffect(() => {
    const onPop = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to) => {
    if (window.location.pathname + window.location.search === to) return;
    window.history.pushState(null, "", to);
    const [p, q] = to.split("?");
    setPathname(p || "/");
    setSearch(q ? `?${q}` : "");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f6fb" : "#0a0e1a");
  }, [theme]);

  // Subscribe to Firebase auth state. Real account wins; otherwise fall back to a guest session.
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setUser(loadGuestSession());  // null if no guest session either
      return;
    }
    const unsub = onAuthChange((fbUser) => {
      if (fbUser) {
        // Real account beats guest. Clear any lingering guest session.
        localStorage.removeItem(GUEST_KEY);
        setUser({
          uid:   fbUser.uid,
          email: fbUser.email,
          name:  fbUser.displayName || fbUser.email.split("@")[0],
        });
        localStorage.setItem("svault:lastUser", JSON.stringify({ email: fbUser.email }));
        return;
      }
      // No real account — restore guest if one exists
      setUser(loadGuestSession());
    });
    return unsub;
  }, []);

  const handleGuestLogin = () => {
    const guest = createGuestUser();
    localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
    setUser(guest);
    navigate("/dashboard");
  };

  const handleBiometricLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("svault:lastUser", JSON.stringify({ email: userData.email }));
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    localStorage.removeItem(GUEST_KEY);
    setUser(null);
    navigate("/");
  };

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  // Recipient page — runs without authentication. Just needs the link.
  if (pathname.startsWith("/zk")) {
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

  // /login — Sign In / Create Account page
  if (pathname.startsWith("/login")) {
    if (user) {
      // Already signed in — bounce to dashboard
      navigate("/dashboard");
      return null;
    }
    const params = new URLSearchParams(search);
    const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
    return (
      <Login
        onBiometricLogin={handleBiometricLogin}
        onGuestLogin={handleGuestLogin}
        theme={theme}
        onToggleTheme={toggleTheme}
        navigate={navigate}
        initialMode={initialMode}
      />
    );
  }

  // /dashboard or any logged-in-only path → Dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      // Not authenticated — bounce to home
      navigate("/");
      return null;
    }
    return (
      <Dashboard user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} navigate={navigate} />
    );
  }

  // Default: Home page (whether signed in or not)
  return (
    <Home
      navigate={navigate}
      theme={theme}
      onToggleTheme={toggleTheme}
      isAuthenticated={!!user}
      onGuestLogin={handleGuestLogin}
    />
  );
}
