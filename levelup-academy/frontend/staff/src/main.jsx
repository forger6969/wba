import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/manrope';
import { AuthProvider } from './auth.jsx';
import './i18n.js';
import App from './App.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

// ErrorBoundary ставит этот флаг перед авто-reload'ом на "битый чанк после
// деплоя" — не даёт зациклиться, если новая загрузка тоже упадёт. Если же
// 5 секунд всё стабильно, значит сборка рабочая — снимаем флаг, чтобы
// следующий деплой (через несколько часов/дней в той же вкладке) тоже
// получил свой один авто-reload, а не сразу ручную кнопку.
setTimeout(() => sessionStorage.removeItem('levelup-chunk-reload-attempted'), 5000);
