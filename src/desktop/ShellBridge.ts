/**
 * ShellBridge — thin seam between the desktop shell and the (optional)
 * MVE engine's sandboxed `/system/bin/sh`.
 *
 * This repo does not link the native MveBridge module; when it is absent
 * every command resolves to a friendly "engine not linked" message so the
 * Terminal, Recycle Bin and assistant keep working in JS-only builds.
 */
import { NativeModules } from 'react-native';

const native: any = NativeModules.MveBridge;

export const isNative = native != null;

export async function runShell(cmd: string): Promise<string> {
  if (native?.run) return native.run(cmd);
  return `[engine not linked] $ ${cmd}\n(no sandbox shell in this build)`;
}
