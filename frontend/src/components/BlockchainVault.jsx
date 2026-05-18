import { useEffect, useState } from "react";
import { BrowserProvider, hexlify, toUtf8Bytes, toUtf8String } from "ethers";
import { auth, saveBlockchainKey, logSecurityEvent } from "../utils/firebase";

const SEPOLIA = {
  chainIdHex: "0xaa36a7",
  chainIdDec: 11155111,
  name: "Ethereum Sepolia Testnet",
  rpcUrl: "https://rpc.sepolia.org",
  explorer: "https://sepolia.etherscan.io",
  currency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
};

// Burn address — sending 0 ETH + data here just records the data on-chain.
// MetaMask blocks self-tx with data AND blocks the zero address, so we use
// the well-known "dEaD" burn address which is allowed.
const DATA_SINK = "0x000000000000000000000000000000000000dEaD";

function shortAddr(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "";
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return "0x" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function BlockchainVault() {
  const [keys, setKeys]                 = useState([]);
  const [connected, setConnected]       = useState(false);
  const [walletAddr, setWalletAddr]     = useState("");
  const [balance, setBalance]           = useState("0");
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [newLabel, setNewLabel]         = useState("");
  const [newPassword, setNewPassword]   = useState("");
  const [storing, setStoring]           = useState(false);
  const [log, setLog]                   = useState([]);

  const addLog = (msg, type = "info") => {
    setLog(p => [{ msg, type, time: new Date().toLocaleTimeString() }, ...p.slice(0, 11)]);
  };

  // Refresh balance + network whenever wallet changes
  useEffect(() => {
    if (!window.ethereum) return;
    const onAccountsChanged = (accts) => {
      if (accts.length === 0) {
        setConnected(false);
        setWalletAddr("");
      } else {
        setWalletAddr(accts[0]);
        refreshBalance(accts[0]);
      }
    };
    const onChainChanged = (chainId) => {
      setWrongNetwork(chainId !== SEPOLIA.chainIdHex);
      if (walletAddr) refreshBalance(walletAddr);
    };
    window.ethereum.on?.("accountsChanged", onAccountsChanged);
    window.ethereum.on?.("chainChanged", onChainChanged);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", onChainChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddr]);

  const refreshBalance = async (addr) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(addr);
      // Format to 4 decimals
      setBalance((Number(bal) / 1e18).toFixed(4));
    } catch {
      setBalance("0");
    }
  };

  const ensureSepolia = async () => {
    const currentChain = await window.ethereum.request({ method: "eth_chainId" });
    if (currentChain === SEPOLIA.chainIdHex) {
      setWrongNetwork(false);
      return true;
    }
    addLog("Switching network to Sepolia...", "warn");
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA.chainIdHex }],
      });
      setWrongNetwork(false);
      return true;
    } catch (err) {
      // 4902 = chain not added to wallet
      if (err?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: SEPOLIA.chainIdHex,
              chainName: SEPOLIA.name,
              rpcUrls: [SEPOLIA.rpcUrl],
              blockExplorerUrls: [SEPOLIA.explorer],
              nativeCurrency: SEPOLIA.currency,
            }],
          });
          setWrongNetwork(false);
          return true;
        } catch {
          addLog("Failed to add Sepolia network", "error");
          return false;
        }
      }
      addLog("User rejected network switch", "error");
      return false;
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      addLog("MetaMask not installed — opening install page", "error");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    setLoading(true);
    addLog("Requesting MetaMask connection...", "info");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const addr = accounts[0];
      setWalletAddr(addr);
      setConnected(true);
      addLog(`Connected: ${shortAddr(addr)}`, "success");

      const switched = await ensureSepolia();
      if (!switched) setWrongNetwork(true);

      await refreshBalance(addr);
    } catch (err) {
      addLog(`Connection rejected: ${err?.message || "user denied"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const storeKey = async () => {
    if (!newLabel || !newPassword) return;
    if (!await ensureSepolia()) return;

    setStoring(true);
    try {
      addLog(`Hashing key for: ${newLabel}`, "info");
      const keyHash = await sha256Hex(newPassword + newLabel);

      // Encode payload to put in tx data — visible forever on-chain
      const payload = `SVAULT_STORE:${newLabel}:${keyHash}`;
      const data    = hexlify(toUtf8Bytes(payload));

      addLog("Awaiting MetaMask signature...", "warn");
      const provider = new BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to:    DATA_SINK,
        value: 0n,
        data,
      });
      addLog(`Tx broadcast: ${tx.hash.slice(0, 12)}...`, "info");

      const receipt = await tx.wait();
      addLog(`✓ Confirmed in block ${receipt.blockNumber}`, "success");

      const newKey = {
        id:     Date.now(),
        label:  newLabel,
        hash:   keyHash.slice(0, 42),
        stored: new Date().toISOString().split("T")[0],
        txHash: tx.hash,
        status: "ACTIVE",
        uses:   0,
      };
      setKeys(p => [...p, newKey]);

      if (auth?.currentUser) {
        const uid = auth.currentUser.uid;
        saveBlockchainKey(uid, { label: newLabel, hash: keyHash.slice(0, 42), txHash: tx.hash }).catch(() => {});
        logSecurityEvent(uid, {
          type:   "blockchain",
          detail: `Stored key hash for ${newLabel} on Sepolia`,
          risk:   "SAFE",
        }).catch(() => {});
      }
      setNewLabel("");
      setNewPassword("");
      await refreshBalance(walletAddr);
    } catch (err) {
      console.error("storeKey error:", err);
      const code = err?.code || err?.error?.code;
      let msg;
      if (code === 4001 || code === "ACTION_REJECTED") msg = "You rejected the transaction in MetaMask";
      else if (code === -32603) msg = "RPC error — try switching network and back";
      else if (err?.message?.includes("coalesce")) msg = "MetaMask popup was closed or blocked — click the 🦊 icon and retry";
      else msg = err?.shortMessage || err?.info?.error?.message || err?.error?.message || err?.reason || err?.message || "transaction failed";
      addLog(`✗ ${msg}`, "error");
    } finally {
      setStoring(false);
    }
  };

  const revokeKey = async (id) => {
    if (!await ensureSepolia()) return;
    const target = keys.find(k => k.id === id);
    if (!target) return;

    try {
      addLog(`Revoking ${target.label}...`, "warn");
      const payload = `SVAULT_REVOKE:${target.hash}`;
      const data    = hexlify(toUtf8Bytes(payload));

      const provider = new BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to:    DATA_SINK,
        value: 0n,
        data,
      });
      addLog(`Revoke tx: ${tx.hash.slice(0, 12)}...`, "info");
      await tx.wait();
      addLog("✓ Key revoked on-chain", "success");

      setKeys(p => p.map(k => k.id === id ? { ...k, status: "REVOKED" } : k));
      await refreshBalance(walletAddr);
    } catch (err) {
      console.error("revokeKey error:", err);
      const code = err?.code || err?.error?.code;
      let msg;
      if (code === 4001 || code === "ACTION_REJECTED") msg = "You rejected the transaction in MetaMask";
      else if (err?.message?.includes("coalesce")) msg = "MetaMask popup was closed — click the 🦊 icon and retry";
      else msg = err?.shortMessage || err?.info?.error?.message || err?.message || "revoke failed";
      addLog(`✗ ${msg}`, "error");
    }
  };

  return (
    <div style={styles.page} className="fade-up">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>⛓️ Blockchain Key Vault</h2>
          <p style={styles.sub}>Real on-chain storage · Sepolia testnet · Immutable audit trail</p>
        </div>
        <div style={styles.networkBadge}>
          <span style={{
            ...styles.networkDot,
            background: wrongNetwork ? "var(--accent-red)" : "var(--accent-green)",
            boxShadow:  `0 0 8px ${wrongNetwork ? "var(--accent-red)" : "var(--accent-green)"}`,
          }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
            {wrongNetwork ? "Wrong Network" : SEPOLIA.name}
          </span>
        </div>
      </div>

      {wrongNetwork && connected && (
        <div style={styles.warnBox}>
          ⚠️ Please switch to Sepolia testnet.
          <button onClick={ensureSepolia} style={styles.switchBtn}>Switch Network</button>
        </div>
      )}

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
                  <a
                    href={`${SEPOLIA.explorer}/address/${walletAddr}`}
                    target="_blank" rel="noreferrer"
                    style={{ ...styles.addr, textDecoration: "none" }}
                  >
                    {walletAddr.slice(0, 10)}...{walletAddr.slice(-8)} ↗
                  </a>
                </div>
                <div style={styles.addrBox}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>BALANCE</span>
                  <span style={styles.addr}>{balance} SepoliaETH</span>
                </div>
                {Number(balance) === 0 && (
                  <a
                    href="https://www.alchemy.com/faucets/ethereum-sepolia"
                    target="_blank" rel="noreferrer"
                    style={styles.faucetLink}
                  >
                    💧 Get free test ETH from Alchemy faucet ↗
                  </a>
                )}
              </div>
            ) : (
              <button className="btn btn-primary" onClick={connectWallet} disabled={loading}
                style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
                {loading ? "Connecting..." : "Connect MetaMask"}
              </button>
            )}
          </div>

          {/* Store new key */}
          {connected && !wrongNetwork && (
            <div style={styles.storeCard}>
              <div style={styles.storeTitle}>Store New Key Hash On-Chain</div>
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
                  ⚠️ Only the SHA-256 hash is broadcast on-chain. The raw password never leaves your device.
                  Costs ~0.00002 SepoliaETH in gas.
                </p>
                <button className="btn btn-green" onClick={storeKey} disabled={!newLabel || !newPassword || storing}
                  style={{ justifyContent: "center" }}>
                  {storing ? "⛓️ Awaiting confirmation..." : "⛓️ Store on Sepolia"}
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
            <span style={{ fontSize: 13, fontWeight: 600 }}>Your On-Chain Keys</span>
            <span className="badge badge-cyan">{keys.filter(k => k.status === "ACTIVE").length} Active</span>
          </div>
          <div style={styles.table}>
            {keys.length === 0 ? (
              <div style={styles.empty}>
                No keys stored yet. Connect MetaMask and click "Store on Sepolia" to write your first key hash to the blockchain.
              </div>
            ) : keys.map(k => (
              <div key={k.id} style={styles.keyRow}>
                <div style={styles.keyTop}>
                  <div style={{ flex: 1 }}>
                    <div style={styles.keyLabel}>{k.label}</div>
                    <div style={styles.keyHash}>{k.hash.slice(0, 24)}...</div>
                  </div>
                  <span className={`badge ${k.status === "ACTIVE" ? "badge-green" : "badge-red"}`}>
                    {k.status}
                  </span>
                </div>
                <div style={styles.keyMeta}>
                  <span>📅 {k.stored}</span>
                  <span>🔑 Used {k.uses}×</span>
                  <a href={`${SEPOLIA.explorer}/tx/${k.txHash}`} target="_blank" rel="noreferrer"
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
  page:   { maxWidth: 1100 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  title:  { fontFamily: "Space Grotesk, sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 },
  sub:    { fontSize: 14, color: "var(--text-secondary)" },
  networkBadge: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" },
  networkDot: { width: 8, height: 8, borderRadius: "50%" },
  warnBox: { padding: "12px 16px", background: "rgba(255,180,0,0.08)", border: "1px solid var(--accent-amber)", borderRadius: "var(--radius-md)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--accent-amber)" },
  switchBtn: { background: "var(--accent-amber)", color: "#000", border: "none", padding: "6px 12px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 600, fontSize: 12 },
  grid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  walletCard: { padding: 20, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" },
  walletHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14, fontSize: 15 },
  walletInfo: { display: "flex", flexDirection: "column", gap: 10, marginTop: 10 },
  addrBox: { display: "flex", flexDirection: "column", gap: 4, padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" },
  addr:   { fontSize: 13, color: "var(--accent-cyan)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.02em" },
  faucetLink: { fontSize: 11, color: "var(--accent-amber)", textDecoration: "none", padding: "8px 10px", background: "rgba(255,180,0,0.08)", borderRadius: "var(--radius-sm)", textAlign: "center" },
  storeCard: { padding: 20, background: "var(--bg-card)", border: "1px solid var(--border-bright)", borderRadius: "var(--radius-lg)" },
  storeTitle: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 16 },
  label: { fontSize: 12, letterSpacing: "0.08em", color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 },
  logBox: { padding: 14, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontFamily: "JetBrains Mono, monospace" },
  logRow: { display: "flex", gap: 10, padding: "4px 0", borderBottom: "1px solid var(--border)" },
  tableHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  table: { display: "flex", flexDirection: "column", gap: 12, maxHeight: 600, overflowY: "auto" },
  empty: { padding: 24, background: "var(--bg-card)", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-muted)", fontSize: 13, textAlign: "center", lineHeight: 1.6 },
  keyRow: { padding: 18, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", transition: "border-color 0.2s" },
  keyTop: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  keyLabel: { fontSize: 15, fontWeight: 600, marginBottom: 4 },
  keyHash: { fontSize: 12, color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" },
  keyMeta: { display: "flex", gap: 16, alignItems: "center", fontSize: 12, color: "var(--text-secondary)" },
};
