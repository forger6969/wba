import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// dev-прокси: фронт зовёт /api/... как свой origin → без CORS/куки-головной боли.
// Target для прокси — DEV_API_PROXY (НЕ VITE_ префикс, серверная переменная, в браузер
// не попадает). VITE_API_URL — отдельно, только для build/preview (боевой бэкенд Render),
// в dev должен быть ПУСТ: если задать его и в dev, api.js склеит АБСОЛЮТНЫЙ URL к Render
// прямо в браузере — прокси окажется в обходе, и вылезет CORS (Access-Control-Allow-Origin
// не совпадёт с dev-портом).
// loadEnv нужен, т.к. process.env НЕ читает .env автоматически внутри vite.config.js
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5273,
      // FE-COOP: default COOP browsers apply to cross-origin window.open() blocks
      // Firebase's signInWithPopup from polling popup.closed — console warning
      // (google/firebase-js-sdk#7370). same-origin-allow-popups keeps isolation
      // but explicitly permits interacting with popups we opened ourselves.
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        '/api': {
          target: env.DEV_API_PROXY || 'https://levelup-academy-1.onrender.com',
          changeOrigin: true,
        },
        '/socket.io': {
          target: env.DEV_API_PROXY || 'https://levelup-academy-1.onrender.com',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
