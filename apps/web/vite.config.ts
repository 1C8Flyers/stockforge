import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  preview: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: [
      'enterprise.local',
      'sfdemo.manring.co',
      'app.vericapt.com',
      '.app.vericapt.com',
      'localhost',
      '127.0.0.1'
    ]
  }
});
