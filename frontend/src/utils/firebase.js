import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
  updateProfile as fbUpdateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject,
  listAll
} from "firebase/storage";

// Reads from Vite env vars first (VITE_FIREBASE_*), falls back to inline placeholders.
// If config is incomplete, app runs in DEMO mode — see isFirebaseConfigured below.
const env = import.meta.env;
const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY             || "48d8c786aadbb009b9cb988ac3801b97b4048448e16c8cd55987a1c4e25dc71a",
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN         || "YOUR_AUTH_DOMAIN",
  projectId:         env.VITE_FIREBASE_PROJECT_ID          || "YOUR_PROJECT_ID",
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET      || "YOUR_STORAGE_BUCKET",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId:             env.VITE_FIREBASE_APP_ID              || "YOUR_APP_ID",
};

const isPlaceholder = (v) => !v || v.startsWith("YOUR_");
export const isFirebaseConfigured =
  !isPlaceholder(firebaseConfig.authDomain) &&
  !isPlaceholder(firebaseConfig.projectId) &&
  !isPlaceholder(firebaseConfig.appId);

let app     = null;
export let auth    = null;
export let db      = null;
export let storage = null;

if (isFirebaseConfigured) {
  app     = initializeApp(firebaseConfig);
  auth    = getAuth(app);
  db      = getFirestore(app);
  storage = getStorage(app);
} else if (typeof window !== "undefined") {
  console.warn(
    "[SecureVault] Firebase not configured — running in DEMO mode. " +
    "Add VITE_FIREBASE_* env vars to .env (or edit firebase.js) for persistence."
  );
}

// ── AUTH FUNCTIONS ──

function demoUser(email) {
  return { uid: `demo-${btoa(email).slice(0, 16)}`, email };
}

export async function registerUser(email, password, name) {
  if (!isFirebaseConfigured) {
    await new Promise(r => setTimeout(r, 400));
    return demoUser(email);
  }
  // The OTP step in the UI gates this call, so by the time we get here the
  // user has already proven control of the email. No Firebase email-link needed.
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", result.user.uid), {
    name,
    email,
    createdAt: serverTimestamp(),
    securityScore: 100,
    filesEncrypted: 0,
    threatsBlocked: 0,
    otpVerifiedAt: serverTimestamp(),
  });
  return result.user;
}

export async function loginUser(email, password) {
  if (!isFirebaseConfigured) {
    await new Promise(r => setTimeout(r, 400));
    return demoUser(email);
  }
  const result = await signInWithEmailAndPassword(auth, email, password);
  // Refresh so emailVerified reflects the latest state
  await reload(result.user);
  return result.user;
}

export async function resendVerificationEmail() {
  if (!isFirebaseConfigured || !auth.currentUser) {
    throw new Error("No user is currently signed in to resend verification for.");
  }
  await sendEmailVerification(auth.currentUser);
}

export async function logoutUser() {
  if (!isFirebaseConfigured) return;
  await signOut(auth);
}

export function onAuthChange(callback) {
  if (!isFirebaseConfigured) return () => {};
  return onAuthStateChanged(auth, callback);
}

// ── USER PROFILE ──

export async function getUserProfile(uid) {
  if (!isFirebaseConfigured || !uid) return null;
  const docRef  = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function updateUserProfile(uid, data) {
  if (!isFirebaseConfigured || !uid) return;
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

export async function updateDisplayName(name) {
  if (!isFirebaseConfigured || !auth?.currentUser) return;
  await fbUpdateProfile(auth.currentUser, { displayName: name });
  await setDoc(doc(db, "users", auth.currentUser.uid), { name }, { merge: true });
}

export async function deleteAccountWithReauth(password) {
  if (!isFirebaseConfigured || !auth?.currentUser) {
    throw new Error("You're not signed in with a Firebase account.");
  }
  const user = auth.currentUser;
  if (!user.email) throw new Error("Account has no email on file.");
  // Re-authenticate. Firebase requires this for delete if the last sign-in was a while ago.
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  // Try to delete the Firestore profile first — non-fatal if it fails
  try { await deleteDoc(doc(db, "users", user.uid)); } catch { /* ignore */ }
  await deleteUser(user);
}

// ── FILE RECORDS (Firestore metadata) ──

export async function saveFileRecord(uid, fileData) {
  const ref = await addDoc(collection(db, "users", uid, "files"), {
    ...fileData,
    uploadedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserFiles(uid) {
  const q        = query(
    collection(db, "users", uid, "files"),
    orderBy("uploadedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteFileRecord(uid, fileId) {
  await deleteDoc(doc(db, "users", uid, "files", fileId));
}

// ── ENCRYPTED FILE STORAGE ──

export async function uploadEncryptedFile(uid, encryptedBlob, filename) {
  const storageRef = ref(storage, `users/${uid}/encrypted/${filename}`);
  await uploadBytes(storageRef, encryptedBlob);
  const url = await getDownloadURL(storageRef);
  return url;
}

export async function deleteStoredFile(uid, filename) {
  const storageRef = ref(storage, `users/${uid}/encrypted/${filename}`);
  await deleteObject(storageRef);
}

// ── SECURITY EVENTS LOG ──

export async function logSecurityEvent(uid, event) {
  await addDoc(collection(db, "users", uid, "events"), {
    ...event,
    timestamp: serverTimestamp(),
  });
}

export async function getSecurityEvents(uid) {
  const q        = query(
    collection(db, "users", uid, "events"),
    orderBy("timestamp", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── BLOCKCHAIN KEYS ──

export async function saveBlockchainKey(uid, keyData) {
  const ref = await addDoc(collection(db, "users", uid, "keys"), {
    ...keyData,
    createdAt: serverTimestamp(),
    status: "ACTIVE",
  });
  return ref.id;
}

export async function getUserKeys(uid) {
  const q        = query(
    collection(db, "users", uid, "keys"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── ZK SHARE LINKS ──

export async function saveShareLink(uid, linkData) {
  const ref = await addDoc(collection(db, "shareLinks"), {
    ...linkData,
    uid,
    createdAt: serverTimestamp(),
    views: 0,
  });
  return ref.id;
}

export async function getShareLink(linkId) {
  const docSnap = await getDoc(doc(db, "shareLinks", linkId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}