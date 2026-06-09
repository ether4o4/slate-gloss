import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  Dimensions,
} from 'react-native';
import {
  Canvas,
  Group,
  Rect,
  Shader,
  Skia,
  vec,
  LinearGradient,
  BlurMask,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { useDerivedValue, useFrame } = require('@shopify/react-native-skia');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface TaskbarProps {
  height?: number;
  startOrbComponent?: React.ReactNode;
  quickLaunchItems?: React.ReactNode[];
  windowButtons?: React.ReactNode[];
  systemTray?: React.ReactNode;
  onStartPress?: () => void;
  style?: ViewStyle;
  showClock?: boolean;
  clockFormat?: '12h' | '24h';
  /** Tap target for the clock — opens the notification/calendar popup. */
  onClockPress?: () => void;
}

interface TaskbarButtonProps {
  icon: React.ReactNode;
  label?: string;
  isActive?: boolean;
  isHovered?: boolean;
  onPress?: () => void;
  width?: number;
}

// Taskbar shader with Vista-style reflection
const taskbarShaderSource = `
  uniform float2 resolution;
  uniform float time;
  uniform float2 mousePos;
  
  float random(float2 st) {
    return fract(sin(dot(st.xy, float2(12.9898, 78.233))) * 43758.5453123);
  }
  
  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    float2 mouseUV = mousePos / resolution;
    
    // Base glass color (slightly blue-tinted)
    half4 baseColor = half4(0.94, 0.96, 1.0, 0.18);
    
    // Strong top reflection highlight (Vista signature)
    float reflection = smoothstep(0.0, 0.2, uv.y) * smoothstep(0.35, 0.15, uv.y);
    baseColor.rgb += half3(1.0, 1.0, 1.0) * reflection * 0.5;
    
    // Secondary reflection band
    float reflection2 = smoothstep(0.05, 0.15, uv.y) * smoothstep(0.25, 0.15, uv.y) * 0.3;
    baseColor.rgb += half3(1.0) * reflection2;
    
    // Bottom gradient fade
    float bottomFade = smoothstep(0.5, 1.0, uv.y) * 0.15;
    baseColor.rgb -= bottomFade;
    
    // Mouse interaction glow (subtle ripple)
    float mouseDist = length(uv - mouseUV);
    float mouseGlow = smoothstep(0.4, 0.0, mouseDist) * 0.1;
    baseColor.rgb += half3(0.8, 0.9, 1.0) * mouseGlow;
    
    // Very subtle noise texture
    float noise = random(coord * 0.05 + time * 0.001) * 0.03;
    baseColor.rgb += noise;
    
    // Top edge highlight line
    float topLine = smoothstep(0.0, 0.02, uv.y) * 0.6;
    baseColor.rgb += half3(1.0) * topLine;
    
    return baseColor;
  }
`;

// Taskbar button shader
const taskbarButtonShaderSource = `
  uniform float2 resolution;
  uniform float isActive;
  uniform float isHovered;
  uniform float time;
  
  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    
    // Base glass color
    half4 color = half4(1.0, 1.0, 1.0, 0.05 + isHovered * 0.1);
    
    // Active state indicator (bottom glow)
    if (isActive > 0.5) {
      float activeGlow = smoothstep(1.0, 0.85, uv.y) * 0.4;
      color.rgb += half3(0.6, 0.8, 1.0) * activeGlow;
      color.a += activeGlow * 0.3;
    }
    
    // Hover highlight
    float hoverHighlight = smoothstep(0.0, 0.4, uv.y) * isHovered * 0.2;
    color.rgb += hoverHighlight;
    
    // Border highlight on hover
    float borderDist = min(uv.y * resolution.y, (1.0 - uv.y) * resolution.y);
    float borderGlow = smoothstep(4.0, 0.0, borderDist) * isHovered * 0.3;
    color.rgb += borderGlow;
    
    return color;
  }
`;

const TaskbarButton: React.FC<TaskbarButtonProps> = ({
  icon,
  label,
  isActive = false,
  onPress,
  width = 48,
}) => {
  const hoverValue = useSharedValue(0);
  const pressValue = useSharedValue(0);
  const activeValue = useSharedValue(isActive ? 1 : 0);

  React.useEffect(() => {
    activeValue.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - pressValue.value * 0.03 + hoverValue.value * 0.02 },
      { translateY: pressValue.value * 1 },
    ],
    backgroundColor: isActive 
      ? `rgba(100, 150, 255, ${0.2 + hoverValue.value * 0.1})`
      : `rgba(255, 255, 255, ${0 + hoverValue.value * 0.05})`,
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: activeValue.value + hoverValue.value * 0.3,
    transform: [{ scaleX: 0.6 + activeValue.value * 0.4 }],
  }));

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      pressValue.value = withTiming(1, { duration: 50 });
    })
    .onEnd(() => {
      pressValue.value = withTiming(0, { duration: 100 });
      onPress?.();
    })
    .onFinalize(() => {
      pressValue.value = withTiming(0, { duration: 100 });
    });

  const hoverGesture = Gesture.Hover()
    .onBegin(() => {
      hoverValue.value = withSpring(1, { damping: 15, stiffness: 200 });
    })
    .onEnd(() => {
      hoverValue.value = withSpring(0, { damping: 15, stiffness: 200 });
    });

  const composedGesture = Gesture.Exclusive(tapGesture, hoverGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.taskbarButton, { width }, animatedStyle]}>
        <Animated.View style={[styles.activeIndicator, indicatorStyle]} />
        <View style={styles.buttonContent}>
          {icon}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

export const Taskbar: React.FC<TaskbarProps> = ({
  height = 40,
  startOrbComponent,
  quickLaunchItems = [],
  windowButtons = [],
  systemTray,
  onStartPress,
  style,
  showClock = true,
  clockFormat = '12h',
  onClockPress,
}) => {
  const shaderRef = useRef(taskbarShaderSource);
  const runtimeEffect = useRef(Skia.RuntimeEffect.Make(shaderRef.current));
  
  const timeValue = useSharedValue(0);
  const mouseX = useSharedValue(SCREEN_WIDTH / 2);
  const mouseY = useSharedValue(height / 2);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Animation loop
  useFrame((frameInfo: any) => {
    timeValue.value = frameInfo.timeSinceFirstFrame / 1000;
  });

  // Clock update
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    if (clockFormat === '24h') {
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const uniforms = useDerivedValue(() => ({
    resolution: vec(SCREEN_WIDTH, height),
    time: timeValue.value,
    mousePos: vec(mouseX.value, mouseY.value),
  }), [height]);

  const hoverGesture = Gesture.Hover()
    .onChange((event) => {
      mouseX.value = event.x;
      mouseY.value = event.y;
    });

  return (
    <GestureDetector gesture={hoverGesture}>
      <View style={[styles.container, { height }, style]}>
        {/* Background canvas */}
        <Canvas style={{ width: SCREEN_WIDTH, height, position: 'absolute' }}>
          <Group>
            <BlurMask blur={20} style="normal" respectCTM />
            <Rect x={0} y={0} width={SCREEN_WIDTH} height={height}>
              {runtimeEffect.current && (
                <Shader
                  source={runtimeEffect.current}
                  uniforms={uniforms}
                />
              )}
            </Rect>
            
            {/* Top highlight edge */}
            <Rect
              x={0}
              y={0}
              width={SCREEN_WIDTH}
              height={1}
              color="rgba(255, 255, 255, 0.5)"
            />
          </Group>
        </Canvas>

        {/* Taskbar content */}
        <View style={styles.content}>
          {/* Start Orb area */}
          <View style={styles.startArea}>
            <View style={styles.startOrbWrapper}>
              {startOrbComponent || (
                <View style={styles.placeholderOrb} />
              )}
            </View>
          </View>

          {/* Quick launch divider */}
          {quickLaunchItems.length > 0 && (
            <View style={styles.divider} />
          )}

          {/* Quick launch items */}
          <View style={styles.quickLaunch}>
            {quickLaunchItems.map((item, index) => (
              <View key={index} style={styles.quickLaunchItem}>
                {item}
              </View>
            ))}
          </View>

          {/* Window buttons area */}
          <View style={styles.windowButtonsArea}>
            {windowButtons.map((button, index) => (
              <View key={index}>{button}</View>
            ))}
          </View>

          {/* System tray area */}
          <View style={styles.systemTray}>
            {systemTray}
            
            {showClock && (
              <TouchableOpacity
                style={styles.clock}
                onPress={onClockPress}
                disabled={!onClockPress}
                activeOpacity={0.7}>
                <Text style={styles.clockTime}>{formatTime(currentTime)}</Text>
                <Text style={styles.clockDate}>{formatDate(currentTime)}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  startArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  startOrbWrapper: {
    width: 50,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 100, 200, 0.5)',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 4,
  },
  quickLaunch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  quickLaunchItem: {
    marginHorizontal: 2,
  },
  windowButtonsArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  taskbarButton: {
    height: 34,
    marginHorizontal: 2,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: 'rgba(100, 150, 255, 0.8)',
    borderRadius: 1,
  },
  buttonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  systemTray: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  clock: {
    paddingHorizontal: 8,
    alignItems: 'flex-end',
  },
  clockTime: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '500',
  },
  clockDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
  },
});

export default Taskbar;
