import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

const app = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

const container = document.getElementById('root');

// В проде HTML уже отрисован на этапе сборки (scripts/prerender.js) — его нужно
// оживить, а не затирать: createRoot выбросил бы готовую разметку и свёл prerender на нет.
// В dev-режиме vite отдаёт пустую оболочку, гидратировать нечего.
if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
