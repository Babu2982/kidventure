import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kidventure.app",
  appName: "KidVenture",
  // Next.js 14 static export output (next.config.mjs: output:'export')
  webDir: "out",
  android: {
    allowMixedContent: false,
    // WebView ships its own back-button handling; the app's TopBar
    // back arrows use Next router history which works in WebView.
  },
  server: {
    // Serve the bundled site over https scheme so the Web Audio API,
    // localStorage and the Web Speech API behave as on a secure origin.
    androidScheme: "https",
  },
};

export default config;
