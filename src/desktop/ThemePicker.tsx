/**
 * ThemePicker — contents of the Settings desktop window.
 *
 * The pre-configured design catalog: tap a card to switch the whole OS to
 * that aesthetic. The same catalog the NeverSoft Service Assistant drives
 * from chat ("themes", "theme royale noir").
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { THEMES, ThemeStore } from '../theme/themes';

const ThemePicker: React.FC = () => {
  const [activeId, setActiveId] = useState(() => ThemeStore.theme().id);
  useEffect(() => ThemeStore.subscribe(() => setActiveId(ThemeStore.theme().id)), []);

  return (
    <ScrollView style={styles.body} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Pick a design — or ask the assistant ("theme royale noir").
      </Text>
      {THEMES.map(t => (
        <TouchableOpacity
          key={t.id}
          activeOpacity={0.8}
          onPress={() => ThemeStore.setTheme(t.id)}
          style={[styles.card, t.id === activeId && styles.cardActive]}
        >
          <LinearGradient
            colors={t.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.swatch}
          />
          <View style={styles.cardText}>
            <Text style={styles.cardName}>
              {t.id === activeId ? '● ' : ''}
              {t.name}
            </Text>
            <Text style={styles.cardTagline} numberOfLines={2}>
              {t.tagline}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1 },
  content: { padding: 12, gap: 10 },
  hint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  cardActive: {
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  cardText: { flex: 1 },
  cardName: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  cardTagline: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 },
});

export default ThemePicker;
