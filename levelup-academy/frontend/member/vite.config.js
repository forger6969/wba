import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// dev-прокси: фронт зовёт /api/... как свой origin → без CORS, и refresh-cookie
// (SameSite=Lax) доезжает. Target — DEV_API_PROXY (без VITE_ префикса: серверная
// переменная, в браузер не попадает). VITE_API_URL — только для build/preview;
// в dev должен быть ПУСТ, иначе api.js склеит абсолютный URL к Render прямо в
// браузере, прокси окажется в обходе → CORS + cookie не отправится.
// loadEnv нужен, т.к. process.env НЕ читает .env автоматически внутри vite.config.js
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Kabinet bitta saytning ichida `/kabinet/` ostida turadi (frontend/vercel.json).
    // Yig'ish paytida VITE_BASE_PATH=kabinet beriladi; alohida ishga tushirilganda
    // '/' qoladi. Qiymat ataylab boshida slashsiz: Windows/Git Bash '/kabinet/'
    // ko'rinishidagi qiymatni disk yo'liga aylantirib yuboradi ("/Program Files/…").
    base: (process.env.VITE_BASE_PATH || env.VITE_BASE_PATH)
      ? `/${(process.env.VITE_BASE_PATH || env.VITE_BASE_PATH).replace(/^\/+|\/+$/g, '')}/`
      : '/',
    plugins: [react()],
    server: {
      port: 5175,
      // host: true — слушать LAN, не только localhost: страницу /qr-login
      // открывает камера телефона по IP компа, а не по localhost телефона.
      host: true,
      proxy: {
        '/api': {
          target: env.DEV_API_PROXY || 'https://levelup-academy-1.onrender.com',
          changeOrigin: true,
        },
        // AB-VERIFY: без прокси /socket.io чат родителя молча не подключался
        // (connect_error: timeout) — тот же баг, что и в staff/vite.config.js.
        '/socket.io': {
          target: env.DEV_API_PROXY || 'https://levelup-academy-1.onrender.com',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
