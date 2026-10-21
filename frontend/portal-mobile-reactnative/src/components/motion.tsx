import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius } from '../theme/tokens';

/** Respeta "reducir movimiento" del sistema: los componentes cambian a apariciones instantáneas. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; sub.remove(); };
  }, []);
  return reduced;
}

/** Vibración corta al confirmar; en web o sin motor háptico no hace nada. */
export function tap(kind: 'light' | 'success' = 'light'): void {
  try {
    if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Sin soporte háptico.
  }
}

interface PopPressableProps {
  onPress: () => void;
  children: React.ReactNode;
  backgroundColor: string;
  disabled?: boolean;
  borderRadius?: number;
  /** Estilo del contenedor exterior (márgenes, flex, alineación). */
  style?: StyleProp<ViewStyle>;
  /** Estilo del cuerpo del botón (padding, alineación del contenido). */
  bodyStyle?: StyleProp<ViewStyle>;
  offset?: number;
  haptic?: boolean;
  accessibilityLabel?: string;
  accessibilityState?: { disabled?: boolean; busy?: boolean; selected?: boolean };
  accessibilityRole?: 'button' | 'tab';
}

/** Botón pegatina: sombra dura detrás y el cuerpo se hunde al presionar. */
export const PopPressable: React.FC<PopPressableProps> = ({
  onPress, children, backgroundColor, disabled = false, borderRadius = radius.pill, style, bodyStyle, offset = 3,
  haptic = true, accessibilityLabel, accessibilityState, accessibilityRole = 'button',
}) => {
  const press = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const move = (to: number) => {
    if (reduced) return;
    Animated.timing(press, { toValue: to, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  const shift = press.interpolate({ inputRange: [0, 1], outputRange: [0, offset - 1] });

  return (
    <View style={[{ marginRight: offset, marginBottom: offset }, style]}>
      {!disabled && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: offset, top: offset, right: -offset, bottom: -offset, borderRadius, backgroundColor: colors.shadow }}
        />
      )}
      <Pressable
        onPressIn={() => move(1)}
        onPressOut={() => move(0)}
        onPress={() => { if (haptic) tap('light'); onPress(); }}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState ?? { disabled }}
      >
        <Animated.View
          style={[
            { borderRadius, borderWidth: 2, borderColor: disabled ? colors.ruleStrong : colors.mora, backgroundColor, overflow: 'hidden' },
            { transform: [{ translateX: shift }, { translateY: shift }] },
            bodyStyle,
          ]}
        >
          {children}
        </Animated.View>
      </Pressable>
    </View>
  );
};

interface SlapProps {
  children: React.ReactNode;
  tilt?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** La pegatina cae desde arriba y se pega con rebote, quedando en su inclinación final. */
export const Slap: React.FC<SlapProps> = ({ children, tilt = 0, delay = 0, style }) => {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const run = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(progress, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
    ]);
    run.start();
    return () => run.stop();
  }, [reduced, delay, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1.25, 1] }) },
            { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: [`${tilt - 14}deg`, `${tilt}deg`] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/** Rebote breve cada vez que `trigger` cambia (la canasta al recibir un producto). */
export const Bump: React.FC<{ trigger: number | string; children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ trigger, children, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduced) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.25, duration: 130, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [trigger, reduced, scale]);

  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
};

/** Pulso lento para los últimos minutos del temporizador. */
export const Pulse: React.FC<{ active: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ active, children, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active || reduced) { scale.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.06, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, reduced, scale]);

  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
};

/** Sello que se estampa al aparecer: entra grande y girado y queda inclinado. */
export const Stamp: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; tilt?: number }> = ({ children, style, tilt = -6 }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) { progress.setValue(1); return; }
    Animated.spring(progress, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [reduced, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1.6, 1] }) },
            { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: [`${tilt - 8}deg`, `${tilt}deg`] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/** Bloque de carga con brillo suave en lugar de un spinner. */
export const Skeleton: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const opacity = useRef(new Animated.Value(0.55)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.55, duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduced, opacity]);

  return <Animated.View style={[{ backgroundColor: colors.rule, borderRadius: radius.block, opacity }, style]} />;
};
