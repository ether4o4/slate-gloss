import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

interface State {
  error: Error | null;
}

/**
 * Wraps the whole app. As a *launcher*, an uncaught render error would crash the
 * home screen and make Android fall back to the previous launcher ("won't lock
 * in"). Catching it here keeps the home app alive and shows a recover button.
 */
export class ErrorBoundary extends React.Component<{children: React.ReactNode}, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error) {
    console.error('NeverSoft OS crashed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>NeverSoft OS hit a snag</Text>
          <Text style={styles.message} numberOfLines={4}>
            {String(this.state.error?.message ?? this.state.error)}
          </Text>
          <Pressable style={styles.button} onPress={() => this.setState({error: null})}>
            <Text style={styles.buttonText}>Reload</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0d2137', alignItems: 'center', justifyContent: 'center', padding: 28},
  title: {color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 10},
  message: {color: '#9fb4c9', fontSize: 13, textAlign: 'center', marginBottom: 22},
  button: {backgroundColor: '#2f7bf6', borderRadius: 22, paddingHorizontal: 28, paddingVertical: 12},
  buttonText: {color: '#fff', fontWeight: '700', fontSize: 15},
});

export default ErrorBoundary;
