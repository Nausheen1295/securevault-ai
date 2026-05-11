import { useState } from "react";

// Simulated blockchain — in production connects to Ethereum via ethers.js + MetaMask
const MOCK_CHAIN = {
  network: "Ethereum Sepolia Testnet",
  chainId: "0xaa36a7",
  contractAddress: "0x7f4e3a2b1c9d8e5f6a3b2c1d4e5f6a7b8c9d0e1f",
};

function generateTxHash() {
  return "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2,"0")).join("");
}

function generateKeyHash(label) {
  return "0x" + Array.from(crypto.getRandomValues(new Uint8Array(20)))
    .map(b => b.toString(16).padStart(2,"0")).join("");
}

const INITIAL_KEYS = [
  { id: 1, label: "ProjectDocs_2024",   hash: generateKeyHash(), stored: "2024-11-10", txHash: generateTxHash(), status: "ACTIVE",  uses: 14 },
  { id: 2, label: "PersonalBackup_Q4",  hash: generateKeyHash(), stored: "2024-12-01", txHash: generateTxHash(), status: "ACTIVE",  uses: 3  },
  { id: 3, label: "FinancialReports",   hash: generateKeyHash(), stored: "2025-01-15", txHash: generateTxHash(), status: "REVOKED", uses: 7  },
];

export default function BlockchainVault() {
  const [keys, setKeys]         = useState(INITIAL_KEYS);
  const [connected, setConnected] = useState(false);
  const [walletAddr, setWalletAddr] = useState("");
  const [loading, setLoading]   = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [storing, setStoring]   = useState(false);
  const [log, setLog]           = useState([]);

  const addLog = (msg, type = "info") => {
    setLog(p => [{ msg, type, time: new Date().toLocaleTimeString() }, ...p.slice(0, 9)]);
  };

  const connectWallet = async () => {
    setLoading(true);
    addLog("Requesting MetaMask connection...", "info");
    await new Promise(r => setTimeout(r, 1200));

    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setWalletAddr(accounts[0]);
        setConnected(true);
        addLog(`Connected: ${accounts[0].slice(0,6)}...${accounts[0].slice(-4)}`, "success");
      } catch {
        addLog("MetaMask connection rejected by user", "error");
      }
    } else {
      // Demo mode without MetaMask
      const demoAddr = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b=>b.toString(16).padStart(2,"0")).join("");
      setWalletAddr(demoAddr);
      setConnected(true);
      addLog("Demo mode: MetaMask not found — simulating connection", "warn");
    }
    setLoading(false);
  };

  const storeKey = async () => {
    if (!newLabel || !newPassword) return;
    setStoring(true);
    addLog(`Hashing key for: ${newLabel}`, "info");
    await new Promise(r => setTimeout(r, 500));

    // Hash the password before storing (never store raw password)
    const enc  = new TextEncoder();
    const buf  = await crypto.subtle.digest("SHA-256", enc.encode(newPassword + newLabel));
    const hash = "0x" + Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
    const txHash = generateTxHash();

    addLog("Broadcasting to blockchain...", "info");
    await new Promise(r => setTimeout(r, 1500));

    addLog(`Tx confirmed: ${txHash.slice(0,12)}...`, "success");

    setKeys(p => [...p, {
      id: Date.now(), label: newLabel, hash: hash.slice(0, 42),
      stored: new Date().toISOString().split("T")[0],
      txHash, status: "ACTIVE", uses: 0,
    }]);
    setNewLabel("");
    setNewPassword("");
    setStoring(false);
  };

  const revokeKey = async (id) => {
    addLog("Revoking key on blockchain...", "warn");
    await new Promise(r => setTimeout(r, 800));
    setKeys(p => p.map(k => k.id === id ? { ...k, status: "REVOKED" } : k));
    addLog("Key revoked successfully", "success");
  };

  return (
    <div style={styles.page} className="fade-up">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>⛓️ Blockchain Key Vault</h2>
          <p style={styles.sub}>Decentralized key storage · Immutable audit trail · Zero-trust architecture</p>
        </div>
        <div style={styles.networkBadge}>
          <span style={styles.networkDot} />
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{MOCK_CHAIN.network}</span>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Left — Wallet + store key */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Wallet connection */}
          <div style={styles.walletCard}>
            <div style={styles.walletHeader}>
              <span style={{ fontSize: 16 }}>🦊</span>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700 }}>MetaMask Wallet</span>
              {connected && <span className="badge badge-green">Connected</span>}
            </div>
            {connected ? (
              <div style={styles.walletInfo}>
                <div style={styles.addrBox}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>WALLET ADDRESS</span>
                  <span style={styles.addr}>{walletAddr.slice(0,10)}...{walletAddr.slice(-8)}</span>
                </div>
                <div style={styles.addrBox}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>CONTRACT</span>
                  <span style={styles.addr}>{MOCK_CHAIN.contractAddress.slice(0,12)}...</span>
                </div>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={connectWallet} disabled={loading}
                style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
                {loading ? "Connecting..." : "Connect MetaMask"}
              </button>
            )}
          </div>

          {/* Store new key */}
          {connected && (
            <div style={styles.storeCard}>
              <div style={styles.storeTitle}>Store New Key Hash</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={styles.label}>KEY LABEL</label>
                  <input className="input" placeholder="e.g. ProjectDocs_2025"
                    value={newLabel} onChange={e => setNewLabel(e.target.value)} />
                </div>
                <div>
                  <label style={styles.label}>ENCRYPTION PASSWORD</label>
                  <input className="input" type="password" placeholder="Password to hash & store"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  ⚠️ Only the SHA-256 hash of your password is stored on-chain. The raw password never leaves your device.
                </p>
                <button className="btn btn-green" onClick={storeKey} disabled={!newLabel || !newPassword || storing}
                  style={{ justifyContent: "center" }}>
                  {storing ? "⛓️ Broadcasting..." : "⛓️ Store on Blockchain"}
                </button>
              </div>
            </div>
          )}

          {/* Transaction log */}
          {log.length > 0 && (
            <div style={styles.logBox}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.08em" }}>TRANSACTION LOG</div>
              {log.map((l, i) => (
                <div key={i} style={styles.logRow}>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0 }}>{l.time}</span>
                  <span style={{
                    fontSize: 11, flex: 1,
                    color: l.type === "success" ? "var(--accent-green)" : l.type === "error" ? "var(--accent-red)" : l.type === "warn" ? "var(--accent-amber)" : "var(--text-secondary)"
                  }}>{l.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Key table */}
        <div>
          <div style={styles.tableHeader}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Stored Keys</span>
            <span className="badge badge-cyan">{keys.filter(k=>k.status==="ACTIVE").length} Active</span>
          </div>
          <div style={styles.table}>
            {keys.map(k => (
              <div key={k.id} style={styles.keyRow}>
                <div style={styles.keyTop}>
                  <div style={{ flex: 1 }}>
                    <div style={styles.keyLabel}>{k.label}</div>
                    <div style={styles.keyHash}>{k.hash.slice(0,24)}...</div>
                  </div>
                  <span className={`badge ${k.status === "ACTIVE" ? "badge-green" : "badge-red"}`}>
                    {k.status}
                  </span>
                </div>
                <div style={styles.keyMeta}>
                  <span>📅 {k.stored}</span>
                  <span>🔑 Used {k.uses}×</span>
                  <a href={`https://sepolia.etherscan.io/tx/${k.txHash}`} target="_blank" rel="noreferrer"
                    style={{ color: "var(--accent-cyan)", fontSize: 10, textDecoration: "none" }}>
                    View Tx ↗
                  </a>
                  {k.status === "ACTIVE" && (
                    <button onClick={() => revokeKey(k.id)}
                      style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", fontSize: 10 }}>
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:   { maxWidth: 900 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title:  { fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 4 },
  sub:    { fontSize: 12, color: "var(--text-muted)" },
  networkBadge: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" },
  networkDot: { width: 6, height: 6, borderRadius: "50%", background: "var(--accent-green)", boxShadow: "0 0 6px var(--accent-green)" },
  grid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  walletCard: { padding: 16, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" },
  walletHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  walletInfo: { display: "flex", flexDirection: "column", gap: 8, marginTop: 8 },
  addrBox: { display: "flex", flexDirection: "column", gap: 2, padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" },
  addr:   { fontSize: 11, color: "var(--accent-cyan)", fontFamily: "DM Mono, monospace", letterSpacing: "0.02em" },
  storeCard: { padding: 16, background: "var(--bg-card)", border: "1px solid var(--border-bright)", borderRadius: "var(--radius-lg)" },
  storeTitle: { fontFamily: "Syne, sans-serif", fontWeight: 700, marginBottom: 12, fontSize: 14 },
  label: { fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4 },
  logBox: { padding: 12, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontFamily: "DM Mono, monospace" },
  logRow: { display: "flex", gap: 8, padding: "3px 0", borderBottom: "1px solid var(--border)" },
  tableHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  table: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 520, overflowY: "auto" },
  keyRow: { padding: 14, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", transition: "border-color 0.2s" },
  keyTop: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  keyLabel: { fontSize: 13, fontWeight: 600, marginBottom: 2 },
  keyHash: { fontSize: 10, color: "var(--text-muted)", fontFamily: "DM Mono, monospace" },
  keyMeta: { display: "flex", gap: 12, alignItems: "center", fontSize: 10, color: "var(--text-muted)" },
};