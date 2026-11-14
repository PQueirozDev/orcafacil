import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Só no desenvolvimento: serve as funções de /api (Vercel Functions) dentro do Vite,
 * para testar o pagamento localmente sem `vercel dev`. Em produção quem roda é a Vercel.
 */
function funcoesLocais(): Plugin {
  return {
    name: 'funcoes-locais',
    apply: 'serve',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''))
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
        if (!url.pathname.startsWith('/api/') || url.pathname.includes('_')) return next()
        try {
          const modulo = (await server.ssrLoadModule(`/api${url.pathname.slice(4)}.ts`)) as Record<string, (r: Request) => Promise<Response>>
          const handler = modulo[req.method ?? 'GET']
          if (!handler) {
            res.statusCode = 405
            return res.end()
          }
          const partes: Buffer[] = []
          for await (const p of req) partes.push(p as Buffer)
          const corpo = partes.length ? Buffer.concat(partes) : undefined
          const resposta = await handler(
            new Request(url, { method: req.method, headers: req.headers as Record<string, string>, body: corpo && req.method !== 'GET' ? corpo : undefined }),
          )
          res.statusCode = resposta.status
          resposta.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await resposta.arrayBuffer()))
        } catch (e) {
          server.config.logger.error(String(e))
          res.statusCode = 500
          res.end('erro na função local')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), funcoesLocais()],
})
