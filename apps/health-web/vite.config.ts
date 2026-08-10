import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const envDir = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  envDir,
  base: "/health/",
  server: {
    host: "::",
    port: 8091,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
  },
});
