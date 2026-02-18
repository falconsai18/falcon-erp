import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { haptics } from '@/lib/offline/haptics';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showHandle?: boolean;
  maxHeight?: string;
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  showHandle = true,
  maxHeight = '85vh'
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      haptics.medium();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = startYRef.current;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    const diff = currentYRef.current - startYRef.current;
    
    if (sheetRef.current) {
      if (diff > 100) {
        // Close if dragged down enough
        onClose();
      } else {
        // Snap back
        sheetRef.current.style.transform = '';
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-dark-100 rounded-t-2xl overflow-hidden",
          "animate-in slide-in-from-bottom duration-300",
          className
        )}
        style={{ maxHeight }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-dark-300 rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-dark-300/50">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-dark-200 transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - ${title ? 60 : 40}px)` }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Action sheet variant (for quick actions)
interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actions: {
    id: string;
    label: string;
    icon?: React.ReactNode;
    color?: string;
    onClick: () => void;
    destructive?: boolean;
  }[];
  cancelText?: string;
}

export function MobileActionSheet({
  isOpen,
  onClose,
  actions,
  cancelText = 'Cancel'
}: MobileActionSheetProps) {
  const handleActionClick = (action: MobileActionSheetProps['actions'][0]) => {
    action.onClick();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 animate-in slide-in-from-bottom duration-300">
        <div className="bg-dark-100 rounded-xl overflow-hidden">
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                "hover:bg-dark-200",
                index !== actions.length - 1 && "border-b border-dark-300/50",
                action.destructive ? "text-red-400" : (action.color || "text-white")
              )}
            >
              {action.icon && <span>{action.icon}</span>}
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-dark-100 rounded-xl text-white font-semibold hover:bg-dark-200 transition-colors"
        >
          {cancelText}
        </button>
      </div>
    </div>,
    document.body
  );
}

// Bottom sheet with form
interface MobileFormSheetProps extends MobileBottomSheetProps {
  onSubmit: () => void;
  submitText?: string;
  isSubmitting?: boolean;
}

export function MobileFormSheet({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = 'Save',
  isSubmitting = false,
  className,
  maxHeight = '90vh'
}: MobileFormSheetProps) {
  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className={className}
      maxHeight={maxHeight}
    >
      <div className="p-4 space-y-4">
        {children}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-dark-200 text-white font-medium hover:bg-dark-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : submitText}
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
}