import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { type Plugin, defineConfig } from 'vite'
import { handle, memoryStore } from './api/analytics.ts'

/**
 * Local development: serve /api/analytics from the same code Vercel runs,
 * with an in-memory database and the admin password "dev".
 */
function devAnalytics(): Plugin {
  const store = memoryStore()
  return {
    name: 'pawnce-dev-analytics',
    configureServer(server) {
      server.middlewares.use('/api/analytics', async (req, res) => {
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const request = new Request(`http://localhost${req.originalUrl ?? req.url ?? ''}`, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
        })
        const response = await handle(request, { ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'dev' }, store)
        res.statusCode = response.status
        response.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await response.arrayBuffer()))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devAnalytics()],
  build: {
    // The app is one small bundle (~160 KB gzipped); only warn if it grows a lot.
    chunkSizeWarningLimit: 700,
  },
})
