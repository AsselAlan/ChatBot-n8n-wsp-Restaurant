import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import ghPages from 'vite-plugin-gh-pages';

// Reemplazá 'tu-usuario' y 'tu-repo' por los tuyos
export default defineConfig({
  plugins: [react(), ghPages()],
  base: '/tu-repo/', // 👈 importante para que funcione en GitHub Pages
});