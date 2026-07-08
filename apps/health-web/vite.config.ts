import { defineConfig } from "vite";

export default defineConfig({
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
