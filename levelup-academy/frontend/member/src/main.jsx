import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/manrope';
import { AuthProvider } from './auth.jsx';
import { I18nProvider } from './i18n/index.jsx';
import App from './App.jsx';
import './index.css';

// Kabinet bitta saytning ichida, `/kabinet/` ostida turadi (frontend/vercel.json).
// BASE_URL build paytida beriladi (`vite build --base=/kabinet/`), alohida
// ishga tushirilganda esa '/' bo'ladi — shuning uchun qiymat qotirilmaydi.
const BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

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
      <BrowserRouter basename={BASENAME} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <I18nProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
