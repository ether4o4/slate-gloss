import React, {useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import type {NotificationInfo} from '../../native/Launcher';
import {GlassSurface} from './GlassSurface';
import {Vista} from '../../theme';

interface Props {
  visible: boolean;
  notifications: NotificationInfo[];
  notifAccess: boolean;
  onClose: () => void;
  onGrantAccess: () => void;
  onDismiss: (key: string) => void;
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

export const SystemFlyout: React.FC<Props> = ({
  visible,
  notifications,
  notifAccess,
  onClose,
  onGrantAccess,
  onDismiss,
}) => {
  const today = new Date();
  const [view, setView] = useState({y: today.getFullYear(), m: today.getMonth()});

  const cells = useMemo(() => buildMonth(view.y, view.m), [view]);
  const monthName = new Date(view.y, view.m, 1).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });
  const isThisMonth = view.y === today.getFullYear() && view.m === today.getMonth();

  const shift = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({y: d.getFullYear(), m: d.getMonth()});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.wrap}>
          <GlassSurface radius={18} style={styles.panel}>
            <Text style={styles.bigTime}>
              {today.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
            </Text>
            <Text style={styles.bigDate}>
              {today.toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}
            </Text>

            {/* Calendar */}
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

            <View style={styles.divider} />

            {/* Notifications */}
            <Text style={styles.sectionTitle}>Notifications</Text>
            {!notifAccess ? (
              <Pressable onPress={onGrantAccess} style={styles.grantBtn}>
                <Text style={styles.grantText}>Enable notification access</Text>
              </Pressable>
            ) : notifications.length === 0 ? (
              <Text style={styles.empty}>No notifications</Text>
            ) : (
              <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
                {notifications.map(n => (
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
                ))}
              </ScrollView>
            )}
          </GlassSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)'},
  wrap: {width: 320, maxWidth: '94%', marginRight: 8, marginBottom: 72},
  panel: {padding: 16},
  bigTime: {color: Vista.text, fontSize: 34, fontWeight: '700'},
  bigDate: {color: Vista.textDim, fontSize: 14, marginBottom: 12},
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
  divider: {height: StyleSheet.hairlineWidth, backgroundColor: Vista.borderSoft, marginVertical: 12},
  sectionTitle: {color: Vista.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8},
  grantBtn: {backgroundColor: Vista.accent, borderRadius: 12, paddingVertical: 10, alignItems: 'center'},
  grantText: {color: '#fff', fontWeight: '700'},
  empty: {color: Vista.textDim, fontStyle: 'italic', paddingVertical: 8},
  notifList: {maxHeight: 220},
  notif: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Vista.borderSoft},
  notifBody: {flex: 1},
  notifApp: {color: '#9cc2ff', fontSize: 11, fontWeight: '700'},
  notifTitle: {color: Vista.text, fontSize: 14, fontWeight: '600'},
  notifText: {color: Vista.textDim, fontSize: 13},
  notifClose: {color: Vista.textDim, fontSize: 14, paddingLeft: 4},
});

export default SystemFlyout;
