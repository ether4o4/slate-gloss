# VistaLauncher APK Build Setup

This document describes the Android SDK/NDK setup required for building the VistaLauncher React Native application.

## Prerequisites

### Required Tools

1. **Node.js** (v18 or newer)
   ```bash
   # Install via nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **Java Development Kit** (JDK 17)
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install openjdk-17-jdk
   
   # Verify
   java -version
   ```

3. **Android SDK** (Command Line Tools)
   - Download from: https://developer.android.com/studio#command-tools
   - Extract to: `$HOME/android-sdk` (or your preferred location)

### Environment Variables

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Android SDK
export ANDROID_SDK_ROOT=$HOME/android-sdk
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator

# Java
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

Then reload: `source ~/.bashrc`

## SDK Components Installation

### 1. Install SDK Manager

```bash
# Create sdk directory
mkdir -p $HOME/android-sdk/cmdline-tools
cd $HOME/android-sdk/cmdline-tools

# Download and extract command line tools
wget https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip
unzip commandlinetools-linux-10406996_latest.zip
mv cmdline-tools latest
```

### 2. Install Required SDK Packages

```bash
# Accept licenses
sdkmanager --licenses

# Install required packages
sdkmanager "platform-tools"
sdkmanager "build-tools;34.0.0"
sdkmanager "platforms;android-34"
sdkmanager "ndk;25.1.8937393"
sdkmanager "cmake;3.22.1"
```

### 3. Verify Installation

```bash
# Check ADB
adb --version

# Check SDK manager
sdkmanager --list_installed
```

## Build Configuration

### Gradle Configuration

The project is configured with the following optimizations in `android/gradle.properties`:

- **Parallel builds**: `org.gradle.parallel=true`
- **Build cache**: `org.gradle.caching=true`
- **Configuration cache**: `org.gradle.configuration-cache=true`
- **Memory settings**: 4GB heap size
- **R8 full mode**: Enabled for release builds

### Signing Configuration

The build script automatically creates:
- **Debug keystore**: `android/app/debug.keystore` (auto-generated)
- **Release keystore**: `android/app/release.keystore` (created by build script)

For production releases, replace the release keystore with your official signing key:

```bash
# Generate production keystore
keytool -genkey -v \
  -keystore vistalauncher-release.keystore \
  -alias vistalauncher \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Then set environment variables for CI/CD:
```bash
export VISTA_KEYSTORE_PASSWORD=your_password
export VISTA_KEY_ALIAS=vistalauncher
export VISTA_KEY_PASSWORD=your_password
```

## Building the APK

### Quick Build

```bash
# Navigate to project root
cd /root/.openclaw/workspace/vista-launcher

# Run build script (release)
./build-apk.sh release

# Or debug build
./build-apk.sh debug
```

### Manual Build Steps

```bash
# 1. Install dependencies (if package.json exists)
npm install

# 2. Bundle assets
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle

# 3. Build APK
cd android
./gradlew assembleRelease

# 4. Find output APK
find app/build/outputs/apk -name "*.apk"
```

## APK Output Structure

The build produces architecture-specific APKs:

```
output/
├── vistalauncher-v1.0-1-arm64-v8a.apk    # ARM 64-bit
├── vistalauncher-v1.0-1-armeabi-v7a.apk  # ARM 32-bit
└── mapping.txt                           # ProGuard mapping (release only)
```

### ABI Support

| ABI | Architecture | Devices |
|-----|-------------|---------|
| `arm64-v8a` | ARM64 | Modern devices (2015+) |
| `armeabi-v7a` | ARMv7 | Older devices |

Set `universalApk true` in `build.gradle` to also create a universal APK.

## Troubleshooting

### Build Failures

1. **Gradle daemon issues**:
   ```bash
   cd android
   ./gradlew --stop
   ./gradlew clean
   ```

2. **Missing NDK**:
   ```bash
   sdkmanager "ndk;25.1.8937393"
   ```

3. **Out of memory**:
   - Edit `gradle.properties`
   - Increase `org.gradle.jvmargs=-Xmx6g`

4. **License not accepted**:
   ```bash
   sdkmanager --licenses
   ```

### Performance Tips

- Use SSD storage for Android SDK and project
- Enable Gradle daemon: `org.gradle.daemon=true`
- Use build cache across projects
- Run builds with `--parallel` flag

## CI/CD Integration

For GitHub Actions or similar:

```yaml
- name: Setup Android SDK
  uses: android-actions/setup-android@v2

- name: Build APK
  run: |
    export ANDROID_SDK_ROOT=$ANDROID_HOME
    ./build-apk.sh release

- name: Upload APK
  uses: actions/upload-artifact@v3
  with:
    name: vistalauncher-apk
    path: output/*.apk
```

## References

- [React Native Android Setup](https://reactnative.dev/docs/environment-setup)
- [Android Gradle Plugin](https://developer.android.com/studio/releases/gradle-plugin)
- [ProGuard Rules](https://www.guardsquare.com/manual/configuration/usage)
