// Все запросы идут на /api (dev-прокси Vite → http://localhost:4000).
// VITE_API_URL — боевой бэкенд (Render) для production build.
// credentials:'include' — чтобы refresh-cookie ставилась и слалась.

const API_BASE = typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_URL || '' : '';

async function rawRequest(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch сам бросает сырой TypeError ("Failed to fetch") при обрыве сети/
    // недоступном сервере — до пользователя это доходить не должно
    const err = new Error('Сервер недоступен. Проверьте подключение и попробуйте ещё раз');
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.fields = data.details || data.errors || null;
    throw err;
  }
  return data;
}

// Пути, которым нельзя подсовывать авто-refresh (иначе цикл/логин ломается)
const AUTH_PATHS = new Set([
  '/auth/main/login', '/auth/main/google', '/auth/main/refresh', '/auth/main/logout',
  '/auth/forgot-password', '/auth/reset-password',
]);

// Единый refreshPromise — ЛЮБОЙ триггер (bootstrap на старте приложения,
// реактивный 401, проактивный таймер/visibilitychange в auth.jsx) идёт через
// один и тот же промис, не долбит /refresh по отдельности. Без этого
// bootstrap-вызов при загрузке страницы и первый же 401 от другого
// компонента, смонтированного чуть раньше, оба уходят на сервер с ОДНИМ и
// тем же ещё не провёрнутым refresh-токеном — сервер видит это как reuse и
// отзывает ВСЕ токены пользователя разом (backend/src/modules/auth/
// auth.service.js:refresh, reuse-detection), роняя сессию целиком без
// единой реальной причины (см. task-protocol, 21.08.2026).
let refreshPromise = null;
let onTokenRefreshed = null;
export function setOnTokenRefreshed(cb) { onTokenRefreshed = cb; }

export function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = rawRequest('/auth/main/refresh', { method: 'POST' })
      .then((d) => {
        onTokenRefreshed?.(d);
        return d;
      })
      .catch((err) => {
        onTokenRefreshed?.(null);
        throw err;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// Авто-refresh на 401: один раз пробуем обновить токен и повторить запрос
async function request(path, opts = {}) {
  try {
    return await rawRequest(path, opts);
  } catch (err) {
    if (err.status === 401 && !AUTH_PATHS.has(path) && !opts._retried) {
      const session = await refreshOnce();
      return rawRequest(path, { ...opts, token: session.accessToken, _retried: true });
    }
    throw err;
  }
}

export const api = {
  // auth
  loginMain: (login, password) =>
    request('/auth/main/login', { method: 'POST', body: { login, password } }),
  // используется в auth.jsx при загрузке — восстановление сессии по refresh-cookie
  refresh: () => refreshOnce(),
  logout: () => request('/auth/main/logout', { method: 'POST' }),
  googleLogin: (idToken) => request('/auth/main/google', { method: 'POST', body: { idToken } }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body }),

  // dashboard / partners
  dashboard: (token) => request('/main/dashboard', { token }),
  revenue: (token) => request('/main/revenue', { token }),
  getProfile: (token) => request('/main/profile', { token }),
  // список партнёров отдельно не запрашиваем — он приходит внутри /main/dashboard
  setPartnerStatus: (token, id, status, reason = 'Изменено вручную через Main Admin') =>
    request(`/main/partners/${id}/status`, { method: 'PATCH', token, body: { status, reason } }),
  onboardPartner: (token, body) =>
    request('/main/partners', { method: 'POST', token, body }),

  // leads
  leads: (token, status) =>
    request(`/main/leads${status ? `?status=${status}` : ''}`, { token }),
  updateLead: (token, id, body) =>
    request(`/main/leads/${id}`, { method: 'PATCH', token, body }),

  // pricing (только чтение: PUT /main/pricing на бэкенде ничего не записывает,
  // тарифы лежат в backend/src/config/plans.js — правка через БД это v2)
  getPricing: (token) => request('/main/pricing', { token }),

  // main announcements
  mainAnnouncements: (token) => request('/main/announcements', { token }),
  mainCreateAnnouncement: (token, body) =>
    request('/main/announcements', { method: 'POST', token, body }),
  mainDeleteAnnouncement: (token, id) =>
    request(`/main/announcements/${id}`, { method: 'DELETE', token }),

  // profile update
  updateProfile: (token, body) =>
    request('/main/profile', { method: 'PATCH', token, body }),

  // каталог платных фич (не фиксированный список — Main Admin ведёт сам)
  addonPrices: (token) => request('/main/addon-prices', { token }),
  createAddonFeature: (token, body) =>
    request('/main/addon-prices', { method: 'POST', token, body }),
  updateAddonFeature: (token, key, body) =>
    request(`/main/addon-prices/${key}`, { method: 'PATCH', token, body }),
  deactivateAddonFeature: (token, key) =>
    request(`/main/addon-prices/${key}`, { method: 'DELETE', token }),

  // фичи конкретного партнёра
  partnerFeatures: (token, id) => request(`/main/partners/${id}/features`, { token }),
  setPartnerFeature: (token, id, key, enabled) =>
    request(`/main/partners/${id}/features/${key}`, { method: 'PATCH', token, body: { enabled } }),

  // биллинг партнёра (ручная фиксация оплаты/бонуса)
  recordPayment: (token, id, body) =>
    request(`/main/partners/${id}/payments`, { method: 'POST', token, body }),
  grantBonus: (token, id, months, note = 'Бонус предоставлен Main Admin') =>
    request(`/main/partners/${id}/bonus`, { method: 'POST', token, body: { months, note } }),
  orgLedger: (token, id) => request(`/main/partners/${id}/ledger`, { token }),

  // собственные расходы платформы + P&L
  expenses: (token) => request('/main/expenses', { token }),
  createExpense: (token, body) => request('/main/expenses', { method: 'POST', token, body }),
  deleteExpense: (token, id) => request(`/main/expenses/${id}`, { method: 'DELETE', token }),
  finance: (token) => request('/main/finance', { token }),
  videoStorageCosts: (token) => request('/main/video-storage-costs', { token }),

  // заявки CEO на подключение/отключение фичи
  featureRequests: (token, status) =>
    request(`/main/feature-requests${status ? `?status=${status}` : ''}`, { token }),
  decideFeatureRequest: (token, id, decision) =>
    request(`/main/feature-requests/${id}`, { method: 'PATCH', token, body: { decision } }),

  // журнал действий платформы (Karis 25.08.2026)
  // центр проблем: что требует вмешательства прямо сейчас (Karis 25.08.2026)
  actionCenter: (token) => request('/main/action-center', { token }),
  systemHealth: (token) => request('/main/system-health', { token }),
  errorLog: (token, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return request(`/main/error-log${qs ? `?${qs}` : ''}`, { token });
  },
  resolveError: (token, id) => request(`/main/error-log/${id}/resolve`, { method: 'PATCH', token }),
  queueHealth: (token) => request('/main/queue-health', { token }),
  partnerHealth: (token) => request('/main/partner-health', { token }),
  productActivity: (token, days = 7) => request(`/main/product-activity?days=${days}`, { token }),
  storageHealth: (token) => request('/main/storage-health', { token }),
  partnerChanges: (token, days = 7) => request(`/main/partner-changes?days=${days}`, { token }),

  // счета и долги партнёров (Karis 26.08.2026)
  invoices: (token, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return request(`/main/invoices${qs ? `?${qs}` : ''}`, { token });
  },
  orgDebt: (token) => request('/main/invoices/debt', { token }),
  generateInvoices: (token, periodCovered) =>
    request('/main/invoices', { method: 'POST', token, body: periodCovered ? { periodCovered } : {} }),
  cancelInvoice: (token, id, reason) =>
    request(`/main/invoices/${id}/cancel`, { method: 'PATCH', token, body: { reason } }),

  // аналитика сайта levelup-academy.uz: Search Console + GA4 (Karis 25.08.2026)
  siteAnalytics: (token, days = 28) => request(`/main/site-analytics?days=${days}`, { token }),

  // модерация чата: один список слов на всю платформу (Karis 26.08.2026)
  bannedWords: (token) => request('/main/banned-words', { token }),
  addBannedWords: (token, words) => request('/main/banned-words', { method: 'POST', token, body: { words } }),
  setBannedWordActive: (token, id, isActive) =>
    request(`/main/banned-words/${id}`, { method: 'PATCH', token, body: { isActive } }),
  setBannedWordAutoMask: (token, id, autoMask) =>
    request(`/main/banned-words/${id}/auto-mask`, { method: 'PATCH', token, body: { autoMask } }),
  deleteBannedWord: (token, id) => request(`/main/banned-words/${id}`, { method: 'DELETE', token }),
  flaggedMessages: (token, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return request(`/main/flagged-messages${qs ? `?${qs}` : ''}`, { token });
  },

  auditLog: (token, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return request(`/main/audit${qs ? `?${qs}` : ''}`, { token });
  },
};
