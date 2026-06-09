import React from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {GlassSurface} from './GlassSurface';
import {Theme, TASKBAR_PRESETS} from '../../theme';

interface Props {
  visible: boolean;
  currentColors: string[];
  startIcon: string;
  onClose: () => void;
  onPickColors: (colors: string[]) => void;
  onPickStartIcon: () => void;
  onResetStartIcon: () => void;
  onChangeWallpaper: () => void;
  onAddWidget: () => void;
  onRunSetup: () => void;
}

const sameColors = (a: string[], b: string[]) =>
  a.length === b.length && a.every((c, i) => c === b[i]);

export const Personalize: React.FC<Props> = ({
  visible,
  currentColors,
  startIcon,
  onClose,
  onPickColors,
  onPickStartIcon,
  onResetStartIcon,
  onChangeWallpaper,
  onAddWidget,
  onRunSetup,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.center}>
          <GlassSurface radius={18} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Personalize</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.section}>Taskbar color</Text>
              <View style={styles.swatchGrid}>
                {TASKBAR_PRESETS.map(preset => {
                  const selected = sameColors(preset.colors, currentColors);
                  return (
                    <Pressable
                      key={preset.name}
                      onPress={() => onPickColors(preset.colors)}
                      style={styles.swatchWrap}>
                      <LinearGradient
                        colors={preset.colors}
                        style={[styles.swatch, selected && styles.swatchSelected]}
                      />
                      <Text style={styles.swatchLabel} numberOfLines={1}>
                        {preset.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.section}>Start button</Text>
              <View style={styles.row}>
                <Pressable style={styles.btn} onPress={onPickStartIcon}>
                  <Text style={styles.btnText}>Choose image…</Text>
                </Pressable>
                {!!startIcon && (
                  <Pressable style={styles.btnGhost} onPress={onResetStartIcon}>
                    <Text style={styles.btnGhostText}>Reset</Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.section}>Wallpaper</Text>
              <Pressable style={styles.btn} onPress={onChangeWallpaper}>
                <Text style={styles.btnText}>Choose wallpaper…</Text>
              </Pressable>

              <Text style={styles.section}>Widgets</Text>
              <Pressable style={styles.btn} onPress={onAddWidget}>
                <Text style={styles.btnText}>Add a home-screen widget…</Text>
              </Pressable>

              <Text style={styles.section}>Setup</Text>
              <Pressable style={styles.btn} onPress={onRunSetup}>
                <Text style={styles.btnText}>Run setup &amp; permissions…</Text>
              </Pressable>
            </ScrollView>
          </GlassSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20},
  center: {maxHeight: '85%'},
  card: {padding: 18},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  title: {color: Theme.text, fontSize: 20, fontWeight: '800'},
  close: {color: Theme.text, fontSize: 18},
  section: {color: Theme.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 14, marginBottom: 8},
  swatchGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  swatchWrap: {width: 84, alignItems: 'center'},
  swatch: {width: 84, height: 40, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)'},
  swatchSelected: {borderWidth: 3, borderColor: '#fff'},
  swatchLabel: {color: Theme.textDim, fontSize: 11, marginTop: 4},
  row: {flexDirection: 'row', gap: 12, alignItems: 'center'},
  btn: {backgroundColor: Theme.accent, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18, alignItems: 'center'},
  btnText: {color: '#fff', fontWeight: '700'},
  btnGhost: {borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: Theme.border},
  btnGhostText: {color: Theme.text, fontWeight: '600'},
});

export default Personalize;
