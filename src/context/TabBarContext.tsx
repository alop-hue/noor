import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react';
import { Animated } from 'react-native';

interface TabBarCtx {
  visible: Animated.Value;
  show: () => void;
  hide: () => void;
}

const Ctx = createContext<TabBarCtx>({ visible: new Animated.Value(1), show: () => {}, hide: () => {} });

export function TabBarProvider({ children }: { children: ReactNode }) {
  const visible = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(visible, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [visible]);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(visible, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }, 300);
  }, [visible]);

  return <Ctx.Provider value={{ visible, show, hide }}>{children}</Ctx.Provider>;
}

export function useTabBar() {
  return useContext(Ctx);
}
