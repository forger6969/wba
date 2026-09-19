import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mail, Phone, CalendarDays, ShieldCheck, KeyRound, Check, AlertCircle, LogOut,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import Avatar from '../../components/Avatar.jsx';
import { useMe } from '../../queries.js';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';

/**
 * Профиль администратора (admin и superadmin — оба входят сюда по /profile).
 *
 * Редактируется ровно то, что принимает бэкенд (PATCH /api/users/me):
 * имя, фамилия, email. Ничего сверх этого тут нет намеренно — поле, которое
 * некуда сохранить, хуже отсутствующего поля.
 *
 * Никнейм и возраст здесь были и молча терялись: updateProfileSchema их
 * отбрасывает, а «Профиль обновлён!» всё равно показывалось. Дата рождения
 * не возвращается и в GET /users/me, хотя колонка `birth_date` в таблице users
 * есть (миграция) — бэкенд её пока не отдаёт и не принимает.
 * TODO(Karis): добавить birth_date в updateProfileSchema + findById, тогда
 * поле можно вернуть в форму.
 *
 * Пароль в кабинете не меняется: у API нет такого эндпоинта (только
 * forgot-password / reset-password через код на почту). Поэтому вместо
 * формы смены пароля — честная кнопка восстановления.
 */

/* Строка «иконка — подпись — значение» в карточке личности. */
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon size={16} className="text-base-content/35 shrink-0" />
      <span className="text-sm text-base-content/55 shrink-0">{label}</span>
      <span className="text-sm font-semibold ml-auto text-right truncate">{value || '—'}</span>
    </div>
  );
}

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

const roleLabelsMap = (t) => ({
  admin: t('role.admin'),
  superadmin: t('role.ceo'),
  mentor: t('role.mentor'),
  methodist: t('role.methodist'),
});

export default function AdminProfile() {
  const { t, i18n } = useTranslation();
  const ROLE_LABELS = roleLabelsMap(t);
  const { token, user, logout, patchUser } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  // `loadError` отдельно от `error` ниже: тот про сохранение формы, этот про
  // сам запрос. Раньше ошибку загрузки не забирали вовсе — упавший `/me`
  // оставлял пустые поля без единого слова о причине, и это выглядело как
  // «профиль пустой», а не «профиль не загрузился».
  const { data, isLoading, error: loadError, refetch } = useMe();
  const me = data?.data ?? null;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Форму заполняем, когда приехали данные, а не в начальном useState: на
  // первом рендере `me` ещё null, и поля навсегда остались бы пустыми.
  useEffect(() => {
    if (!me) return;
    setFirstName(me.firstName ?? '');
    setLastName(me.lastName ?? '');
    setEmail(me.email ?? '');
  }, [me]);

  const dirty = me && (
    firstName !== (me.firstName ?? '')
    || lastName !== (me.lastName ?? '')
    || email !== (me.email ?? '')
  );

  const validate = () => {
    if (!firstName.trim()) return t('admin.profile.enterName');
    if (!lastName.trim()) return t('admin.profile.enterLast');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return t('admin.profile.invalidEmail');
    return '';
  };

  const handleSave = async () => {
    const problem = validate();
    if (problem) { setError(problem); return; }

    setSaving(true);
    setError('');
    try {
      const patch = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() };
      await api.updateMe(token, patch);
      qc.invalidateQueries({ queryKey: ['me'] });
      // В шапке живут только имя и почта.
      patchUser(patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || t('admin.profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!me) return;
    setFirstName(me.firstName ?? '');
    setLastName(me.lastName ?? '');
    setEmail(me.email ?? '');
    setError('');
  };

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const fullName = `${me?.firstName ?? user?.firstName ?? ''} ${me?.lastName ?? user?.lastName ?? ''}`.trim();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  return (
    /* /profile у админа — обычная страница с общим скроллом (в Layout
       полноэкранным помечен только профиль ментора), поэтому отступы даёт
       контейнер, а не этот блок: здесь только две колонки. */
    <>
      {/* Страницу целиком не подменяем: имя, email и роль есть в сессии через
          useAuth(), поэтому при упавшем /me профиль остаётся читаемым. Но
          сказать об этом надо — иначе пустые «Телефон» и «Зарегистрирован»
          (их в сессии нет) выглядят как «не заполнено», а не «не загрузилось».
          Фрагмент, а не ещё один flex-контейнер: обёртка сдвинула бы отступ у
          ~170 строк ниже и утопила бы правку в шуме. */}
      {loadError && (
        <div className="alert alert-warning mb-5">
          <span className="flex-1 text-sm">
            {t('admin.profile.loadErrorPrefix', { message: loadError.message })}
          </span>
          <button className="btn btn-sm" onClick={() => refetch()}>
            {t('admin.profile.retry')}
          </button>
        </div>
      )}

    <div className="flex flex-col lg:flex-row gap-5">
      {/* ═════ Карточка личности ═════ */}
      <aside className="w-full lg:w-[380px] shrink-0">
        <div className="space-y-5">
          <section className="card bg-base-100 overflow-hidden">
            <div className="h-20 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent" />
            <div className="px-5 pb-5 -mt-10">
              <div className="ring-4 ring-base-100 rounded-full w-fit">
                <Avatar name={fullName || '?'} size={72} />
              </div>
              <h2 className="text-lg font-extrabold mt-3 truncate">
                {isLoading
                  ? <span className="skeleton inline-block h-5 w-36 align-middle" />
                  : fullName}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="badge badge-primary badge-sm gap-1">
                  <ShieldCheck size={11} /> {ROLE_LABELS[user?.role] || user?.role || t('role.admin')}
                </span>
              </div>
            </div>

            <div className="divide-y divide-base-200 border-t border-base-200">
              <InfoRow icon={Mail} label={t('admin.profile.emailLabel')} value={me?.email ?? user?.email} />
              <InfoRow icon={Phone} label={t('admin.profile.phoneLabel')} value={me?.phone} />
              <InfoRow icon={CalendarDays} label={t('admin.profile.registeredLabel')} value={formatDate(me?.createdAt)} />
            </div>
          </section>
        </div>
      </aside>

      {/* ═════ Настройки ═════ */}
      <div className="flex-1 min-w-0">
        <div className="space-y-5">
          <section className="card bg-base-100">
            <header className="px-5 py-4 border-b border-base-200">
              <h2 className="font-bold">{t('admin.profile.personalData')}</h2>
              <p className="text-xs text-base-content/45 mt-0.5">
                {t('admin.profile.personalDataHint')}
              </p>
            </header>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="form-control">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5">{t('admin.profile.firstNameLabel')}</span>
                <input
                  className="input input-bordered"
                  value={firstName}
                  maxLength={80}
                  onChange={(e) => { setFirstName(e.target.value); setError(''); }}
                  disabled={isLoading}
                />
              </label>
              <label className="form-control">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5">{t('admin.profile.lastNameLabel')}</span>
                <input
                  className="input input-bordered"
                  value={lastName}
                  maxLength={80}
                  onChange={(e) => { setLastName(e.target.value); setError(''); }}
                  disabled={isLoading}
                />
              </label>
              <label className="form-control sm:col-span-2">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5">{t('admin.profile.emailLabel')}</span>
                <input
                  type="email"
                  className="input input-bordered"
                  value={email}
                  maxLength={160}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={isLoading}
                />
                <span className="text-[11px] text-base-content/45 mt-1.5">
                  {t('admin.profile.emailHint')}
                </span>
              </label>
            </div>

            <footer className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-base-200 bg-base-200/30 rounded-b-2xl min-h-[60px]">
              <span className="text-xs">
                {error ? (
                  <span className="flex items-center gap-1.5 text-error font-medium">
                    <AlertCircle size={14} /> {error}
                  </span>
                ) : saved ? (
                  <span className="flex items-center gap-1.5 text-success font-semibold">
                    <Check size={14} /> {t('admin.profile.saved')}
                  </span>
                ) : dirty ? (
                  <span className="text-base-content/50">{t('admin.profile.dirty')}</span>
                ) : null}
              </span>

              <span className="flex items-center gap-2 shrink-0">
                {dirty && (
                  <button className="btn btn-ghost btn-sm" onClick={reset} disabled={saving}>
                    {t('admin.profile.cancel')}
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm gap-1.5"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                >
                  {saving ? <span className="loading loading-spinner loading-xs" /> : <Check size={15} />}
                  {t('admin.profile.save')}
                </button>
              </span>
            </footer>
          </section>

          <section className="card bg-base-100">
            <header className="px-5 py-4 border-b border-base-200">
              <h2 className="font-bold">{t('admin.profile.security')}</h2>
            </header>

            <div className="divide-y divide-base-200">
              <div className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <KeyRound size={15} className="text-base-content/40" /> {t('admin.profile.password')}
                  </div>
                  <p className="text-xs text-base-content/50 mt-1 max-w-md">
                    {t('admin.profile.passwordHint')}
                  </p>
                </div>
                <button
                  className="btn btn-outline btn-sm shrink-0"
                  onClick={() => navigate('/login?reset=1')}
                >
                  {t('admin.profile.resetPassword')}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <LogOut size={15} className="text-base-content/40" /> {t('admin.profile.endSession')}
                  </div>
                  <p className="text-xs text-base-content/50 mt-1">
                    {t('admin.profile.sessionHint')}
                  </p>
                </div>
                <button className="btn btn-outline btn-error btn-sm shrink-0" onClick={onLogout}>
                  {t('admin.profile.logout')}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
    </>
  );
}
