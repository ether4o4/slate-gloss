import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import {
  Canvas,
  Skia,
  Group,
  RoundedRect,
  Paint,
  BlurMask,
  Shader,
  RuntimeShader,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { useDerivedValue, useFrame } = require('@shopify/react-native-skia');

export interface GlassPanelProps {
  width: number;
  height: number;
  cornerRadius?: number;
  blurRadius?: number;
  opacity?: number;
  borderWidth?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
  enableNoise?: boolean;
  enableChromaticAberration?: boolean;
  chromaticIntensity?: number;
  onPress?: () => void;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
}

// Glass Panel Runtime Shader
const glassShaderSource = `
  uniform float2 resolution;
  uniform float cornerRadius;
  uniform float opacity;
  uniform float time;
  
  float random(float2 st) {
    return fract(sin(dot(st.xy, float2(12.9898, 78.233))) * 43758.5453123);
  }
  
  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    
    // Base glass color
    half4 color = half4(1.0, 1.0, 1.0, opacity * 0.18);
    
    // Top reflection highlight (Vista signature look)
    float highlight = smoothstep(0.0, 0.25, uv.y) * 0.25;
    color.rgb += highlight;
    
    // Bottom shadow
    float shadow = smoothstep(1.0, 0.6, uv.y) * 0.08;
    color.rgb -= shadow;
    
    // Subtle noise for glass texture
    float noise = random(coord * 0.01 + time * 0.001) * 0.04;
    color.rgb += noise - 0.02;
    
    // Border highlight
    float borderDist = min(
      min(uv.x, 1.0 - uv.x) * resolution.x,
      min(uv.y, 1.0 - uv.y) * resolution.y
    );
    float borderGlow = smoothstep(8.0, 2.0, borderDist) * 0.35;
    color.rgb += borderGlow;
    
    return color;
  }
`;

export const GlassPanel: React.FC<GlassPanelProps> = ({
  width,
  height,
  cornerRadius = 8,
  blurRadius = 20,
  opacity = 1,
  borderWidth = 1,
  children,
  style,
  enableNoise = true,
  enableChromaticAberration = false,
  chromaticIntensity = 0.5,
  onPress,
  onHoverIn,
  onHoverOut,
}) => {
  const shaderRef = useRef(glassShaderSource);
  const runtimeEffect = useRef(Skia.RuntimeEffect.Make(shaderRef.current));
  
  const hoverValue = useSharedValue(0);
  const pressValue = useSharedValue(0);
  const timeValue = useSharedValue(0);

  // Animation loop
  useFrame((frameInfo: any) => {
    timeValue.value = frameInfo.timeSinceFirstFrame / 1000;
  });

  const uniforms = useDerivedValue(() => ({
    resolution: vec(width, height),
    cornerRadius,
    opacity: opacity + hoverValue.value * 0.1,
    time: timeValue.value,
  }), [width, height, cornerRadius, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + hoverValue.value * 0.005 },
    ],
  }));

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      pressValue.value = withTiming(1, { duration: 50 });
    })
    .onFinalize(() => {
      pressValue.value = withTiming(0, { duration: 100 });
      onPress?.();
    });

  const hoverGesture = Gesture.Hover()
    .onBegin(() => {
      hoverValue.value = withSpring(1, { damping: 15, stiffness: 200 });
      onHoverIn?.();
    })
    .onEnd(() => {
      hoverValue.value = withSpring(0, { damping: 15, stiffness: 200 });
      onHoverOut?.();
    });

  const composedGesture = Gesture.Exclusive(tapGesture, hoverGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.container,
          { width, height },
          animatedStyle,
          style,
        ]}
      >
        <Canvas style={{ width, height }}>
          <Group>
            {/* Backdrop blur effect */}
            <Paint>
              <BlurMask blur={blurRadius} style="normal" respectCTM />
            </Paint>
            
            {/* Main glass panel */}
            <RoundedRect
              x={0}
              y={0}
              width={width}
              height={height}
              r={cornerRadius}
            >
              {runtimeEffect.current && (
                <Shader
                  source={runtimeEffect.current}
                  uniforms={uniforms}
                />
              )}
            </RoundedRect>
            
            {/* Border highlight */}
            <RoundedRect
              x={borderWidth}
              y={borderWidth}
              width={width - borderWidth * 2}
              height={height - borderWidth * 2}
              r={cornerRadius - borderWidth}
              color="rgba(255, 255, 255, 0.2)"
              style="stroke"
              strokeWidth={borderWidth}
            />
            
            {/* Inner glow */}
            <RoundedRect
              x={2}
              y={2}
              width={width - 4}
              height={height - 4}
              r={cornerRadius - 2}
              color="rgba(255, 255, 255, 0.05)"
              style="stroke"
              strokeWidth={1}
            />
          </Group>
        </Canvas>
        
        {/* Content overlay */}
        <View style={[styles.content, { width, height }]}>
          {children}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 16,
  },
});

export default GlassPanel;
