import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// dev-прокси: форма зовёт /api/leads как свой origin → без CORS-настроек на бэке
// VITE_API_URL — боевой бэкенд (Render) для build / preview
// loadEnv нужен, т.к. process.env НЕ читает .env автоматически внутри vite.config.js
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'https://levelup-academy-1.onrender.com',
          changeOrigin: true,
        },
      },
    },
  };
});
