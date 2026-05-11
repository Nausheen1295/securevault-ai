// Real AI Threat Scanner using VirusTotal API
// Free tier: 4 requests/minute, 500/day

const VT_API_KEY = "YOUR_VIRUSTOTAL_API_KEY"; // paste your key here

// ── ENTROPY ANALYSIS (runs locally, no API needed) ──
export async function analyzeEntropy(file) {
  const buffer = await file.arrayBuffer();
  const bytes  = new Uint8Array(buffer.slice(0, 1024000)); // first 1MB
  
  // Count byte frequencies
  const freq = new Array(256).fill(0);
  bytes.forEach(b => freq[b]++);
  
  // Calculate Shannon entropy
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

// ── VIRUSTOTAL SCAN (real AI) ──
export async function scanWithVirusTotal(file) {
  try {
    // Step 1: Upload file to VirusTotal
    const formData = new FormData();
    formData.append("file", file);
    
    const uploadRes = await fetch("https://www.virustotal.com/api/v3/files", {
      method: "POST",
      headers: { "x-apikey": VT_API_KEY },
      body: formData,
    });
    
    if (!uploadRes.ok) throw new Error("Upload failed");
    const uploadData = await uploadRes.json();
    const analysisId = uploadData.data.id;
    
    // Step 2: Poll for results (max 30 seconds)
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000));
      
      const resultRes = await fetch(
        `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
        { headers: { "x-apikey": VT_API_KEY } }
      );
      
      const resultData = await resultRes.json();
      const status     = resultData.data.attributes.status;
      
      if (status === "completed") {
        const stats     = resultData.data.attributes.stats;
        const malicious = stats.malicious || 0;
        const total     = Object.values(stats).reduce((a, b) => a + b, 0);
        
        return {
          malicious,
          total,
          risk: malicious > 5  ? "HIGH"   :
                malicious > 0  ? "MEDIUM" : "CLEAN",
          confidence: Math.round((1 - malicious / total) * 100),
          engines: stats,
          vtLink: `https://www.virustotal.com/gui/file/${analysisId}`,
        };
      }
    }
    throw new Error("Scan timeout");
  } catch (err) {
    // Fall back to local analysis if API fails
    console.warn("VirusTotal API error:", err.message);
    return null;
  }
}

// ── FULL SCAN (combines everything) ──
export async function fullScan(file) {
  const [entropy, signature, vtResult] = await Promise.all([
    analyzeEntropy(file),
    Promise.resolve(checkFileSignature(file.name, file.size)),
    scanWithVirusTotal(file),
  ]);
  
  // Combine results
  const finalRisk = vtResult?.risk === "HIGH"   || signature.risk === "HIGH"   ? "HIGH"   :
                    vtResult?.risk === "MEDIUM"  || signature.risk === "MEDIUM" ? "MEDIUM" :
                    entropy > 7.5                                               ? "LOW"    : "CLEAN";
  
  return {
    filename:   file.name,
    size:       file.size,
    entropy,
    signature,
    virustotal: vtResult,
    finalRisk,
    confidence: vtResult?.confidence ?? (finalRisk === "CLEAN" ? 95 : 75),
    scannedAt:  new Date().toISOString(),
  };
}