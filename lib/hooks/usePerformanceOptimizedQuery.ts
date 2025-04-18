import { useEffect, useState, useRef, useCallback } from 'react';
import { useOptimizedQuery } from './useOptimizedQuery';
import { trackApiResponseTime } from '../utils/performanceMonitoring';
import { CACHE_DURATIONS } from '../utils/apiOptimizations';

interface UsePerformanceOptimizedQueryOptions<T> {
  queryFn: () => Promise<T>;
  key: string;
  params?: Record<string, any>;
  cacheDuration?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  initialData?: T;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * A hook for optimized data fetching with performance tracking
 */
export function usePerformanceOptimizedQuery<T>({
  queryFn,
  key,
  params,
  cacheDuration = CACHE_DURATIONS.MEDIUM,
  enabled = true,
  onSuccess,
  onError,
  initialData = null,
  retryCount = 3,
  retryDelay = 1000,
}: UsePerformanceOptimizedQueryOptions<T>) {
  // Track retry attempts
  const retryAttemptRef = useRef(0);
  
  // Create a wrapped query function that tracks performance
  const wrappedQueryFn = useCallback(async () => {
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      
      // Track API response time
      const endTime = performance.now();
      const duration = endTime - startTime;
      trackApiResponseTime(`${key}${params ? `:${JSON.stringify(params)}` : ''}`, duration);
      
      // Reset retry attempts on success
      retryAttemptRef.current = 0;
      
      return result;
    } catch (error) {
      // Handle retries
      if (retryAttemptRef.current < retryCount) {
        retryAttemptRef.current++;
        
        // Exponential backoff for retries
        const delay = retryDelay * Math.pow(2, retryAttemptRef.current - 1);
        
        console.log(`Retrying query (${retryAttemptRef.current}/${retryCount}) after ${delay}ms...`);
        
        // Wait for the delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the query
        return queryFn();
      }
      
      // If we've exhausted retries, throw the error
      throw error;
    }
  }, [queryFn, key, params, retryCount, retryDelay]);
  
  // Use the optimized query hook with our wrapped query function
  const result = useOptimizedQuery({
    queryFn: wrappedQueryFn,
    key,
    params,
    cacheDuration,
    enabled,
    onSuccess,
    onError,
    initialData,
  });
  
  return result;
}
