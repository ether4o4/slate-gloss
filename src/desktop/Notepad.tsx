/**
 * Notepad — a basic, generic desktop text editor window (the old-PC kind).
 *
 * Edits a single persistent note (the same store field the Notes widget uses),
 * so what you type here is kept across restarts. Opens inside a WindowFrame
 * from the desktop icon.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

const Notepad: React.FC<{ initial: string; onChange: (text: string) => void }> = ({
  initial,
  onChange,
}) => {
  const [text, setText] = useState(initial);
  const chars = text.length;
  const lines = text.length === 0 ? 0 : text.split('\n').length;

  return (
    <View style={styles.body}>
      <TextInput
        style={styles.editor}
        value={text}
        onChangeText={t => {
          setText(t);
          onChange(t);
        }}
        placeholder="Type here… your notes are saved automatically."
        placeholderTextColor="#7d97b5"
        multiline
        textAlignVertical="top"
        autoCorrect
      />
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {lines} {lines === 1 ? 'line' : 'lines'} · {chars}{' '}
          {chars === 1 ? 'char' : 'chars'}
        </Text>
        <Text style={styles.statusText}>Saved</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1 },
  editor: {
    flex: 1,
    color: '#f2f8ff',
    fontSize: 15,
    lineHeight: 21,
    padding: 12,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(20,34,52,0.4)',
  },
  statusText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
});

export default Notepad;
