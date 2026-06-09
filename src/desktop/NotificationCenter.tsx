/**
 * NotificationCenter — the popup behind the taskbar clock.
 *
 * Upgrades over the old one-size menu:
 *   • the whole panel SCROLLS (capped at 72% of the screen, never clipped);
 *   • a month calendar grid with today highlighted;
 *   • a notifications section (empty state in this build — no intent
 *     registry is linked);
 *   • the "Aesthetic Quickswitch" widget box — a labeled toggle board for
 *     instant theme/effect switching, reusable as a desktop widget too.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { THEMES, ThemeStore } from '../theme/themes';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function monthMatrix(anchor: Date): (number | null)[][] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/** The labeled-toggle board. Standalone so it can also live in a desktop widget. */
export const QuickswitchBox: React.FC = () => {
  const [, force] = useState(0);
  useEffect(() => ThemeStore.subscribe(() => force(n => n + 1)), []);
  const aesthetic = ThemeStore.get();
  const accent = ThemeStore.theme().accent;

  return (
    <View style={styles.quickBox}>
      <Text style={styles.sectionLabel}>Aesthetic Quickswitch</Text>

      <View style={styles.themeChips}>
        {THEMES.map(t => {
          const active = t.id === aesthetic.themeId;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => ThemeStore.setTheme(t.id)}
              style={[
                styles.themeChip,
                { backgroundColor: t.gradient[0] },
                active && { borderColor: accent, borderWidth: 2 },
              ]}
              activeOpacity={0.8}>
              <Text style={styles.themeChipText} numberOfLines={1}>
                {t.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ToggleRow
        label="Glass transparency"
        value={aesthetic.transparency}
        onChange={ThemeStore.setTransparency}
      />
      <ToggleRow
        label="Pulse animations"
        value={aesthetic.pulseAnimations}
        onChange={ThemeStore.setPulseAnimations}
      />
    </View>
  );
};

const ToggleRow: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(120,170,235,0.7)' }}
      thumbColor="#ffffff"
    />
  </View>
);

const NotificationCenter: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => {
  const now = new Date();
  const rows = monthMatrix(now);
  const monthTitle = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.panel}>
          {/* The scroll fix: everything below lives in one ScrollView. */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator>
            <Text style={styles.clockBig}>
              {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </Text>
            <Text style={styles.dateBig}>
              {now.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            {/* Calendar */}
            <View style={styles.calendar}>
              <Text style={styles.sectionLabel}>{monthTitle}</Text>
              <View style={styles.calRow}>
                {WEEKDAYS.map((d, i) => (
                  <Text key={`${d}-${i}`} style={[styles.calCell, styles.calHead]}>
                    {d}
                  </Text>
                ))}
              </View>
              {rows.map((row, ri) => (
                <View key={ri} style={styles.calRow}>
                  {row.map((day, ci) => (
                    <Text
                      key={ci}
                      style={[
                        styles.calCell,
                        day === now.getDate() && styles.calToday,
                      ]}>
                      {day ?? ''}
                    </Text>
                  ))}
                </View>
              ))}
            </View>

            {/* Notifications */}
            <View style={styles.notifBox}>
              <Text style={styles.sectionLabel}>Notifications</Text>
              <Text style={styles.notifEmpty}>No new notifications.</Text>
            </View>

            {/* Aesthetic Quickswitch widget box */}
            <QuickswitchBox />
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  panel: {
    position: 'absolute',
    right: 8,
    bottom: 56,
    width: 320,
    maxHeight: '72%',
    borderRadius: 12,
    backgroundColor: 'rgba(28,42,66,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  scroll: { flexGrow: 0 },
  scrollContent: { padding: 14, gap: 12 },
  clockBig: { color: '#ffffff', fontSize: 34, fontWeight: '300' },
  dateBig: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: -6 },
  sectionLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  calendar: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  calRow: { flexDirection: 'row' },
  calCell: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    paddingVertical: 3,
  },
  calHead: { color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  calToday: {
    color: '#0d2137',
    backgroundColor: '#9ed0ff',
    borderRadius: 10,
    overflow: 'hidden',
    fontWeight: '700',
  },
  notifBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  notifEmpty: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontStyle: 'italic' },
  notifRow: { flexDirection: 'row', gap: 8, paddingVertical: 4, alignItems: 'center' },
  notifVerb: {
    color: '#bcdcff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    minWidth: 50,
  },
  notifText: { color: '#eaf4ff', fontSize: 12, flex: 1 },
  quickBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  themeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  themeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    maxWidth: 140,
  },
  themeChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  toggleLabel: { color: '#eaf4ff', fontSize: 13 },
});

export default NotificationCenter;
