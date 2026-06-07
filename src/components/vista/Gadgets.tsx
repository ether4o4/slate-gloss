import React, {useEffect, useState} from 'react';
import {AppState, StyleSheet, Text, View} from 'react-native';
import {Vista} from '../../theme';
import {GlassSurface} from './GlassSurface';
import {getBatteryInfo, type BatteryInfo} from '../../native/Launcher';

const ClockGadget: React.FC = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <GlassSurface radius={16} style={styles.gadget}>
      <Text style={styles.time}>
        {now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
      </Text>
      <Text style={styles.seconds}>{now.toLocaleTimeString([], {second: '2-digit'})}s</Text>
      <Text style={styles.date}>
        {now.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'})}
      </Text>
    </GlassSurface>
  );
};

const BatteryGadget: React.FC = () => {
  const [bat, setBat] = useState<BatteryInfo>({level: 0, charging: false});

  useEffect(() => {
    const refresh = () => getBatteryInfo().then(setBat);
    refresh();
    const id = setInterval(refresh, 60000);
    const sub = AppState.addEventListener('change', s => s === 'active' && refresh());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const color = bat.level <= 15 ? '#e2574c' : bat.level <= 35 ? '#e2a14c' : '#4ade80';
  return (
    <GlassSurface radius={16} style={styles.gadget}>
      <Text style={styles.gadgetLabel}>Battery</Text>
      <View style={styles.batteryRow}>
        <View style={styles.batteryShell}>
          <View style={[styles.batteryFill, {width: `${Math.max(4, bat.level)}%`, backgroundColor: color}]} />
        </View>
        <View style={styles.batteryCap} />
      </View>
      <Text style={styles.batteryPct}>
        {bat.level}%{bat.charging ? ' ⚡' : ''}
      </Text>
    </GlassSurface>
  );
};

export const GadgetSidebar: React.FC = () => (
  <View style={styles.sidebar} pointerEvents="box-none">
    <ClockGadget />
    <BatteryGadget />
  </View>
);

const styles = StyleSheet.create({
  sidebar: {position: 'absolute', right: 10, top: 8, gap: 10, width: 132},
  gadget: {padding: 12, alignItems: 'center'},
  time: {color: Vista.text, fontSize: 30, fontWeight: '700', letterSpacing: 1},
  seconds: {color: Vista.textDim, fontSize: 11, marginTop: -2},
  date: {color: Vista.textDim, fontSize: 12, marginTop: 4},
  gadgetLabel: {color: Vista.textDim, fontSize: 11, marginBottom: 8, alignSelf: 'flex-start'},
  batteryRow: {flexDirection: 'row', alignItems: 'center'},
  batteryShell: {
    width: 84,
    height: 26,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    padding: 2,
    justifyContent: 'center',
  },
  batteryFill: {height: '100%', borderRadius: 2},
  batteryCap: {
    width: 4,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    marginLeft: 1,
  },
  batteryPct: {color: Vista.text, fontSize: 14, fontWeight: '600', marginTop: 8},
});

export default GadgetSidebar;
