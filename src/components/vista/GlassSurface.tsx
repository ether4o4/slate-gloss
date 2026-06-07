import React from 'react';
import {View, StyleSheet, type ViewStyle, type StyleProp} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Vista} from '../../theme';

interface GlassSurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  /** Adds the bright Aero gloss highlight across the top half. */
  sheen?: boolean;
}

/**
 * A cheap frosted-glass panel: a translucent gradient fill, a hairline border
 * and an optional top "sheen" highlight that gives the Vista Aero gloss.
 * Static gradients only — nothing animates, so it costs no battery while idle.
 */
export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  style,
  radius = 14,
  sheen = true,
}) => {
  return (
    <View style={[styles.wrapper, {borderRadius: radius}, style]}>
      <LinearGradient
        colors={Vista.glassFill}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
        style={[StyleSheet.absoluteFill, {borderRadius: radius}]}
      />
      {sheen && (
        <LinearGradient
          colors={Vista.glassSheen}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          style={[styles.sheen, {borderTopLeftRadius: radius, borderTopRightRadius: radius}]}
          pointerEvents="none"
        />
      )}
      <View style={[styles.border, {borderRadius: radius}]} pointerEvents="none" />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {overflow: 'hidden', backgroundColor: 'rgba(20,40,70,0.25)'},
  sheen: {position: 'absolute', top: 0, left: 0, right: 0, height: '55%', opacity: 0.9},
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Vista.border,
  },
});

export default GlassSurface;
