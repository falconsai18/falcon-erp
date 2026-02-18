import React, { useRef, useState, useCallback, useEffect } from 'react';
import { haptics } from '@/lib/offline/haptics';

interface GestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  onPinch?: (scale: number) => void;
  swipeThreshold?: number;
  longPressDuration?: number;
}

interface GestureWrapperProps {
  children: React.ReactNode;
  className?: string;
  config: GestureConfig;
}

export function GestureWrapper({ children, className, config }: GestureWrapperProps) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    onDoubleTap,
    onPinch,
    swipeThreshold = 50,
    longPressDuration = 500
  } = config;

  const [isGesturing, setIsGesturing] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialDistanceRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    setIsGesturing(true);

    // Long press detection
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        haptics.longPress();
        onLongPress();
      }, longPressDuration);
    }

    // Pinch detection
    if (onPinch && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [onLongPress, onPinch, longPressDuration]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Cancel long press if moved significantly
    if ((Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Pinch handling
    if (onPinch && e.touches.length === 2 && initialDistanceRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = distance / initialDistanceRef.current;
      onPinch(scale);
    }
  }, [onPinch]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Double tap detection
    const now = Date.now();
    if (deltaTime < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      if (now - lastTapRef.current < 300 && onDoubleTap) {
        haptics.medium();
        onDoubleTap();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }

    // Swipe detection
    if (deltaTime < 500) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > swipeThreshold) {
          if (deltaX > 0 && onSwipeRight) {
            haptics.light();
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            haptics.light();
            onSwipeLeft();
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > swipeThreshold) {
          if (deltaY > 0 && onSwipeDown) {
            haptics.light();
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            haptics.light();
            onSwipeUp();
          }
        }
      }
    }

    touchStartRef.current = null;
    initialDistanceRef.current = null;
    setIsGesturing(false);
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDoubleTap, swipeThreshold]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`${className} ${isGesturing ? 'touch-none' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}

// Pull to refresh wrapper
interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only allow pull when at top of scroll
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startYRef.current);
    
    // Dampen the pull
    const dampenedDistance = Math.min(distance * 0.5, 150);
    setPullDistance(dampenedDistance);

    if (dampenedDistance > PULL_THRESHOLD) {
      haptics.light();
    }
  }, [isPulling]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    if (pullDistance > PULL_THRESHOLD && !isRefreshing) {
      haptics.medium();
      setIsRefreshing(true);
      
      try {
        await onRefresh();
        haptics.success();
      } catch (error) {
        haptics.error();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    setIsPulling(false);
  }, [isPulling, pullDistance, isRefreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform"
          style={{ 
            transform: `translateY(${Math.min(pullDistance - 50, 0)}px)`,
            opacity: Math.min(pullDistance / PULL_THRESHOLD, 1)
          }}
        >
          <div className="flex items-center gap-2 text-brand-400">
            {isRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Refreshing...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 transition-transform"
                  style={{ transform: `rotate(${pullDistance * 2}deg)` }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-sm">
                  {pullDistance > PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div 
        className="transition-transform"
        style={{ transform: isPulling || isRefreshing ? `translateY(${Math.max(pullDistance, 0)}px)` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}