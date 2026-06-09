import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import {
  Canvas,
  Group,
  Circle,
  Shader,
  Skia,
  vec,
  RadialGradient,
  BlurMask,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { useDerivedValue, useFrame } = require('@shopify/react-native-skia');

export interface StartOrbProps {
  size?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  pulseOnIdle?: boolean;
}

// Start Orb Shader - The iconic Vista start button
const startOrbShaderSource = `
  uniform float2 resolution;
  uniform float time;
  uniform float hover;
  uniform float press;
  
  float random(float2 st) {
    return fract(sin(dot(st.xy, float2(12.9898, 78.233))) * 43758.5453123);
  }
  
  half4 main(float2 coord) {
    float2 center = resolution * 0.5;
    float2 p = coord - center;
    float dist = length(p);
    float maxDist = resolution.x * 0.5;
    float normalizedDist = dist / maxDist;
    
    // Pulsing glow effect
    float pulse = sin(time * 1.5) * 0.08 + 1.0;
    float glowIntensity = (1.0 + hover * 0.3) * pulse;
    
    // Colors
    half3 outerRing = half3(0.102, 0.227, 0.431);   // Deep blue
    half3 midRing = half3(0.180, 0.361, 0.620);     // Medium blue
    half3 glowColor = half3(0.0, 0.831, 1.0);       // Cyan glow
    half3 centerColor = half3(1.0, 1.0, 1.0);       // White center
    
    // Gradient from outside in
    half3 color = outerRing;
    color = mix(color, midRing, smoothstep(0.85, 0.5, normalizedDist));
    color = mix(color, glowColor, smoothstep(0.55, 0.25, normalizedDist) * glowIntensity * 0.8);
    color = mix(color, centerColor, smoothstep(0.35, 0.0, normalizedDist) * (0.95 + hover * 0.05));
    
    // Press effect - darken
    color *= (1.0 - press * 0.25);
    
    // Outer ring glow on hover
    float ringDist = abs(normalizedDist - 0.9);
    float hoverRing = smoothstep(0.08, 0.0, ringDist) * hover * 0.6;
    color += glowColor * hoverRing;
    
    // Alpha - soft outer edge
    float alpha = smoothstep(1.0, 0.92, normalizedDist);
    
    // Subtle sparkle/noise
    float sparkle = random(coord * 0.1 + time) * 0.05 * hover;
    color += sparkle;
    
    return half4(color, alpha);
  }
`;

export const StartOrb: React.FC<StartOrbProps> = ({
  size = 60,
  onPress,
  onLongPress,
  style,
  pulseOnIdle = true,
}) => {
  const shaderRef = useRef(startOrbShaderSource);
  const runtimeEffect = useRef(Skia.RuntimeEffect.Make(shaderRef.current));
  
  const hoverValue = useSharedValue(0);
  const pressValue = useSharedValue(0);
  const timeValue = useSharedValue(0);
  const pulseValue = useSharedValue(0);

  // Continuous animation
  useFrame((frameInfo: any) => {
    timeValue.value = frameInfo.timeSinceFirstFrame / 1000;
  });

  // Idle pulse animation
  React.useEffect(() => {
    if (pulseOnIdle) {
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [pulseOnIdle]);

  const uniforms = useDerivedValue(() => ({
    resolution: vec(size, size),
    time: timeValue.value,
    hover: hoverValue.value,
    press: pressValue.value,
  }), [size]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + hoverValue.value * 0.1 - pressValue.value * 0.08 },
    ],
    shadowColor: 'rgba(0, 212, 255, 0.6)',
    shadowOpacity: 0.4 + hoverValue.value * 0.4 + pulseValue.value * 0.2,
    shadowRadius: 15 + hoverValue.value * 15 + pulseValue.value * 5,
    shadowOffset: { width: 0, height: 0 },
  }));

  const outerGlowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + hoverValue.value * 0.4 + pulseValue.value * 0.2,
    transform: [{ scale: 1 + hoverValue.value * 0.15 }],
  }));

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onBegin(() => {
      pressValue.value = withTiming(1, { duration: 50 });
    })
    .onEnd(() => {
      pressValue.value = withTiming(0, { duration: 150 });
      onPress?.();
    })
    .onFinalize(() => {
      pressValue.value = withTiming(0, { duration: 150 });
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      onLongPress?.();
    });

  const hoverGesture = Gesture.Hover()
    .onBegin(() => {
      hoverValue.value = withSpring(1, { damping: 10, stiffness: 150 });
    })
    .onEnd(() => {
      hoverValue.value = withSpring(0, { damping: 10, stiffness: 150 });
    });

  const composedGesture = Gesture.Exclusive(
    longPressGesture,
    tapGesture,
    hoverGesture
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.container,
          { width: size, height: size },
          animatedStyle,
          style,
        ]}
      >
        {/* Outer glow effect */}
        <Animated.View
          style={[
            styles.outerGlow,
            { width: size * 1.3, height: size * 1.3 },
            outerGlowStyle,
          ]}
        >
          <Canvas style={{ width: size * 1.3, height: size * 1.3 }}>
            <Circle
              cx={(size * 1.3) / 2}
              cy={(size * 1.3) / 2}
              r={(size * 1.3) / 2 - 5}
            >
              <RadialGradient
                c={vec((size * 1.3) / 2, (size * 1.3) / 2)}
                r={(size * 1.3) / 2 - 5}
                colors={['rgba(0, 212, 255, 0.3)', 'rgba(0, 212, 255, 0)']}
              />
            </Circle>
          </Canvas>
        </Animated.View>

        {/* Main orb */}
        <Canvas style={{ width: size, height: size }}>
          <Group>
            {/* Glow blur */}
            <BlurMask blur={8} style="normal" respectCTM />
            
            {/* Main orb circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 2}
            >
              {runtimeEffect.current && (
                <Shader
                  source={runtimeEffect.current}
                  uniforms={uniforms}
                />
              )}
            </Circle>
            
            {/* Inner highlight */}
            <Circle
              cx={size / 2}
              cy={size / 2 - size * 0.15}
              r={size / 3}
            >
              <RadialGradient
                c={vec(size / 2, size / 2 - size * 0.15)}
                r={size / 3}
                colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
              />
            </Circle>
          </Group>
        </Canvas>

        {/* Windows logo overlay */}
        <View style={[styles.logoContainer, { width: size, height: size }]}>
          <View style={styles.logo}>
            <View style={styles.logoPaneTopLeft} />
            <View style={styles.logoPaneTopRight} />
            <View style={styles.logoPaneBottomLeft} />
            <View style={styles.logoPaneBottomRight} />
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerGlow: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 24,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    opacity: 0.9,
  },
  logoPaneTopLeft: {
    width: 10,
    height: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 1,
  },
  logoPaneTopRight: {
    width: 10,
    height: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 1,
  },
  logoPaneBottomLeft: {
    width: 10,
    height: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 1,
  },
  logoPaneBottomRight: {
    width: 10,
    height: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 1,
  },
});

export default StartOrb;
