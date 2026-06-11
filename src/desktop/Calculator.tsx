/**
 * Calculator — a basic, generic desktop calculator window (the old-PC kind).
 *
 * Plain four-function + percent and sign flip. Self-contained: no external
 * state, opens inside a WindowFrame from the desktop icon.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Op = '+' | '-' | '×' | '÷';

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);

  const inputDigit = (d: string) => {
    if (fresh) {
      setDisplay(d === '.' ? '0.' : d);
      setFresh(false);
      return;
    }
    if (d === '.' && display.includes('.')) return;
    setDisplay(display.length < 12 ? display + d : display);
  };

  const apply = (a: number, b: number, o: Op): number => {
    switch (o) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '×':
        return a * b;
      case '÷':
        return b === 0 ? NaN : a / b;
    }
  };

  const chooseOp = (next: Op) => {
    const cur = parseFloat(display);
    if (acc != null && op && !fresh) {
      const r = apply(acc, cur, op);
      setAcc(r);
      setDisplay(formatNum(r));
    } else {
      setAcc(cur);
    }
    setOp(next);
    setFresh(true);
  };

  const equals = () => {
    if (acc == null || !op) return;
    const cur = parseFloat(display);
    const r = apply(acc, cur, op);
    setDisplay(formatNum(r));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => {
    setDisplay('0');
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const negate = () => setDisplay(formatNum(parseFloat(display) * -1));
  const percent = () => setDisplay(formatNum(parseFloat(display) / 100));

  return (
    <View style={styles.body}>
      <View style={styles.screen}>
        <Text style={styles.display} numberOfLines={1} adjustsFontSizeToFit>
          {display}
        </Text>
      </View>
      <View style={styles.pad}>
        <View style={styles.row}>
          <CalcKey activeOp={op} label="C" kind="fn" onPress={clear} />
          <CalcKey activeOp={op} label="±" kind="fn" onPress={negate} />
          <CalcKey activeOp={op} label="%" kind="fn" onPress={percent} />
          <CalcKey activeOp={op} label="÷" kind="op" onPress={() => chooseOp('÷')} />
        </View>
        <View style={styles.row}>
          <CalcKey activeOp={op} label="7" onPress={() => inputDigit('7')} />
          <CalcKey activeOp={op} label="8" onPress={() => inputDigit('8')} />
          <CalcKey activeOp={op} label="9" onPress={() => inputDigit('9')} />
          <CalcKey activeOp={op} label="×" kind="op" onPress={() => chooseOp('×')} />
        </View>
        <View style={styles.row}>
          <CalcKey activeOp={op} label="4" onPress={() => inputDigit('4')} />
          <CalcKey activeOp={op} label="5" onPress={() => inputDigit('5')} />
          <CalcKey activeOp={op} label="6" onPress={() => inputDigit('6')} />
          <CalcKey activeOp={op} label="-" kind="op" onPress={() => chooseOp('-')} />
        </View>
        <View style={styles.row}>
          <CalcKey activeOp={op} label="1" onPress={() => inputDigit('1')} />
          <CalcKey activeOp={op} label="2" onPress={() => inputDigit('2')} />
          <CalcKey activeOp={op} label="3" onPress={() => inputDigit('3')} />
          <CalcKey activeOp={op} label="+" kind="op" onPress={() => chooseOp('+')} />
        </View>
        <View style={styles.row}>
          <CalcKey activeOp={op} label="0" wide onPress={() => inputDigit('0')} />
          <CalcKey activeOp={op} label="." onPress={() => inputDigit('.')} />
          <CalcKey activeOp={op} label="=" kind="op" onPress={equals} />
        </View>
      </View>
    </View>
  );
};

const CalcKey: React.FC<{
  label: string;
  onPress: () => void;
  kind?: 'num' | 'op' | 'fn';
  wide?: boolean;
  activeOp: Op | null;
}> = ({ label, onPress, kind = 'num', wide, activeOp }) => (
  <TouchableOpacity
    style={[
      styles.key,
      kind === 'op' && styles.opKey,
      kind === 'fn' && styles.fnKey,
      wide && styles.wideKey,
      activeOp === label && styles.opKeyActive,
    ]}
    activeOpacity={0.7}
    onPress={onPress}
  >
    <Text style={[styles.keyText, kind === 'fn' && styles.fnKeyText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

function formatNum(n: number): string {
  if (!isFinite(n)) return 'Error';
  const s = String(Math.round(n * 1e10) / 1e10);
  return s.length > 12 ? n.toPrecision(8) : s;
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: 8, gap: 8 },
  screen: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'flex-end',
    minHeight: 56,
  },
  display: { color: '#ffffff', fontSize: 32, fontWeight: '300' },
  pad: { flex: 1, gap: 6 },
  row: { flexDirection: 'row', flex: 1, gap: 6 },
  key: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  wideKey: { flex: 2.08 },
  opKey: { backgroundColor: 'rgba(120,170,235,0.5)' },
  opKeyActive: { backgroundColor: 'rgba(120,170,235,0.9)' },
  fnKey: { backgroundColor: 'rgba(255,255,255,0.06)' },
  keyText: { color: '#ffffff', fontSize: 20, fontWeight: '600' },
  fnKeyText: { color: '#bfe3ff' },
});

export default Calculator;
