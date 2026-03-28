import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ottracker.app',
  appName: 'OverTime',
  webDir: 'dist',
  android: {
    path: '.'
  }
};

export default config;
