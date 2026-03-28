import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import {
  Canvas,
  Group,
  RoundedRect,
  Rect,
  Shader,
  Skia,
  vec,
  LinearGradient,
  BlurMaskFilter,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { useDerivedValue, useFrame } = require('@shopify/react-native-skia');

interface WindowFrameProps {
  title: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  children?: React.ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onRestore?: () => void;
  isMaximized?: boolean;
  isMinimized?: boolean;
  style?: ViewStyle;
  showTitleBar?: boolean;
  titleBarHeight?: number;
  cornerRadius?: number;
  resizable?: boolean;
  draggable?: boolean;
}

// Title bar shader
const titleBarShaderSource = `
  uniform float2 resolution;
  uniform float hover;
  uniform float time;
  
  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    
    // Gradient from top (lighter) to bottom (darker)
    half3 topColor = half3(0.95, 0.97, 1.0);
    half3 bottomColor = half3(0.75, 0.80, 0.90);
    
    half3 color = mix(bottomColor, topColor, uv.y);
    
    // Top highlight line
    float topLine = smoothstep(0.0, 0.05, uv.y) * smoothstep(0.1, 0.05, uv.y);
    color += half3(1.0) * topLine * 0.3;
    
    // Subtle noise
    float noise = fract(sin(dot(coord, float2(12.9898, 78.233))) * 43758.5453);
    color += (noise - 0.5) * 0.02;
    
    return half4(color, 0.95);
  }
`;

// Window frame shader
const windowFrameShaderSource = `
  uniform float2 resolution;
  uniform float cornerRadius;
  uniform float time;
  
  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    
    // Glass base color
    half4 color = half4(0.98, 0.99, 1.0, 0.12);
    
    // Top highlight (stronger at top edge)
    float topHighlight = smoothstep(0.0, 0.1, uv.y) * 0.3;
    color.rgb += topHighlight;
    
    // Border highlight
    float borderDist = min(
      min(uv.x, 1.0 - uv.x) * resolution.x,
      min(uv.y, 1.0 - uv.y) * resolution.y
    );
    float borderGlow = smoothstep(10.0, 2.0, borderDist) * 0.4;
    color.rgb += borderGlow;
    
    return color;
  }
`;

interface WindowButtonProps {
  type: 'minimize' | 'maximize' | 'close' | 'restore';
  onPress: () => void;
  size?: number;
}

const WindowButton: React.FC<WindowButtonProps> = ({
  type,
  onPress,
  size = 26,
}) => {
  const hoverValue = useSharedValue(0);
  const pressValue = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressValue.value * 0.05 }],
    backgroundColor: type === 'close' 
      ? hoverValue.value > 0.5 
        ? `rgba(232, 17, 35, ${0.8 + hoverValue.value * 0.2})`
        : 'transparent'
      : hoverValue.value > 0
        ? `rgba(255, 255, 255, ${0.1 + hoverValue.value * 0.2})`
        : 'transparent',
  }));

  const iconColor = type === 'close' && hoverValue.value > 0.5 
    ? '#fff' 
    : 'rgba(0, 0, 0, 0.6)';

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      pressValue.value = withTiming(1, { duration: 50 });
    })
    .onEnd(() => {
      pressValue.value = withTiming(0, { duration: 100 });
      onPress();
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

  const renderIcon = () => {
    switch (type) {
      case 'minimize':
        return <View style={[styles.buttonIcon, { backgroundColor: iconColor, height: 2, marginTop: 8 }]} />;
      case 'maximize':
        return <View style={[styles.buttonIcon, { borderColor: iconColor, borderWidth: 1, width: 10, height: 10 }]} />;
      case 'restore':
        return (
          <View style={styles.restoreIcon}>
            <View style={[styles.restoreBox, { borderColor: iconColor }]} />
            <View style={[styles.restoreBoxSmall, { borderColor: iconColor }]} />
          </View>
        );
      case 'close':
        return (
          <Text style={[styles.closeIcon, { color: iconColor }]}×</Text>
        );
    }
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.windowButton, { width: size, height: size - 4 }, animatedStyle]}>
        {renderIcon()}
      </Animated.View>
    </GestureDetector>
  );
};

export const WindowFrame: React.FC<WindowFrameProps> = ({
  title,
  width: initialWidth,
  height: initialHeight,
  x: initialX = 50,
  y: initialY = 50,
  minWidth = 200,
  minHeight = 150,
  children,
  onClose,
  onMinimize,
  onMaximize,
  onRestore,
  isMaximized = false,
  style,
  showTitleBar = true,
  titleBarHeight = 32,
  cornerRadius = 6,
  draggable = true,
}) => {
  const shaderRef = useRef(windowFrameShaderSource);
  const titleBarShaderRef = useRef(titleBarShaderSource);
  const runtimeEffect = useRef(Skia.RuntimeEffect.Make(shaderRef.current));
  const titleBarRuntimeEffect = useRef(Skia.RuntimeEffect.Make(titleBarShaderRef.current));

  const [windowWidth, setWindowWidth] = useState(initialWidth);
  const [windowHeight, setWindowHeight] = useState(initialHeight);
  
  const posX = useSharedValue(initialX);
  const posY = useSharedValue(initialY);
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(1);
  const timeValue = useSharedValue(0);
  const isDragging = useSharedValue(false);

  useFrame((frameInfo) => {
    timeValue.value = frameInfo.timeSinceFirstFrame / 1000;
  });

  const frameUniforms = useDerivedValue(() => ({
    resolution: vec(windowWidth, windowHeight),
    cornerRadius,
    time: timeValue.value,
  }), [windowWidth, windowHeight, cornerRadius]);

  const titleBarUniforms = useDerivedValue(() => ({
    resolution: vec(windowWidth, titleBarHeight),
    hover: isDragging.value ? 1 : 0,
    time: timeValue.value,
  }), [windowWidth, titleBarHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: posX.value },
      { translateY: posY.value },
      { scale: scaleValue.value },
    ],
    opacity: opacityValue.value,
    width: windowWidth,
    height: windowHeight,
  }));

  const dragGesture = Gesture.Pan()
    .enabled(draggable && !isMaximized)
    .onBegin(() => {
      isDragging.value = true;
      scaleValue.value = withTiming(1.01, { duration: 100 });
    })
    .onChange((event) => {
      posX.value += event.changeX;
      posY.value += event.changeY;
    })
    .onEnd(() => {
      isDragging.value = false;
      scaleValue.value = withTiming(1, { duration: 150 });
    });

  const handleClose = () => {
    opacityValue.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(onClose)?.();
    });
  };

  const handleMaximize = () => {
    if (isMaximized) {
      onRestore?.();
    } else {
      onMaximize?.();
    }
  };

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <GestureDetector gesture={dragGesture}>
        <View style={[{ width: windowWidth, height: windowHeight }]} >
          {/* Window frame background */}
          <Canvas style={{ width: windowWidth, height: windowHeight, position: 'absolute' }}>
            <Group>
              {/* Main frame */}
              <RoundedRect
                x={0}
                y={0}
                width={windowWidth}
                height={windowHeight}
                r={cornerRadius}
              >
                <BlurMaskFilter blur={15} style="normal" respectCTM />
                {runtimeEffect.current && (
                  <Shader
                    source={runtimeEffect.current}
                    uniforms={frameUniforms}
                  />
                )}
              </RoundedRect>
              
              {/* Border stroke */}
              <RoundedRect
                x={0.5}
                y={0.5}
                width={windowWidth - 1}
                height={windowHeight - 1}
                r={cornerRadius}
                color="rgba(255, 255, 255, 0.25)"
                style="stroke"
                strokeWidth={1}
              />
            </Group>
          </Canvas>

          {/* Title bar */}
          {showTitleBar && (
            <View style={[styles.titleBar, { width: windowWidth, height: titleBarHeight }]}>
              <Canvas style={{ width: windowWidth, height: titleBarHeight, position: 'absolute' }}>
                <Group>
                  <RoundedRect
                    x={0}
                    y={0}
                    width={windowWidth}
                    height={titleBarHeight}
                    r={cornerRadius}
                  >
                    {titleBarRuntimeEffect.current && (
                      <Shader
                        source={titleBarRuntimeEffect.current}
                        uniforms={titleBarUniforms}
                      />
                    )}
                  </RoundedRect>
                  
                  {/* Title bar bottom border */}
                  <Rect
                    x={0}
                    y={titleBarHeight - 1}
                    width={windowWidth}
                    height={1}
                    color="rgba(0, 0, 0, 0.1)"
                  />
                </Group>
              </Canvas>

              {/* Window icon and title */}
              <View style={styles.titleContainer}>
                <View style={styles.windowIcon} />
                <Text style={styles.titleText} numberOfLines={1}>
                  {title}
                </Text>
              </View>

              {/* Window controls */}
              <View style={styles.windowControls}>
                <WindowButton type="minimize" onPress={onMinimize || (() => {})} />
                <WindowButton 
                  type={isMaximized ? 'restore' : 'maximize'} 
                  onPress={handleMaximize} 
                />
                <WindowButton type="close" onPress={handleClose} />
              </View>
            </View>
          )}

          {/* Window content */}
          <View style={[styles.content, { 
            width: windowWidth, 
            height: windowHeight - (showTitleBar ? titleBarHeight : 0),
            marginTop: showTitleBar ? titleBarHeight : 0,
          }]}>
            {children}
          </View>
        </View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  titleBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    flex: 1,
  },
  windowIcon: {
    width: 16,
    height: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
    marginRight: 8,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(0, 0, 0, 0.7)',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
  },
  windowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  windowButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 1,
    borderRadius: 2,
  },
  buttonIcon: {
    width: 10,
  },
  restoreIcon: {
    width: 10,
    height: 10,
    position: 'relative',
  },
  restoreBox: {
    position: 'absolute',
    width: 8,
    height: 7,
    borderWidth: 1,
    top: 3,
    left: 0,
  },
  restoreBoxSmall: {
    position: 'absolute',
    width: 8,
    height: 7,
    borderWidth: 1,
    top: 0,
    left: 2,
    backgroundColor: 'white',
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '300',
    lineHeight: 18,
  },
  content: {
    overflow: 'hidden',
  },
});

export default WindowFrame;
