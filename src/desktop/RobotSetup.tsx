/**
 * RobotSetup — first-run "paint your robot" step.
 *
 * The little robot is the face of MVE (the taskbar AI button). On first start
 * the user picks his paint job; the tint is applied as a translucent wash over
 * the sprite wherever he appears. Choice is stored on-device. More outfits and
 * abilities hang off this same screen later.
 */
import React, { useState } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ROBOT = require('../assets/icons/robot.png');

export interface RobotPaint {
  id: string;
  name: string;
  /** Tint wash color, or null for the classic factory black. */
  color: string | null;
}

export const ROBOT_PAINTS: RobotPaint[] = [
  { id: 'classic', name: 'Factory Black', color: null },
  { id: 'blue', name: 'NeverSoft Blue', color: '#3a8de0' },
  { id: 'green', name: 'Jelly Green', color: '#2dbb4e' },
  { id: 'red', name: 'Royale Red', color: '#e0483a' },
  { id: 'purple', name: 'Royale Noir', color: '#8a5fd4' },
  { id: 'orange', name: 'Sunset', color: '#f08c3a' },
  { id: 'pink', name: 'Bubblegum', color: '#e066b8' },
  { id: 'frost', name: 'Arctic Frost', color: '#9fd4f5' },
];

export const RobotSprite: React.FC<{ size: number; tint: string | null }> = ({
  size,
  tint,
}) => (
  <View style={{ width: size, height: size }}>
    <Image
      source={ROBOT}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
    {tint && (
      <Image
        source={ROBOT}
        style={[
          styles.tintWash,
          { width: size, height: size, tintColor: tint },
        ]}
        resizeMode="contain"
      />
    )}
  </View>
);

const RobotSetup: React.FC<{
  visible: boolean;
  onDone: (paint: RobotPaint) => void;
}> = ({ visible, onDone }) => {
  const [picked, setPicked] = useState<RobotPaint>(ROBOT_PAINTS[0]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Meet your robot</Text>
          <Text style={styles.sub}>
            He's the face of MVE — he lives on your taskbar and runs the AI.
            Pick his paint job. (Outfits and abilities are coming.)
          </Text>

          <View style={styles.preview}>
            <RobotSprite size={120} tint={picked.color} />
            <Text style={styles.paintName}>{picked.name}</Text>
          </View>

          <View style={styles.swatches}>
            {ROBOT_PAINTS.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setPicked(p)}
                style={[
                  styles.swatch,
                  { backgroundColor: p.color ?? '#222428' },
                  picked.id === p.id && styles.swatchActive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={() => onDone(picked)}>
            <Text style={styles.doneText}>Paint him</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  tintWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.45,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    backgroundColor: 'rgba(13,33,55,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    padding: 20,
    alignItems: 'center',
  },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  sub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  preview: { alignItems: 'center', marginVertical: 18, gap: 8 },
  paintName: { color: '#bfe3ff', fontSize: 13, fontWeight: '700' },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  swatchActive: { borderColor: '#ffffff', borderWidth: 3 },
  doneBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(120,170,235,0.7)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  doneText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
});

export default RobotSetup;
