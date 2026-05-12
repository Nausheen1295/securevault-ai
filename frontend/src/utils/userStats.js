import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "./firebase";
import { isEnrolled } from "./webauthn";

const EMPTY = {
  filesEncrypted: 0,
  threatsBlocked: 0,
  blockchainKeys: 0,
  zkLinks:        0,
  highThreats:    0,
  mediumThreats:  0,
  totalEvents:    0,
};

const DEMO = {
  filesEncrypted: 1284,
  threatsBlocked: 47,
  blockchainKeys: 8,
  zkLinks:        3,
  highThreats:    2,
  mediumThreats:  5,
  totalEvents:    312,
};

export async function fetchUserStats(uid) {
  if (!isFirebaseConfigured || !uid) return { ...EMPTY };
  try {
    const [filesSnap, keysSnap, eventsSnap] = await Promise.all([
      getDocs(collection(db, "users", uid, "files")),
      getDocs(collection(db, "users", uid, "keys")),
      getDocs(collection(db, "users", uid, "events")),
    ]);
    const events = eventsSnap.docs.map(d => d.data());
    const scans  = events.filter(e => e.type === "scan");
    return {
      filesEncrypted: filesSnap.size,
      threatsBlocked: scans.filter(e => e.risk === "HIGH" || e.risk === "MEDIUM").length,
      blockchainKeys: keysSnap.size,
      zkLinks:        events.filter(e => e.type === "share").length,
      highThreats:    scans.filter(e => e.risk === "HIGH").length,
      mediumThreats:  scans.filter(e => e.risk === "MEDIUM").length,
      totalEvents:    events.length,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function computeThreatLevel(stats) {
  if (stats.highThreats > 0)
    return { level: "HIGH",   color: "var(--accent-red)",   badge: "badge-red",   percent: 82 };
  if (stats.mediumThreats > 0)
    return { level: "MEDIUM", color: "var(--accent-amber)", badge: "badge-amber", percent: 50 };
  return     { level: "LOW",    color: "var(--accent-green)", badge: "badge-green", percent: 14 };
}

export function computeSecurityScore({ filesEncrypted, biometricEnabled, verified, threatsBlocked }) {
  let s = 40;                              // baseline for having an account
  if (filesEncrypted >= 1)  s += 10;       // first encryption
  if (filesEncrypted >= 5)  s += 5;        // some activity
  if (filesEncrypted >= 20) s += 5;        // active user
  if (biometricEnabled)     s += 15;       // strong 2nd factor
  if (verified)             s += 15;       // OTP-verified email
  if (threatsBlocked >= 1)  s += 10;       // proactive scanning
  return Math.min(100, s);
}

/* React hook used by Sidebar, StatsBar, and elsewhere */
export function useUserStats(user) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setStats(null); setLoading(false); return;
      }
      if (user.isGuest) {
        if (cancelled) return;
        setStats({
          ...DEMO,
          biometricEnabled: false,
          verified:         false,
          isDemo:           true,
        });
        setLoading(false);
        return;
      }
      const base = await fetchUserStats(user.uid);
      if (cancelled) return;
      setStats({
        ...base,
        biometricEnabled: isEnrolled(user.email),
        verified:         !!auth?.currentUser,   // OTP-verified by construction
        isDemo:           false,
      });
      setLoading(false);
    }

    setLoading(true);
    load();
    return () => { cancelled = true; };
  }, [user?.uid, user?.isGuest, user?.email]);

  return { stats: stats || { ...EMPTY, isDemo: !!user?.isGuest, biometricEnabled: false, verified: false }, loading };
}
