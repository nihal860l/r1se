import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Initialize Capacitor plugins and native functionality
 * This file handles platform-specific setup for the Android wrapper
 */
export async function initCapacitor() {
  // Only run native setup on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('Running in web browser - skipping native initialization');
    return;
  }

  console.log('Initializing Capacitor native plugins...');

  try {
    // Configure status bar for dark theme
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
  } catch (e) {
    console.warn('StatusBar plugin not available:', e);
  }

  try {
    // Hide splash screen after app is ready
    await SplashScreen.hide();
  } catch (e) {
    console.warn('SplashScreen plugin not available:', e);
  }

  // Handle back button on Android
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      // Optionally exit app or show confirmation
      App.exitApp();
    }
  });

  // Handle app state changes (foreground/background)
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed. Is active:', isActive);
    
    if (isActive) {
      // App came to foreground - trigger sync if needed
      window.dispatchEvent(new CustomEvent('app-resumed'));
    }
  });

  // Handle deep links (useful for OAuth callbacks)
  App.addListener('appUrlOpen', ({ url }) => {
    console.log('App opened with URL:', url);
    
    // Handle OAuth redirect
    if (url.includes('auth') || url.includes('callback')) {
      // Navigate to the appropriate route
      const path = new URL(url).pathname;
      window.location.href = path;
    }
  });

  console.log('Capacitor initialization complete');
}

/**
 * Check if running as native app
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get platform info
 */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}
