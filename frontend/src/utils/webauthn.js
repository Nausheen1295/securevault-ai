// Biometric (WebAuthn) helpers.
// Credentials are bound to a specific email AND the current origin (browser-enforced).
// Local storage holds only the credential ID — the private key never leaves the
// platform authenticator (Windows Hello / Touch ID / Android keystore).

const STORAGE_KEY = "svault:webauthn";

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function isBiometricSupported() {
  return !!(window.PublicKeyCredential && navigator.credentials?.create && navigator.credentials?.get);
}

export async function isPlatformAuthenticatorAvailable() {
  if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) return false;
  try { return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }
  catch { return false; }
}

export function getEnrolledCredential(email) {
  if (!email) return null;
  return loadStore()[email.toLowerCase()] || null;
}

export function isEnrolled(email) {
  return !!getEnrolledCredential(email);
}

function bytesToB64Url(bytes) {
  let bin = "";
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64UrlToBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const b   = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

export async function enrollBiometric(email) {
  if (!isBiometricSupported()) throw new Error("WebAuthn is not supported in this browser.");
  if (!email) throw new Error("Email required to enroll biometric.");
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId    = crypto.getRandomValues(new Uint8Array(16));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp:   { name: "SecureVault AI", id: window.location.hostname },
      user: { id: userId, name: email, displayName: email.split("@")[0] },
      pubKeyCredParams: [
        { alg: -7,   type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    },
  });
  if (!credential) throw new Error("Enrollment cancelled.");

  const credId = bytesToB64Url(new Uint8Array(credential.rawId));
  const store  = loadStore();
  store[email.toLowerCase()] = {
    credId,
    enrolledAt: Date.now(),
    hostname:   window.location.hostname,
  };
  saveStore(store);
  return { credId };
}

export async function verifyBiometric(email) {
  const stored = getEnrolledCredential(email);
  if (!stored) {
    const err = new Error("No biometric credential is enrolled for this account on this device. Sign in with password first, then enable biometric from the sidebar.");
    err.code = "NOT_ENROLLED";
    throw err;
  }
  if (!isBiometricSupported()) throw new Error("WebAuthn is not supported in this browser.");

  const challenge   = crypto.getRandomValues(new Uint8Array(32));
  const credIdBytes = b64UrlToBytes(stored.credId);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: credIdBytes, type: "public-key" }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  if (!assertion) throw new Error("Biometric verification failed.");
  return true;
}

export function unenrollBiometric(email) {
  if (!email) return;
  const store = loadStore();
  delete store[email.toLowerCase()];
  saveStore(store);
}
