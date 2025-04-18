/**
 * Register the service worker with enhanced error handling and update management
 */
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    // Wait until the page is fully loaded
    window.addEventListener("load", async () => {
      try {
        // Register the service worker
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none" // Don't use cached service worker
        });

        console.log("ServiceWorker registered successfully with scope:", registration.scope);

        // Check for updates every 60 minutes
        setInterval(() => {
          registration.update().catch(err => {
            console.error("Error updating service worker:", err);
          });
        }, 60 * 60 * 1000);

        // Handle service worker updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          console.log("New service worker installing...");

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("New service worker installed and waiting to activate");
              // Notify the user about the update
              if (window.confirm("New version available! Reload to update?")) {
                // Send message to skip waiting
                newWorker.postMessage({ type: "skipWaiting" });
                // Reload the page to activate the new service worker
                window.location.reload();
              }
            }
          });
        });
      } catch (error) {
        console.error("ServiceWorker registration failed:", error);
      }
    });

    // Handle controller change (when a new service worker takes over)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("New service worker activated");
    });
  }
}

/**
 * Check if the application is currently offline
 */
export function isOffline() {
  return !navigator.onLine;
}

/**
 * Show a notification when the application is offline
 */
export function showOfflineNotification() {
  if (isOffline()) {
    console.log("You are currently offline. Some features may be limited.");
    // Show a toast notification to the user
    if (typeof window !== 'undefined' && window.document) {
      const event = new CustomEvent('offline-status', { detail: { isOffline: true } });
      window.dispatchEvent(event);
    }
  }
}

/**
 * Show a notification when the application is back online
 */
export function showOnlineNotification() {
  console.log("You are back online.");
  // Show a toast notification to the user
  if (typeof window !== 'undefined' && window.document) {
    const event = new CustomEvent('offline-status', { detail: { isOffline: false } });
    window.dispatchEvent(event);
  }
}

/**
 * Set up listeners for online/offline events
 */
export function setupOfflineListeners() {
  if (typeof window === 'undefined') return;

  // Initial check
  if (isOffline()) {
    showOfflineNotification();
  }

  // Handle coming back online
  window.addEventListener("online", () => {
    showOnlineNotification();

    // Attempt to revalidate any failed requests
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'revalidate'
      });
    }
  });

  // Handle going offline
  window.addEventListener("offline", () => {
    showOfflineNotification();
  });
}

/**
 * Clear the service worker cache
 */
export function clearCache() {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'clearCache'
    });
    console.log('Cache clear request sent to service worker');
    return true;
  }
  return false;
}
