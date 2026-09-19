/* ─────────────────────────────────────────────────────────────────────────────
   Finance Manager — Настройки профиля. Раньше это был статичный демо-раздел:
   имя/email из auth, всё остальное (включая "город") — выдуманный PROFILE из
   _data.js, редактирование уходило только в localStorage и никогда не
   долетало до сервера ("Сохранено!" был обманом). 22.08.2026 (Karis) —
   подключено к настоящему GET/PATCH /api/users/me, тому же, что уже
   используют Admin/Mentor/Methodist (см. pages/admin/Profile.jsx). Телефон
   показываем как есть (реальное поле), но не даём редактировать — бэкенд
   (updateProfileSchema) его не принимает; "город" убран целиком, это была
   несуществующая колонка.
   ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useState } from 'react';
import { User, Mail, Phone, Save, BadgeCheck, Globe, ShieldCheck, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader.jsx';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import { useMe, useInvalidate } from '../../queries.js';
import { Card } from './_ui.jsx';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';

function Field({ label, icon: Icon, value, onChange, readOnly }) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block text-base-content/50">
        {label}
      </label>
      <div className="relative">
        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
        <input
          type="text"
          value={value ?? ''}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className={`w-full h-10 pl-9 pr-3 rounded-[10px] border border-base-300 bg-base-100 text-base-content text-[13px] outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary ${
            readOnly ? 'cursor-not-allowed bg-base-200 text-base-content/50' : ''
          }`}
        />
      </div>
    </div>
  );
}

export default function FinanceSettings() {
  const { t } = useTranslation();
  const { token, user, patchUser } = useAuth();
  const invalidate = useInvalidate();
  const { data: meData, isLoading } = useMe();
  const me = meData?.data ?? null;

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  // Форму заполняем, когда реально приехали данные — на первом рендере me
  // ещё null, инициализировать useState-ом сразу значило бы навсегда
  // оставить пустые поля (та же ошибка, что уже была поймана в admin/Profile.jsx).
  /* GET /users/me отдаёт СЫРУЮ строку БД (first_name/last_name), а PATCH
     /users/me ждёт camelCase (firstName/lastName, updateProfileSchema) —
     асимметрия эндпоинта. Читали camelCase, поэтому имя и фамилия оставались
     пустыми, а email заполнялся (у него имя поля совпадает). Karis 22.08.2026.
     Читаем оба варианта, чтобы не сломаться, если ответ причешут. */
  useEffect(() => {
    if (!me) return;
    setForm({
      firstName: me.firstName ?? me.first_name ?? '',
      lastName: me.lastName ?? me.last_name ?? '',
      email: me.email ?? '',
    });
  }, [me]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErr(''); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) { setErr(t('finance.settings.firstName') + '/' + t('finance.settings.lastName')); return; }
    setSaving(true); setErr('');
    try {
      const patch = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim() };
      await api.updateMe(token, patch);
      invalidate(['me']);
      patchUser(patch); // в шапке живут имя/email — обновить сразу, не дожидаясь рефетча
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e2) { setErr(e2.message); } finally { setSaving(false); }
  };

  const initials = ((form.firstName?.[0] ?? '') + (form.lastName?.[0] ?? '')).toUpperCase() || 'FM';

  return (
    <div className="space-y-6 pb-8 animate-page-enter">
      <PageHeader title={t('finance.settings.title')} subtitle={t('finance.settings.subtitle')} />

      <Card bodyClass="p-5">
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-[18px] grid place-items-center text-2xl font-black shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #134e4a 100%)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold text-base-content">
              {isLoading ? <span className="skeleton inline-block h-5 w-36 align-middle" /> : `${form.firstName} ${form.lastName}`}
            </h2>
            <p className="text-sm mt-0.5 text-base-content/70">{form.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600">
                <BadgeCheck size={12} />
                Finance Manager
              </span>
            </div>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSave} className="card bg-base-100 border border-base-300 shadow-sm p-6">
        <h2 className="text-[15px] font-extrabold text-base-content">{t('finance.settings.personal')}</h2>
        <p className="text-[12px] text-base-content/50 mt-0.5 mb-5">{t('finance.settings.personalSub')}</p>

        {err && (
          <div className="px-4 py-3 mb-5 rounded-[12px] text-[13px] font-medium bg-error/10 text-error border border-error/20">
            {err}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2.5 px-4 py-3 mb-5 rounded-[12px] text-[13px] font-medium bg-success/10 text-success border border-success/20 animate-slide-up">
            <CheckCircle2 size={15} />
            {t('finance.settings.saved')}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('finance.settings.firstName')} icon={User} value={form.firstName} onChange={(v) => set('firstName', v)} />
          <Field label={t('finance.settings.lastName')} icon={User} value={form.lastName} onChange={(v) => set('lastName', v)} />
          <Field label={t('finance.settings.email')} icon={Mail} value={form.email} onChange={(v) => set('email', v)} />
          {/* Телефон — реальное поле (GET /users/me), но PATCH его не принимает
              (backend/src/modules/users/users.schemas.js: updateProfileSchema),
              поэтому read-only, а не выдуманное сохранение как раньше. */}
          <Field label={t('finance.settings.phone')} icon={Phone} value={me?.phone} readOnly />
        </div>

        <div className="flex justify-end mt-6">
          <button type="submit" className="btn btn-primary btn-sm gap-2" disabled={saving || isLoading}>
            {saving ? <span className="loading loading-spinner loading-xs" /> : <Save size={14} />}
            {t('finance.settings.save')}
          </button>
        </div>
      </form>

      <Card title={t('finance.settings.lang')} subtitle={t('finance.settings.langSub')} bodyClass="p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Globe size={20} />
          </span>
          <LanguageSwitcher />
        </div>
      </Card>

      <Card title={t('finance.settings.security')} subtitle={t('finance.settings.securitySub')} bodyClass="p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/10 text-warning">
            <ShieldCheck size={20} />
          </span>
          <span className="text-[13px] text-base-content/60">{form.email}</span>
        </div>
      </Card>
    </div>
  );
}
