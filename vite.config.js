import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ChatBot-n8n-wsp-Restaurant/', // 👈 tu repo exacto
});