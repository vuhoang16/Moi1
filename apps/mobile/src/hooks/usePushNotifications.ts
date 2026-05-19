import { useState, useCallback } from 'react';

export interface ForegroundNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Firebase disabled for Expo Go testing — re-enable for EAS dev/production builds
export function usePushNotifications(_navigate: (screen: string, params?: any) => void) {
  const [foreground] = useState<ForegroundNotification | null>(null);
  const clearForeground = useCallback(() => {}, []);
  return { foreground, clearForeground };
}
