import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-mode middleware that runs the Vercel-style serverless handler at api/chat.js.
// In production, Vercel runs the same file natively as a Node function.
function chatApiDevMiddleware(env) {
  return {
    name: 'chat-api-dev-middleware',
    configureServer(server) {
      // Promote .env values onto process.env so api/chat.js (which reads
      // process.env.GOOGLE_API_KEY) can find them in dev. Vercel does
      // this automatically in production.
      if (env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY) {
        process.env.GOOGLE_API_KEY = env.GOOGLE_API_KEY
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/chat')) return next()

        // Buffer the request body and surface it as req.body, matching Vercel's Node runtime.
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const raw = Buffer.concat(chunks).toString()
        try { req.body = raw ? JSON.parse(raw) : {} } catch { req.body = {} }

        // Add the small subset of Vercel's response helpers that the handler uses.
        res.status = (code) => { res.statusCode = code; return res }
        res.json   = (obj)  => {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(obj))
        }

        try {
          // Always-fresh import so edits to api/chat.js hot-reload on the next request.
          const mod = await server.ssrLoadModule('/api/chat.js')
          await mod.default(req, res)
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
          }
          res.end(JSON.stringify({ error: err?.message || 'Chat API middleware error' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), chatApiDevMiddleware(env)],
    server: {
      port: 3000,
      proxy: {
        '/api/vt': {
          target: 'https://www.virustotal.com',
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/vt/, '/api/v3'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.VT_API_KEY) proxyReq.setHeader('x-apikey', env.VT_API_KEY)
            })
          },
        },
      },
    },
  }
})
