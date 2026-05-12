import { useState } from "react";
import Sidebar from "../components/Sidebar";
import StatsBar from "../components/StatsBar";
import FileEncryptor from "../components/FileEncryptor";
import AIThreatScanner from "../components/AIThreatScanner";
import BlockchainVault from "../components/BlockchainVault";
import ZeroKnowledgeShare from "../components/ZeroKnowledgeShare";
import SecurityAnalytics from "../components/SecurityAnalytics";

const VIEWS = {
  encrypt:    <FileEncryptor />,
  ai:         <AIThreatScanner />,
  blockchain: <BlockchainVault />,
  share:      <ZeroKnowledgeShare />,
  analytics:  <SecurityAnalytics />,
};

export default function Dashboard({ user, onLogout, theme, onToggleTheme }) {
  const [activeView, setActiveView] = useState("encrypt");

  return (
    <div style={styles.layout}>
      <Sidebar
        active={activeView}
        onChange={setActiveView}
        user={user}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <main style={styles.main}>
        <StatsBar />
        <div style={styles.content}>
          {VIEWS[activeView]}
        </div>
      </main>
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
