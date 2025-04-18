"use client";

import { Providers } from "@/app/providers";
import {
  registerServiceWorker,
  setupOfflineListeners,
} from "@/app/serviceWorker";
import { Toaster } from "@/components/ui/sonner";
import { OfflineIndicator, OnlineIndicator } from "@/components/ui/offline-indicator";
import authService from "@/lib/services/authService";
import { initPerformanceMonitoring } from "@/lib/utils/performanceMonitoring";
import { useEffect } from "react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize service worker
    registerServiceWorker();
    setupOfflineListeners();

    // Initialize authentication service
    authService.initialize();

    // Initialize performance monitoring
    initPerformanceMonitoring();
  }, []);

  return (
    <Providers>
      <Toaster position="top-right" richColors />
      <OfflineIndicator />
      <OnlineIndicator />
      {children}
    </Providers>
  );
}
