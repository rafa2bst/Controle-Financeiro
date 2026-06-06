/* Service Worker — Gestão Financeira
   Estratégia: network-first para o site (sempre busca atualizações),
   cache-first apenas para ícones/manifest (que mudam pouco).
   Isso mantém o app atualizado e ainda funciona offline pra abrir. */
const CACHE = "fin-v1";
const STATIC = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // sempre buscar fresco da rede pra HTML/site (pra pegar atualizações)
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return r;
      }).catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // ícones/manifest e mesmo domínio: cache primeiro, rede como fallback
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((r) =>
        r ||
        fetch(req).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return resp;
        })
      )
    );
    return;
  }
  // domínios externos (Supabase, CDN): deixa o navegador cuidar
});
