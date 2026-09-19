import { useState, useEffect } from 'react';
import {
  Mail, Building2, CalendarDays, ShieldCheck, KeyRound, Check, AlertCircle, LogOut, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import Avatar from '../../components/Avatar.jsx';
import MyDiscipline from '../../components/MyDiscipline.jsx';
import { useMe } from '../../queries.js';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';

/**
 * Профиль методиста. У методиста нет групп/грейда/навыков ментора — карточка
 * короче: личные данные (PATCH /api/users/me принимает firstName/lastName/
 * email — bio/skills сервис игнорирует не у ментора), безопасность, и своя
 * дисциплина (K-DISC-FRONT: раньше у методиста вообще не было /profile —
 * маршрут молча редиректил на дашборд).
 */
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon size={16} className="text-base-content/35 shrink-0" />
      <span className="text-sm text-base-content/55 shrink-0">{label}</span>
      <span className="text-sm font-semibold ml-auto text-right truncate">{value || '—'}</span>
    </div>
  );
}

function MethodistProfileView() {
  const { t, i18n } = useTranslation(); const lang = i18n.language;
  const { token, user, logout, patchUser } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error: meError } = useMe();
  const me = data?.data ?? null;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

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
    if (!firstName.trim()) return t('methodist.profile.enter_name');
    if (!lastName.trim()) return t('methodist.profile.enter_last');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return t('methodist.profile.invalid_email');
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
      patchUser(patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || t('methodist.profile.save_failed'));
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
  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString(lang, { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-5 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl grid place-items-center" style={{ background: 'var(--mt-accent-light)' }}>
            <ShieldCheck size={18} className="text-[var(--mt-accent)]" />
          </div>
          <div>
            <h1 className="text-[20px] font-extrabold text-[var(--mt-text)] tracking-tight">{t('methodist.profile.personal_data')}</h1>
            <p className="text-[12px] text-[var(--mt-text-muted)]">{fullName || '—'}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>
      {isError && (
        <div className="alert alert-error w-full shrink-0">
          <AlertTriangle size={20} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{t('methodist.profile.load_error')}</p>
            <p className="text-xs opacity-80">{meError?.message || t('methodist.common.loading_failed')}</p>
          </div>
          <button
            className="btn btn-ghost btn-sm gap-1.5 shrink-0"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={14} /> {t('methodist.common.retry')}
          </button>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0 lg:overflow-hidden">
      {/* ═════ Карточка личности ═════ */}
      <aside className="w-full lg:w-[380px] shrink-0 lg:h-full lg:overflow-y-auto">
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
                  <ShieldCheck size={11} /> {t('methodist.profile.role_methodist')}
                </span>
              </div>
            </div>

            <div className="divide-y divide-base-200 border-t border-base-200">
              <InfoRow icon={Mail} label={t('methodist.profile.email')} value={isLoading ? <span className="skeleton inline-block h-4 w-24 align-middle" /> : (me?.email ?? user?.email)} />
              <InfoRow icon={Building2} label={t('methodist.profile.branch')} value={isLoading ? <span className="skeleton inline-block h-4 w-24 align-middle" /> : me?.branchName} />
              <InfoRow icon={CalendarDays} label={t('methodist.profile.registered')} value={isLoading ? <span className="skeleton inline-block h-4 w-24 align-middle" /> : formatDate(me?.createdAt)} />
            </div>
          </section>
        </div>
      </aside>

      {/* ═════ Настройки ═════ */}
      <div className="flex-1 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1">
        <div className="space-y-5">
          <section className="card bg-base-100">
            <header className="px-5 py-4 border-b border-base-200">
              <h2 className="font-bold">{t('methodist.profile.personal_data')}</h2>
              <p className="text-xs text-base-content/45 mt-0.5">
                {t('methodist.profile.personal_data_hint')}
              </p>
            </header>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="form-control">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5">{t('methodist.profile.first_name')}</span>
                <input
                  className="input input-bordered"
                  value={firstName}
                  maxLength={80}
                  onChange={(e) => { setFirstName(e.target.value); setError(''); }}
                  disabled={isLoading}
                />
              </label>
              <label className="form-control">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5">{t('methodist.profile.last_name')}</span>
                <input
                  className="input input-bordered"
                  value={lastName}
                  maxLength={80}
                  onChange={(e) => { setLastName(e.target.value); setError(''); }}
                  disabled={isLoading}
                />
              </label>
              <label className="form-control sm:col-span-2">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5">{t('methodist.profile.email')}</span>
                <input
                  type="email"
                  className="input input-bordered"
                  value={email}
                  maxLength={160}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={isLoading}
                />
                <span className="text-[11px] text-base-content/45 mt-1.5">
                  {t('methodist.profile.email_hint')}
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
                    <Check size={14} /> {t('methodist.profile.saved')}
                  </span>
                ) : dirty ? (
                  <span className="text-base-content/50">{t('methodist.profile.dirty')}</span>
                ) : null}
              </span>

              <span className="flex items-center gap-2 shrink-0">
                {dirty && (
                  <button className="btn btn-ghost btn-sm" onClick={reset} disabled={saving}>
                    {t('methodist.common.cancel')}
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm gap-1.5"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                >
                  {saving ? <span className="loading loading-spinner loading-xs" /> : <Check size={15} />}
                  {t('methodist.common.save')}
                </button>
              </span>
            </footer>
          </section>

          <section className="card bg-base-100">
            <header className="px-5 py-4 border-b border-base-200">
              <h2 className="font-bold">{t('methodist.profile.security')}</h2>
            </header>

            <div className="divide-y divide-base-200">
              <div className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <KeyRound size={15} className="text-base-content/40" /> {t('methodist.profile.password')}
                  </div>
                  <p className="text-xs text-base-content/50 mt-1 max-w-md">
                    {t('methodist.profile.password_hint')}
                  </p>
                </div>
                <button
                  className="btn btn-outline btn-sm shrink-0"
                  onClick={() => navigate('/login?reset=1')}
                >
                  {t('methodist.profile.reset_password')}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <LogOut size={15} className="text-base-content/40" /> {t('methodist.profile.end_session')}
                  </div>
                  <p className="text-xs text-base-content/50 mt-1">
                    {t('methodist.profile.session_hint')}
                  </p>
                </div>
                <button className="btn btn-outline btn-error btn-sm shrink-0" onClick={onLogout}>
                  {t('methodist.profile.logout')}
                </button>
              </div>
            </div>
          </section>

          {/* K-DISC-FRONT: свои взыскания + устав, только просмотр */}
          <MyDiscipline />
        </div>
      </div>
      </div>
    </div>
  );
}

export default function MethodistProfile() {
  return (
    <MethodistProfileView />
  );
}
