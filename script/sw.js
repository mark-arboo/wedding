const CACHE_NAME = 'wedding-images-v1';

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
            console.log('Eliminazione vecchia cache:', cache);
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

  // Intercettiamo solo le richieste per le immagini
  if (request.destination === 'image' || request.url.startsWith('https://lh3.googleusercontent.com/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Cerca l'immagine in cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Trovata in cache! La restituiamo subito
          return cachedResponse;
        }

        // Se non è in cache, la scarichiamo dalla rete
        try {
          const networkResponse = await fetch(request);

          // Verifichiamo che la risposta sia valida prima di salvarla
          if (networkResponse && networkResponse.status === 200) {
            // Nota: cloniamo la risposta perché il body di una Response può essere letto una sola volta
            cache.put(request, networkResponse.clone());
          }

          return networkResponse;
        } catch (error) {
          console.error('Download immagine fallito (offline e non in cache):', error);
          // Opzionale: puoi restituire un'immagine di fallback / placeholder locale
          return cache.match('/img/no-image.jpg');
        }
      })
    );
  }
});