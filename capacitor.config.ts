import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.danchon.healthsync",
  appName: "RH Healthcare",
  webDir: "dist",
  bundledWebRuntime: false,

  android: {
    path: "android",
  },
};

export default config;
