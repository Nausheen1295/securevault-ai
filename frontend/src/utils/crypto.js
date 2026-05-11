// AES-256-GCM encryption using Web Crypto API
// Zero-knowledge: keys are derived locally, never sent anywhere

const PBKDF2_ITERATIONS = 310000; // OWASP recommended 2023
const SALT_LEN = 16;
const IV_LEN   = 12;

export async function deriveKey(password, salt) {
  const enc     = new TextEncoder();
  const keyMat  = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFile(file, password) {
  const salt   = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv     = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key    = await deriveKey(password, salt);
  const buf    = await file.arrayBuffer();
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buf);

  // Layout: [salt 16B][iv 12B][ciphertext]
  const out = new Uint8Array(SALT_LEN + IV_LEN + cipher.byteLength);
  out.set(salt, 0);
  out.set(iv, SALT_LEN);
  out.set(new Uint8Array(cipher), SALT_LEN + IV_LEN);

  const checksum = await sha256Hex(out);
  return {
    blob: new Blob([out], { type: "application/octet-stream" }),
    checksum,
    size: out.byteLength,
    name: file.name + ".svault",
  };
}

export async function decryptFile(file, password) {
  const buf  = await file.arrayBuffer();
  const data = new Uint8Array(buf);

  const salt       = data.slice(0, SALT_LEN);
  const iv         = data.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = data.slice(SALT_LEN + IV_LEN);

  const key = await deriveKey(password, salt);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    const name  = file.name.endsWith(".svault") ? file.name.slice(0, -7) : file.name;
    return { blob: new Blob([plain]), name };
  } catch {
    throw new Error("Decryption failed — wrong password or tampered file.");
  }
}

export async function sha256Hex(data) {
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

export function generateZKLink(checksum, password) {
  // Zero-knowledge: password is NOT included in link — shared out-of-band
  const token   = btoa(JSON.stringify({ checksum, exp: Date.now() + 86400000, v: 1 }));
  return `${window.location.origin}/zk/${token}`;
}

export function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8)            score++;
  if (pw.length >= 14)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Fortress"];
  const colors = ["", "#ff3b6b", "#ffb020", "#f1c40f", "#00e5ff", "#00ff88"];
  return { score, label: labels[score] || "", color: colors[score] || "" };
}