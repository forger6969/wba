import { useState, useEffect } from 'react';
import {
  Mail, Phone, Building2, CalendarDays, ShieldCheck, KeyRound,
  Check, AlertCircle, LogOut, BookOpen, Users, Plus, X, Lock, Award,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Avatar from '../../components/Avatar.jsx';
import MyDiscipline from '../../components/MyDiscipline.jsx';
import { useMe, useMentorGroups } from '../../queries.js';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import { disconnectSocket } from '../../socket.js';

/**
 * Профиль и настройки аккаунта.
 *
 * Редактируется ровно то, что принимает бэкенд (PATCH /api/users/me):
 * имя, фамилия, email. Ничего сверх этого тут нет намеренно — поле, которое
 * некуда сохранить, хуже отсутствующего поля.
 *
 * Пароль в кабинете не меняется: у API нет такого эндпоинта, есть только
 * восстановление через код на почту. Поэтому вместо формы — честная кнопка,
 * ведущая в этот сценарий.
 */

/* Строка «иконка — подпись — значение».
   Раньше каждая такая строка несла ещё и разделитель, и серый квадрат под
   иконкой: три способа отделить одно от другого там, где хватает одного. */
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon size={16} className="text-base-content/35 shrink-0" />
      <span className="text-sm text-base-content/55 shrink-0">{label}</span>
      <span className="text-sm font-semibold ml-auto text-right truncate">{value || '—'}</span>
    </div>
  );
}

/* Грейд. Ментор его только видит: назначает админ, и это должно быть понятно
   из самой карточки, а не выясняться после неудачной попытки сохранить. */
const GRADES = {
  junior: { label: 'Junior', cls: 'bg-info/10 text-info border-info/25' },
  middle: { label: 'Middle', cls: 'bg-warning/10 text-warning border-warning/25' },
  senior: { label: 'Senior', cls: 'bg-success/10 text-success border-success/25' },
};

function GradeBadge({ grade }) {
  const { t } = useTranslation();
  const g = GRADES[grade];
  if (!g) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-base-300 text-base-content/45">
        {t('mentor.profile.gradeNotSet')}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${g.cls}`}>
      <Award size={12} /> {g.label}
    </span>
  );
}

/* Навыки тегами. Ввод по Enter или запятой: перечисляя список, человек
   печатает запятые машинально, и терять на них ввод — раздражает. */
function SkillsInput({ value, onChange, max = 20 }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const skill = raw.trim().replace(/,$/, '').trim();
    if (!skill) return;
    if (skill.length > 40) return;
    if (value.length >= max) return;
    // регистр не должен плодить «React» и «react» — бэкенд такое отклонит
    if (value.some((s) => s.toLowerCase() === skill.toLowerCase())) { setDraft(''); return; }
    onChange([...value, skill]);
    setDraft('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2.5">
        {value.length === 0 && (
          <span className="text-xs text-base-content/40 py-1">{t('mentor.profile.noSkills')}</span>
        )}
        {value.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium"
          >
            {s}
            <button
              onClick={() => onChange(value.filter((x) => x !== s))}
              className="w-5 h-5 rounded grid place-items-center hover:bg-primary/20 transition-colors"
              aria-label={t('mentor.profile.removeSkill', { skill: s })}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="input input-bordered input-sm flex-1"
          placeholder={t('mentor.profile.skillPlaceholder')}
          value={draft}
          maxLength={40}
          disabled={value.length >= max}
          onChange={(e) => {
            if (e.target.value.endsWith(',')) add(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(draft); }
            // Backspace в пустом поле убирает последний тег — привычный жест
            if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
        />
        <button
          className="btn btn-sm btn-outline gap-1"
          onClick={() => add(draft)}
          disabled={!draft.trim() || value.length >= max}
        >
          <Plus size={14} /> {t('mentor.profile.add')}
        </button>
      </div>
      <div className="text-[11px] text-base-content/40 mt-1.5">
        {t('mentor.profile.skillsHint', { count: value.length, max })}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="flex-1 text-center px-2">
      <Icon size={16} className="text-primary mx-auto" />
      <div className="text-xl font-extrabold mt-1.5 tabular-nums leading-none">{value}</div>
      <div className="text-[11px] text-base-content/45 mt-1">{label}</div>
    </div>
  );
}

export default function MentorProfile() {
  const { t, i18n } = useTranslation();
  const { token, user, logout, patchUser } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useMe();
  const me = data?.data ?? null;

  const { data: groupsData } = useMentorGroups();
  const groups = groupsData?.data ?? [];
  const studentsTotal = groups.reduce((sum, g) => sum + (g.students ?? 0), 0);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
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
    setBio(me.bio ?? '');
    setSkills(me.skills ?? []);
  }, [me]);

  const skillsChanged = me
    && JSON.stringify(skills) !== JSON.stringify(me.skills ?? []);
  const dirty = me && (
    firstName !== (me.firstName ?? '')
    || lastName !== (me.lastName ?? '')
    || email !== (me.email ?? '')
    || bio !== (me.bio ?? '')
    || skillsChanged
  );

  const validate = () => {
    if (!firstName.trim()) return t('mentor.profile.enterFirstName');
    if (!lastName.trim()) return t('mentor.profile.enterLastName');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return t('mentor.profile.invalidEmail');
    return '';
  };

  const handleSave = async () => {
    const problem = validate();
    if (problem) { setError(problem); return; }

    setSaving(true);
    setError('');
    try {
      const patch = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        bio: bio.trim(),
        skills,
      };
      await api.updateMe(token, patch);
      qc.invalidateQueries({ queryKey: ['me'] });
      // В шапке живут только имя и почта — bio/skills туда не идут.
      patchUser({ firstName: patch.firstName, lastName: patch.lastName, email: patch.email });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || t('mentor.profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!me) return;
    setFirstName(me.firstName ?? '');
    setLastName(me.lastName ?? '');
    setEmail(me.email ?? '');
    setBio(me.bio ?? '');
    setSkills(me.skills ?? []);
    setError('');
  };

  const onLogout = async () => {
    disconnectSocket();
    await logout();
    navigate('/login', { replace: true });
  };

  const fullName = `${me?.firstName ?? user?.firstName ?? ''} ${me?.lastName ?? user?.lastName ?? ''}`.trim();
  const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };
  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString(LOCALE_OF[i18n.language] || 'ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  return (
    /* Заголовок страницы убран: карточка слева и так представляет человека,
       а строка «Profil» съедала высоту, которой не хватает форме.

       Раскладка рабочего стола: маршрут помечен в Layout как full-page, здесь
       две колонки со своими границами прокрутки. Карточка личности стоит на
       месте, крутится только форма — на десктопе (lg+). Ниже lg колонки
       складываются в одну и страница скроллится целиком: на телефоне
       фиксированная карточка в пол-экрана только мешала бы. */
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5 p-4 sm:p-6 lg:p-8 overflow-y-auto lg:overflow-hidden">

      {/* ═════ Карточка личности — неподвижная ═════ */}
      <aside className="w-full lg:w-[380px] shrink-0 lg:h-full lg:overflow-y-auto">
        <div className="space-y-5">
          <section className="card bg-base-100 overflow-hidden">
            {/* Цветная шапка: аватар лежит на границе, как в привычных
                профилях — сразу задаёт, что эта карточка про человека. */}
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
                  <ShieldCheck size={11} /> {t('role.mentor')}
                </span>
                <GradeBadge grade={me?.grade} />
              </div>
              {me?.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {me.skills.slice(0, 6).map((s) => (
                    <span key={s} className="text-[11px] font-medium px-2 py-1 rounded-md bg-base-200 text-base-content/70">
                      {s}
                    </span>
                  ))}
                  {me.skills.length > 6 && (
                    <span className="text-[11px] px-2 py-1 text-base-content/45">
                      +{me.skills.length - 6}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Показатели: профиль без единой цифры выглядит анкетой,
                а не рабочим экраном. */}
            <div className="flex border-t border-base-200 py-3.5">
              <Stat icon={BookOpen} value={groups.length} label={t('mentor.profile.groupsLabel')} />
              <div className="w-px bg-base-200" />
              <Stat icon={Users} value={studentsTotal} label={t('mentor.profile.studentsLabel')} />
            </div>

            <div className="divide-y divide-base-200 border-t border-base-200">
              <InfoRow icon={Mail} label={t('mentor.profile.email')} value={me?.email ?? user?.email} />
              <InfoRow icon={Phone} label={t('mentor.profile.phone')} value={me?.phone} />
              <InfoRow icon={Building2} label={t('mentor.profile.branch')} value={me?.branchName} />
              <InfoRow icon={CalendarDays} label={t('mentor.profile.registered')} value={formatDate(me?.createdAt)} />
            </div>
          </section>
        </div>
      </aside>

      {/* ═════ Настройки — единственная прокручиваемая область ═════ */}
      <div className="flex-1 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1">
        <div className="space-y-5">
          <section className="card bg-base-100">
            <header className="px-5 py-4 border-b border-base-200">
              <h2 className="font-bold">{t('mentor.profile.personalData')}</h2>
              <p className="text-xs text-base-content/45 mt-0.5">
                {t('mentor.profile.personalDataHint')}
              </p>
            </header>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="form-control">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5">{t('mentor.profile.firstName')}</span>
                <input
                  className="input input-bordered"
                  value={firstName}
                  maxLength={80}
                  onChange={(e) => { setFirstName(e.target.value); setError(''); }}
                  disabled={isLoading}
                />
              </label>
              <label className="form-control">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5">{t('mentor.profile.lastName')}</span>
                <input
                  className="input input-bordered"
                  value={lastName}
                  maxLength={80}
                  onChange={(e) => { setLastName(e.target.value); setError(''); }}
                  disabled={isLoading}
                />
              </label>
              <label className="form-control sm:col-span-2">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5">{t('mentor.profile.email')}</span>
                <input
                  type="email"
                  className="input input-bordered"
                  value={email}
                  maxLength={160}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={isLoading}
                />
                <span className="text-[11px] text-base-content/45 mt-1.5">
                  {t('mentor.profile.emailHint')}
                </span>
              </label>

              {/* ── Профессиональная часть ── */}
              <div className="sm:col-span-2 border-t border-base-200 pt-4 mt-1">
                <h3 className="text-sm font-bold">{t('mentor.profile.professionalInfo')}</h3>
                <p className="text-xs text-base-content/45 mt-0.5">
                  {t('mentor.profile.professionalHint')}
                </p>
              </div>

              <label className="form-control sm:col-span-2">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5">
                  {t('mentor.profile.about')}
                </span>
                <textarea
                  className="textarea textarea-bordered min-h-[104px] leading-relaxed"
                  placeholder={t('mentor.profile.aboutPlaceholder')}
                  value={bio}
                  maxLength={1000}
                  onChange={(e) => { setBio(e.target.value); setError(''); }}
                  disabled={isLoading}
                />
                <span className="text-[11px] text-base-content/40 mt-1.5 text-right tabular-nums">
                  {bio.length}/1000
                </span>
              </label>

              <div className="form-control sm:col-span-2">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5">
                  {t('mentor.profile.skills')}
                </span>
                <SkillsInput
                  value={skills}
                  onChange={(next) => { setSkills(next); setError(''); }}
                />
              </div>

              {/* Грейд — только чтение. Показываем прямо в форме и объясняем
                  почему: поле, которое нельзя изменить, без объяснения
                  выглядит сломанным. */}
              <div className="form-control sm:col-span-2">
                <span className="text-xs font-semibold text-base-content/55 mb-1.5 flex items-center gap-1.5">
                  <Lock size={11} /> {t('mentor.profile.grade')}
                </span>
                <div className="flex items-center gap-3 flex-wrap px-3.5 py-3 rounded-lg bg-base-200/50 border border-base-200">
                  <GradeBadge grade={me?.grade} />
                  <span className="text-xs text-base-content/50">
                    {t('mentor.profile.gradeHint')}
                  </span>
                </div>
              </div>
            </div>

            {/* Панель действий прижата к низу карточки полосой-разделителем.
                Раньше кнопка висела в пустоте под формой, оторванная от неё. */}
            <footer className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-base-200 bg-base-200/30 rounded-b-2xl min-h-[60px]">
              <span className="text-xs">
                {error ? (
                  <span className="flex items-center gap-1.5 text-error font-medium">
                    <AlertCircle size={14} /> {error}
                  </span>
                ) : saved ? (
                  <span className="flex items-center gap-1.5 text-success font-semibold">
                    <Check size={14} /> {t('mentor.profile.saved')}
                  </span>
                ) : dirty ? (
                  <span className="text-base-content/50">{t('mentor.profile.unsavedChanges')}</span>
                ) : null}
              </span>

              <span className="flex items-center gap-2 shrink-0">
                {dirty && (
                  <button className="btn btn-ghost btn-sm" onClick={reset} disabled={saving}>
                    {t('mentor.profile.cancel')}
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm gap-1.5"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                >
                  {saving ? <span className="loading loading-spinner loading-xs" /> : <Check size={15} />}
                  {t('mentor.profile.save')}
                </button>
              </span>
            </footer>
          </section>

          <section className="card bg-base-100">
            <header className="px-5 py-4 border-b border-base-200">
              <h2 className="font-bold">{t('mentor.profile.security')}</h2>
            </header>

            <div className="divide-y divide-base-200">
              <div className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <KeyRound size={15} className="text-base-content/40" /> {t('mentor.profile.password')}
                  </div>
                  <p className="text-xs text-base-content/50 mt-1 max-w-md">
                    {t('mentor.profile.passwordHint')}
                  </p>
                </div>
                <button
                  className="btn btn-outline btn-sm shrink-0"
                  onClick={() => navigate('/login?reset=1')}
                >
                  {t('mentor.profile.resetPassword')}
                </button>
              </div>

              {/* Выход — тоже про доступ к аккаунту, поэтому живёт здесь, а не
                  красной кнопкой во всю ширину под карточкой профиля. */}
              <div className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <LogOut size={15} className="text-base-content/40" /> {t('mentor.profile.endSession')}
                  </div>
                  <p className="text-xs text-base-content/50 mt-1">
                    {t('mentor.profile.endSessionHint')}
                  </p>
                </div>
                <button className="btn btn-outline btn-error btn-sm shrink-0" onClick={onLogout}>
                  {t('mentor.profile.logout')}
                </button>
              </div>
            </div>
          </section>

          {/* K-DISC-FRONT: свои взыскания + устав, только просмотр */}
          <MyDiscipline />
        </div>
      </div>
    </div>
  );
}
