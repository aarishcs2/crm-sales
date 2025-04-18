import { useEffect, useLayoutEffect } from 'react';

/**
 * A hook that works like useLayoutEffect, but does not warn when used during SSR
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
