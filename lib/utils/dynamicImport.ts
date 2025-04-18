import dynamic from 'next/dynamic';
import { ComponentType, lazy } from 'react';

/**
 * Dynamically import a component with loading state
 * @param importFn Function that imports the component
 * @param LoadingComponent Component to show while loading
 * @returns Dynamically imported component
 */
export function dynamicImport<T>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  LoadingComponent?: ComponentType
) {
  return dynamic(importFn, {
    loading: LoadingComponent,
    ssr: false, // Disable server-side rendering for better performance
  });
}

/**
 * Preload a component to improve perceived performance
 * @param importFn Function that imports the component
 */
export function preloadComponent(
  importFn: () => Promise<{ default: ComponentType<any> }>
) {
  // Start loading the component in the background
  const promise = importFn();
  
  // Return a function that can be called to check if the component is loaded
  return () => {
    // This will return true if the component is already loaded
    return promise.then(
      () => true,
      () => false
    );
  };
}

/**
 * Common components that can be dynamically imported
 */
export const DynamicComponents = {
  // Dashboard components
  DashboardChart: dynamic(() => import('@/components/dashboard/chart'), {
    ssr: false,
    loading: () => <div className="h-64 w-full bg-gray-100 animate-pulse rounded-lg" />
  }),
  
  // Modal components
  ConfirmModal: dynamic(() => import('@/components/ui/confirm-modal'), {
    ssr: false
  }),
  
  // Form components
  RichTextEditor: dynamic(() => import('@/components/ui/rich-text-editor'), {
    ssr: false,
    loading: () => <div className="h-32 w-full bg-gray-100 animate-pulse rounded-lg" />
  }),
  
  // Heavy components
  DataTable: dynamic(() => import('@/components/ui/data-table'), {
    ssr: false,
    loading: () => <div className="h-96 w-full bg-gray-100 animate-pulse rounded-lg" />
  }),
};
