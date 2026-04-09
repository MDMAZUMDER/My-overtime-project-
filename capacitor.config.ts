import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'My.overtime.app',
  appName: 'overtime',
  webDir: 'dist',
  android: {
    path: '.'
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false,
    }
  }
};

export default config;
