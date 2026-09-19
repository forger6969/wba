import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { useI18n } from '../i18n/index.jsx';

/**
 * Вход по QR: admin показывает код в StudentDetail (staff-панель), студент
 * сканирует камерой телефона — камера сама открывает эту ссылку с ?token=,
 * дальше уже никакого участия студента не требуется. Токен постоянный
 * (backend: auth/qr-login.service.js, users.qr_token) — работает при каждом
 * сканировании, пока admin явно не перевыпустит его. Ошибка здесь означает
 * «QR перевыпущен/студент удалён», а не «истёк по времени».
 */
export default function QrLogin() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const { adoptSession } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | error

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }
    api.qrLogin(token)
      .then((res) => {
        // /auth/member/qr-login отвечает {user, accessToken} без {success,data}-обёртки —
        // тот же формат, что и обычный /auth/member/login (в отличие от telegram/login/poll).
        adoptSession(res);
        navigate('/', { replace: true });
      })
      .catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen grid place-items-center bg-base-200 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-base-300 bg-base-100 p-8 text-center shadow-[0_1px_2px_rgba(29,36,23,0.04),0_18px_50px_-12px_rgba(29,36,23,0.14)]">
        <img src="/logo-primary.svg" alt="LevelUp Academy" className="h-8 w-auto mx-auto mb-6" />
        {status === 'loading' ? (
          <>
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="text-sm opacity-60 mt-4">{t.qr.loading}</p>
          </>
        ) : (
          <>
            <div role="alert" className="alert alert-error text-sm mb-4">
              <span>{t.qr.invalid}</span>
            </div>
            <Link to="/login" className="btn btn-primary btn-sm w-full">{t.qr.backToLogin}</Link>
          </>
        )}
      </div>
    </div>
  );
}
