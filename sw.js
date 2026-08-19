const CACHE_NAME = 'wedding-images-v1';

// Logging centralizzato del Service Worker.
// In produzione i log informativi sono disattivati di default.
const SW_LOG_LEVEL = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1' ? 'debug' : 'error';

const SW_LOG_LEVELS = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

function canLog(level) {
  return SW_LOG_LEVELS[level] <= SW_LOG_LEVELS[SW_LOG_LEVEL];
}

function swLog(...args) {
  if (canLog('info')) {
    console.log(...args);
  }
}

function swWarn(...args) {
  if (canLog('warn')) {
    console.warn(...args);
  }
}

function swError(...args) {
  if (canLog('error')) {
    console.error(...args);
  }
}

// 1. Evento Install: opzionale, pulisce o prepara la cache
self.addEventListener('install', (event) => {
  // Forza il Service Worker ad attivarsi immediatamente senza attendere la chiusura della scheda
  self.skipWaiting();
});

// 2. Evento Activate: pulisce eventuali vecchie cache se cambi il nome (es. v2)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            swLog('Eliminazione vecchia cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Evento Fetch: intercetta le richieste HTTP
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isGoogleImage = url.origin === 'https://lh3.googleusercontent.com' && url.pathname.startsWith('/d/');

  // Intercettiamo solo le richieste per le immagini
  if (request.destination === 'image' || isGoogleImage) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Cerca l'immagine in cache
        const cachedResponse = await cache.match(request.url);
        if (cachedResponse) {
          // Trovata in cache! La restituiamo subito
          swLog('Immagine servita dalla cache:', request.url);
          return cachedResponse;
        }

        // Se non è in cache, la scarichiamo dalla rete
        try {
          const networkResponse = await fetch(request);

          // Verifichiamo che la risposta sia valida prima di salvarla
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            // Nota: cloniamo la risposta perché il body di una Response può essere letto una sola volta
            await cache.put(request.url, networkResponse.clone());
            swLog('Immagine salvata in cache:', request.url);
          }

          return networkResponse;
        } catch (error) {
          swError('Download immagine fallito (offline e non in cache):', error);
          // Opzionale: puoi restituire un'immagine di fallback / placeholder locale
          return cache.match('/img/no-image.jpg');
        }
      })
    );
  }
});