/**
 * @format
 */

// react-native-gesture-handler must be imported first, before anything else.
import 'react-native-gesture-handler';
import React from 'react';
import { AppRegistry } from 'react-native';
import App from './App';
import { ErrorBoundary } from './src/ErrorBoundary';
import { name as appName } from './app.json';

const Root = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

AppRegistry.registerComponent(appName, () => Root);
