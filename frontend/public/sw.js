/**
 * Service worker minimo.
 *
 * Guarda a casca do app (HTML, CSS e JS) para que ele abra mesmo sem rede.
 * As chamadas da API nunca sao cacheadas: monitoramento com dado velho seria
 * pior do que nenhum dado.
 */
const CACHE = 'vinherias-v1'
const CASCA = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CASCA)))
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url)

  // Dados sempre da rede: nunca mostrar leitura antiga como se fosse atual
  if (url.pathname.startsWith('/api')) return

  evento.respondWith(
    caches.match(evento.request).then((resposta) => resposta || fetch(evento.request))
  )
})
