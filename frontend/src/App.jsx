import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import "./index.css";

const STORAGE_KEY = "svault:session";

function loadSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
  catch { return null; }
}

export default function App() {
  const [user, setUser] = useState(loadSession);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem("svault:lastUser", JSON.stringify({ email: userData.email }));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    // Keep svault:lastUser so the email pre-fills on the next login
  };

  return user
    ? <Dashboard user={user} onLogout={handleLogout} />
    : <Login onLogin={handleLogin} />;
}
