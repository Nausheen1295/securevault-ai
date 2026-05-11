import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
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

// PASTE YOUR CONFIG HERE
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize
const app       = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// ── AUTH FUNCTIONS ──

export async function registerUser(email, password, name) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  // Save user profile in Firestore
  await setDoc(doc(db, "users", result.user.uid), {
    name,
    email,
    createdAt: serverTimestamp(),
    securityScore: 100,
    filesEncrypted: 0,
    threatsBlocked: 0,
  });
  return result.user;
}

export async function loginUser(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── USER PROFILE ──

export async function getUserProfile(uid) {
  const docRef  = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function updateUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
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