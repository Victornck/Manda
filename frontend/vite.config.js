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
  // Em dev, o front (5173) e o back (4000) são origens diferentes. Este proxy faz
  // as imagens em /uploads virem do backend, mantendo tudo na mesma origem (o
  // "Baixar PDF" não quebra). Em produção o Express serve tudo no mesmo domínio.
  server: {
    proxy: {
      "/uploads": "http://localhost:4000",
    },
  },
});
