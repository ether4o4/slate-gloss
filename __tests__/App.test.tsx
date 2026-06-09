/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// Fake timers keep the taskbar clock's setInterval from firing after the
// test environment tears down; unmounting runs the effect cleanups.
jest.useFakeTimers();

test('renders correctly', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<App />);
  });
  await ReactTestRenderer.act(() => {
    tree?.unmount();
  });
});
