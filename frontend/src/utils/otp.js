// One-time-password verification for signup.
// Sends a 6-digit code via EmailJS (browser-only, no backend needed).
// If EmailJS isn't configured, falls back to dev mode: the code is returned
// to the caller so the UI can display it for testing.

import emailjs from "@emailjs/browser";

const env = import.meta.env;
const SERVICE_ID  = env.VITE_EMAILJS_SERVICE_ID  || "";
const TEMPLATE_ID = env.VITE_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY  = env.VITE_EMAILJS_PUBLIC_KEY  || "";

const isPlaceholder = (v) => !v || v.startsWith("YOUR_");
export const isEmailJsConfigured =
  !isPlaceholder(SERVICE_ID) && !isPlaceholder(TEMPLATE_ID) && !isPlaceholder(PUBLIC_KEY);

export function generateOtp() {
  // Cryptographically random 6-digit code (uniform-ish; the slight modulo bias is fine for OTP)
  const buf = crypto.getRandomValues(new Uint32Array(1));
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

export async function sendOtpEmail(email, otp, name) {
  if (!isEmailJsConfigured) {
    return { ok: true, dev: true };
  }
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: email,
        to_name:  name || email.split("@")[0],
        otp_code: otp,
        app_name: "SecureVault AI",
      },
      { publicKey: PUBLIC_KEY },
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.text || err?.message || "Couldn't send OTP email." };
  }
}
