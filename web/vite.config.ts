/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dos páginas: la landing en "/" (index.html) y la app en "/app/" (app/index.html).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        landing: "index.html",
        app: "app/index.html",
      },
    },
  },
  test: {
    environment: "node",
  },
});
