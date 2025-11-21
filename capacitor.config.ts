import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.760ea3f285644f72897fcd37a8a466ca',
  appName: 'Samsung Health Sync',
  webDir: 'dist',
  server: {
    url: 'https://760ea3f2-8564-4f72-897f-cd37a8a466ca.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
    },
  },
};

export default config;
