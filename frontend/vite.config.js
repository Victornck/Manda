import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

// Expõe a versão do app (do package.json) como __APP_VERSION__ no código.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
});
