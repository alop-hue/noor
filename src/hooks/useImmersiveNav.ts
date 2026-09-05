import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

export function useImmersiveNav() {
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNavBar = useCallback(() => {
    if (Platform.OS !== 'android') return;
    SystemBars.setHidden({ navigationBar: false });
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      SystemBars.setHidden({ navigationBar: true });
    }, 3000);
  }, []);

  const hideNavBar = useCallback(() => {
    if (Platform.OS !== 'android') return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    SystemBars.setHidden({ navigationBar: true });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    SystemBars.setHidden({ navigationBar: true });
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      SystemBars.setHidden({ navigationBar: false });
    };
  }, []);

  return { showNavBar, hideNavBar };
}
