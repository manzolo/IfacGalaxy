import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [
    viteSingleFile({ removeViteModuleLoader: true }),
  ],
  build: {
    // i dataset in public/data restano file esterni caricati con fetch;
    // tutto il resto (js, css) viene inlinato in dist/index.html
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 5000,
  },
  test: {
    environment: "node",
  },
});
