import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
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