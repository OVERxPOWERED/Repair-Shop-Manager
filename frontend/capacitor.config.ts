import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.fixpro.repairshop",
  appName: "FixPro",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: process.env.CAP_ALLOW_MIXED_CONTENT === "true",
  },
  plugins: {
    Haptics: {},
  },
};

export default config;
