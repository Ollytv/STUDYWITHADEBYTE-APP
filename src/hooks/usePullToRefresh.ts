// src/hooks/usePullToRefresh.ts
//
// Lightweight, dependency-free pull-to-refresh gesture handler.
//
// Why not `react-pull-to-refresh`: it's unmaintained (last published
// years ago), doesn't handle iOS momentum-scroll bounce correctly, and
// pulls in its own CSS that fights dark-mode overrides. This hook gives
// full control over the threshold, resistance curve, and only engages
// the gesture when the scrollable container is actually at scrollTop 0 —
// so normal page scrolling is never intercepted.

import { useRef, useState, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  /** Called when the user releases past the trigger threshold. Must return a Promise. */
  onRefresh: () => Promise<void>;
  /** Distance in px the user must pull before release triggers a refresh. Default 70. */
  threshold?: number;
  /** Max visual pull distance (rubber-band cap) in px. Default 120. */
  maxPull?: number;
  /** Resistance factor — higher = harder to pull. Default 2.5. */
  resistance?: number;
  /** Disable the gesture entirely (e.g. while a modal is open). */
  disabled?: boolean;
}

export type PullPhase = 'idle' | 'pulling' | 'ready' | 'refreshing';

export function usePullToRefresh<T extends HTMLElement>({
  onRefresh,
  threshold = 70,
  maxPull = 120,
  resistance = 2.5,
  disabled = false,
}: UsePullToRefreshOptions) {
  const containerRef = useRef<T | null>(null);
  const startY = useRef(0);
  const dragging = useRef(false);
  const refreshingRef = useRef(false); // mirrors state but readable synchronously in listeners
  const pullDistanceRef = useRef(0);   // live value read inside touchend, avoids re-binding listeners every frame

  const [pullDistance, setPullDistance] = useState(0);
  const [phase, setPhase] = useState<PullPhase>('idle');

  const reset = useCallback(() => {
    pullDistanceRef.current = 0;
    setPullDistance(0);
    setPhase('idle');
    dragging.current = false;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    const atTop = () => el.scrollTop <= 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      // Only arm the gesture if the container is already scrolled to top —
      // this is what prevents interference with normal scrolling.
      if (!atTop()) return;
      startY.current = e.touches[0].clientY;
      dragging.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragging.current || refreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const delta = currentY - startY.current;

      // User is pulling up or container scrolled away from top mid-gesture — bail cleanly.
      if (delta <= 0 || !atTop()) {
        dragging.current = false;
        setPullDistance(0);
        setPhase('idle');
        return;
      }

      // Rubber-band resistance curve — feels native, never lets pull run away.
      const resisted = Math.min(delta / resistance, maxPull);
      pullDistanceRef.current = resisted;
      setPullDistance(resisted);
      setPhase(resisted >= threshold ? 'ready' : 'pulling');

      // Only preventDefault while actively pulling past a small dead-zone —
      // keeps normal tap/scroll gestures completely untouched.
      if (delta > 10) e.preventDefault();
    };

    const handleTouchEnd = async () => {
      if (!dragging.current || refreshingRef.current) return;
      dragging.current = false;

      if (pullDistanceRef.current >= threshold) {
        refreshingRef.current = true;
        setPhase('refreshing');
        pullDistanceRef.current = threshold;
        setPullDistance(threshold); // hold the spinner in place while loading

        try {
          await onRefresh();
        } finally {
          refreshingRef.current = false;
          reset();
        }
      } else {
        reset();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', reset, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', reset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, threshold, maxPull, resistance, onRefresh, reset]);

  return { containerRef, pullDistance, phase, threshold };
}
