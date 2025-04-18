"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { isOffline } from "@/app/serviceWorker";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Set initial state
    setOffline(isOffline());

    // Listen for offline status changes
    const handleOfflineStatus = (event: CustomEvent<{ isOffline: boolean }>) => {
      setOffline(event.detail.isOffline);
      
      if (event.detail.isOffline) {
        toast.error("You are offline. Some features may be limited.", {
          id: "offline-toast",
          duration: 5000,
        });
      } else {
        toast.success("You are back online!", {
          id: "online-toast",
          duration: 3000,
        });
      }
    };

    // Add event listener
    window.addEventListener('offline-status', handleOfflineStatus as EventListener);

    // Also listen to native online/offline events as a fallback
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Clean up
    return () => {
      window.removeEventListener('offline-status', handleOfflineStatus as EventListener);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Don't render anything if online
  if (!offline) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 z-50 animate-pulse">
      <WifiOff size={16} />
      <span className="text-sm font-medium">Offline</span>
    </div>
  );
}

export function OnlineIndicator() {
  const [showOnline, setShowOnline] = useState(false);

  useEffect(() => {
    // Only show the online indicator briefly when coming back online
    const handleOfflineStatus = (event: CustomEvent<{ isOffline: boolean }>) => {
      if (!event.detail.isOffline) {
        setShowOnline(true);
        setTimeout(() => setShowOnline(false), 3000);
      }
    };

    // Add event listener
    window.addEventListener('offline-status', handleOfflineStatus as EventListener);

    // Also listen to native online event as a fallback
    const handleOnline = () => {
      setShowOnline(true);
      setTimeout(() => setShowOnline(false), 3000);
    };
    
    window.addEventListener('online', handleOnline);

    // Clean up
    return () => {
      window.removeEventListener('offline-status', handleOfflineStatus as EventListener);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Don't render anything if not showing
  if (!showOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 z-50 animate-pulse">
      <Wifi size={16} />
      <span className="text-sm font-medium">Back Online</span>
    </div>
  );
}
