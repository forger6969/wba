import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// loadEnv нужен, т.к. process.env НЕ читает .env автоматически внутри vite.config.js
// (Vite грузит .env только в import.meta.env для клиентского кода)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5174,
      // FE-COOP: default COOP blocks Firebase signInWithPopup from polling
      // popup.closed — console warning (google/firebase-js-sdk#7370).
      // same-origin-allow-popups keeps isolation but allows our own popups.
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        '/api': {
          /* DEV_API_PROXY впереди VITE_API_URL намеренно.
             Раньше цель бралась только из VITE_API_URL, а его в локальном .env
             обычно нет — и dev-сервер по умолчанию проксировал на БОЕВОЙ
             api.levelup-academy.uz. То есть разработчик, запустив панель у себя,
             работал против продакшена и мог там что-нибудь создать или удалить,
             ничего не подозревая. Так же сделано в main-admin.
             DEV_API_PROXY не имеет префикса VITE_ и в браузер не попадает. */
          target: env.DEV_API_PROXY || env.VITE_API_URL || 'https://api.levelup-academy.uz',
          changeOrigin: true,
        },
        // MP-VERIFY: socket.js подключается на VITE_API_URL || '' (тот же origin,
        // т.е. dev-сервер), а не на бэкенд — без проксирования /socket.io чат и
        // живая посещаемость молча не подключались (connect_error: timeout) в
        // любом локальном запуске, что и мешало живой проверке Mentor-панели.
        '/socket.io': {
          target: env.DEV_API_PROXY || env.VITE_API_URL || 'https://api.levelup-academy.uz',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
