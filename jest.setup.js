/**
 * Jest setup — mocks the native modules the shell depends on so the App
 * smoke test can render outside an Android runtime.
 */
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// SQLite chat persistence — inert in-memory stub.
jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: () => ({
    transaction: cb =>
      cb({
        executeSql: (_sql, _params, onSuccess) => {
          if (onSuccess) {
            onSuccess(null, { rows: { length: 0, item: () => null } });
          }
        },
      }),
  }),
}));

// DeepSeek HTTP client — never hit the network from tests.
jest.mock('axios', () => ({
  post: jest.fn(() =>
    Promise.resolve({ data: { choices: [{ message: { role: 'assistant', content: '' } }] } }),
  ),
}));

// Stub the Skia surface the glass components touch: drawing components render
// as host strings, Skia.RuntimeEffect compiles to null, frame hooks are inert.
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'SkiaCanvas',
  Group: 'SkiaGroup',
  Rect: 'SkiaRect',
  RoundedRect: 'SkiaRoundedRect',
  Circle: 'SkiaCircle',
  Paint: 'SkiaPaint',
  Shader: 'SkiaShader',
  RuntimeShader: 'SkiaRuntimeShader',
  LinearGradient: 'SkiaLinearGradient',
  RadialGradient: 'SkiaRadialGradient',
  BlurMask: 'SkiaBlurMask',
  Fill: 'SkiaFill',
  vec: (x, y) => ({ x, y }),
  Skia: {
    RuntimeEffect: { Make: () => null },
  },
  useDerivedValue: fn => ({ value: typeof fn === 'function' ? fn() : undefined }),
  useFrame: () => {},
}));
