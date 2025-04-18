"use client";

import { useState, useEffect, useRef } from 'react';
import Image, { ImageProps } from 'next/image';
import { useIntersectionObserver } from '@/lib/utils/renderOptimizations';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string;
  loadingClassName?: string;
  errorClassName?: string;
}

/**
 * OptimizedImage component with lazy loading, blur-up effect, and error handling
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fallbackSrc = '/images/placeholder.jpg',
  className,
  loadingClassName,
  errorClassName,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imageRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(imageRef, { 
    rootMargin: '200px', // Load images 200px before they enter the viewport
    threshold: 0.1 
  });

  // Reset states when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setCurrentSrc(src);
  }, [src]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    setCurrentSrc(fallbackSrc);
  };

  return (
    <div 
      ref={imageRef} 
      className={cn(
        'relative overflow-hidden',
        !isLoaded && !hasError && loadingClassName,
        hasError && errorClassName,
        className
      )}
      style={{ width, height }}
    >
      {/* Only render the image when it's visible in the viewport */}
      {isVisible && (
        <>
          {/* Loading skeleton */}
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          
          {/* Actual image */}
          <Image
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            className={cn(
              'transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={handleLoad}
            onError={handleError}
            {...props}
          />
        </>
      )}
    </div>
  );
}

/**
 * Responsive image component that adapts to container size
 */
export function ResponsiveImage({
  src,
  alt,
  aspectRatio = '16/9',
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & { aspectRatio?: string }) {
  return (
    <div 
      className={cn('relative w-full', className)}
      style={{ aspectRatio }}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        {...props}
      />
    </div>
  );
}
