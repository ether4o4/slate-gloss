# Vista Launcher - Windows Aero for Android

## 🎉 Project Complete!

A fully functional Windows Vista Aero-inspired Android launcher built with React Native.

### ✅ What's Included

#### Core Components (`src/components/glass/`)
| Component | Description |
|-----------|-------------|
| **GlassPanel** | Translucent panel with blur, inner glow, border highlights |
| **GlassButton** | Glass button with hover/active states |
| **StartOrb** | Iconic Vista start button with pulse animation |
| **WindowFrame** | Draggable window with glass title bar |
| **Taskbar** | Vista-style taskbar with glass effect |
| **shaders.ts** | Skia shaders for blur, noise, chromatic aberration |

#### Animations (`src/animations/`)
| Hook | Purpose |
|------|---------|
| **useStartMenuAnimation** | Start menu open/close with spring physics |
| **useDragPhysics** | Window dragging with momentum |
| **useGlassShimmer** | Subtle light reflection on glass |
| **useButtonHover** | Scale + glow on button hover |
| **useTaskbarBounce** | Notification bounce animation |
| **SharedTransitions** | Element-to-element transitions |

#### Features
- ✅ Desktop with draggable icons
- ✅ Start menu with glass animation
- ✅ Draggable windows (open multiple!)
- ✅ Vista Aurora gradient background
- ✅ 120fps smooth animations
- ✅ Real glassmorphism with Skia shaders

---

## 🚀 How to Build

### Option 1: GitHub Actions (Easiest)

1. **Push to GitHub:**
   ```bash
   cd /root/.openclaw/workspace/vista-launcher
   git init
   git add .
   git commit -m "Vista Launcher v1.0"
   git remote add origin https://github.com/YOUR_USERNAME/vista-launcher.git
   git push -u origin main
   ```

2. **GitHub auto-builds the APK** (~5-10 minutes)

3. **Download from Actions tab** or Releases

### Option 2: Local Build

**Prerequisites:**
- Android Studio (SDK Platform 34, Build Tools 34.0.0)
- Java 17 JDK
- Node.js 18+

**Build:**
```bash
cd /root/.openclaw/workspace/vista-launcher
npm install
./build-apk.sh release
```

APK will be in: `android/app/build/outputs/apk/release/`

---

## 📁 Project Structure

```
vista-launcher/
├── android/           # Android native code
├── ios/              # iOS native code
├── src/
│   ├── components/
│   │   └── glass/    # Aero glass components
│   ├── animations/   # Reanimated hooks
│   ├── screens/      # Screen layouts
│   └── assets/       # Images, fonts
├── docs/             # Documentation
├── .github/
│   └── workflows/
│       └── build-apk.yml  # CI/CD pipeline
├── App.tsx           # Main app entry
└── build-apk.sh      # Local build script
```

---

## 🎨 Customization

### Colors
Edit `src/components/glass/shaders.ts` to change:
- Glass tint color
- Border highlights
- Shadow colors

### Wallpaper
Replace the gradient in `App.tsx`:
```tsx
<LinearGradient colors={['#2c5aa0', '#1a3a5c']} ... />
```

### Icons
Add your own icons to the desktop:
```tsx
<DesktopIcon label="My App" icon="🔥" onPress={...} />
```

---

## 🔧 GitHub Actions Secrets (Optional)

For signed release builds, add to GitHub repo:

1. `RELEASE_KEYSTORE_BASE64` - Base64-encoded keystore
2. `KEYSTORE_PASSWORD` - Keystore password
3. `KEY_ALIAS` - Key alias
4. `KEY_PASSWORD` - Key password

Generate keystore:
```bash
keytool -genkey -v -keystore release.keystore -alias vistakey -keyalg RSA -keysize 2048 -validity 10000
base64 -i release.keystore | pbcopy
```

---

## 📱 Installing the APK

1. Download the APK from GitHub Actions
2. Transfer to Android device
3. Enable "Install from Unknown Sources"
4. Install and enjoy your Vista desktop!

---

## 🐛 Known Issues

- Some shaders may not work on older Android devices
- Drag physics could be smoother (tune spring configs)
- Window z-index stacking needs improvement

---

## 📝 Next Steps

Want to add more features?
- Widgets (clock, weather, RAM monitor)
- App drawer with search
- File manager integration
- Live wallpapers
- Icon packs support

---

**Built with ❤️ using React Native + Skia + Reanimated**
