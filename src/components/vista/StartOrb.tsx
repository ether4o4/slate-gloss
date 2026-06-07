import React, {useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Vista} from '../../theme';

interface StartOrbProps {
  size?: number;
  active?: boolean;
  onPress: () => void;
}

/**
 * The glossy Vista "pearl" start orb. The only animation is a quick spring on
 * press, driven by the native driver, so it never spins on the JS thread or
 * runs while idle.
 */
export const StartOrb: React.FC<StartOrbProps> = ({size = 56, active = false, onPress}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.9)}
      onPressOut={() => animateTo(1)}
      hitSlop={10}>
      <Animated.View style={{transform: [{scale}]}}>
        <LinearGradient
          colors={active ? Vista.orbActive : Vista.orb}
          start={{x: 0.2, y: 0}}
          end={{x: 0.8, y: 1}}
          style={[styles.orb, {width: size, height: size, borderRadius: size / 2}]}>
          {/* Top glossy highlight */}
          <View
            style={[
              styles.gloss,
              {
                width: size * 0.7,
                height: size * 0.34,
                borderRadius: size / 2,
                top: size * 0.08,
              },
            ]}
          />
          <Text style={[styles.logo, {fontSize: size * 0.42}]}>⊞</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#0a2c52',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
  },
  gloss: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  logo: {
    color: '#ffffff',
    fontWeight: '700',
    textShadowColor: 'rgba(0,40,90,0.6)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
});

export default StartOrb;
