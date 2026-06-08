import React from 'react';
import {Image, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import type {AppInfo} from '../../native/Launcher';
import {Theme} from '../../theme';

export const AppIconImage: React.FC<{
  app?: AppInfo;
  size: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}> = ({app, size, radius = 12, style}) => {
  const dim = {width: size, height: size, borderRadius: radius};
  if (app?.icon) {
    return <Image source={{uri: app.icon}} style={[dim, style]} fadeDuration={0} />;
  }
  return (
    <View style={[dim, styles.fallback, style]}>
      <Text style={[styles.letter, {fontSize: size * 0.42}]}>
        {(app?.label ?? '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {color: Theme.text, fontWeight: '700'},
});

export default AppIconImage;
