import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

const SNAP_POINTS = [0.45, 0.72, 0.92];
const MIN_H = 0.38;
const MAX_H = 0.95;

export function ResizableSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const { height: screenH } = useWindowDimensions();
  const [open, setOpen] = useState(visible);
  const targetRef = useRef(SNAP_POINTS[1]);
  const animH = useRef(new Animated.Value(SNAP_POINTS[0] * screenH)).current;
  const startH = useRef(0);

  const snap = (frac: number) => {
    targetRef.current = frac;
    Animated.spring(animH, {
      toValue: frac * screenH,
      useNativeDriver: false,
      friction: 8,
      tension: 55,
    }).start();
  };

  const close = () => {
    Animated.timing(animH, {
      toValue: 60,
      duration: 160,
      useNativeDriver: false,
    }).start(() => onClose());
  };

  useEffect(() => {
    if (visible) {
      setOpen(true);
      targetRef.current = SNAP_POINTS[1];
      animH.setValue(SNAP_POINTS[0] * screenH);
      Animated.spring(animH, {
        toValue: SNAP_POINTS[1] * screenH,
        useNativeDriver: false,
        friction: 8,
        tension: 55,
      }).start();
    } else {
      setOpen(false);
    }
  }, [visible, screenH, animH]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        startH.current = targetRef.current * screenH;
        animH.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        const next = Math.min(MAX_H * screenH, Math.max(MIN_H * screenH, startH.current - g.dy));
        animH.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const dy = g.dy;
        const vy = g.vy;
        if (dy > screenH * 0.14 || vy > 0.7) {
          close();
          return;
        }
        if (dy < -screenH * 0.08 || vy < -0.7) {
          snap(MAX_H);
          return;
        }
        const frac = Math.min(MAX_H, Math.max(MIN_H, (startH.current - dy) / screenH));
        let best = SNAP_POINTS[0];
        let bestDist = Infinity;
        for (const p of SNAP_POINTS) {
          const d = Math.abs(p - frac);
          if (d < bestDist) {
            bestDist = d;
            best = p;
          }
        }
        snap(best);
      },
    }),
  ).current;

  if (!visible && !open) return null;

  return (
    <Modal visible={visible || open} transparent animationType="none" onRequestClose={close}>
      <Pressable style={[styles.scrim, { backgroundColor: colors.scrim }]} onPress={close} />
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.bgElevated, height: animH },
        ]}
      >
        <View style={styles.grabberZone} {...responder.panHandlers}>
          <View style={[styles.grabber, { backgroundColor: 'rgba(128,128,128,0.45)' }]} />
          <View style={styles.grabberIcons}>
            <Pressable onPress={() => snap(SNAP_POINTS[0])} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => snap(MAX_H)} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="chevron-up" size={16} color={colors.textSecondary} />
            </Pressable>
            <Pressable onPress={close} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1 },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  grabberZone: {
    paddingTop: space[2],
    paddingBottom: space[1],
    alignItems: 'center',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: space[1],
  },
  grabberIcons: {
    flexDirection: 'row',
    gap: space[4],
    marginTop: 2,
  },
  iconBtn: {
    width: 30,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
