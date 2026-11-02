import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, strictPort: true },
  // внутренний инструмент: один чанк ~500 КБ (React + dnd + radix) — норма
  build: { chunkSizeWarningLimit: 700 },
});
