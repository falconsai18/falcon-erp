import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';
import { haptics } from '@/lib/offline/haptics';

interface FABAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions?: FABAction[];
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function FloatingActionButton({
  actions,
  onClick,
  icon = <Plus size={24} />,
  className,
  position = 'bottom-right'
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const handleMainClick = () => {
    haptics.medium();
    
    if (actions && actions.length > 0) {
      setIsOpen(!isOpen);
    } else {
      onClick?.();
    }
  };

  const handleActionClick = (action: FABAction) => {
    haptics.light();
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className={cn("fixed z-40", positionClasses[position], className)}>
      {/* Action buttons */}
      {isOpen && actions && (
        <div className="absolute bottom-full right-0 mb-3 space-y-2">
          {actions.map((action, index) => (
            <div
              key={action.id}
              className={cn(
                "flex items-center justify-end gap-3 animate-in slide-in-from-bottom-2",
                "fade-in duration-200"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="text-sm text-white bg-dark-200 px-2 py-1 rounded-lg whitespace-nowrap">
                {action.label}
              </span>
              <button
                onClick={() => handleActionClick(action)}
                className={cn(
                  "w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110",
                  action.color || "bg-brand-500"
                )}
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        ref={fabRef}
        onClick={handleMainClick}
        className={cn(
          "w-14 h-14 rounded-full shadow-xl flex items-center justify-center",
          "bg-brand-500 text-white transition-all duration-300",
          "hover:scale-105 active:scale-95",
          isOpen && "rotate-45 bg-red-500"
        )}
      >
        {isOpen ? <X size={24} /> : icon}
      </button>

      {/* Backdrop for closing */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Single action FAB (simpler variant)
interface SingleFABProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

export function SingleFAB({
  onClick,
  icon = <Plus size={24} />,
  label,
  className,
  position = 'bottom-right',
  variant = 'primary'
}: SingleFABProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const variantClasses = {
    primary: 'bg-brand-500 hover:bg-brand-600',
    secondary: 'bg-dark-200 hover:bg-dark-300',
    success: 'bg-emerald-500 hover:bg-emerald-600',
    danger: 'bg-red-500 hover:bg-red-600'
  };

  return (
    <div className={cn("fixed z-40 flex items-center gap-3", positionClasses[position], className)}>
      {label && (
        <span className="text-sm text-white bg-dark-200 px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
          {label}
        </span>
      )}
      <button
        onClick={() => {
          haptics.medium();
          onClick();
        }}
        className={cn(
          "w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white",
          "transition-all duration-300 hover:scale-105 active:scale-95",
          variantClasses[variant]
        )}
      >
        {icon}
      </button>
    </div>
  );
}

// Extended FAB with label
interface ExtendedFABProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className?: string;
  position?: 'bottom-right' | 'bottom-left';
  variant?: 'primary' | 'secondary';
}

export function ExtendedFAB({
  onClick,
  icon,
  label,
  className,
  position = 'bottom-right',
  variant = 'primary'
}: ExtendedFABProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6'
  };

  const variantClasses = {
    primary: 'bg-brand-500 hover:bg-brand-600',
    secondary: 'bg-dark-200 hover:bg-dark-300'
  };

  return (
    <button
      onClick={() => {
        haptics.medium();
        onClick();
      }}
      className={cn(
        "fixed z-40 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl",
        "text-white font-medium transition-all duration-300",
        "hover:scale-105 active:scale-95",
        positionClasses[position],
        variantClasses[variant],
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}