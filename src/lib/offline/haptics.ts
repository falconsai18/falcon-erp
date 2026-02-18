// Haptic feedback for mobile devices
// Provides physical feedback for user actions

interface HapticsObject {
  light: () => void;
  medium: () => void;
  heavy: () => void;
  success: () => void;
  error: () => void;
  warning: () => void;
  swipeTick: () => void;
  select: () => void;
  longPress: () => void;
  isSupported: () => boolean;
  enabled: boolean;
  perform: (type: keyof Omit<HapticsObject, 'isSupported' | 'enabled' | 'perform'>) => void;
}

export const haptics: HapticsObject = {
  // Light feedback - subtle tick
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  // Medium feedback - standard confirmation
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  // Heavy feedback - important action
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  // Success feedback - gentle pulse
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
  },

  // Error feedback - double buzz
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50, 100, 50]);
    }
  },

  // Warning feedback - pattern
  warning: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  // Swipe tick feedback
  swipeTick: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  },

  // Selection feedback
  select: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  },

  // Long press feedback
  longPress: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }
  },

  // Check if haptics are supported
  isSupported: (): boolean => {
    return 'vibrate' in navigator;
  },

  // Enable/disable haptics globally
  enabled: true,

  // Perform haptic if enabled
  perform: (type: keyof Omit<HapticsObject, 'isSupported' | 'enabled' | 'perform'>) => {
    if (haptics.enabled) {
      (haptics[type] as () => void)();
    }
  }
};

// Gesture-specific haptics
export const gestureHaptics = {
  // Swipe start
  swipeStart: () => haptics.light(),
  
  // Swipe in progress (repeated)
  swipeProgress: () => haptics.swipeTick(),
  
  // Swipe complete
  swipeComplete: () => haptics.medium(),
  
  // Swipe cancelled
  swipeCancel: () => haptics.light(),
  
  // Pull to refresh threshold reached
  pullThreshold: () => haptics.medium(),
  
  // Pull to refresh complete
  pullComplete: () => haptics.success()
};

// Button haptics
export const buttonHaptics = {
  press: () => haptics.light(),
  confirm: () => haptics.medium(),
  destructive: () => haptics.heavy()
};

// Form haptics
export const formHaptics = {
  validationError: () => haptics.error(),
  validationSuccess: () => haptics.success(),
  fieldFocus: () => haptics.light()
};

// Sync haptics
export const syncHaptics = {
  start: () => haptics.light(),
  progress: () => haptics.swipeTick(),
  complete: () => haptics.success(),
  error: () => haptics.error()
};