import React, { useRef } from 'react';
import { View, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import {
  Canvas,
  Group,
  RoundedRect,
  Shader,
  Skia,
  vec,
  LinearGradient,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { useDerivedValue, useFrame } = require('@shopify/react-native-skia');

export interface GlassButtonProps {
  title: string;
  onPress: () => void;
  width?: number;
  height?: number;
  cornerRadius?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  icon?: React.ReactNode;
}

// Glass Button Shader with dynamic gradients
const buttonShaderSource = `
  uniform float2 resolution;
  uniform float cornerRadius;
  uniform float hover;
  uniform float active;
  uniform float time;
  
  float random(float2 st) {
    return fract(sin(dot(st.xy, float2(12.9898, 78.233))) * 43758.5453123);
  }
  
  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    
    // Base glass color - more opaque than panel
    half4 baseColor = half4(1.0, 1.0, 1.0, 0.25 + hover * 0.1);
    
    // Top highlight gradient
    float highlight = smoothstep(0.0, 0.4, uv.y) * (0.3 + hover * 0.2);
    baseColor.rgb += highlight;
    
    // Bottom shadow for 3D effect
    float shadow = smoothstep(1.0, 0.5, uv.y) * 0.1;
    baseColor.rgb -= shadow;
    
    // Active state - pressed down look
    float pressDarken = active * 0.15;
    baseColor.rgb -= pressDarken;
    
    // Subtle noise texture
    float noise = random(coord * 0.02 + time * 0.001) * 0.03;
    baseColor.rgb += noise;
    
    // Border glow on hover
    float borderDist = min(
      min(uv.x, 1.0 - uv.x) * resolution.x,
      min(uv.y, 1.0 - uv.y) * resolution.y
    );
    float borderGlow = smoothstep(6.0, 1.0, borderDist) * (0.4 + hover * 0.3);
    baseColor.rgb += borderGlow;
    
    return baseColor;
  }
`;

export const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  width = 140,
  height = 42,
  cornerRadius = 6,
  style,
  textStyle,
  disabled = false,
  icon,
}) => {
  const shaderRef = useRef(buttonShaderSource);
  const runtimeEffect = useRef(Skia.RuntimeEffect.Make(shaderRef.current));
  
  const hoverValue = useSharedValue(0);
  const pressValue = useSharedValue(0);
  const timeValue = useSharedValue(0);

  useFrame((frameInfo: any) => {
    timeValue.value = frameInfo.timeSinceFirstFrame / 1000;
  });

  const uniforms = useDerivedValue(() => ({
    resolution: vec(width, height),
    cornerRadius,
    hover: hoverValue.value,
    active: pressValue.value,
    time: timeValue.value,
  }), [width, height, cornerRadius]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - pressValue.value * 0.03 + hoverValue.value * 0.02 },
    ],
    shadowColor: interpolateColor(
      hoverValue.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.1)', 'rgba(200, 220, 255, 0.4)']
    ),
    shadowOpacity: 0.3 + hoverValue.value * 0.3,
    shadowRadius: 8 + hoverValue.value * 8,
    shadowOffset: { width: 0, height: pressValue.value * 2 },
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: pressValue.value * 1 },
    ],
    color: interpolateColor(
      hoverValue.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 1)']
    ),
  }));

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      pressValue.value = withTiming(1, { duration: 50 });
    })
    .onEnd(() => {
      pressValue.value = withTiming(0, { duration: 150 });
      onPress();
    })
    .onFinalize(() => {
      pressValue.value = withTiming(0, { duration: 150 });
    });

  const hoverGesture = Gesture.Hover()
    .enabled(!disabled)
    .onBegin(() => {
      hoverValue.value = withSpring(1, { damping: 12, stiffness: 180 });
    })
    .onEnd(() => {
      hoverValue.value = withSpring(0, { damping: 12, stiffness: 180 });
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
          disabled && styles.disabled,
        ]}
      >
        <Canvas style={{ width, height }}>
          <Group>
            {/* Main button background */}
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
            
            {/* Inner highlight stroke */}
            <RoundedRect
              x={1}
              y={1}
              width={width - 2}
              height={height - 2}
              r={cornerRadius - 1}
              color="rgba(255, 255, 255, 0.15)"
              style="stroke"
              strokeWidth={1}
            />
            
            {/* Top edge highlight */}
            <RoundedRect
              x={2}
              y={2}
              width={width - 4}
              height={(height - 4) * 0.5}
              r={cornerRadius - 2}
            >
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, height * 0.5)}
                colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0)']}
              />
            </RoundedRect>
          </Group>
        </Canvas>
        
        {/* Button content */}
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Animated.Text style={[styles.text, textAnimatedStyle, textStyle]}>
            {title}
          </Animated.Text>
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
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GlassButton;
