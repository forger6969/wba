import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { useI18n } from '../i18n/index.jsx';

function EyeIcon({ off }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.4-1.61" />
      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Вход учеников и родителей: логин-код + пароль.
// Google-входа НЕТ. «Забыли пароль» НЕТ — код перевыдаёт администратор центра.
export default function Login() {
  const { t } = useI18n();
  const { login, adoptSession } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /* ── Вход через Telegram ────────────────────────────────────────────────
     Логин-код из 8 символов и пароль из 6 цифр ребёнок забывает; открытый
     Telegram у него в телефоне всегда. Работает ТОЛЬКО у тех, кто уже привязал
     бота в кабинете: бот ищет чат в telegram_accounts и, не найдя, отвечает
     отказом. То есть это не обход пароля, а второй ключ к уже доказанному
     владению аккаунтом.

     Опрос, а не редирект обратно: deep-link уводит в приложение Telegram, и
     вернуть человека на вкладку автоматически неоткуда — вкладка ждёт сама. */
  const [tgBusy, setTgBusy] = useState(false);
  const [tgWaiting, setTgWaiting] = useState(false);
  const [tgAvailable, setTgAvailable] = useState(true);
  const pollTimer = useRef(null);

  // Оставленный таймер продолжил бы опрашивать сервер после ухода со страницы.
  useEffect(() => () => clearInterval(pollTimer.current), []);

  const onTelegramLogin = async () => {
    setError('');
    setTgBusy(true);
    try {
      const { data } = await api.telegramLoginStart();
      window.open(data.deepLink, '_blank', 'noopener,noreferrer');
      setTgWaiting(true);

      clearInterval(pollTimer.current);
      const startedAt = Date.now();

      pollTimer.current = setInterval(async () => {
        // Ждём ровно столько, сколько живёт nonce на сервере (expiresIn) —
        // дольше опрашивать бессмысленно, ключа уже нет.
        if (Date.now() - startedAt > data.expiresIn * 1000) {
          clearInterval(pollTimer.current);
          setTgWaiting(false);
          setError(t.login.error.tgExpired);
          return;
        }

        try {
          const res = await api.telegramLoginPoll(data.nonce);
          if (res.data.status === 'approved') {
            clearInterval(pollTimer.current);
            setTgWaiting(false);
            adoptSession(res.data);
            navigate('/', { replace: true });
          } else if (res.data.status === 'unknown') {
            clearInterval(pollTimer.current);
            setTgWaiting(false);
            setError(t.login.error.tgExpired);
          }
        } catch (err) {
          // err.status есть только у настоящего ответа сервера (4xx/5xx) — значит
          // nonce подтверждён, но вход не удался (например бэкенд недоступен из-за
          // Redis) — nonce на сервере уже одноразово использован, повторный опрос
          // бессмыслен. Без .status — обрыв сети/таймаут fetch, тик просто повторится.
          if (err?.status) {
            clearInterval(pollTimer.current);
            setTgWaiting(false);
            setError(err.message || t.login.error.tgFailed);
          }
        }
      }, 2000);
    } catch (err) {
      // 503 — на сервере не задан бот. Кнопку прячем: она гарантированно не сработает.
      if (err?.status === 503) setTgAvailable(false);
      else setError(t.login.error.tgFailed);
    } finally {
      setTgBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || !password) {
      setError(t.login.error.empty);
      return;
    }
    setBusy(true);
    try {
      await login(code.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.status === 401) setError(t.login.error.invalid);
      else if (err.status === 429) setError(t.login.error.rateLimit);
      else if (err.status === 422) setError(t.login.error.empty);
      // без .status — сеть не ответила (fetch бросил TypeError «Failed to
      // fetch»): раньше это показывалось сырым текстом, теперь понятно.
      else if (!err.status) setError(t.login.error.network);
      else setError(err.message || t.login.error.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-base-200">
      {/* Левая панель — бренд */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-sidebar text-neutral-content p-12">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full" style={{ background: 'rgba(220, 38, 38, 0.12)', filter: 'blur(80px)' }} />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full" style={{ background: 'rgba(220, 38, 38, 0.07)', filter: 'blur(80px)' }} />
        <img src="/logo-white.svg" alt="LevelUp Academy" className="relative h-10 w-auto self-start" />
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">{t.login.brandTitle}</h2>
          <p className="opacity-60 mt-2 max-w-sm">
            {t.login.brandDesc}
          </p>
          <ul className="mt-8 space-y-3">
            {t.login.features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm opacity-80">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: 'rgba(220, 38, 38, 0.15)', color: '#dc2626' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs opacity-40">{t.login.footer}</div>
      </div>

      {/* Правая панель — форма */}
      <div className="grid place-items-center p-6">
        <div className="w-full max-w-md">
          <img src="/logo-primary.svg" alt="LevelUp Academy" className="h-8 w-auto mb-6 lg:hidden" />
          <div className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-[0_1px_2px_rgba(29,36,23,0.04),0_18px_50px_-12px_rgba(29,36,23,0.14)] sm:p-10">
            <h1 className="text-2xl font-bold tracking-tight">{t.login.title}</h1>
            <p className="text-sm opacity-60 mb-6">{t.login.subtitle}</p>
            {error && (
              <div role="alert" className="alert alert-error text-sm py-2 mb-4">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">{t.login.loginCode}</span>
                <input
                  type="text"
                  required
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  value={code}
                  onChange={(e) => setCode(e.target.value.trim())}
                  placeholder={t.login.placeholderCode}
                  className="input input-bordered w-full tracking-widest"
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">{t.login.password}</span>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    inputMode="numeric"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.login.placeholderPw}
                    className="input input-bordered w-full pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    tabIndex={-1}
                    aria-label={showPw ? t.login.hidePassword : t.login.showPassword}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-base-content/40 hover:text-base-content transition-colors"
                  >
                    <EyeIcon off={showPw} />
                  </button>
                </div>
              </label>
              <button type="submit" className="btn btn-primary w-full" disabled={busy}>
                {busy ? <span className="loading loading-spinner loading-sm" /> : t.login.submit}
              </button>
            </form>

            {tgAvailable && (
              <>
                <div className="divider text-xs opacity-40 my-4">{t.common.or}</div>
                <button
                  type="button"
                  onClick={onTelegramLogin}
                  disabled={tgBusy || tgWaiting}
                  className="btn w-full gap-2"
                  style={{ background: '#E4F1FF', color: '#1668B8', border: 'none' }}
                >
                  {tgWaiting ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      {t.login.tg.verify}
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M21.9 4.3 18.9 19c-.2 1-.8 1.2-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.5-7.7c.4-.3-.1-.5-.6-.2L6.9 13 2.4 11.6c-1-.3-1-1 .2-1.4l18-7c.8-.3 1.5.2 1.3 1.1z" />
                      </svg>
                      {t.login.tg.enter}
                    </>
                  )}
                </button>
                {tgWaiting && (
                  <p className="text-xs opacity-60 text-center pt-2 leading-snug">
                    {t.login.tg.waiting}
                  </p>
                )}
              </>
            )}

            <p className="text-xs opacity-50 text-center pt-4">
              {t.login.note}
              {tgAvailable && t.login.noteTg}
            </p>
          </div>
          <p className="text-center text-xs opacity-40 mt-6">{t.login.copyright}</p>
        </div>
      </div>
    </div>
  );
}
