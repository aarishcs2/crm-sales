import { useEffect, useState, useRef } from 'react';
import { cacheHelpers, shouldRefetch, generateCacheKey, CACHE_DURATIONS } from '../utils/apiOptimizations';

interface UseOptimizedQueryOptions<T> {
  queryFn: () => Promise<T>;
  key: string;
  params?: Record<string, any>;
  cacheDuration?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  initialData?: T;
}

interface UseOptimizedQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<T>;
  isFetching: boolean;
}

/**
 * A hook for optimized data fetching with caching
 */
export function useOptimizedQuery<T>({
  queryFn,
  key,
  params,
  cacheDuration = CACHE_DURATIONS.MEDIUM,
  enabled = true,
  onSuccess,
  onError,
  initialData = null,
}: UseOptimizedQueryOptions<T>): UseOptimizedQueryResult<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  
  // Use refs to track last fetch time and abort controller
  const lastFetchTimeRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Generate a consistent cache key
  const cacheKey = generateCacheKey(key, params);
  
  // Function to fetch data
  const fetchData = async (force = false): Promise<T> => {
    // Check if we should use cached data
    if (!force && !shouldRefetch(lastFetchTimeRef.current, cacheDuration)) {
      return data as T;
    }
    
    // Check if there's a cached version
    const cachedData = cacheHelpers.get<T>(cacheKey);
    if (!force && cachedData && !shouldRefetch(cachedData.timestamp, cacheDuration)) {
      setData(cachedData.data);
      setIsLoading(false);
      setIsError(false);
      setError(null);
      lastFetchTimeRef.current = cachedData.timestamp;
      return cachedData.data;
    }
    
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsFetching(true);
    if (data === null) {
      setIsLoading(true);
    }
    
    try {
      const result = await queryFn();
      
      // Update state
      setData(result);
      setIsLoading(false);
      setIsError(false);
      setError(null);
      
      // Update cache
      cacheHelpers.set(cacheKey, result);
      lastFetchTimeRef.current = Date.now();
      
      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      // Only handle errors if the request wasn't aborted
      if (err instanceof Error && err.name !== 'AbortError') {
        setIsError(true);
        setError(err as Error);
        setIsLoading(false);
        
        // Call error callback
        if (onError) {
          onError(err as Error);
        }
      }
      
      throw err;
    } finally {
      setIsFetching(false);
      abortControllerRef.current = null;
    }
  };
  
  // Effect to fetch data on mount and when dependencies change
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    
    // Try to load from cache first
    const cachedData = cacheHelpers.get<T>(cacheKey);
    if (cachedData && !shouldRefetch(cachedData.timestamp, cacheDuration)) {
      setData(cachedData.data);
      setIsLoading(false);
      lastFetchTimeRef.current = cachedData.timestamp;
    } else {
      // Fetch fresh data
      fetchData().catch(() => {}); // Catch errors to prevent unhandled rejections
    }
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cacheKey, enabled, cacheDuration]);
  
  return {
    data,
    isLoading,
    isError,
    error,
    refetch: () => fetchData(true),
    isFetching,
  };
}
