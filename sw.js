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

        // Se non è in cache, la scarichiamo dalla rete con retry su 429
        const MAX_RETRIES = 3;
        const BASE_DELAY_MS = 800;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            const networkResponse = await fetch(request.url);

            if (networkResponse.status === 429 && attempt < MAX_RETRIES - 1) {
              const delay = BASE_DELAY_MS * (attempt + 1) + Math.random() * 400;
              swWarn(`Limite richieste (429). Retry ${attempt + 1}/${MAX_RETRIES - 1} tra ${Math.round(delay)}ms:`, request.url);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }

            if (networkResponse.ok || networkResponse.type === 'opaque') {
              await cache.put(request.url, networkResponse.clone());
              swLog('Immagine salvata in cache:', request.url);
            }

            return networkResponse;
          } catch (error) {
            if (attempt < MAX_RETRIES - 1) continue;
            swError('Download immagine fallito (offline e non in cache):', error);
          }
        }

        return (await cache.match('/img/no-image.jpg')) || Response.error();
      })
    );
  }
});