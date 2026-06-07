/**
 * Platform detection utilities for cross-platform app
 */

export type Platform = 'web' | 'android' | 'ios' | 'windows' | 'mac' | 'linux';

export function getPlatform(): Platform {
  // Check if running in Capacitor (mobile)
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    const platform = (window as any).Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
  }
  
  // Check if running in Electron (desktop)
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const electronPlatform = (window as any).electronAPI.platform;
    if (electronPlatform === 'win32') return 'windows';
    if (electronPlatform === 'darwin') return 'mac';
    if (electronPlatform === 'linux') return 'linux';
  }
  
  // Default to web
  return 'web';
}

export function isMobile(): boolean {
  const platform = getPlatform();
  return platform === 'android' || platform === 'ios';
}

export function isDesktop(): boolean {
  const platform = getPlatform();
  return platform === 'windows' || platform === 'mac' || platform === 'linux';
}

export function isWeb(): boolean {
  return getPlatform() === 'web';
}

export function getPlatformName(): string {
  const platform = getPlatform();
  const names: Record<Platform, string> = {
    web: 'Web Browser',
    android: 'Android',
    ios: 'iOS',
    windows: 'Windows',
    mac: 'macOS',
    linux: 'Linux'
  };
  return names[platform];
}
