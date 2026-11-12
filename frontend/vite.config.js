import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Força a abrir para a rede externa
    port: 5173,
    strictPort: true, // Impede o Vite de pular furtivamente para a porta 5174
  },
});
