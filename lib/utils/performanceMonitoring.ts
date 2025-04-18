/**
 * Performance monitoring utilities
 */

// Performance metrics to track
export interface PerformanceMetrics {
  // Page load metrics
  timeToFirstByte?: number;
  firstContentfulPaint?: number;
  domInteractive?: number;
  domComplete?: number;
  loadTime?: number;
  
  // Runtime metrics
  memoryUsage?: number;
  longTasks?: number;
  interactionDelay?: number;
  
  // Custom metrics
  apiResponseTime?: Record<string, number>;
  componentRenderTime?: Record<string, number>;
  resourceLoadTime?: Record<string, number>;
}

// Global metrics store
const metrics: PerformanceMetrics = {
  apiResponseTime: {},
  componentRenderTime: {},
  resourceLoadTime: {},
};

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined' || !window.performance) return;
  
  // Observe long tasks
  if ('PerformanceObserver' in window) {
    try {
      // Track long tasks (tasks that take more than 50ms)
      const longTaskObserver = new PerformanceObserver((list) => {
        metrics.longTasks = (metrics.longTasks || 0) + list.getEntries().length;
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      
      // Track first contentful paint
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
            paintObserver.disconnect();
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      
      // Track resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const resource = entry as PerformanceResourceTiming;
          metrics.resourceLoadTime![resource.name] = resource.duration;
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.error('Error setting up performance observers:', e);
    }
  }
  
  // Track page load metrics
  window.addEventListener('load', () => {
    if (window.performance.timing) {
      const timing = window.performance.timing;
      
      metrics.timeToFirstByte = timing.responseStart - timing.requestStart;
      metrics.domInteractive = timing.domInteractive - timing.navigationStart;
      metrics.domComplete = timing.domComplete - timing.navigationStart;
      metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
    }
  });
  
  // Track memory usage if available
  if (window.performance.memory) {
    setInterval(() => {
      metrics.memoryUsage = window.performance.memory.usedJSHeapSize;
    }, 5000);
  }
}

/**
 * Measure the execution time of a function
 * @param fn Function to measure
 * @param label Label for the measurement
 * @returns Result of the function
 */
export function measureExecutionTime<T>(fn: () => T, label: string): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.debug(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  
  return result;
}

/**
 * Measure the execution time of an async function
 * @param fn Async function to measure
 * @param label Label for the measurement
 * @returns Promise resolving to the result of the function
 */
export async function measureAsyncExecutionTime<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  console.debug(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  
  return result;
}

/**
 * Track API response time
 * @param endpoint API endpoint
 * @param duration Response time in milliseconds
 */
export function trackApiResponseTime(endpoint: string, duration: number): void {
  metrics.apiResponseTime![endpoint] = duration;
}

/**
 * Track component render time
 * @param componentName Component name
 * @param duration Render time in milliseconds
 */
export function trackComponentRenderTime(componentName: string, duration: number): void {
  metrics.componentRenderTime![componentName] = duration;
}

/**
 * Get current performance metrics
 * @returns Current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...metrics };
}

/**
 * Log performance metrics to console
 */
export function logPerformanceMetrics(): void {
  console.group('Performance Metrics');
  console.log('Page Load Metrics:', {
    timeToFirstByte: metrics.timeToFirstByte,
    firstContentfulPaint: metrics.firstContentfulPaint,
    domInteractive: metrics.domInteractive,
    domComplete: metrics.domComplete,
    loadTime: metrics.loadTime,
  });
  console.log('Runtime Metrics:', {
    memoryUsage: metrics.memoryUsage,
    longTasks: metrics.longTasks,
    interactionDelay: metrics.interactionDelay,
  });
  console.log('API Response Times:', metrics.apiResponseTime);
  console.log('Component Render Times:', metrics.componentRenderTime);
  console.log('Resource Load Times:', metrics.resourceLoadTime);
  console.groupEnd();
}

/**
 * Create a performance monitoring hook for React components
 * @param componentName Component name
 * @returns Object with start and end functions
 */
export function usePerformanceMonitoring(componentName: string) {
  return {
    startMeasure: () => {
      if (typeof performance === 'undefined') return null;
      const markName = `${componentName}-render-start`;
      performance.mark(markName);
      return markName;
    },
    endMeasure: (startMarkName: string | null) => {
      if (typeof performance === 'undefined' || !startMarkName) return;
      const endMarkName = `${componentName}-render-end`;
      const measureName = `${componentName}-render-duration`;
      
      performance.mark(endMarkName);
      performance.measure(measureName, startMarkName, endMarkName);
      
      const entries = performance.getEntriesByName(measureName);
      if (entries.length > 0) {
        const duration = entries[0].duration;
        trackComponentRenderTime(componentName, duration);
        
        // Clean up marks and measures
        performance.clearMarks(startMarkName);
        performance.clearMarks(endMarkName);
        performance.clearMeasures(measureName);
      }
    }
  };
}
