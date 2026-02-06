# R1SE Android APK Build Guide

This guide explains how to build the R1SE workout tracker as a native Android APK using Capacitor.

## Prerequisites

1. **Node.js** (v18+)
2. **Android Studio** (latest version)
3. **Java JDK 17+**
4. **Android SDK** (API level 33+)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Web App

```bash
npm run build
```

This creates the `dist/` folder with the production build.

### 3. Initialize Android Platform

```bash
npx cap add android
```

This creates the `android/` folder with the native Android project.

### 4. Sync Web Assets to Android

```bash
npx cap sync android
```

Run this command every time you make changes to the web app.

### 5. Open in Android Studio

```bash
npx cap open android
```

This opens the project in Android Studio.

### 6. Build APK

In Android Studio:
1. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Wait for the build to complete
3. Find the APK at `android/app/build/outputs/apk/debug/app-debug.apk`

For a release build:
1. Go to **Build > Generate Signed Bundle / APK**
2. Create or use an existing keystore
3. Select APK and build

## Configuration

### App Identity (capacitor.config.ts)

- **appId**: `app.lovable.r1se` - Unique identifier for the app
- **appName**: `R1SE` - Display name
- **webDir**: `dist` - Build output folder

### Customization

#### App Icon
Replace these files in `android/app/src/main/res/`:
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

#### Splash Screen
Replace `android/app/src/main/res/drawable/splash.png`

#### Status Bar
Configured in `capacitor.config.ts` to match the app's dark theme.

## Features

### Offline Support
- All workouts are stored locally using localStorage
- Zustand state persists between sessions
- Service Worker caches all app assets
- Network requests are cached with fallback

### Sync Behavior
- When online: Automatically syncs with cloud
- When offline: Queues changes for later sync
- On app resume: Triggers sync check

### Deep Links
The app handles OAuth callback URLs for Google sign-in.

## Development Workflow

1. Make changes to the React code
2. Run `npm run build`
3. Run `npx cap sync android`
4. Test in Android Studio emulator or device

### Live Reload (Development Only)

For faster development, enable live reload in `capacitor.config.ts`:

```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:5173',
  cleartext: true,
}
```

Then run `npm run dev` and sync.

## Troubleshooting

### White Screen on Launch
- Ensure `npm run build` completed successfully
- Run `npx cap sync android` after building

### OAuth Not Working
- Check that the redirect URL matches your app's scheme
- Verify the app scheme in `AndroidManifest.xml`

### Network Issues
- For development, enable cleartext traffic in `capacitor.config.ts`
- For production, ensure all API calls use HTTPS

## Publishing to Play Store

1. Generate a signed release APK or AAB (Android App Bundle)
2. Create a Google Play Developer account ($25 one-time fee)
3. Create a new app in Google Play Console
4. Upload the AAB file
5. Complete the store listing with screenshots and descriptions
6. Submit for review

## File Structure

```
├── capacitor.config.ts     # Capacitor configuration
├── src/
│   ├── capacitor-init.ts   # Native plugin initialization
│   └── ...
├── android/                # Generated Android project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/       # Native Java code
│   │   │   ├── res/        # Android resources (icons, splash)
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── ...
└── dist/                   # Web build output
```
