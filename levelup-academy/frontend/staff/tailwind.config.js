/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        sidebar: '#16210f',
        limebrand: '#dc2626',
        // По коду панелей давно ходят `text-danger`, `bg-danger/15`,
        // `border-danger/30` — но такого цвета в конфиге не было, и Tailwind
        // молча выбрасывал эти классы: статус «не пришёл» рисовался без
        // красного. Определяем цвет, чтобы классы наконец работали.
        danger: '#dc2626',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    // Одна тема. Тёмной нет — см. комментарий в src/index.css.
    themes: [
      {
        levelup: {
          // Спокойный лесной зелёный: контраст с белым 4.6:1 (WCAG AA для
          // обычного текста). Неоновый лайм #dc2626 остался ТОЛЬКО брендовым
          // акцентом на тёмном сайдбаре (colors.limebrand) — как заливка
          // кнопок он давал 1.3:1 и был нечитаем.
          primary: '#dc2626',
          'primary-content': '#ffffff',
          secondary: '#16210f',
          'secondary-content': '#ffffff',
          accent: '#dc2626',
          'accent-content': '#ffffff',
          neutral: '#16210f',
          'neutral-content': '#e8f0df',
          'base-100': '#ffffff',
          'base-200': '#f5f8f1',
          'base-300': '#e7eede',
          'base-content': '#16210f',
          info: '#2563eb',
          success: '#15803d',
          warning: '#b45309',
          error: '#dc2626',
          // Тот же ход, что в main-admin/tailwind.config.js (11.08.2026,
          // "острее углы = серьёзнее продукт") — там применили, здесь забыли:
          // все .card/.btn/.badge панели Admin/CEO/Mentor/Methodist/Branch
          // Manager/Finance наследуют этот токен разом (Karis, 13.08.2026).
          '--rounded-box': '0.5rem',
          '--rounded-btn': '0.375rem',
          '--rounded-badge': '0.25rem',
        },
      },
    ],
  },
};
