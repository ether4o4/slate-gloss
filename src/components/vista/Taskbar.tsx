import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Vista} from '../../theme';
import {StartOrb} from './StartOrb';
import {Clock} from './Clock';

interface TaskbarProps {
  startActive: boolean;
  onStartPress: () => void;
  onSwarmPress: () => void;
}

/**
 * The glossy Vista taskbar pinned to the bottom: start orb on the left, a quick
 * "Swarm" AI button and the clock on the right.
 */
export const Taskbar: React.FC<TaskbarProps> = ({
  startActive,
  onStartPress,
  onSwarmPress,
}) => {
  return (
    <LinearGradient colors={Vista.taskbar} style={styles.bar}>
      {/* Bright Aero top edge */}
      <LinearGradient
        colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
        style={styles.topEdge}
        pointerEvents="none"
      />
      <StartOrb active={startActive} onPress={onStartPress} size={50} />

      <View style={styles.right}>
        <Pressable
          onPress={onSwarmPress}
          style={({pressed}) => [styles.swarm, pressed && styles.swarmPressed]}>
          <Text style={styles.swarmDot}>✦</Text>
          <Text style={styles.swarmText}>Swarm</Text>
        </Pressable>
        <Clock />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 6,
    height: 64,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.35)',
  },
  topEdge: {position: 'absolute', top: 0, left: 0, right: 0, height: 2},
  right: {flexDirection: 'row', alignItems: 'center', gap: 16},
  swarm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Vista.border,
  },
  swarmPressed: {backgroundColor: 'rgba(255,255,255,0.28)'},
  swarmDot: {color: '#bfe3ff', fontSize: 14},
  swarmText: {color: Vista.text, fontWeight: '600', fontSize: 14},
});

export default Taskbar;
