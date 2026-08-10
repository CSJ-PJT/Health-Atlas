import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "node:url";
import { componentTagger } from "lovable-tagger";

const envDir = fileURLToPath(new URL("../../", import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  envDir,
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@health-sync/shared-auth": path.resolve(__dirname, "../../packages/shared-auth/src"),
      "@health-sync/shared-profile": path.resolve(__dirname, "../../packages/shared-profile/src"),
      "@health-sync/shared-types": path.resolve(__dirname, "../../packages/shared-types/src"),
      "@health-sync/game-link-sdk": path.resolve(__dirname, "../../packages/game-link-sdk/src"),
      "@health-sync/design-system": path.resolve(__dirname, "../../packages/design-system/src"),
    },
  },
}));
