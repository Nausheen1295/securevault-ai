import { useState } from "react";
import Sidebar from "../components/Sidebar";
import StatsBar from "../components/StatsBar";
import FileEncryptor from "../components/FileEncryptor";
import AIThreatScanner from "../components/AIThreatScanner";
import BlockchainVault from "../components/BlockchainVault";
import ZeroKnowledgeShare from "../components/ZeroKnowledgeShare";
import SecurityAnalytics from "../components/SecurityAnalytics";
import Profile from "../components/Profile";
import Chatbot from "../components/Chatbot";

const FEATURE_VIEWS = {
  encrypt:    <FileEncryptor />,
  ai:         <AIThreatScanner />,
  blockchain: <BlockchainVault />,
  share:      <ZeroKnowledgeShare />,
  analytics:  <SecurityAnalytics />,
};

export default function Dashboard({ user, onLogout, theme, onToggleTheme, navigate }) {
  const [activeView, setActiveView] = useState("encrypt");
  const [lastFeature, setLastFeature] = useState("encrypt");

  const handleViewChange = (id) => {
    if (id in FEATURE_VIEWS) setLastFeature(id);
    setActiveView(id);
  };

  const isProfile = activeView === "profile";

  return (
    <div style={styles.layout}>
      <Sidebar
        active={activeView}
        onChange={handleViewChange}
        user={user}
        onLogout={onLogout}
        onOpenProfile={() => setActiveView("profile")}
        onUpgradeAccount={() => navigate?.("/login?mode=signup")}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <main style={styles.main}>
        {!isProfile && <StatsBar user={user} />}
        <div style={styles.content}>
          {isProfile
            ? <Profile user={user} onLogout={onLogout} onBack={() => setActiveView(lastFeature)} navigate={navigate} />
            : FEATURE_VIEWS[activeView]}
        </div>
      </main>

      {/* Floating chatbot — accessible from anywhere in the dashboard */}
      <Chatbot />
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: "32px 40px",
    overflowY: "auto",
  },
};
