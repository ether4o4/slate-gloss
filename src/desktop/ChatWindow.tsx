/**
 * ChatWindow — the MVE assistant as a floating, persistent window.
 *
 * Summoned from the taskbar chat button and available on every screen. It stays
 * mounted (so the conversation persists) and is shown in one of three sizes:
 *   • minimized — collapsed to nothing on screen (a slim restore handle)
 *   • half      — bottom-half sheet
 *   • full      — full screen above the desktop
 * It always clears the taskbar at the bottom, so the taskbar never gets covered.
 */
import React from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AssistantChat from './AssistantChat';
import { ThemeStore } from '../theme/themes';

export type ChatSize = 'min' | 'half' | 'full';

const { height: SCREEN_H } = Dimensions.get('window');

const ChatWindow: React.FC<{
  size: ChatSize;
  taskbarH: number;
  statusBarH: number;
  assistantName: string;
  onSize: (s: ChatSize) => void;
  onClose: () => void;
}> = ({ size, taskbarH, statusBarH, assistantName, onSize, onClose }) => {
  if (size === 'min') {
    return null;
  }

  const accent = ThemeStore.theme().accent;
  const top = size === 'full' ? statusBarH : Math.round(SCREEN_H * 0.46);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.frame, { top, bottom: taskbarH }]}
      pointerEvents="box-none"
    >
      <View style={[styles.window, { borderColor: accent + '88' }]}>
        <View style={styles.titleBar}>
          <Text style={styles.title} numberOfLines={1}>
            {assistantName}
          </Text>
          <View style={styles.controls}>
            <Ctl label="—" onPress={() => onSize('min')} hint="Minimize" />
            <Ctl
              label={size === 'half' ? '▣' : '▢'}
              onPress={() => onSize(size === 'half' ? 'full' : 'half')}
              hint="Resize"
            />
            <Ctl label="✕" onPress={onClose} hint="Close" danger />
          </View>
        </View>
        <AssistantChat />
      </View>
    </KeyboardAvoidingView>
  );
};

const Ctl: React.FC<{
  label: string;
  onPress: () => void;
  hint: string;
  danger?: boolean;
}> = ({ label, onPress, hint, danger }) => (
  <TouchableOpacity
    onPress={onPress}
    hitSlop={8}
    accessibilityLabel={hint}
    style={[styles.ctl, danger && styles.ctlDanger]}
  >
    <Text style={styles.ctlText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  window: {
    flex: 1,
    margin: 6,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(13,33,55,0.96)',
    borderWidth: 1,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.16)',
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  controls: { flexDirection: 'row', gap: 4 },
  ctl: {
    width: 30,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  ctlDanger: { backgroundColor: 'rgba(226,87,76,0.35)' },
  ctlText: { color: '#eaf4ff', fontSize: 14, fontWeight: '800' },
});

export default ChatWindow;
