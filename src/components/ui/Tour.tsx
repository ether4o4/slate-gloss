import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Theme } from '../../theme';

interface Props {
  visible: boolean;
  isDefault: boolean;
  notifAccess: boolean;
  hasKey: boolean;
  onClose: () => void;
  onSetDefault: () => void;
  onBattery: () => void;
  onNotifAccess: () => void;
  onAddKey: () => void;
}

interface Step {
  emoji: string;
  title: string;
  body: string;
  action?: { label: string; run: () => void };
  done?: boolean;
}

export const Tour: React.FC<Props> = ({
  visible,
  isDefault,
  notifAccess,
  hasKey,
  onClose,
  onSetDefault,
  onBattery,
  onNotifAccess,
  onAddKey,
}) => {
  const [i, setI] = useState(0);

  // Restart from the first page whenever the tour is (re)opened.
  useEffect(() => {
    if (visible) {
      setI(0);
    }
  }, [visible]);

  const steps: Step[] = [
    {
      emoji: '👋',
      title: 'Welcome to NeverSoft OS',
      body: 'A glossy, AI-powered home screen. This quick setup turns on the few permissions it needs — takes about a minute.',
    },
    {
      emoji: '🏠',
      title: 'Make it your home',
      body: 'Set NeverSoft OS as your default launcher so the Home button opens it.',
      action: {
        label: isDefault ? 'Set again' : 'Set as default',
        run: onSetDefault,
      },
      done: isDefault,
    },
    {
      emoji: '🔋',
      title: 'Keep it alive',
      body: "Phones aggressively kill background apps — which can bounce you back to your old launcher. Set NeverSoft OS to Unrestricted / don't optimize.",
      action: { label: 'Open battery settings', run: onBattery },
    },
    {
      emoji: '🔔',
      title: 'Notifications (optional)',
      body: 'Grant notification access so the Notifications widget can mirror your alerts.',
      action: {
        label: notifAccess ? 'Open settings' : 'Grant access',
        run: onNotifAccess,
      },
      done: notifAccess,
    },
    {
      emoji: '✦',
      title: 'Meet Swarm, your AI',
      body: 'Swarm can run your launcher by voice/text — change themes, open & pin apps, toggle widgets. It is free: add a Groq key (console.groq.com/keys).',
      action: { label: hasKey ? 'Open Swarm' : 'Add free key', run: onAddKey },
      done: hasKey,
    },
    {
      emoji: '🚀',
      title: "You're all set",
      body: "That's it. Long-press apps or the desktop for menus, tap the clock for widgets, and ask Swarm for anything. Enjoy NeverSoft OS!",
    },
  ];

  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#0d2137', '#13314f', '#0a1a2c']}
          style={StyleSheet.absoluteFill}
        />

        <Pressable style={styles.skip} onPress={onClose} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>

        <View style={styles.body}>
          <Text style={styles.emoji}>{step.emoji}</Text>
          <Text style={styles.title}>{step.title}</Text>
          {step.done && <Text style={styles.doneBadge}>✓ Done</Text>}
          <Text style={styles.text}>{step.body}</Text>

          {step.action && (
            <Pressable style={styles.actionBtn} onPress={step.action.run}>
              <Text style={styles.actionText}>{step.action.label}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {steps.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, idx === i && styles.dotActive]}
              />
            ))}
          </View>
          <View style={styles.nav}>
            {i > 0 ? (
              <Pressable onPress={() => setI(i - 1)} hitSlop={10}>
                <Text style={styles.back}>Back</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              style={styles.nextBtn}
              onPress={() => (last ? onClose() : setI(i + 1))}
            >
              <Text style={styles.nextText}>{last ? 'Finish' : 'Next'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  skip: { position: 'absolute', top: 44, right: 20, zIndex: 5 },
  skipText: { color: Theme.textDim, fontSize: 15, fontWeight: '600' },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emoji: { fontSize: 64, marginBottom: 18 },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  doneBadge: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  text: { color: '#bcd0e6', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  actionBtn: {
    marginTop: 26,
    backgroundColor: Theme.accent,
    borderRadius: 26,
    paddingHorizontal: 30,
    paddingVertical: 14,
  },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { paddingHorizontal: 24, paddingBottom: 40 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 22,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: { backgroundColor: '#fff', width: 22 },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: {
    color: Theme.textDim,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  nextBtn: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 24,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.border,
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default Tour;
