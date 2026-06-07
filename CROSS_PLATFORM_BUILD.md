# Cross-Platform Build Guide

This guide explains how to build the Hotel Manager app for different platforms: Windows, Android, iOS, macOS, and Linux.

## Prerequisites

### Common Requirements
- Node.js (v18 or higher)
- npm, yarn, or bun package manager
- Git

### Mobile Build Requirements (Capacitor)
- **Android**: Android Studio, Java JDK 11+, Android SDK
- **iOS**: Xcode (macOS only), CocoaPods

### Desktop Build Requirements (Electron)
- **Windows**: Windows 10 or later
- **macOS**: macOS 10.15 (Catalina) or later
- **Linux**: Any modern Linux distribution

## Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
bun install
```

## Web Build

For web deployment (Cloudflare Workers, Vercel, etc.):

```bash
npm run build
```

The output will be in the `dist` directory.

## Mobile Builds (Capacitor)

### Initial Setup

After installing dependencies, initialize Capacitor:

```bash
npx cap init
npx cap add android
npx cap add ios
```

### Development

To sync your web build with Capacitor:

```bash
npm run build
npm run cap:sync
```

### Android Build

**Development:**
```bash
npm run cap:android
```
This opens Android Studio with the project.

**Production Build:**
```bash
npm run build
npm run cap:sync
npm run cap:build:android
```

This generates an APK/AAB file in the `android/app/build/outputs/` directory.

### iOS Build

**Development:**
```bash
npm run cap:ios
```
This opens Xcode with the project (macOS only).

**Production Build:**
```bash
npm run build
npm run cap:sync
npm run cap:build:ios
```

This generates an IPA file in the `ios/App/build/` directory.

## Desktop Builds (Electron)

### Development

To run the Electron app in development mode:

```bash
npm run electron:dev
```

This starts Vite dev server and launches Electron.

### Production Builds

#### Windows
```bash
npm run electron:build:win
```

Output: `release/Hotel Manager Setup x.x.x.exe` (installer) and `release/Hotel Manager x.x.x.exe` (portable)

#### macOS
```bash
npm run electron:build:mac
```

Output: `release/Hotel Manager-x.x.x.dmg` (installer) and `release/Hotel Manager-x.x.x-mac.zip` (archive)

#### Linux
```bash
npm run electron:build:linux
```

Output: `release/Hotel Manager-x.x.x.AppImage` and `release/hotel-manager_x.x.x_amd64.deb`

#### All Platforms
```bash
npm run electron:build
```

Builds for all platforms based on your current OS.

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

For production builds, ensure these are set in your build environment.

## Platform-Specific Notes

### Android
- Minimum SDK: 21 (Android 5.0)
- Target SDK: 34 (Android 14)
- The app uses HTTPS scheme for Capacitor HTTP plugin

### iOS
- Minimum iOS: 13.0
- Requires Apple Developer account for App Store distribution
- TestFlight available for beta testing

### Windows
- Requires Windows 10 or later
- NSIS installer provides standard installation experience
- Portable version available for USB drives

### macOS
- Requires macOS 10.15 (Catalina) or later
- Code signing required for distribution outside Mac App Store
- Notarization required for macOS 10.15+

### Linux
- Tested on Ubuntu 20.04+, Fedora 35+, Debian 11+
- AppImage works on most Linux distributions
- DEB package for Debian/Ubuntu-based systems

## Troubleshooting

### Capacitor Issues

**Sync fails:**
```bash
npx cap clean
npm run build
npm run cap:sync
```

**Android build fails:**
- Ensure Android SDK is properly installed
- Check that JAVA_HOME is set correctly
- Run `npx cap doctor` to diagnose issues

**iOS build fails:**
- Ensure Xcode command line tools are installed
- Run `pod install` in the ios directory
- Check that CocoaPods is up to date

### Electron Issues

**Build fails:**
- Ensure all dependencies are installed
- Check that the dist directory exists
- Verify electron-builder configuration

**App won't start:**
- Check that the dist directory has the built files
- Verify the preload script is compiled
- Check Electron console for errors

## Distribution

### Mobile App Stores
- **Google Play**: Upload AAB file from Android build
- **Apple App Store**: Upload IPA file from iOS build (requires Apple Developer account)

### Desktop Distribution
- **Windows**: Distribute EXE installer or portable version
- **macOS**: Distribute DMG file (consider code signing)
- **Linux**: Distribute AppImage or DEB package

### Web Deployment
- **Cloudflare Workers**: Already configured with wrangler.jsonc
- **Vercel/Netlify**: Deploy the dist directory
- **Custom hosting**: Deploy the dist directory to any web server

## Support

For issues specific to:
- **Capacitor**: https://capacitorjs.com/docs
- **Electron**: https://www.electronjs.org/docs
- **Vite**: https://vitejs.dev/guide/
- **TanStack Start**: https://tanstack.com/start/latest
