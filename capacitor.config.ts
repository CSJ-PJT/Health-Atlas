import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.danchon.healthsync",
  appName: "HealthSyncDaily",
  webDir: "dist",
  bundledWebRuntime: false,

  android: {
    path: "android",
  },

  server: {
    androidScheme: "https",
  },
};

export default config;
