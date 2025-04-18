import { fetchBaseQuery } from '@reduxjs/toolkit/query';
import { supabase } from '../supabaseClient';

// Cache duration in seconds
export const CACHE_DURATIONS = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 86400, // 24 hours
};

// Optimized fetch base query with retry logic and timeout
export const optimizedFetchBaseQuery = (baseUrl: string) => 
  fetchBaseQuery({
    baseUrl,
    prepareHeaders: async (headers) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set('authorization', `Bearer ${session.access_token}`);
      }
      return headers;
    },
    fetchFn: async (input, init) => {
      const controller = new AbortController();
      const { signal } = controller;
      
      // Set timeout for requests
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
      
      try {
        // Add signal to request
        const response = await fetch(input, {
          ...init,
          signal,
        });
        
        return response;
      } catch (error) {
        // If request was aborted due to timeout
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
  });

// Helper to determine if we should refetch data based on last fetch time
export const shouldRefetch = (lastFetchTime: number | null, cacheDuration: number = CACHE_DURATIONS.MEDIUM): boolean => {
  if (!lastFetchTime) return true;
  
  const now = Date.now();
  return now - lastFetchTime > cacheDuration * 1000;
};

// Cache key generator for consistent cache keys
export const generateCacheKey = (endpoint: string, params?: Record<string, any>): string => {
  if (!params) return endpoint;
  
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);
  
  return `${endpoint}:${JSON.stringify(sortedParams)}`;
};

// Local storage cache helpers
export const cacheHelpers = {
  get: <T>(key: string): { data: T; timestamp: number } | null => {
    try {
      const item = localStorage.getItem(`api_cache:${key}`);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      return parsed;
    } catch (error) {
      console.error('Error retrieving from cache:', error);
      return null;
    }
  },
  
  set: <T>(key: string, data: T): void => {
    try {
      const item = {
        data,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(`api_cache:${key}`, JSON.stringify(item));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(`api_cache:${key}`);
    } catch (error) {
      console.error('Error removing from cache:', error);
    }
  },
  
  clear: (): void => {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('api_cache:'))
        .forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
};

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

export const deduplicateRequest = async <T>(
  cacheKey: string, 
  requestFn: () => Promise<T>
): Promise<T> => {
  // Check if there's already a pending request with the same key
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Create and store the promise
  const promise = requestFn().finally(() => {
    // Remove from pending requests when done
    pendingRequests.delete(cacheKey);
  });
  
  pendingRequests.set(cacheKey, promise);
  return promise;
};

// Batch request helper
export const batchRequests = async <T>(
  requests: (() => Promise<T>)[],
  batchSize = 3
): Promise<T[]> => {
  const results: T[] = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(req => req()));
    results.push(...batchResults);
  }
  
  return results;
};
