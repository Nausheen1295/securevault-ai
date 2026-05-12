import { useEffect, useState } from "react";
import {
  auth,
  isFirebaseConfigured,
  getUserProfile,
  updateUserProfile,
  updateDisplayName,
  getUserFiles,
  deleteFileRecord,
  getSecurityEvents,
  deleteAccountWithReauth,
} from "../utils/firebase";
import { isEnrolled, unenrollBiometric } from "../utils/webauthn";

function formatBytes(b) {
  if (!b && b !== 0) return "—";
  if (b < 1024)    return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
}
function formatDate(d) {
  if (!d) return "—";
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleString();
}
function relativeTime(d) {
  if (!d) return "";
  const date = d.toDate ? d.toDate() : new Date(d);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)         return "just now";
  if (diff < 3600)       return Math.floor(diff / 60) + " min ago";
  if (diff < 86400)      return Math.floor(diff / 3600) + " hr ago";
  if (diff < 86400 * 7)  return Math.floor(diff / 86400) + " day(s) ago";
  return date.toLocaleDateString();
}

export default function Profile({ user, onLogout, onBack }) {
  const [profile,   setProfile]   = useState(null);
  const [files,     setFiles]     = useState([]);
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  // edit state
  const [editingName, setEditingName] = useState(false);
  const [nameDraft,   setNameDraft]   = useState(user?.name || "");
  const [editingPhone,setEditingPhone]= useState(false);
  const [phoneDraft,  setPhoneDraft]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [savedToast,  setSavedToast]  = useState("");

  // delete-account dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw,   setDeletePw]   = useState("");
  const [deleteErr,  setDeleteErr]  = useState("");
  const [deletePhase,setDeletePhase]= useState("idle"); // idle | working

  const isFirebaseUser = !!auth?.currentUser;
  const biometricEnabled = isEnrolled(user?.email);

  // Load Firestore profile + files + activity
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isFirebaseConfigured || !isFirebaseUser) {
        setLoading(false);
        return;
      }
      try {
        const [p, f, e] = await Promise.all([
          getUserProfile(user.uid),
          getUserFiles(user.uid),
          getSecurityEvents(user.uid),
        ]);
        if (cancelled) return;
        setProfile(p || {});
        setFiles(f || []);
        setEvents(e || []);
        setNameDraft(p?.name || user.name || "");
        setPhoneDraft(p?.phone || "");
      } catch {
        setProfile({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.uid, isFirebaseUser]);

  const toast = (msg) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(""), 2200);
  };

  const handleSaveName = async () => {
    const v = nameDraft.trim();
    if (!v) return;
    setSaving(true);
    try {
      await updateDisplayName(v);
      setProfile(p => ({ ...(p || {}), name: v }));
      setEditingName(false);
      toast("Name updated.");
    } catch (err) {
      toast("Couldn't update name.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhone = async () => {
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { phone: phoneDraft.trim() });
      setProfile(p => ({ ...(p || {}), phone: phoneDraft.trim() }));
      setEditingPhone(false);
      toast(phoneDraft.trim() ? "Phone saved." : "Phone removed.");
    } catch {
      toast("Couldn't update phone.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFile = async (id) => {
    if (!confirm("Remove this file from your history? The encrypted file on disk is not affected.")) return;
    try {
      await deleteFileRecord(user.uid, id);
      setFiles(p => p.filter(f => f.id !== id));
      toast("File record removed.");
    } catch {
      toast("Couldn't delete record.");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteErr("");
    if (!deletePw) { setDeleteErr("Enter your password to confirm."); return; }
    setDeletePhase("working");
    try {
      await deleteAccountWithReauth(deletePw);
      // Firebase signs the user out implicitly. Trigger our cleanup too.
      try { unenrollBiometric(user.email); } catch {}
      onLogout();
    } catch (err) {
      setDeletePhase("idle");
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setDeleteErr("That password isn't right. Try again.");
      } else if (err.code === "auth/too-many-requests") {
        setDeleteErr("Too many attempts. Wait a minute and try again.");
      } else {
        setDeleteErr(err.message || "Couldn't delete the account.");
      }
    }
  };

  const initial = (profile?.name || user.name || user.email || "U")[0].toUpperCase();
  const memberSince = profile?.createdAt ? formatDate(profile.createdAt) : "—";
  const otpVerified = !!profile?.otpVerifiedAt;
  const filesCount  = files.length;
  const totalBytes  = files.reduce((s, f) => s + (f.size || 0), 0);

  return (
    <div style={styles.page} className="fade-up">
      {/* Top bar with back button */}
      <div style={styles.topBar}>
        <button onClick={onBack} style={styles.backBtn}>← Back to Vault</button>
        {savedToast && <span style={styles.toast}>{savedToast}</span>}
      </div>

      {/* Header card */}
      <div style={styles.headerCard}>
        <div style={styles.avatarLarge}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <div style={styles.inlineEditRow}>
              <input className="input" value={nameDraft} autoFocus
                onChange={e => setNameDraft(e.target.value)}
                style={{ fontSize: 18, fontWeight: 600 }} />
              <button onClick={handleSaveName} disabled={saving} style={styles.saveBtn}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setEditingName(false); setNameDraft(profile?.name || user.name || ""); }}
                style={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={styles.nameRow}>
              <h1 style={styles.name}>{profile?.name || user.name}</h1>
              <button onClick={() => setEditingName(true)} style={styles.iconBtn} title="Edit name">✏️</button>
            </div>
          )}
          <div style={styles.email}>{user.email}</div>
          <div style={styles.badges}>
            {otpVerified && <span className="badge badge-green">✓ Email verified (OTP)</span>}
            {biometricEnabled && <span className="badge badge-cyan">👆 Biometric enabled</span>}
            {!isFirebaseUser && <span className="badge badge-amber">Biometric session</span>}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={styles.statsGrid}>
        <Stat label="Files in vault" value={filesCount} accent="cyan" />
        <Stat label="Total encrypted" value={formatBytes(totalBytes)} accent="violet" />
        <Stat label="Activity events" value={events.length} accent="green" />
        <Stat label="Member since" value={memberSince === "—" ? "—" : memberSince.split(",")[0]} accent="amber" small />
      </div>

      {/* Personal information */}
      <Section title="Personal Information">
        <Row label="Display name">
          <span style={styles.rowValue}>{profile?.name || user.name}</span>
          {!editingName && <button onClick={() => setEditingName(true)} style={styles.rowEdit}>Edit</button>}
        </Row>
        <Row label="Email">
          <span style={styles.rowValue}>{user.email}</span>
          <span style={styles.rowHint}>Email is your sign-in identity and can't be changed here.</span>
        </Row>
        <Row label="Phone number">
          {editingPhone ? (
            <div style={styles.inlineEditRow}>
              <input className="input" type="tel" placeholder="+1 555 123 4567"
                value={phoneDraft} onChange={e => setPhoneDraft(e.target.value)} autoFocus />
              <button onClick={handleSavePhone} disabled={saving} style={styles.saveBtn}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setEditingPhone(false); setPhoneDraft(profile?.phone || ""); }}
                style={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span style={styles.rowValue}>
                {profile?.phone || <em style={{ color: "var(--text-muted)" }}>Not set</em>}
              </span>
              <button onClick={() => setEditingPhone(true)} style={styles.rowEdit}>
                {profile?.phone ? "Edit" : "Add"}
              </button>
            </>
          )}
        </Row>
      </Section>

      {/* Security */}
      <Section title="Security">
        <Row label="Account type">
          <span style={styles.rowValue}>
            {isFirebaseUser ? "Standard (password + OTP verified)" : "Biometric-only session"}
          </span>
        </Row>
        <Row label="Biometric login">
          <span style={styles.rowValue}>
            {biometricEnabled ? "Enabled on this device" : "Not enabled"}
          </span>
          <span style={styles.rowHint}>Manage from the sidebar's "Biometric Login" card.</span>
        </Row>
        <Row label="Account created">
          <span style={styles.rowValue}>{memberSince}</span>
        </Row>
        {auth?.currentUser?.metadata?.lastSignInTime && (
          <Row label="Last sign-in">
            <span style={styles.rowValue}>
              {new Date(auth.currentUser.metadata.lastSignInTime).toLocaleString()}
            </span>
          </Row>
        )}
      </Section>

      {/* Encrypted files */}
      <Section title={`Encrypted Files (${filesCount})`}
        right={loading ? <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading…</span> : null}>
        {!loading && filesCount === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 36, opacity: 0.5 }}>📁</div>
            <p style={styles.emptyText}>
              No encrypted files yet. Go to <strong>🔐 Encrypt / Decrypt</strong> and encrypt your first file —
              its metadata (just name, size, and checksum, never the content) will appear here.
            </p>
          </div>
        )}
        {files.length > 0 && (
          <div style={styles.filesList}>
            {files.map(f => (
              <div key={f.id} style={styles.fileRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.fileName}>{f.svaultName || f.originalName}</div>
                  <div style={styles.fileMeta}>
                    <span>{formatBytes(f.size)}</span>
                    <span>•</span>
                    <span>{relativeTime(f.uploadedAt)}</span>
                    {f.checksum && <>
                      <span>•</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {f.checksum.slice(0, 12)}…
                      </span>
                    </>}
                  </div>
                </div>
                <button onClick={() => handleDeleteFile(f.id)} style={styles.deleteRowBtn}
                  title="Remove this file from your history">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recent activity */}
      <Section title="Recent Activity">
        {!loading && events.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No activity yet.</p>
          </div>
        )}
        {events.length > 0 && (
          <div style={styles.eventsList}>
            {events.slice(0, 12).map(ev => (
              <div key={ev.id} style={styles.eventRow}>
                <span style={styles.eventDot} />
                <div style={{ flex: 1 }}>
                  <div style={styles.eventDetail}>{ev.detail}</div>
                  <div style={styles.eventTime}>{relativeTime(ev.timestamp)}</div>
                </div>
                <span className={`badge badge-${ev.risk === "HIGH" ? "red" : ev.risk === "MEDIUM" ? "amber" : "green"}`}>
                  {ev.risk || "SAFE"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Danger zone */}
      <div style={styles.dangerZone}>
        <h2 style={styles.dangerTitle}>⚠️ Danger Zone</h2>
        <p style={styles.dangerSub}>
          These actions affect your sign-in or remove your data.
        </p>

        <div style={styles.dangerActions}>
          <button onClick={onLogout} style={styles.logoutBtn} title="Log out">
            ⎋ Log Out of this device
          </button>
          <button onClick={() => setDeleteOpen(true)} style={styles.deleteAcctBtn}
            disabled={!isFirebaseUser}
            title={isFirebaseUser ? "Permanently delete your account" : "Available only for Firebase accounts"}>
            🗑 Delete Account
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteOpen && (
        <div style={styles.modalBack} onClick={() => deletePhase === "idle" && setDeleteOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Delete your account?</h2>
            <p style={styles.modalText}>
              This permanently removes your sign-in, your saved file records, and any
              activity logs from Firebase. <strong>This can't be undone.</strong>
            </p>
            <p style={styles.modalText}>
              <strong>What stays:</strong> any <code style={styles.codeChip}>.svault</code> files you already downloaded
              remain on your computer — they're still decryptable with the password you used.
            </p>

            <label style={styles.modalLabel}>
              Re-enter your password to confirm
            </label>
            <input className="input" type="password" autoFocus
              value={deletePw} onChange={e => setDeletePw(e.target.value)}
              placeholder="Current password" />

            {deleteErr && <div style={styles.modalError}>{deleteErr}</div>}

            <div style={styles.modalActions}>
              <button onClick={() => setDeleteOpen(false)} disabled={deletePhase === "working"}
                style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={!deletePw || deletePhase === "working"}
                style={styles.confirmDeleteBtn}>
                {deletePhase === "working" ? "Deleting…" : "Yes, delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── small helpers ───── */
function Section({ title, right, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHead}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {right}
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  );
}
function Row({ label, children }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>{label}</div>
      <div style={styles.rowMain}>{children}</div>
    </div>
  );
}
function Stat({ label, value, accent, small }) {
  const colors = {
    cyan:   "var(--accent-cyan)",
    violet: "var(--accent-violet)",
    green:  "var(--accent-green)",
    amber:  "var(--accent-amber)",
  };
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statValue, color: colors[accent], fontSize: small ? 18 : 26 }}>
        {value}
      </div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

/* ───── styles ───── */
const styles = {
  page:  { maxWidth: 980, display: "flex", flexDirection: "column", gap: 24 },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 },
  backBtn: {
    background: "transparent", border: "1.5px solid var(--border-bright)",
    color: "var(--text-secondary)", padding: "8px 14px", borderRadius: "var(--radius-md)",
    cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
  },
  toast: {
    fontSize: 13, fontWeight: 600,
    background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.30)",
    color: "var(--accent-green)",
    padding: "6px 14px", borderRadius: 100,
  },

  headerCard: {
    display: "flex", gap: 22, alignItems: "center",
    padding: 24,
    background: "var(--bg-card)",
    border: "1px solid var(--border-bright)",
    borderRadius: "var(--radius-xl)",
    boxShadow: "var(--shadow-md)",
  },
  avatarLarge: {
    width: 88, height: 88, borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 36, fontWeight: 700, color: "white", flexShrink: 0,
    fontFamily: "Space Grotesk, sans-serif",
    boxShadow: "0 0 32px rgba(167,139,250,0.35)",
  },
  nameRow: { display: "flex", alignItems: "center", gap: 12 },
  name:   {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em",
    color: "var(--text-primary)",
  },
  email:  { fontSize: 14, color: "var(--text-secondary)", marginTop: 2 },
  badges: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
  iconBtn: {
    background: "transparent", border: "1px solid var(--border-bright)",
    borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 14,
  },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 },
  statCard:  {
    padding: 18,
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    display: "flex", flexDirection: "column", gap: 6,
  },
  statValue: {
    fontFamily: "Space Grotesk, sans-serif",
    fontWeight: 700, letterSpacing: "-0.02em",
  },
  statLabel: { fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.04em" },

  section: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  sectionHead: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 22px",
    borderBottom: "1px solid var(--border)",
  },
  sectionTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 17, fontWeight: 700,
    color: "var(--text-primary)",
  },
  sectionBody: { padding: 8 },

  row: {
    display: "grid", gridTemplateColumns: "180px 1fr",
    gap: 16, alignItems: "center",
    padding: "14px 18px", borderRadius: "var(--radius-sm)",
  },
  rowLabel: {
    fontSize: 13, color: "var(--text-secondary)", fontWeight: 600,
    letterSpacing: "0.04em",
  },
  rowMain: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  rowValue: { fontSize: 14, color: "var(--text-primary)", fontWeight: 500 },
  rowHint:  { fontSize: 12, color: "var(--text-muted)", flexBasis: "100%" },
  rowEdit:  {
    background: "transparent", border: "none", color: "var(--accent-cyan)",
    fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px 8px",
  },

  inlineEditRow: { display: "flex", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" },
  saveBtn: {
    background: "var(--accent-cyan)", color: "var(--bg-primary)",
    border: "none", borderRadius: "var(--radius-sm)",
    padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
  },
  cancelBtn: {
    background: "transparent",
    border: "1.5px solid var(--border-bright)", borderRadius: "var(--radius-sm)",
    color: "var(--text-secondary)", padding: "8px 14px",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },

  emptyState: { padding: "32px 24px", textAlign: "center" },
  emptyText:  { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 8 },

  filesList: { display: "flex", flexDirection: "column", gap: 6, padding: 8 },
  fileRow:   {
    display: "flex", alignItems: "center", gap: 14,
    padding: "12px 14px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
  },
  fileName:  {
    fontSize: 14, fontWeight: 600,
    color: "var(--accent-cyan)",
    fontFamily: "JetBrains Mono, monospace",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  fileMeta:  {
    display: "flex", gap: 8, marginTop: 4,
    fontSize: 12, color: "var(--text-secondary)",
  },
  deleteRowBtn: {
    background: "transparent", border: "1px solid var(--border-bright)",
    color: "var(--text-secondary)", borderRadius: 6,
    width: 32, height: 32, cursor: "pointer", fontSize: 14,
    flexShrink: 0,
  },

  eventsList: { display: "flex", flexDirection: "column", gap: 4, padding: 8 },
  eventRow:   {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
  },
  eventDot:   { width: 8, height: 8, borderRadius: "50%", background: "var(--accent-cyan)", flexShrink: 0 },
  eventDetail:{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" },
  eventTime:  { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },

  dangerZone: {
    padding: 24,
    background: "rgba(248,113,113,0.04)",
    border: "1.5px solid rgba(248,113,113,0.30)",
    borderRadius: "var(--radius-lg)",
  },
  dangerTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 18, fontWeight: 700,
    color: "var(--accent-red)",
  },
  dangerSub: { fontSize: 13, color: "var(--text-secondary)", marginTop: 6, marginBottom: 16 },
  dangerActions: { display: "flex", gap: 12, flexWrap: "wrap" },
  logoutBtn: {
    background: "rgba(248,113,113,0.10)",
    border: "1.5px solid rgba(248,113,113,0.35)",
    borderRadius: "var(--radius-md)",
    color: "var(--accent-red)",
    padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  },
  deleteAcctBtn: {
    background: "var(--accent-red)",
    border: "none",
    borderRadius: "var(--radius-md)",
    color: "white",
    padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  },

  modalBack: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    padding: 20, backdropFilter: "blur(4px)",
  },
  modal: {
    width: "100%", maxWidth: 480,
    background: "var(--bg-card)",
    border: "1px solid var(--border-bright)",
    borderRadius: "var(--radius-xl)",
    padding: 28,
    boxShadow: "var(--shadow-md)",
  },
  modalTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 22, fontWeight: 700,
    color: "var(--accent-red)",
    marginBottom: 14,
  },
  modalText: {
    fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12, letterSpacing: "0.08em",
    color: "var(--text-secondary)", fontWeight: 700,
    display: "block", marginTop: 10, marginBottom: 6,
  },
  modalError: {
    marginTop: 10, padding: "10px 14px",
    background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.30)",
    color: "var(--accent-red)", borderRadius: "var(--radius-sm)",
    fontSize: 13, fontWeight: 500,
  },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 },
  confirmDeleteBtn: {
    background: "var(--accent-red)", color: "white",
    border: "none", borderRadius: "var(--radius-sm)",
    padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
  },

  codeChip: {
    background: "var(--bg-secondary)",
    padding: "1px 6px", borderRadius: 4,
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 12, color: "var(--accent-cyan)",
  },
};
