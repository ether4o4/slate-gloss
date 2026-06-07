import React, {useEffect, useMemo, useState} from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {BatteryInfo, NotificationInfo, SystemInfo} from '../../native/Launcher';
import type {Weather} from '../../api/Weather';
import {describeWeather} from '../../api/Weather';
import {WIDGET_CATALOG} from '../../db/LauncherStore';
import {GlassSurface} from './GlassSurface';
import {Vista} from '../../theme';

interface Props {
  visible: boolean;
  enabledWidgets: string[];
  notifications: NotificationInfo[];
  notifAccess: boolean;
  battery: BatteryInfo;
  weather: Weather | null;
  system: SystemInfo | null;
  notes: string;
  onClose: () => void;
  onToggleWidget: (id: string) => void;
  onGrantAccess: () => void;
  onDismiss: (key: string) => void;
  onNotesChange: (text: string) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const buildMonth = (year: number, month: number): (number | null)[] => {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const Bar: React.FC<{pct: number; color: string}> = ({pct, color}) => (
  <View style={styles.barShell}>
    <View style={[styles.barFill, {width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: color}]} />
  </View>
);

export const SystemFlyout: React.FC<Props> = ({
  visible,
  enabledWidgets,
  notifications,
  notifAccess,
  battery,
  weather,
  system,
  notes,
  onClose,
  onToggleWidget,
  onGrantAccess,
  onDismiss,
  onNotesChange,
}) => {
  const today = new Date();
  const [view, setView] = useState({y: today.getFullYear(), m: today.getMonth()});
  const [picker, setPicker] = useState(false);
  const [kb, setKb] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => setKb(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const cells = useMemo(() => buildMonth(view.y, view.m), [view]);
  const monthName = new Date(view.y, view.m, 1).toLocaleDateString([], {month: 'long', year: 'numeric'});
  const isThisMonth = view.y === today.getFullYear() && view.m === today.getMonth();
  const shift = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({y: d.getFullYear(), m: d.getMonth()});
  };

  const has = (id: string) => enabledWidgets.includes(id);
  const batColor = battery.level <= 15 ? '#e2574c' : battery.level <= 35 ? '#e2a14c' : '#4ade80';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={[styles.wrap, {marginBottom: 72 + kb}]}>
          <GlassSurface radius={18} style={styles.panel}>
            {/* Always-on clock header */}
            <Text style={styles.bigTime}>
              {today.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
            </Text>
            <Text style={styles.bigDate}>
              {today.toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}
            </Text>

            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {has('calendar') && (
                <View style={styles.card}>
                  <View style={styles.calHeader}>
                    <Pressable onPress={() => shift(-1)} hitSlop={10}>
                      <Text style={styles.navArrow}>‹</Text>
                    </Pressable>
                    <Text style={styles.monthLabel}>{monthName}</Text>
                    <Pressable onPress={() => shift(1)} hitSlop={10}>
                      <Text style={styles.navArrow}>›</Text>
                    </Pressable>
                  </View>
                  <View style={styles.weekRow}>
                    {WEEKDAYS.map((d, i) => (
                      <Text key={i} style={styles.weekday}>
                        {d}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.grid}>
                    {cells.map((d, i) => {
                      const isToday = isThisMonth && d === today.getDate();
                      return (
                        <View key={i} style={styles.dayCell}>
                          {d != null && (
                            <View style={[styles.dayInner, isToday && styles.todayInner]}>
                              <Text style={[styles.dayText, isToday && styles.todayText]}>{d}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {has('weather') && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Weather</Text>
                  {weather ? (
                    <View style={styles.weatherRow}>
                      <Text style={styles.weatherIcon}>{describeWeather(weather.code).icon}</Text>
                      <View>
                        <Text style={styles.weatherTemp}>{weather.tempF}°F</Text>
                        <Text style={styles.weatherSub}>
                          {describeWeather(weather.code).label}
                          {weather.city ? ` · ${weather.city}` : ''}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.muted}>Weather unavailable (no connection?).</Text>
                  )}
                </View>
              )}

              {has('battery') && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    Battery — {battery.level}%{battery.charging ? ' ⚡ charging' : ''}
                  </Text>
                  <Bar pct={battery.level} color={batColor} />
                </View>
              )}

              {has('system') && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>System</Text>
                  {system ? (
                    <>
                      <Text style={styles.sysLabel}>
                        RAM {system.ramUsedPct}% · {system.ramUsedGb.toFixed(1)}/{system.ramTotalGb.toFixed(1)} GB
                      </Text>
                      <Bar pct={system.ramUsedPct} color="#7fb3ff" />
                      <Text style={[styles.sysLabel, {marginTop: 8}]}>
                        Storage {system.storageUsedPct}% · {system.storageFreeGb.toFixed(0)} GB free
                      </Text>
                      <Bar pct={system.storageUsedPct} color="#b48cff" />
                    </>
                  ) : (
                    <Text style={styles.muted}>Unavailable.</Text>
                  )}
                </View>
              )}

              {has('notes') && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Notes</Text>
                  <TextInput
                    style={styles.notes}
                    value={notes}
                    onChangeText={onNotesChange}
                    placeholder="Jot something down…"
                    placeholderTextColor={Vista.textDim}
                    multiline
                  />
                </View>
              )}

              {has('notifications') && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Notifications</Text>
                  {!notifAccess ? (
                    <Pressable onPress={onGrantAccess} style={styles.grantBtn}>
                      <Text style={styles.grantText}>Enable notification access</Text>
                    </Pressable>
                  ) : notifications.length === 0 ? (
                    <Text style={styles.muted}>No notifications</Text>
                  ) : (
                    notifications.map(n => (
                      <View key={n.key} style={styles.notif}>
                        <View style={styles.notifBody}>
                          <Text style={styles.notifApp}>{n.app}</Text>
                          {!!n.title && (
                            <Text style={styles.notifTitle} numberOfLines={1}>
                              {n.title}
                            </Text>
                          )}
                          {!!n.text && (
                            <Text style={styles.notifText} numberOfLines={2}>
                              {n.text}
                            </Text>
                          )}
                        </View>
                        <Pressable onPress={() => onDismiss(n.key)} hitSlop={10}>
                          <Text style={styles.notifClose}>✕</Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>

            {/* Widget picker */}
            <Pressable onPress={() => setPicker(p => !p)} style={styles.pickerToggle}>
              <Text style={styles.pickerToggleText}>{picker ? '▾ Widgets' : '＋ Widgets'}</Text>
            </Pressable>
            {picker && (
              <View style={styles.chips}>
                {WIDGET_CATALOG.map(w => {
                  const on = has(w.id);
                  return (
                    <Pressable
                      key={w.id}
                      onPress={() => onToggleWidget(w.id)}
                      style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {on ? '✓ ' : ''}
                        {w.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </GlassSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)'},
  wrap: {width: 340, maxWidth: '95%', maxHeight: '82%', marginRight: 8},
  panel: {padding: 16, flexShrink: 1},
  bigTime: {color: Vista.text, fontSize: 34, fontWeight: '700'},
  bigDate: {color: Vista.textDim, fontSize: 14, marginBottom: 10},
  scroll: {flexGrow: 0},
  card: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Vista.borderSoft,
  },
  cardTitle: {color: Vista.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8},
  muted: {color: Vista.textDim, fontStyle: 'italic'},
  calHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6},
  navArrow: {color: Vista.text, fontSize: 24, paddingHorizontal: 8},
  monthLabel: {color: Vista.text, fontSize: 15, fontWeight: '600'},
  weekRow: {flexDirection: 'row'},
  weekday: {flex: 1, textAlign: 'center', color: Vista.textDim, fontSize: 11, fontWeight: '700'},
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  dayCell: {width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center'},
  dayInner: {width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center'},
  todayInner: {backgroundColor: Vista.accent},
  dayText: {color: Vista.text, fontSize: 13},
  todayText: {color: '#fff', fontWeight: '700'},
  weatherRow: {flexDirection: 'row', alignItems: 'center', gap: 14},
  weatherIcon: {fontSize: 40},
  weatherTemp: {color: Vista.text, fontSize: 26, fontWeight: '700'},
  weatherSub: {color: Vista.textDim, fontSize: 13},
  barShell: {height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden'},
  barFill: {height: '100%', borderRadius: 6},
  sysLabel: {color: Vista.text, fontSize: 13, marginBottom: 5},
  notes: {color: Vista.text, fontSize: 14, minHeight: 64, textAlignVertical: 'top', padding: 0},
  notif: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Vista.borderSoft},
  notifBody: {flex: 1},
  notifApp: {color: '#9cc2ff', fontSize: 11, fontWeight: '700'},
  notifTitle: {color: Vista.text, fontSize: 14, fontWeight: '600'},
  notifText: {color: Vista.textDim, fontSize: 13},
  notifClose: {color: Vista.textDim, fontSize: 14, paddingLeft: 4},
  pickerToggle: {paddingTop: 10, alignItems: 'center'},
  pickerToggleText: {color: '#9cc2ff', fontSize: 13, fontWeight: '700'},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Vista.border,
  },
  chipOn: {backgroundColor: Vista.accent},
  chipText: {color: Vista.text, fontSize: 13},
  chipTextOn: {color: '#fff', fontWeight: '700'},
});

export default SystemFlyout;
