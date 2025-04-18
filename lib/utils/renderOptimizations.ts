import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from './hooks';

/**
 * Custom hook to detect if a component is mounted
 */
export function useIsMounted() {
  const isMounted = useRef(false);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  return useCallback(() => isMounted.current, []);
}

/**
 * Custom hook to debounce a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Custom hook to throttle a function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0);
  const lastArgs = useRef<any[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const throttled = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      lastArgs.current = args;
      
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          timeoutRef.current = null;
          callback(...lastArgs.current);
        }, delay - (now - lastCall.current));
      }
    },
    [callback, delay]
  ) as T;
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return throttled;
}

/**
 * Custom hook for virtualized list rendering
 */
export function useVirtualization<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 3
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  // Calculate the range of visible items
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  // Get the visible items
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  // Calculate the total height of the list
  const totalHeight = items.length * itemHeight;
  
  // Calculate the offset for the visible items
  const offsetY = startIndex * itemHeight;
  
  // Handle scroll events
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
    []
  );
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    startIndex,
    endIndex,
  };
}

/**
 * Custom hook to detect when an element is visible in the viewport
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [elementRef, options]);
  
  return isIntersecting;
}

/**
 * Custom hook to measure an element's dimensions
 */
export function useMeasure() {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return;
    
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    
    observer.observe(ref.current);
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return [ref, dimensions] as const;
}

/**
 * Custom hook to prevent unnecessary re-renders
 */
export function useConstant<T>(fn: () => T): T {
  const ref = useRef<{ value: T }>();
  
  if (!ref.current) {
    ref.current = { value: fn() };
  }
  
  return ref.current.value;
}

/**
 * Custom hook for efficient event handling
 */
export function useEventCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef<T>(fn);
  
  useIsomorphicLayoutEffect(() => {
    ref.current = fn;
  });
  
  return useCallback(
    (...args: any[]) => ref.current(...args),
    []
  ) as T;
}
