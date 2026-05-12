import { useEffect, useRef, useState, Fragment } from "react";

const SUGGESTIONS = [
  "How does the encryption work?",
  "What is zero-knowledge sharing?",
  "Can I recover a forgotten password?",
  "How is the threat scanner real?",
];

// Tiny safe markdown renderer — handles **bold** and `inline code`.
// Builds React elements; never touches innerHTML. Newlines preserved via whitespace.
function renderRich(text) {
  const parts = [];
  let buf = "";
  let i = 0;

  const flush = () => { if (buf) { parts.push(buf); buf = ""; } };

  while (i < text.length) {
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        flush();
        parts.push(<strong key={`b${i}`}>{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        flush();
        parts.push(<code key={`c${i}`} style={inlineCode}>{text.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return parts.map((p, idx) => <Fragment key={idx}>{p}</Fragment>);
}

const inlineCode = {
  background: "var(--bg-secondary)",
  padding: "1px 6px",
  borderRadius: 4,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: "0.92em",
  color: "var(--accent-cyan)",
};

export default function Chatbot() {
  const [isOpen,        setIsOpen]        = useState(false);
  const [messages,      setMessages]      = useState([]);     // [{role, content, isError?}]
  const [input,         setInput]         = useState("");
  const [streaming,     setStreaming]     = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const inputRef       = useRef(null);
  const messagesEndRef = useRef(null);
  const abortRef       = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText]);

  // Focus input on open + handle Esc to close
  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch("/api/chat", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ messages: next }),
        signal:  controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";
      let acc       = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const evt of events) {
          if (!evt.startsWith("data: ")) continue;
          let payload;
          try { payload = JSON.parse(evt.slice(6)); } catch { continue; }
          if (payload.type === "text") {
            acc += payload.text;
            setStreamingText(acc);
          } else if (payload.type === "done") {
            setMessages((m) => [...m, { role: "assistant", content: acc }]);
            setStreamingText("");
          } else if (payload.type === "error") {
            throw new Error(payload.message);
          }
        }
      }
    } catch (err) {
      const msg = err.name === "AbortError" ? "Cancelled." : (err.message || "Something went wrong.");
      setMessages((m) => [...m, { role: "assistant", content: msg, isError: true }]);
      setStreamingText("");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const cancel = () => abortRef.current?.abort();

  return (
    <>
      {/* Floating bubble (hidden while panel is open) */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} style={styles.bubble}
          className="btn-breathe" title="Ask the SecureVault assistant">
          <span style={{ fontSize: 26 }}>💬</span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div style={styles.panel} role="dialog" aria-label="SecureVault assistant">
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <span style={styles.headerAvatar}>🤖</span>
              <div>
                <div style={styles.headerTitle}>SecureVault Assistant</div>
                <div style={styles.headerSub}>Ask anything about the app</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={styles.headerBtn} title="Close (Esc)">
              ✕
            </button>
          </div>

          <div style={styles.messages}>
            {messages.length === 0 && !streamingText && !streaming && (
              <div style={styles.emptyState}>
                <div style={{ fontSize: 40 }}>👋</div>
                <p style={styles.emptyText}>
                  Hi! Ask me anything about <strong>SecureVault AI</strong> —
                  encryption, sharing, biometric login, your security score, or any feature.
                </p>
                <div style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => handleSend(s)} style={styles.suggestion}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={msg.role === "user" ? styles.rowUser : styles.rowBot}>
                <div style={
                  msg.role === "user"
                    ? styles.userBubble
                    : msg.isError ? styles.errorBubble : styles.botBubble
                }>
                  {renderRich(msg.content)}
                </div>
              </div>
            ))}

            {streamingText && (
              <div style={styles.rowBot}>
                <div style={styles.botBubble}>
                  {renderRich(streamingText)}
                  <span style={styles.cursor}>▎</span>
                </div>
              </div>
            )}

            {streaming && !streamingText && (
              <div style={styles.rowBot}>
                <div style={styles.botBubble}>
                  <span style={styles.dot} />
                  <span style={{ ...styles.dot, animationDelay: "0.15s" }} />
                  <span style={{ ...styles.dot, animationDelay: "0.3s" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputBar}>
            <input ref={inputRef} className="input"
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={streaming ? "Generating answer…" : "Ask about a feature, e.g. \"how does ZK Share work?\""}
              style={{ flex: 1, paddingRight: 14 }}
              disabled={streaming} />
            {streaming ? (
              <button onClick={cancel} style={styles.cancelBtn} title="Stop">
                ⏹
              </button>
            ) : (
              <button onClick={() => handleSend()} disabled={!input.trim()}
                style={styles.sendBtn} title="Send (Enter)">
                ↑
              </button>
            )}
          </div>

          <div style={styles.footer}>
            Powered by Claude · responses can be imperfect; verify in the app.
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  bubble: {
    position: "fixed", bottom: 24, right: 24, zIndex: 900,
    width: 60, height: 60, borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
    color: "#fff", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 32px rgba(34,211,238,0.45)",
  },

  panel: {
    position: "fixed", bottom: 24, right: 24, zIndex: 900,
    width: 400, maxWidth: "calc(100vw - 32px)",
    height: 600, maxHeight: "calc(100vh - 48px)",
    background: "var(--bg-card)",
    border: "1px solid var(--border-bright)",
    borderRadius: "var(--radius-xl)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 0 80px rgba(34,211,238,0.06)",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
    animation: "fadeUp 0.22s ease",
  },

  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px",
    background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(167,139,250,0.08))",
    borderBottom: "1px solid var(--border)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 12,
    background: "linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, boxShadow: "0 0 18px rgba(167,139,250,0.4)",
  },
  headerTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 15, fontWeight: 700, color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  headerSub: { fontSize: 12, color: "var(--text-secondary)", marginTop: 1 },
  headerBtn: {
    background: "transparent", border: "1px solid var(--border-bright)",
    color: "var(--text-secondary)", borderRadius: 8,
    width: 32, height: 32, cursor: "pointer", fontSize: 14,
  },

  messages: {
    flex: 1, overflowY: "auto",
    padding: "16px",
    display: "flex", flexDirection: "column", gap: 12,
  },

  rowUser: { display: "flex", justifyContent: "flex-end" },
  rowBot:  { display: "flex", justifyContent: "flex-start" },
  userBubble: {
    maxWidth: "82%",
    padding: "10px 14px",
    background: "linear-gradient(135deg, var(--accent-cyan), #0891b2)",
    color: "var(--bg-primary)",
    borderRadius: "16px 16px 4px 16px",
    fontSize: 14, fontWeight: 500, lineHeight: 1.5,
  },
  botBubble: {
    maxWidth: "85%",
    padding: "10px 14px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    borderRadius: "16px 16px 16px 4px",
    fontSize: 14, lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  errorBubble: {
    maxWidth: "85%",
    padding: "10px 14px",
    background: "rgba(248,113,113,0.10)",
    border: "1px solid rgba(248,113,113,0.30)",
    color: "var(--accent-red)",
    borderRadius: "16px 16px 16px 4px",
    fontSize: 13, lineHeight: 1.5,
  },

  cursor: {
    display: "inline-block", marginLeft: 1,
    color: "var(--accent-cyan)",
    animation: "blink 1s steps(1) infinite",
  },
  dot: {
    display: "inline-block",
    width: 8, height: 8, borderRadius: "50%", margin: "0 3px",
    background: "var(--text-secondary)",
    animation: "blink 1.2s ease-in-out infinite",
  },

  emptyState: {
    textAlign: "center", padding: "8px 4px",
    display: "flex", flexDirection: "column", gap: 12, alignItems: "center",
  },
  emptyText: { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55, marginTop: 4 },
  suggestions: { display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: 6 },
  suggestion: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 10, padding: "10px 14px",
    color: "var(--text-primary)", fontSize: 13,
    cursor: "pointer", fontFamily: "Inter, sans-serif",
    textAlign: "left",
    transition: "border-color 0.15s, transform 0.1s",
  },

  inputBar: {
    display: "flex", gap: 8, alignItems: "center",
    padding: "12px 14px",
    borderTop: "1px solid var(--border)",
    background: "var(--bg-card)",
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 12,
    background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
    color: "#fff", border: "none", cursor: "pointer",
    fontSize: 18, fontWeight: 700, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 0 18px rgba(34,211,238,0.4)",
  },
  cancelBtn: {
    width: 40, height: 40, borderRadius: 12,
    background: "var(--accent-red)", color: "#fff",
    border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700,
    flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  footer: {
    padding: "8px 14px",
    fontSize: 11, color: "var(--text-muted)",
    textAlign: "center",
    background: "var(--bg-secondary)",
    borderTop: "1px solid var(--border)",
  },
};
