// @ts-nocheck

// Cache version - increment this when making changes to the service worker
const CACHE_VERSION = 2;
const CACHE_NAME = `crm-sales-cache-v${CACHE_VERSION}`;

// Assets that should be cached immediately during installation
const STATIC_ASSETS = [
  "/",
  "/favicon.ico",
  "/manifest.json",
  "/login",
  "/dashboard"
];

// Assets that should be cached as they are used
const CACHED_ASSETS = [
  "/dashboard",
  "/leads",
  "/leads-sources",
  "/contact",
  "/analytics",
  "/notifications"
];

// Maximum age for cached resources (in milliseconds)
const MAX_AGE = {
  staticAssets: 7 * 24 * 60 * 60 * 1000, // 7 days
  images: 3 * 24 * 60 * 60 * 1000,       // 3 days
  fonts: 30 * 24 * 60 * 60 * 1000,       // 30 days
  api: 5 * 60 * 1000                     // 5 minutes
};

/**
 * Helper function to determine if a cached response is expired
 */
function isExpired(response, maxAge) {
  if (!response || !response.headers || !response.headers.get('date')) {
    return true;
  }

  const dateHeader = response.headers.get('date');
  const parsedDate = new Date(dateHeader).getTime();
  const now = Date.now();

  return now - parsedDate > maxAge;
}

/**
 * Helper function to create a response with proper error handling
 */
function createErrorResponse(message, status = 503) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Helper function to determine if a request is for an API endpoint
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

/**
 * Helper function to determine if a request is for a static asset
 */
function isStaticAsset(url) {
  return STATIC_ASSETS.includes(url.pathname) ||
         CACHED_ASSETS.includes(url.pathname);
}

/**
 * Helper function to determine the appropriate max age for a request
 */
function getMaxAge(request) {
  const url = new URL(request.url);

  if (isApiRequest(url)) {
    return MAX_AGE.api;
  }

  if (isStaticAsset(url)) {
    return MAX_AGE.staticAssets;
  }

  if (request.destination === 'image') {
    return MAX_AGE.images;
  }

  if (request.destination === 'font') {
    return MAX_AGE.fonts;
  }

  return MAX_AGE.staticAssets; // Default
}

const CACHE_STRATEGIES = {
  /**
   * Cache-first strategy with expiration check
   * 1. Check cache first
   * 2. If cached response exists and is not expired, return it
   * 3. Otherwise, fetch from network and update cache
   */
  cacheFirst: async (request) => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      const maxAge = getMaxAge(request);

      // If we have a valid, non-expired cached response, use it
      if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      const networkResponse = await fetch(request);

      // Only cache successful responses
      if (networkResponse.ok) {
        // Clone the response before putting it in the cache
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    } catch (error) {
      console.error("cacheFirst strategy failed:", error);

      // Try to return cached response even if expired as a fallback
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      return createErrorResponse("Unable to fetch resource.");
    }
  },

  /**
   * Network-first strategy with improved error handling
   * 1. Try to fetch from network first
   * 2. If successful, update cache and return response
   * 3. If network fails, fall back to cache
   */
  networkFirst: async (request) => {
    try {
      // Try network first
      const networkResponse = await fetch(request);

      // Only cache successful responses
      if (networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    } catch (error) {
      console.error("networkFirst strategy failed:", error);

      // Fallback to cache if network request fails
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      // If API request, return a specific error for better UX
      if (isApiRequest(new URL(request.url))) {
        return createErrorResponse("API is currently unavailable. Please check your connection.", 503);
      }

      return createErrorResponse("Both network and cache failed.", 503);
    }
  },

  /**
   * Stale-while-revalidate strategy with improved implementation
   * 1. Return cached response immediately if available (even if stale)
   * 2. Fetch updated response from network in the background
   * 3. Update the cache with the new response
   */
  staleWhileRevalidate: async (request) => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      // Start network fetch in the background
      const networkPromise = fetch(request)
        .then(networkResponse => {
          // Only cache successful responses
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(error => {
          console.error("Background fetch failed:", error);
          // If we can't get a new version, the cached version is better than nothing
          return cachedResponse || createErrorResponse("Network request failed");
        });

      // Return the cached response immediately if we have one
      return cachedResponse || networkPromise;
    } catch (error) {
      console.error("staleWhileRevalidate strategy failed:", error);
      return createErrorResponse("Unable to fetch resource.");
    }
  },
};

/**
 * Service Worker Install Event
 * - Caches static assets
 * - Forces service worker to activate immediately
 */
self.addEventListener("install", (event) => {
  console.log(`[Service Worker] Installing version ${CACHE_VERSION}`);

  // Cache static assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force activation without waiting for all tabs to close
        console.log('[Service Worker] Skipping waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[Service Worker] Cache installation failed:", error);
      })
  );
});

/**
 * Service Worker Activate Event
 * - Cleans up old caches
 * - Claims clients so the service worker is in control immediately
 */
self.addEventListener("activate", (event) => {
  console.log(`[Service Worker] Activating version ${CACHE_VERSION}`);

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('crm-sales-cache-') && name !== CACHE_NAME)
            .map((name) => {
              console.log(`[Service Worker] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      }),

      // Take control of all clients immediately
      self.clients.claim().then(() => {
        console.log('[Service Worker] Claimed clients');
      })
    ]).catch((error) => {
      console.error("[Service Worker] Error during activation:", error);
    })
  );
});

/**
 * Service Worker Fetch Event
 * - Handles all fetch requests
 * - Applies different caching strategies based on request type
 */
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Determine the appropriate caching strategy
  let strategy;

  // Static assets use cache-first strategy
  if (STATIC_ASSETS.includes(url.pathname)) {
    strategy = CACHE_STRATEGIES.cacheFirst;
  }
  // API requests use network-first strategy
  else if (url.pathname.startsWith("/api/")) {
    // Special handling for authentication-related endpoints
    if (url.pathname.includes('/auth/')) {
      // Don't cache auth requests at all
      return;
    }
    strategy = CACHE_STRATEGIES.networkFirst;
  }
  // Navigation requests (HTML pages)
  else if (request.mode === 'navigate') {
    // For navigation requests, use network-first but fall back to index.html
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/') || createErrorResponse('Offline. Please check your connection.');
      })
    );
    return;
  }
  // Assets use stale-while-revalidate
  else if (
    request.destination === "image" ||
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font"
  ) {
    strategy = CACHE_STRATEGIES.staleWhileRevalidate;
  }
  // For other requests, use cache-first
  else if (CACHED_ASSETS.some(path => url.pathname.startsWith(path))) {
    strategy = CACHE_STRATEGIES.cacheFirst;
  }

  // Apply the selected strategy
  if (strategy) {
    event.respondWith(
      strategy(request).catch((error) => {
        console.error(`[Service Worker] Fetching failed for ${request.url}:`, error);
        return createErrorResponse("Resource not available.");
      })
    );
  }
});

/**
 * Listen for messages from clients
 */
self.addEventListener('message', (event) => {
  // Handle message to skip waiting and activate immediately
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  // Handle message to clear cache
  if (event.data === 'clearCache') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[Service Worker] Cache cleared');
    });
  }
});
