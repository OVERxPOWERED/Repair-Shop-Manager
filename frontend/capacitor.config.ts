import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.fixpro.repairshop',
  appName: 'FixPro',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Haptics: {},
  }
};

export default config;
