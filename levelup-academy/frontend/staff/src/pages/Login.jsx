import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth.jsx';
import { api, USING_MOCKS } from '../api.js';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.1 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.1 29.1 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.4 36.5 44 30.8 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

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

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4h16v16H4z" opacity="0" />
      <path d="M22 6c0-1.1-.9-2-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6Z" />
      <path d="m2 7 8.97 6.29a2 2 0 0 0 2.06 0L22 7" />
    </svg>
  );
}

// Email-поле с иконкой конверта слева.
function EmailField({ value, onChange, placeholder, autoFocus }) {
  return (
    <div className="relative">
      <span className="absolute inset-y-0 left-0 grid w-11 place-items-center text-base-content/40 pointer-events-none">
        <MailIcon />
      </span>
      <input
        type="email"
        required
        autoFocus={autoFocus}
        autoComplete="username"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input input-bordered w-full pl-11 transition-shadow focus:shadow-[0_0_0_4px_rgba(59,130,246,0.18)]"
      />
    </div>
  );
}

// Поле пароля с кнопкой показать/скрыть.
function PasswordField({ value, onChange, placeholder, autoComplete, minLength }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input input-bordered w-full pr-11 pl-11 transition-shadow focus:shadow-[0_0_0_4px_rgba(59,130,246,0.18)]"
      />
      <span className="absolute inset-y-0 left-0 grid w-11 place-items-center text-base-content/40 pointer-events-none">
        <LockIcon />
      </span>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? t('login.hidePassword') : t('login.showPassword')}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-base-content/40 hover:text-base-content transition-colors"
      >
        <EyeIcon off={show} />
      </button>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function LoginForm({ onForgot }) {
  const { t } = useTranslation();
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError(t('login.enterEmailPassword')); return; }
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.status === 401) setError(t('login.invalidCredentials'));
      else if (err.status === 429) setError(t('login.tooManyAttempts'));
      else if (err.status === 422) setError(t('login.enterEmailPassword'));
      else setError(err.message || t('login.couldNotLogin'));
    } finally { setBusy(false); }
  };

  const onGoogle = async () => {
    setError('');
    setGoogleBusy(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      if (err.code === 'firebase-not-configured') setError(t('login.googleNotConfigured'));
      else if (err.status === 403 || err.status === 401) setError(t('login.googleAccountNotLinked'));
      else if (err.code !== 'auth/popup-closed-by-user') setError(err.message || t('login.couldNotLoginGoogle'));
    } finally { setGoogleBusy(false); }
  };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight animate-slide-up">{t('login.title')}</h1>
      <p className="text-sm opacity-60 mb-6 animate-slide-up stagger-1">{t('login.rolesSubtitle')}</p>
      {error && <div role="alert" className="alert alert-error text-sm py-2 mb-4 animate-fade-in"><span>{error}</span></div>}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="form-control w-full animate-slide-up stagger-2">
          <span className="label-text mb-1 font-medium">{t('login.emailLabel')}</span>
          <EmailField autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
        </label>
        <label className="form-control w-full animate-slide-up stagger-3">
          <span className="label-text mb-1 font-medium">{t('login.passwordLabel')}</span>
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>
        <button type="submit"
          className="btn btn-primary w-full gap-2 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 animate-slide-up stagger-4"
          disabled={busy || googleBusy}>
          {busy ? <span className="loading loading-spinner loading-sm" /> : t('login.signIn')}
        </button>
      </form>

      <div className="divider text-xs opacity-40 animate-slide-up stagger-4">{t('login.or')}</div>

      <button type="button"
        className="btn btn-outline w-full gap-2 border-base-300 text-base-content transition-transform duration-150 hover:-translate-y-0.5 hover:border-base-content/30 hover:bg-base-200 hover:text-base-content active:translate-y-0 animate-slide-up stagger-5"
        onClick={onGoogle} disabled={busy || googleBusy}>
        {googleBusy ? <span className="loading loading-spinner loading-sm" /> : <><GoogleIcon /> {t('login.signInWithGoogle')}</>}
      </button>

      <div className="text-center pt-4 animate-slide-up stagger-6">
        <button type="button"
          className="text-sm text-base-content/50 hover:text-base-content transition-colors"
          onClick={onForgot}>
          {t('login.forgotPassword')}
        </button>
      </div>
    </>
  );
}

function ForgotForm({ onBack }) {
  const { t } = useTranslation();
  const [stage, setStage] = useState('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError(t('login.specifyEmail')); return; }
    setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setStage('confirm');
    } catch (err) { setError(err.message || t('login.couldNotSendCode')); } finally { setBusy(false); }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim() || newPassword.length < 8) { setError(t('login.enterCodeAndPassword')); return; }
    setBusy(true);
    try {
      await api.resetPassword({ email: email.trim(), otp: otp.trim(), newPassword });
      setStage('done');
    } catch (err) {
      if (err.status === 400) setError(t('login.invalidOrExpiredCode'));
      else if (err.status === 429) setError(t('login.tooManyAttemptsResend'));
      else setError(err.message || t('login.couldNotChangePassword'));
    } finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" className="link no-underline text-sm opacity-60 hover:opacity-100 mb-3 transition-opacity" onClick={onBack}>{t('login.backToLogin')}</button>
      <h1 className="text-2xl font-bold tracking-tight animate-slide-up">{t('login.restorePasswordTitle')}</h1>
      {error && <div role="alert" className="alert alert-error text-sm py-2 my-4 animate-fade-in"><span>{error}</span></div>}

      {stage === 'request' && (
        <form onSubmit={sendCode} className="space-y-4 mt-4 animate-fade-in" noValidate>
          <p className="text-sm opacity-60">{t('login.specifyEmailHint')}</p>
          <EmailField autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
          <button className="btn btn-primary w-full transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0" disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-sm" /> : t('login.sendCode')}
          </button>
        </form>
      )}

      {stage === 'confirm' && (
        <form onSubmit={reset} className="space-y-4 mt-4 animate-fade-in" noValidate>
          <p className="text-sm opacity-60">
            {t('login.codeSentToPrefix')} <b>{email}</b> {t('login.codeSentToSuffix')}
          </p>
          <input inputMode="numeric" maxLength={6} required autoFocus autoComplete="one-time-code" value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder={t('login.codePlaceholder')} className="input input-bordered w-full text-center text-lg tracking-[0.5em] transition-shadow focus:shadow-[0_0_0_4px_rgba(59,130,246,0.18)]" />
          <PasswordField
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('login.newPasswordPlaceholder')}
            autoComplete="new-password"
            minLength={8}
          />
          <button className="btn btn-primary w-full transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0" disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-sm" /> : t('login.changePassword')}
          </button>
          <button type="button" className="link link-primary text-xs" onClick={() => setStage('request')}>
            {t('login.resendCode')}
          </button>
        </form>
      )}

      {stage === 'done' && (
        <div className="mt-4 space-y-4 animate-fade-in">
          <div className="alert alert-success text-sm"><span>{t('login.passwordChangedSuccess')}</span></div>
          <button className="btn btn-primary w-full transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg" onClick={onBack}>{t('login.toLogin')}</button>
        </div>
      )}
    </>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const FEATURES = [t('login.feature1'), t('login.feature2'), t('login.feature3')];
  const [mode, setMode] = useState('login');
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-base-200">
      {/* Левая панель — бренд */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-sidebar text-neutral-content p-12">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-limebrand/20 blur-3xl animate-float" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-limebrand/10 blur-3xl animate-float" style={{ animationDelay: '1.2s' }} />
        <img src="/logo-white.svg" alt="LevelUp Academy" className="relative h-10 w-auto self-start animate-slide-up" />
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight animate-slide-up">{t('login.dashboardTitle')}</h2>
          <p className="opacity-60 mt-2 max-w-sm animate-slide-up stagger-1">{t('login.dashboardSubtitle')}</p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f, i) => (
              <li key={f} className={`flex items-center gap-3 text-sm opacity-80 animate-slide-up stagger-${i + 2}`}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-limebrand/15 text-limebrand">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs opacity-40">LevelUp Academy · SaaS</div>
      </div>

      {/* Правая панель — форма */}
      <div className="grid place-items-center p-6">
        <div className="w-full max-w-md">
          <img src="/logo-primary.svg" alt="LevelUp Academy" className="h-8 w-auto mb-6 lg:hidden" />
          <div className="rounded-2xl border border-base-300 bg-base-100 p-8 shadow-[0_1px_2px_rgba(29,36,23,0.04),0_18px_50px_-12px_rgba(29,36,23,0.14)] transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(29,36,23,0.05),0_24px_60px_-12px_rgba(29,36,23,0.18)] sm:p-10 animate-slide-up">
            {mode === 'login'
              ? <LoginForm onForgot={() => setMode('forgot')} />
              : <ForgotForm onBack={() => setMode('login')} />}
            {/* Эти аккаунты — только в mock-режиме (localStorage, без бэкенда):
                Finance Manager/Branch Manager backend-ролью ещё не стали
                (см. комментарии в api.js). Раньше подсказка висела всегда,
                включая локальную разработку с VITE_USE_MOCKS=false (реальный
                бэкенд) — там этих аккаунтов в БД нет и никогда не будет,
                попытка входа честно давала "Неверный email или пароль". */}
            {mode === 'login' && USING_MOCKS && (
              <div className="mt-4 rounded-xl border border-dashed border-base-300 bg-base-200/50 p-3 text-[11px] leading-relaxed text-base-content/50 animate-fade-in">
                <p className="font-semibold uppercase tracking-wider text-base-content/40 mb-1">{t('login.demoAccessTitle')}</p>
                <p><b>Finance Manager:</b> finance.manager@gmail.com · pass123</p>
                <p><b>Branch Manager:</b> kozim.manager@gmail.com · ChangeMe123!</p>
              </div>
            )}
          </div>
          <p className="text-center text-xs opacity-40 mt-6">© LevelUp Academy</p>
        </div>
      </div>
    </div>
  );
}
