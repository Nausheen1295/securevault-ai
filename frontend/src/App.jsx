import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import "./index.css";

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    setAuthenticated(true);
  };

  return authenticated
    ? <Dashboard user={user} onLogout={() => { setAuthenticated(false); setUser(null); }} />
    : <Login onLogin={handleLogin} />;
}
