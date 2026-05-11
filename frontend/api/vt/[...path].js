// Vercel serverless function — proxies /api/vt/* to VirusTotal v3 with the API key.
// The key lives only in the Vercel project's environment variables (server-side).
// Edge runtime is used because it streams request/response bodies, which lets us
// forward multipart file uploads up to Vercel's 4.5 MB hobby-tier body limit.

export const config = { runtime: "edge" };

export default async function handler(req) {
  const apiKey = process.env.VT_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "VT_API_KEY env var not set on server" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const url   = new URL(req.url);
  const parts = url.pathname.split("/api/vt/")[1] || "";
  const target = `https://www.virustotal.com/api/v3/${parts}${url.search}`;

  const headers = new Headers(req.headers);
  headers.set("x-apikey", apiKey);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("cookie");

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    duplex: "half",
  });

  const respHeaders = new Headers(upstream.headers);
  respHeaders.set("access-control-allow-origin", "*");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
