// Have I Been Pwned password check using k-anonymity.
// Only the first 5 chars of the SHA-1 hash are sent to HIBP — the password
// itself, and the rest of the hash, never leave the device.
// https://haveibeenpwned.com/API/v3#PwnedPasswords

export async function checkPwnedPassword(password) {
  if (!password || password.length < 4) return { count: 0, checked: false };

  const enc  = new TextEncoder();
  const buf  = await crypto.subtle.digest("SHA-1", enc.encode(password));
  const hex  = Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const prefix = hex.slice(0, 5);
  const suffix = hex.slice(5);

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" }, // hides the real result length from the network
  });
  if (!res.ok) throw new Error("HIBP API error: " + res.status);
  const text = await res.text();

  for (const line of text.split("\n")) {
    const [hashSuffix, count] = line.trim().split(":");
    if (hashSuffix === suffix) {
      return { count: parseInt(count, 10), checked: true };
    }
  }
  return { count: 0, checked: true };
}
