import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ottracker.app',
  appName: 'OT',
  webDir: 'dist',
  android: {
    path: '.'
  }
};

export default config;
