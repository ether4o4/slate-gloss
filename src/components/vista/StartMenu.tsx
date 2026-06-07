import React, {useEffect, useRef} from 'react';
import {Animated, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {Vista} from '../../theme';
import {GlassSurface} from './GlassSurface';
import {openHomeSettings} from '../../native/Launcher';

interface StartMenuProps {
  visible: boolean;
  onClose: () => void;
  onOpenSwarm: () => void;
  onRefreshApps: () => void;
  isDefaultLauncher: boolean;
  appCount: number;
}

const MenuRow: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
}> = ({icon, label, onPress}) => (
  <Pressable
    onPress={onPress}
    style={({pressed}) => [styles.row, pressed && styles.rowPressed]}>
    <Text style={styles.rowIcon}>{icon}</Text>
    <Text style={styles.rowLabel}>{label}</Text>
  </Pressable>
);

/**
 * Glossy Vista start menu. Slides up with a single native-driver animation when
 * opened and stays static afterwards.
 */
export const StartMenu: React.FC<StartMenuProps> = ({
  visible,
  onClose,
  onOpenSwarm,
  onRefreshApps,
  isDefaultLauncher,
  appCount,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  const translateY = anim.interpolate({inputRange: [0, 1], outputRange: [40, 0]});

  const act = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[styles.menuWrap, {opacity: anim, transform: [{translateY}]}]}>
          <Pressable onPress={() => {}}>
            <GlassSurface radius={18} style={styles.menu}>
              <Text style={styles.title}>Start</Text>
              <Text style={styles.subtitle}>{appCount} apps installed</Text>

              <View style={styles.divider} />

              <MenuRow icon="✦" label="Swarm AI assistant" onPress={act(onOpenSwarm)} />
              <MenuRow icon="↻" label="Refresh app list" onPress={act(onRefreshApps)} />
              <MenuRow
                icon="⚙"
                label={isDefaultLauncher ? 'Home settings' : 'Set as default launcher'}
                onPress={act(openHomeSettings)}
              />

              <View style={styles.divider} />

              <Text style={styles.hint}>
                {isDefaultLauncher
                  ? 'Vista Launcher is your home screen.'
                  : 'Tip: set Vista as your default launcher to use the home button.'}
              </Text>
            </GlassSurface>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)'},
  menuWrap: {paddingHorizontal: 10, paddingBottom: 74},
  menu: {padding: 16},
  title: {color: Vista.text, fontSize: 20, fontWeight: '700'},
  subtitle: {color: Vista.textDim, fontSize: 12, marginTop: 2},
  divider: {height: StyleSheet.hairlineWidth, backgroundColor: Vista.borderSoft, marginVertical: 12},
  row: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 10},
  rowPressed: {backgroundColor: 'rgba(255,255,255,0.16)'},
  rowIcon: {color: '#bfe3ff', fontSize: 18, width: 24, textAlign: 'center'},
  rowLabel: {color: Vista.text, fontSize: 16, fontWeight: '500'},
  hint: {color: Vista.textDim, fontSize: 12, lineHeight: 17},
});

export default StartMenu;
