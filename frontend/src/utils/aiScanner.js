// Real AI Threat Scanner using VirusTotal API via a server-side proxy.
// In dev: Vite proxies /api/vt → virustotal.com/api/v3 and injects x-apikey.
// In prod: /api/vt/[...path].js Vercel serverless function does the same.
// The API key never lives in client code.

const VT_BASE = "/api/vt";

// ── ENTROPY ANALYSIS (runs locally, no API needed) ──
export async function analyzeEntropy(file) {
  const buffer = await file.arrayBuffer();
  const bytes  = new Uint8Array(buffer.slice(0, 1024000)); // first 1MB

  const freq = new Array(256).fill(0);
  bytes.forEach(b => freq[b]++);

  let entropy = 0;
  const len   = bytes.length;
  freq.forEach(f => {
    if (f > 0) {
      const p  = f / len;
      entropy -= p * Math.log2(p);
    }
  });

  return +entropy.toFixed(2);
}

// ── FILE SIGNATURE CHECK (local) ──
export function checkFileSignature(filename, size) {
  const ext = "." + filename.split(".").pop().toLowerCase();

  const HIGH_RISK   = [".exe",".bat",".ps1",".vbs",".cmd",".msi",".scr",".jar",".com"];
  const MEDIUM_RISK = [".js",".vba",".macro",".zip",".rar",".7z"];
  const LOW_RISK    = [".pdf",".doc",".docx",".xls",".xlsx"];

  if (HIGH_RISK.includes(ext))   return { risk: "HIGH",   reason: "High-risk executable file type" };
  if (MEDIUM_RISK.includes(ext)) return { risk: "MEDIUM", reason: "Potentially dangerous file type" };
  if (LOW_RISK.includes(ext))    return { risk: "LOW",    reason: "Low risk but review recommended" };
  if (size > 100 * 1024 * 1024)  return { risk: "MEDIUM", reason: "Very large file — manual review recommended" };

  return { risk: "CLEAN", reason: "No signature threats detected" };
}

// ── VIRUSTOTAL SCAN (real, via proxy) ──
export async function scanWithVirusTotal(file) {
  // Free tier ceiling
  if (file.size > 32 * 1024 * 1024) {
    return { error: "File exceeds VirusTotal 32 MB free-tier limit" };
  }
  try {
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch(`${VT_BASE}/files`, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      const txt = await uploadRes.text();
      throw new Error(`HTTP ${uploadRes.status} — ${txt.slice(0, 120)}`);
    }
    const uploadData = await uploadRes.json();
    const analysisId = uploadData?.data?.id;
    if (!analysisId) throw new Error("No analysis ID returned");

    // Poll for results — up to ~45 s
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const resultRes  = await fetch(`${VT_BASE}/analyses/${analysisId}`);
      if (!resultRes.ok) continue;
      const resultData = await resultRes.json();
      const status     = resultData?.data?.attributes?.status;

      if (status === "completed") {
        const stats      = resultData.data.attributes.stats;
        const malicious  = stats.malicious  || 0;
        const suspicious = stats.suspicious || 0;
        const total      = Object.values(stats).reduce((a, b) => a + b, 0);
        const flagged    = malicious + suspicious;

        return {
          malicious,
          suspicious,
          total,
          risk: malicious > 3 ? "HIGH" : flagged > 0 ? "MEDIUM" : "CLEAN",
          confidence: Math.round((1 - flagged / Math.max(total, 1)) * 100),
          engines: stats,
          vtLink: `https://www.virustotal.com/gui/file-analysis/${analysisId}`,
        };
      }
    }
    return { error: "VirusTotal scan timed out (queue is busy, try again)" };
  } catch (err) {
    return { error: err.message };
  }
}

// ── FULL SCAN (combines all signals) ──
// `sensitivity` 0-100. Higher = stricter (lower entropy threshold).
export async function fullScan(file, sensitivity = 50) {
  const [entropy, signature, vtResult] = await Promise.all([
    analyzeEntropy(file),
    Promise.resolve(checkFileSignature(file.name, file.size)),
    scanWithVirusTotal(file),
  ]);

  const entropyThreshold = 8.0 - (sensitivity / 100) * 2.0; // 8.0 → 6.0
  const vtRisk    = vtResult?.risk;
  const finalRisk =
    vtRisk === "HIGH"   || signature.risk === "HIGH"   ? "HIGH"   :
    vtRisk === "MEDIUM" || signature.risk === "MEDIUM" ? "MEDIUM" :
    vtRisk === "CLEAN"                                 ? "CLEAN"  :
    entropy > entropyThreshold                         ? "LOW"    : "CLEAN";

  let detail;
  if (vtResult?.malicious !== undefined) {
    detail = vtResult.malicious > 0
      ? `VirusTotal: ${vtResult.malicious}/${vtResult.total} engines flagged this file`
      : `VirusTotal: clean (scanned by ${vtResult.total} engines)`;
  } else {
    detail = signature.reason + (vtResult?.error ? ` · VT: ${vtResult.error}` : "");
  }

  return {
    file,
    risk:        finalRisk,
    type:        signature.reason,
    detail,
    entropy,
    confidence:  vtResult?.confidence ?? (finalRisk === "CLEAN" ? 95 : 75),
    vtLink:      vtResult?.vtLink,
    vtMalicious: vtResult?.malicious,
    vtTotal:     vtResult?.total,
    vtError:     vtResult?.error,
    scannedAt:   new Date().toISOString(),
  };
}
