import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Vista} from '../../theme';

const fmtTime = (d: Date) =>
  d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
const fmtDate = (d: Date) =>
  d.toLocaleDateString([], {month: 'short', day: 'numeric'});

/**
 * Taskbar clock. Updates once a minute (aligned to the minute boundary) — no
 * tight timers, so it has no measurable battery impact.
 */
export const Clock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;

    const msToNextMinute = 60000 - (Date.now() % 60000);
    timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.time}>{fmtTime(now)}</Text>
      <Text style={styles.date}>{fmtDate(now)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {alignItems: 'flex-end'},
  time: {color: Vista.text, fontSize: 15, fontWeight: '600'},
  date: {color: Vista.textDim, fontSize: 11},
});

export default Clock;
