/* PlanFit · service worker: funciona sin conexión y avisa cuando hay versión nueva.
   IMPORTANTE: cada vez que cambies cualquier archivo, sube el número de VERSION. */
const VERSION = "1.1.0";
const CACHE = "planfit-" + VERSION;

const ARCHIVOS = [
  "./", "index.html", "styles.css", "manifest.webmanifest",
  "js/data.js", "js/store.js", "js/pdf-lib.js", "js/pdf-plan.js",
  "js/ui-base.js", "js/ui-grafica.js", "js/ui-editor.js", "js/ui-vistas.js", "js/app.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(ARCHIVOS.map((a) => c.add(new Request(a, { cache: "reload" })))))
  );
  // No se activa sola: la app muestra «Actualizar» y entonces se activa.
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("planfit-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.tipo === "SALTAR_ESPERA") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      }).catch(() => (req.mode === "navigate" ? caches.match("index.html") : Response.error()));
    })
  );
});
