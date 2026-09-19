import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import PasswordInput from '../components/PasswordInput.jsx';

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

// ---- вход по email + Google ----
function LoginForm({ onForgot }) {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Неверный email или пароль' : err.message);
    } finally { setBusy(false); }
  };

  const onGoogle = async () => {
    setError('');
    try {
      await loginWithGoogle();
      navigate('/', { replace: true });
    } catch (err) {
      if (err.code === 'firebase-not-configured') setError('Google-вход пока не настроен');
      else if (err.status === 403 || err.status === 401) setError('Этот Google-аккаунт не привязан к Main Admin');
      else if (err.code !== 'auth/popup-closed-by-user') setError(err.message);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold">Вход</h1>
      <p className="text-sm opacity-60 mb-6">Main Admin</p>
      {error && <div role="alert" className="alert alert-error text-sm py-2 mb-4"><span>{error}</span></div>}

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="form-control w-full">
          <span className="label-text mb-1">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com" className="input input-bordered w-full" />
        </label>
        <label className="form-control w-full">
          <span className="label-text mb-1">Пароль</span>
          <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" className="input input-bordered w-full" />
        </label>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? <span className="loading loading-spinner loading-sm" /> : 'Войти'}
        </button>
      </form>

      <div className="divider text-xs opacity-40">или</div>

      <button type="button" className="btn btn-outline w-full gap-2" onClick={onGoogle}>
        <GoogleIcon /> Войти через Google
      </button>

      <div className="text-center pt-3">
        <button type="button"
          className="text-sm text-base-content/50 hover:text-base-content transition-colors"
          onClick={onForgot}>
          Забыли пароль?
        </button>
      </div>
    </>
  );
}

// ---- сброс пароля: email → код на почту → новый пароль ----
const RESEND_SECONDS = 60;

function ForgotForm({ onBack }) {
  const [stage, setStage] = useState('request'); // request | confirm | done
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Бэкенд держит на этом маршруте passwordResetLimiter — при частых попытках
  // прилетает 429. Раньше он показывался сырым текстом; теперь объясняем причину.
  const sendCode = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setStage('confirm'); // ответ всегда нейтральный (не раскрывает, есть ли аккаунт)
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(
        err.status === 429
          ? 'Слишком много запросов кода — подождите пару минут'
          : err.message,
      );
    } finally { setBusy(false); }
  };

  // Повторная отправка: раньше кнопка просто возвращала на первый шаг, и человек
  // мог долбить её подряд, упираясь в лимитер. Теперь отсчёт до следующей попытки.
  const resend = async () => {
    if (resendIn > 0 || busy) return;
    setError(''); setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setOtp('');
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(
        err.status === 429
          ? 'Слишком много запросов кода — подождите пару минут'
          : err.message,
      );
    } finally { setBusy(false); }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.resetPassword({ email: email.trim(), otp: otp.trim(), newPassword });
      setStage('done');
    } catch (err) {
      if (err.status === 400) setError('Неверный или просроченный код');
      else if (err.status === 429) setError('Слишком много попыток — запросите код заново');
      else setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" className="link text-sm opacity-60 mb-3" onClick={onBack}>← Назад ко входу</button>
      <h1 className="text-2xl font-bold">Восстановление пароля</h1>
      {error && <div role="alert" className="alert alert-error text-sm py-2 my-4"><span>{error}</span></div>}

      {stage === 'request' && (
        <form onSubmit={sendCode} className="space-y-3 mt-4">
          <p className="text-sm opacity-60">Укажите email — пришлём 6-значный код на почту.</p>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com" className="input input-bordered w-full" />
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-sm" /> : 'Отправить код'}
          </button>
        </form>
      )}

      {stage === 'confirm' && (
        <form onSubmit={reset} className="space-y-3 mt-4">
          <p className="text-sm opacity-60">
            Код отправлен на <b>{email}</b> (проверьте почту, в т.ч. «Спам»). Введите код и новый пароль.
          </p>
          <input inputMode="numeric" maxLength={6} required value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="Код из письма (6 цифр)" className="input input-bordered w-full tracking-widest" />
          <PasswordInput required minLength={8} value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Новый пароль (мин. 8)" className="input input-bordered w-full" />
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-sm" /> : 'Сменить пароль'}
          </button>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="link link-primary text-xs disabled:no-underline disabled:opacity-40"
              onClick={resend}
              disabled={resendIn > 0 || busy}
            >
              {resendIn > 0 ? `Отправить заново через ${resendIn} с` : 'Отправить код заново'}
            </button>
            <button type="button" className="link text-xs opacity-60" onClick={() => setStage('request')}>
              Другой email
            </button>
          </div>
        </form>
      )}

      {stage === 'done' && (
        <div className="mt-4 space-y-4">
          <div className="alert alert-success text-sm"><span>Пароль изменён. Войдите с новым паролем.</span></div>
          <button className="btn btn-primary w-full" onClick={onBack}>Ко входу</button>
        </div>
      )}
    </>
  );
}

export default function Login() {
  const [mode, setMode] = useState('login'); // login | forgot
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-base-200">
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-neutral-content p-12">
        <img src="/logo-white.svg" alt="LevelUp Academy" className="h-10 w-auto self-start" />
        <div>
          <h2 className="text-2xl font-bold">Панель владельца платформы</h2>
          <p className="opacity-60 mt-2 max-w-sm">Партнёры, заявки с лендинга, доход и тарифы — в одном месте.</p>
        </div>
        <div className="text-xs opacity-40">SaaS · Main Admin</div>
      </div>

      <div className="grid place-items-center p-6">
        <div className="w-full max-w-sm">
          <img src="/logo-primary.svg" alt="LevelUp Academy" className="h-8 w-auto mb-5 lg:hidden" />
          {mode === 'login'
            ? <LoginForm onForgot={() => setMode('forgot')} />
            : <ForgotForm onBack={() => setMode('login')} />}
        </div>
      </div>
    </div>
  );
}
