// Service worker do Orçafácil: deixa o app funcionando offline.
const VERSAO = 'orcafacil-v5'
const ESSENCIAIS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Páginas: tenta a rede primeiro; offline, usa o index.html salvo (SPA)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(async (res) => {
          const html = (res.headers.get('content-type') || '').includes('text/html')
          if (res.ok && html) {
            const copia = res.clone()
            caches.open(VERSAO).then((c) => c.put('/index.html', copia))
            return res
          }
          // Erro HTTP (ex.: 503 durante um deploy): usa a versão salva, se houver
          return (await caches.match('/index.html')) || res
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // Arquivos com hash (/assets) e fontes: cache primeiro
  const ehAsset = url.origin === self.location.origin && url.pathname.startsWith('/assets/')
  const ehFonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  if (ehAsset || ehFonte) {
    e.respondWith(
      caches.match(req).then(
        (salvo) =>
          salvo ||
          fetch(req).then((res) => {
            if (res.ok || res.type === 'opaque') {
              const copia = res.clone()
              caches.open(VERSAO).then((c) => c.put(req, copia))
            }
            return res
          }),
      ),
    )
    return
  }

  // Demais arquivos do próprio site: rede com fallback no cache
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).catch(async () => (await caches.match(req)) || Response.error()))
  }
})
