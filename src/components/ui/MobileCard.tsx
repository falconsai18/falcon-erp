import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { haptics, gestureHaptics } from '@/lib/offline/haptics';

interface SwipeAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  onAction: () => void;
  confirm?: boolean;
}

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  expandable?: boolean;
  expandedContent?: React.ReactNode;
}

export function MobileCard({
  children,
  className,
  onPress,
  onLongPress,
  leftActions = [],
  rightActions = [],
  expandable = false,
  expandedContent
}: MobileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showActions, setShowActions] = useState<'left' | 'right' | null>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80;
  const ACTION_WIDTH = 72;

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    currentXRef.current = clientX;
    setIsSwiping(true);

    // Long press detection
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        haptics.longPress();
        onLongPress();
      }, 500);
    }

    gestureHaptics.swipeStart();
  }, [onLongPress]);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isSwiping) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    currentXRef.current = clientX;
    const diff = clientX - startXRef.current;

    // Cancel long press if moved significantly
    if (Math.abs(diff) > 10 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Limit swipe distance
    const maxSwipe = Math.max(leftActions.length, rightActions.length) * ACTION_WIDTH;
    const clampedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    
    setSwipeOffset(clampedDiff);

    if (Math.abs(diff) > 20) {
      gestureHaptics.swipeProgress();
    }
  }, [isSwiping, leftActions.length, rightActions.length]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const diff = currentXRef.current - startXRef.current;
    const absDiff = Math.abs(diff);

    if (absDiff > SWIPE_THRESHOLD) {
      // Reveal actions
      if (diff > 0 && leftActions.length > 0) {
        setSwipeOffset(leftActions.length * ACTION_WIDTH);
        setShowActions('left');
        gestureHaptics.swipeComplete();
      } else if (diff < 0 && rightActions.length > 0) {
        setSwipeOffset(-rightActions.length * ACTION_WIDTH);
        setShowActions('right');
        gestureHaptics.swipeComplete();
      } else {
        setSwipeOffset(0);
        setShowActions(null);
      }
    } else if (absDiff < 10) {
      // Tap
      setSwipeOffset(0);
      setShowActions(null);
      if (expandable) {
        setIsExpanded(!isExpanded);
        haptics.select();
      }
      onPress?.();
    } else {
      // Swipe cancelled
      setSwipeOffset(0);
      setShowActions(null);
      gestureHaptics.swipeCancel();
    }

    setIsSwiping(false);
  }, [isSwiping, leftActions.length, rightActions.length, expandable, onPress]);

  const handleActionPress = useCallback((action: SwipeAction) => {
    if (action.confirm) {
      if (window.confirm(`Are you sure you want to ${action.label.toLowerCase()}?`)) {
        action.onAction();
      }
    } else {
      action.onAction();
    }
    setSwipeOffset(0);
    setShowActions(null);
  }, []);

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setShowActions(null);
  }, []);

  // Close actions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        resetSwipe();
      }
    };

    if (showActions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showActions, resetSwipe]);

  return (
    <div className="relative overflow-hidden rounded-xl" ref={cardRef}>
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex">
          {leftActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionPress(action)}
              className={cn(
                "flex flex-col items-center justify-center w-[72px] transition-all",
                action.bgColor,
                showActions === 'left' ? 'opacity-100' : 'opacity-0'
              )}
              style={{
                transform: `translateX(${Math.max(0, swipeOffset - (index * ACTION_WIDTH))}px)`,
                zIndex: leftActions.length - index
              }}
            >
              <span className={action.color}>{action.icon}</span>
              <span className={cn("text-xs mt-1", action.color)}>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex">
          {rightActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionPress(action)}
              className={cn(
                "flex flex-col items-center justify-center w-[72px] transition-all",
                action.bgColor,
                showActions === 'right' ? 'opacity-100' : 'opacity-0'
              )}
              style={{
                transform: `translateX(${Math.min(0, swipeOffset + (index * ACTION_WIDTH))}px)`,
                zIndex: rightActions.length - index
              }}
            >
              <span className={action.color}>{action.icon}</span>
              <span className={cn("text-xs mt-1", action.color)}>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Card Content */}
      <div
        className={cn(
          "glass-card p-4 transition-transform duration-200 ease-out select-none",
          className,
          isSwiping && "cursor-grabbing"
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
        
        {expandable && isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-300/50 animate-in slide-in-from-top-2">
            {expandedContent}
          </div>
        )}
      </div>
    </div>
  );
}

// Simple card without swipe (for lists without actions)
interface SimpleMobileCardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
}

export function SimpleMobileCard({ children, className, onPress }: SimpleMobileCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-4 cursor-pointer active:scale-[0.98] transition-transform",
        className
      )}
      onClick={onPress}
    >
      {children}
    </div>
  );
}

// Card with badge
interface BadgeMobileCardProps extends SimpleMobileCardProps {
  badge?: {
    text: string;
    color: string;
  };
}

export function BadgeMobileCard({ children, className, onPress, badge }: BadgeMobileCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-4 cursor-pointer active:scale-[0.98] transition-transform relative",
        className
      )}
      onClick={onPress}
    >
      {badge && (
        <div className={cn(
          "absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium",
          badge.color
        )}>
          {badge.text}
        </div>
      )}
      {children}
    </div>
  );
}