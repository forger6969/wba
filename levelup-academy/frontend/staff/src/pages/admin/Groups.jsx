import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Archive, ArchiveRestore, ChevronRight, Users, User, FolderOpen, LayoutGrid, List, Download, Clock, Pencil, CalendarDays, KeyRound, UserPlus, Copy, Check, BellRing } from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { useAdminGroups, useAdminMentors, useAdminSettings, useAdminTrainingTypes } from '../../queries.js';
import { api } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import ExportDialog from '../../components/ExportDialog.jsx';
import { Avatar, EmptyState, Kpi, RowSkeleton, SearchInput, Tip, Modal } from '../mentor/_ui.jsx';

const isArchived = (g) => g.isArchived ?? g.is_archived ?? false;
const MAX_STUDENTS = 15;
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };
const dayLabelsFor = (locale) => Object.fromEntries(
  DAYS.map((key, i) => [key, new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })]),
);

const PRESETS = [
  { label: '1-3-5', days: ['mon', 'wed', 'fri'] },
  { label: '2-4-6', days: ['tue', 'thu', 'sat'] },
];

// subject/monthlyPrice больше не вводятся руками — приходят из методики
// (training_type), которую CEO уже оценил (Karis, 08.08.2026): методист
// заводит методику -> CEO ставит цену -> только тогда она доступна здесь.
// trainingTypeId — единственное, что выбирает admin/branch_manager.
const emptyForm = { name: '', trainingTypeId: '', room: '', mentorId: '', days: [], startTime: '', showCustomDays: false };

/** Вычисляет время конца урока: "15:00" + 80 мин → "16:20" */
function calcEndTime(startTime, durationMin) {
  if (!startTime || !durationMin) return null;
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + Number(durationMin);
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

/* ─── Task 4: свободные часы ментора (08:00–20:00, шаг 30 мин) ─── */
const SLOT_WINDOW = { start: 8 * 60, end: 20 * 60 }; // 08:00–20:00
const SLOT_STEP = 30;

function toMin(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}
function toHM(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** Все кандидаты-старты в окне 08:00–20:00 (последний урок должен успеть закончиться) */
function candidateStarts(durationMin) {
  const out = [];
  for (let m = SLOT_WINDOW.start; m + durationMin <= SLOT_WINDOW.end; m += SLOT_STEP) out.push(toHM(m));
  return out;
}

/** Свободен ли слот [start, start+duration) в конкретный день (без пересечения с занятыми) */
function isSlotFree(day, start, durationMin, busy) {
  const cStart = toMin(start);
  const cEnd = cStart + durationMin;
  const occ = busy[day] || [];
  return !occ.some((o) => cStart < toMin(o.end) && cEnd > toMin(o.start));
}

/* ─── Task 4: автоподсчёт даты окончания модуля (превью) ─── */
const DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const modulesFor = (t) => [
  { label: t('admin.groups.module1'), value: 1 },
  { label: t('admin.groups.module3'), value: 3 },
  { label: t('admin.groups.module6'), value: 6 },
];

/** Ближайшая дата урока (если день = сегодня и время ещё не прошло — сегодня, иначе следующая неделя) */
function nextLessonDate(dayCode, startTime) {
  const now = new Date();
  const d = new Date(now);
  const target = DAY_INDEX[dayCode];
  let diff = (target - d.getDay() + 7) % 7;
  if (diff === 0 && startTime) {
    const [h, m] = startTime.split(':').map(Number);
    const lessonAt = new Date(now);
    lessonAt.setHours(h, m, 0, 0);
    if (lessonAt <= now) diff = 7; // урок сегодня уже прошёл → следующая неделя
  }
  d.setDate(d.getDate() + diff);
  return d;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function fmtDate(d, locale = 'ru-RU') {
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ═══════════════ Group Card ═══════════════ */
function GroupCard({ g, onEdit, onArchive, onOpen, isExpanded, students = [] }) {
  const { t } = useTranslation();
  const archived = isArchived(g);
  const studentsCount = Number(g.students ?? g.studentsCount ?? g.students_count ?? 0);
  const mentorName = g.mentor?.name || g.mentorName || null;
  const full = studentsCount >= MAX_STUDENTS;

  return (
    <div
      className={`card bg-base-100 p-5 card-hover-premium hover:border-primary/40 group relative block cursor-pointer select-none ${archived ? 'opacity-60' : ''}`}
      onClick={() => onOpen && onOpen(g)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${archived ? 'bg-base-200 text-base-content/45' : 'bg-primary/10 text-primary'}`}>
            <FolderOpen size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold text-base-content group-hover:text-primary transition-colors flex items-center gap-1 truncate">
              {g.name}
              <ChevronRight size={14} className={`shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`} />
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-0.5 ${archived ? 'bg-base-200 text-base-content/45' : 'bg-success/10 text-success'}`}>
              {archived ? t('admin.groups.archived') : t('admin.groups.active')}
            </span>
          </div>
        </div>
        {/* Action buttons — grouped, pinned to the right edge of the card */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Edit button — stops propagation so click doesn't navigate */}
          {!archived && onEdit && (
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center text-base-content/45 hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(g); }}
              title={t('admin.groups.editGroupTooltip')}
            >
              <Pencil size={13} />
            </button>
          )}
          {!archived && (
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center text-base-content/45 hover:text-warning hover:bg-warning/10 transition-all opacity-0 group-hover:opacity-100"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(g); }}
              title={t('admin.groups.archiveTooltip')}
            >
              <Archive size={13} />
            </button>
          )}
          {archived && (
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center text-base-content/45 hover:text-success hover:bg-success/10 transition-all opacity-0 group-hover:opacity-100"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(g); }}
              title={t('admin.groups.restoreTooltip')}
            >
              <ArchiveRestore size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-[12px]">
        {mentorName && (
          <span className="flex items-center gap-1.5 text-base-content/70 min-w-0">
            <User size={12} className="text-base-content/45 shrink-0" />
            <span className="truncate">{mentorName}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5 text-base-content/70 shrink-0">
          <Users size={12} className="text-base-content/45" />
          {t('admin.groups.studentsOfMax', { count: studentsCount, max: MAX_STUDENTS })}
        </span>
        {g.startTime && (
          <span className="flex items-center gap-1.5 text-base-content/70 shrink-0">
            <Clock size={12} className="text-base-content/45" />
            {g.startTime}{g.endTime ? `–${g.endTime}` : ''}
          </span>
        )}
      </div>

      {/* Полоса заполнения */}
      <div className="mt-3">
        <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              full ? 'bg-error' : studentsCount >= MAX_STUDENTS * 0.75 ? 'bg-warning' : 'bg-success'
            }`}
            style={{ width: `${Math.min(100, (studentsCount / MAX_STUDENTS) * 100)}%` }}
          />
        </div>
      </div>

      {/* Expandable student list */}
      <div className={`mt-3 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        {isExpanded && (
          <div className="space-y-2 pt-2 border-t border-base-200">
            {students.length > 0 ? (
              students.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-base-200 transition-colors">
                  <Avatar name={[s.firstName || '', s.lastName || ''].filter(Boolean).join(' ')} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-base-content truncate">
                      {[s.firstName || '', s.lastName || ''].filter(Boolean).join(' ')}
                    </div>
                    <div className="text-xs text-base-content/50 truncate">
                      {s.phone || s.loginCode || '—'}
                    </div>
                  </div>
                  {s.status === 'frozen' && (
                    <span className="badge badge-warning badge-xs">{t('status.frozen')}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-base-content/45 text-sm">
                {t('admin.groups.noStudentsYet')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ Group Form Modal ═══════════════ */
/* Экспортируется: переиспользуется в GroupDetail.jsx (кнопка «Редактировать»). */
export function GroupFormModal({ open, onClose, mentors, lessonDurationMin, initial, onSave, token, groups, trainingTypes = [] }) {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const DAY_LABEL = dayLabelsFor(locale);
  const MODULES = modulesFor(t);
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(initial ?? emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Task 4: свободные часы ментора
  const [busySlots, setBusySlots] = useState({});   // { day: [{ start, end }] }
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [moduleMonths, setModuleMonths] = useState(3);
  const [showStudent, setShowStudent] = useState(false);
  const [student, setStudent] = useState({ firstName: '', lastName: '', phone: '' });
  const [creds, setCreds] = useState(null);          // { loginCode, password } после создания ученика
  const [copied, setCopied] = useState('');

  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  const durationMin = Number(lessonDurationMin) || 80;
  const selectedTrainingType = trainingTypes.find((t) => t.id === form.trainingTypeId);

  // При смене ментора — тянем расписания его групп и строим карту занятости
  useEffect(() => {
    if (!open) return;
    if (isEdit || !form.mentorId) {
      setBusySlots({});
      setSlotsError('');
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError('');
    setBusySlots({});

    const myGroups = (groupsRef.current || []).filter(
      (g) => g.mentor && String(g.mentor.id) === String(form.mentorId)
    );

    if (myGroups.length === 0) {
      setSlotsLoading(false);
      return;
    }

    Promise.allSettled(myGroups.map((g) => api.adminGroupDetail(token, g.id)))
      .then((results) => {
        if (cancelled) return;
        const busy = {};
        let failed = false;
        results.forEach((r) => {
          if (r.status !== 'fulfilled') { failed = true; return; }
          const detail = r.value?.data || r.value;
          const schedule = detail?.schedule || detail?.group?.schedule || [];
          (Array.isArray(schedule) ? schedule : []).forEach((s) => {
            const day = String(s.day).toLowerCase();
            if (s.start && s.end) (busy[day] = busy[day] || []).push({ start: s.start, end: s.end });
          });
        });
        if (failed && Object.keys(busy).length === 0) setSlotsError(t('admin.groups.scheduleLoadFailed'));
        setBusySlots(busy);
      })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, form.mentorId, token]);

  // Task 4: свободные слоты = пересечение по всем выбранным дням
  const freeSlots = useMemo(() => {
    if (isEdit || !form.mentorId || !form.days?.length) return null;
    if (Object.keys(busySlots).length === 0 && slotsLoading) return null;
    const starts = candidateStarts(durationMin);
    return starts.filter((s) => form.days.every((d) => isSlotFree(d, s, durationMin, busySlots)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, form.mentorId, form.days, busySlots, slotsLoading, durationMin]);

  // Reset form when modal opens
  if (!open) return null;

  const endPreview = calcEndTime(form.startTime, durationMin);

  // Есть ли хоть один свободный слот в конкретный день (для точки на кнопке дня)
  const dayHasSlots = (day) => {
    if (Object.keys(busySlots).length === 0 && !slotsLoading) return true; // нет данных → не блокируем
    const starts = candidateStarts(durationMin);
    return starts.some((s) => isSlotFree(day, s, durationMin, busySlots));
  };

  // Task 4: автодата окончания модуля (первый выбранный день + moduleMonths)
  const modulePreview = (() => {
    if (isEdit || !form.days?.length) return null;
    const firstDay = form.days[0];
    const firstDate = nextLessonDate(firstDay, form.startTime);
    const lastDate = addMonths(firstDate, moduleMonths);
    return { firstDate, lastDate };
  })();

  const setDays = (days) => setForm((f) => ({ ...f, days }));
  const toggleDay = (d) => setDays(
    form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d]
  );
  const applyPreset = (preset) => {
    setDays(preset.days);
    setForm((f) => ({ ...f, showCustomDays: false }));
  };
  const activePreset = PRESETS.find((p) => JSON.stringify([...p.days].sort()) === JSON.stringify([...form.days].sort()))?.label;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  const submit = async () => {
    setErr('');
    if (!form.name.trim()) return setErr(t('admin.groups.enterGroupName'));
    if (!form.trainingTypeId) return setErr(t('admin.groups.selectDirection'));
    if (!form.mentorId) return setErr(t('admin.groups.selectMentorRequired'));
    if (!form.days || form.days.length === 0) return setErr(t('admin.groups.selectAtLeastOneDay'));
    if (!form.startTime) return setErr(t('admin.groups.specifyStartTime'));
    if (!isEdit && !slotsLoading && freeSlots && freeSlots.length === 0 && Object.keys(busySlots).length > 0) {
      return setErr(t('admin.groups.noFreeSlots'));
    }

    // transform for backend — send only what schema expects. subject/monthlyPrice
    // backend подставляет сам из training_type (не доверяем клиенту, см. admin.service.createGroup).
    const payload = {
      name: form.name.trim(),
      trainingTypeId: form.trainingTypeId,
      mentorId: form.mentorId,
      days: form.days,
      startTime: form.startTime,
    };
    // room is optional — only send if filled
    if (form.room?.trim()) payload.room = form.room.trim();

    setBusy(true);
    try {
      const created = await onSave(payload); // возвращает созданную группу

      // Task 4: новый ученик — создаём сразу в эту группу
      if (!isEdit && showStudent && student.firstName?.trim()) {
        const groupId = created?.id || created?.data?.id;
        if (groupId) {
          const res = await api.adminCreateStudent(token, {
            firstName: student.firstName.trim(),
            lastName: student.lastName.trim(),
            phone: student.phone?.trim() || undefined,
            groupId,
          });
          const r = res?.data || res;
          const stu = r?.student || r;
          setCreds({ loginCode: stu.loginCode || stu.login_code || '', password: stu.password || '' });
          return; // не закрываем — показываем логин-код/пароль
        }
      }
      onClose();
    } catch (e) {
      setErr(e.message || t('admin.groups.genericError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      boxClass="max-w-md p-6 max-h-[92vh] overflow-y-auto"
      title={creds ? t('admin.groups.studentCreatedTitle') : (isEdit ? t('admin.groups.editGroupTitle') : t('admin.groups.newGroupTitle'))}
      actions={creds ? (
        <button className="btn btn-primary rounded-lg w-full" onClick={onClose}>{t('admin.groups.done')}</button>
      ) : (
        <>
          <button className="btn btn-ghost rounded-lg" onClick={onClose} disabled={busy}>{t('admin.groups.cancel')}</button>
          <button className="btn btn-primary rounded-lg" onClick={submit} disabled={busy || !form.name || !form.mentorId}>
            {busy && <span className="loading loading-spinner loading-xs" />}
            {isEdit ? t('admin.groups.saveChanges') : t('admin.groups.createGroup')}
          </button>
        </>
      )}
    >
      {err && <div className="alert alert-error mb-4 py-2 text-sm rounded-lg">{err}</div>}

        {/* Ученик создан — показываем логин-код и пароль */}
        {creds ? (
          <div className="animate-fade-in">
            <div className="rounded-2xl border border-success/30 bg-success/5 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-success/15 text-success flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm text-base-content">{t('admin.groups.studentCreatedHeadline')}</p>
                  <p className="text-xs text-base-content/60">{t('admin.groups.studentCreatedHint')}</p>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                {[
                  { label: t('admin.groups.loginCode'), value: creds.loginCode, field: 'code' },
                  { label: t('admin.groups.password'), value: creds.password, field: 'pass' },
                ].map((row) => (
                  <div key={row.field} className="flex items-center justify-between bg-base-100 border border-base-300 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <KeyRound size={14} className="text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-base-content/50 font-bold">{row.label}</p>
                        <p className="font-mono font-bold text-[15px] text-base-content truncate">{row.value}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs rounded-lg"
                      onClick={() => copyToClipboard(row.value, row.field)}
                    >
                      {copied === row.field ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                      {copied === row.field ? t('admin.groups.copied') : t('admin.groups.copy')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
        <>
        <div className="space-y-4">
          {/* Название */}
          <label className="form-control">
            <span className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">
              {t('admin.groups.groupNameLabel')} <span className="text-error">*</span>
            </span>
            <input
              className="input input-bordered w-full rounded-lg"
              placeholder={t('admin.groups.groupNamePlaceholder')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          {/* Направление — методика с ценой от CEO (методист создаёт -> CEO оценивает -> появляется здесь) */}
          <label className="form-control">
            <span className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">
              {t('admin.groups.directionLabel')} <span className="text-error">*</span>
            </span>
            <select
              className="select select-bordered w-full rounded-lg"
              value={form.trainingTypeId}
              onChange={(e) => setForm({ ...form, trainingTypeId: e.target.value })}
            >
              <option value="">{t('admin.groups.selectDirectionOption')}</option>
              {trainingTypes.map((tt) => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
            </select>
            {trainingTypes.length === 0 ? (
              <span className="text-[10px] text-warning mt-1">
                {t('admin.groups.noEvaluatedDirections')}
              </span>
            ) : (
              <span className="text-[10px] text-base-content/40 mt-1">
                {t('admin.groups.priceSetByCeo')}
              </span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="form-control">
              <span className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">
                {t('admin.groups.priceLabel')}
              </span>
              <div className="input input-bordered w-full rounded-lg flex items-center text-base-content/70">
                {selectedTrainingType ? `${Number(selectedTrainingType.price).toLocaleString(locale)}` : '—'}
              </div>
            </label>
            <label className="form-control">
              <span className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">
                {t('admin.groups.roomLabel')}
              </span>
              <input
                className="input input-bordered w-full rounded-lg"
                placeholder={t('admin.groups.roomPlaceholder')}
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
              />
            </label>
          </div>

          {/* Ментор — ОБЯЗАТЕЛЬНО */}
          <label className="form-control">
            <span className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">
              {t('admin.groups.mentorLabel')} <span className="text-error">*</span>
            </span>
            <select
              className="select select-bordered w-full rounded-lg"
              value={form.mentorId}
              onChange={(e) => setForm({ ...form, mentorId: e.target.value, startTime: '' })}
            >
              <option value="">{t('admin.groups.selectMentorOption')}</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  {[m.firstName || m.first_name, m.lastName || m.last_name].filter(Boolean).join(' ')}
                </option>
              ))}
            </select>
            {mentors.length === 0 && (
              <span className="text-xs text-warning mt-1">{t('admin.groups.noMentors')}</span>
            )}
            {!isEdit && form.mentorId && (
              <span className="text-xs text-base-content/50 mt-1 flex items-center gap-1">
                {slotsLoading ? (
                  <><span className="loading loading-spinner loading-xs text-primary" /> {t('admin.groups.loadingMentorSchedule')}</>
                ) : slotsError ? (
                  <span className="text-warning">{slotsError} — {t('admin.groups.enterTimeManually')}</span>
                ) : (
                  <>{t('admin.groups.mentorScheduleLoaded')}</>
                )}
              </span>
            )}
          </label>

          {/* Дни занятий */}
          <div className="bg-base-200/50 p-4 rounded-xl border border-base-200">
            <span className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-2 block">
              {t('admin.groups.lessonDaysLabel')}
            </span>

            {/* Быстрые пресеты */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`btn btn-sm rounded-lg flex-1 ${activePreset === p.label ? 'btn-primary' : 'btn-outline bg-base-100'}`}
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                className={`btn btn-sm rounded-lg flex-1 ${form.showCustomDays ? 'btn-neutral' : 'btn-outline bg-base-100'}`}
                onClick={() => setForm((f) => ({ ...f, showCustomDays: !f.showCustomDays, days: f.showCustomDays ? [] : f.days }))}
              >
                {t('admin.groups.otherDaysBtn')}
              </button>
            </div>

            {/* Кастомные галочки */}
            {form.showCustomDays && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-base-300">
                {DAYS.map((d) => {
                  const active = form.days.includes(d);
                  const free = !isEdit && form.mentorId ? dayHasSlots(d) : true;
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`btn btn-xs rounded-md ${active ? 'btn-primary' : 'btn-ghost bg-base-100 border border-base-300'}`}
                      onClick={() => toggleDay(d)}
                    >
                      {DAY_LABEL[d]}
                      {!isEdit && form.mentorId && (
                        <span className={`ml-0.5 w-1.5 h-1.5 rounded-full ${free ? 'bg-success' : 'bg-error'}`} title={free ? t('admin.groups.hasFreeTime') : t('admin.groups.dayBusy')} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Выбранные дни — показать если не custom */}
            {!form.showCustomDays && form.days.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.days.map((d) => (
                  <span key={d} className="badge badge-primary badge-sm font-semibold">{DAY_LABEL[d]}</span>
                ))}
              </div>
            )}
          </div>

          {/* Время начала */}
          <div className="bg-base-200/50 p-4 rounded-xl border border-base-200">
            <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-2 block">
              {t('admin.groups.startTimeLabel')}
            </label>

            {/* Task 4: свободные слоты ментора (только для новой группы) */}
            {!isEdit && form.mentorId && !slotsError && (
              form.days.length === 0 ? (
                <p className="text-xs text-base-content/50 mb-3">{t('admin.groups.selectDaysFirst')}</p>
              ) : slotsLoading ? (
                <div className="flex items-center gap-2 text-xs text-base-content/60 py-2">
                  <span className="loading loading-spinner loading-xs text-primary" />
                  {t('admin.groups.searchingFreeTime')}
                </div>
              ) : (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-base-content/50 font-bold">
                      {t('admin.groups.freeHours', { start: SLOT_WINDOW.start / 60, end: SLOT_WINDOW.end / 60 })}
                    </span>
                    <span className="text-[10px] text-base-content/40">{t('admin.groups.lessonMinutes', { min: durationMin })}</span>
                  </div>
                  {freeSlots && freeSlots.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                      {freeSlots.map((s) => {
                        const active = form.startTime === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            className={`py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                              active
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-base-100 border-base-300 text-base-content/70 hover:border-primary/50 hover:text-primary'
                            }`}
                            onClick={() => setForm({ ...form, startTime: s })}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  ) : Object.keys(busySlots).length > 0 ? (
                    <div className="alert alert-warning py-2 px-3 text-xs rounded-lg mb-2">
                      {t('admin.groups.noCommonFreeTime')}
                    </div>
                  ) : (
                    <p className="text-xs text-base-content/50">{t('admin.groups.noScheduleData')}</p>
                  )}
                </div>
              )
            )}

            <input
              className="input input-bordered w-full rounded-lg"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
            {endPreview && (
              <div className="mt-3 flex items-center justify-between bg-primary/5 px-3 py-2 rounded-lg border border-primary/10">
                <span className="text-xs font-medium text-base-content/70 flex items-center gap-1.5">
                  <Clock size={13} className="text-primary" />
                  {t('admin.groups.endLabel')}
                </span>
                <span className="text-sm font-bold text-primary">
                  {endPreview}
                  {durationMin && <span className="text-[10px] font-normal text-primary/60 ml-1">{t('admin.groups.minutesShort', { min: durationMin })}</span>}
                </span>
              </div>
            )}
          </div>

          {/* Task 4: модуль + автодата окончания */}
          {!isEdit && modulePreview && (
            <div className="bg-base-200/50 p-4 rounded-xl border border-base-200">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider block">
                  {t('admin.groups.moduleLabel')}
                </label>
                <select
                  className="select select-bordered select-sm rounded-lg text-sm"
                  value={moduleMonths}
                  onChange={(e) => setModuleMonths(Number(e.target.value))}
                >
                  {MODULES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex items-center gap-2.5 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2.5">
                <CalendarDays size={15} className="text-primary shrink-0" />
                <div className="text-xs text-base-content/70">
                  <span className="font-semibold text-base-content">
                    {fmtDate(modulePreview.firstDate, locale)}
                  </span>
                  {' — '}
                  <span className="font-semibold text-primary">
                    {fmtDate(modulePreview.lastDate, locale)}
                  </span>
                  <span className="text-base-content/50">{t('admin.groups.moduleMonthsSuffix', { n: moduleMonths })}</span>
                </div>
              </div>
              <p className="text-[10px] text-base-content/40 mt-1.5">{t('admin.groups.endDatePreliminary')}</p>
            </div>
          )}

          {/* Task 4: новый ученик в этой группе */}
          {!isEdit && (
            <div className="border border-base-300 rounded-xl overflow-hidden">
              <button
                type="button"
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors ${showStudent ? 'bg-primary/5 text-primary' : 'bg-base-100 text-base-content/70 hover:bg-base-200/60'}`}
                onClick={() => setShowStudent(!showStudent)}
              >
                <span className="flex items-center gap-2">
                  <UserPlus size={15} />
                  {t('admin.groups.addNewStudentToggle')}
                </span>
                <span className={`transition-transform ${showStudent ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {showStudent && (
                <div className="p-4 space-y-3 bg-base-100 border-t border-base-300 animate-fade-in">
                  <p className="text-[10px] uppercase tracking-wider text-base-content/50 font-bold">
                    {t('admin.groups.studentWillBeCreated')}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="form-control">
                      <span className="text-[11px] font-bold text-base-content/70 mb-1 block">{t('admin.groups.firstNameLabel')} <span className="text-error">*</span></span>
                      <input
                        className="input input-bordered input-sm rounded-lg w-full"
                        placeholder="Азиза"
                        value={student.firstName}
                        onChange={(e) => setStudent({ ...student, firstName: e.target.value })}
                      />
                    </label>
                    <label className="form-control">
                      <span className="text-[11px] font-bold text-base-content/70 mb-1 block">{t('admin.groups.lastNameLabel')}</span>
                      <input
                        className="input input-bordered input-sm rounded-lg w-full"
                        placeholder="Рахимова"
                        value={student.lastName}
                        onChange={(e) => setStudent({ ...student, lastName: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="form-control">
                    <span className="text-[11px] font-bold text-base-content/70 mb-1 block">{t('admin.groups.phoneLabel')}</span>
                    <input
                      className="input input-bordered input-sm rounded-lg w-full"
                      placeholder="+998 90 123 45 67"
                      value={student.phone}
                      onChange={(e) => setStudent({ ...student, phone: e.target.value })}
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
        </>
        )}
    </Modal>
  );
}

/* ═══════════════ Main Groups ═══════════════ */
export default function AdminGroups() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, error, refetch } = useAdminGroups();
  const { data: mentorsData } = useAdminMentors();
  const { data: settingsData } = useAdminSettings();
  const { data: trainingTypesData } = useAdminTrainingTypes();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // по умолчанию таблица (Karis, 08.08.2026)
  const [showExport, setShowExport] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [groupStudents, setGroupStudents] = useState({});
  // Archive confirm modal — asks for a reason before archiving
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiving, setArchiving] = useState(false);

  // Auto-open the create modal when arriving from Dashboard «Новая группа»
  // (navigate('/groups', { state: { openCreate: true } })). State is cleared
  // so a browser refresh doesn't re-open the modal.
  useEffect(() => {
    if (location.state?.openCreate) {
      setForm({ ...emptyForm });
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGroupStudents = async (groupId) => {
    if (groupStudents[groupId]) return;
    try {
      // Отдельного GET /admin/groups/:id/students нет ни в api.js, ни в бэкенде:
      // список учеников приходит внутри GET /admin/groups/:id (groupDetail) —
      // раньше здесь был вызов несуществующего api.adminGroupStudents → TypeError.
      const res = await api.adminGroupDetail(token, groupId);
      const students = res?.data?.students || res?.students || res?.data?.group?.students || res?.group?.students || [];
      setGroupStudents(prev => ({ ...prev, [groupId]: students }));
    } catch (e) {
      console.error('Group students fetch error:', e);
      setGroupStudents(prev => ({ ...prev, [groupId]: [] }));
    }
  };

  const toggleGroupExpand = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
      fetchGroupStudents(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const raw = data?.data || data || {};
  const rows = raw.groups || (Array.isArray(raw) ? raw : []);
  const mraw = mentorsData?.data || mentorsData || {};
  const mentors = mraw.mentors || (Array.isArray(mraw) ? mraw : []);
  const lessonDurationMin = settingsData?.lessonDurationMin ?? settingsData?.data?.lessonDurationMin ?? null;
  const ttRaw = trainingTypesData?.data || trainingTypesData || {};
  const trainingTypes = ttRaw.trainingTypes || (Array.isArray(ttRaw) ? ttRaw : []);

  const activeGroups = rows.filter((g) => !isArchived(g)).length;
  const archivedGroups = rows.filter((g) => isArchived(g)).length;
  const totalStudents = rows.reduce((s, g) => s + Number(g.students ?? g.studentsCount ?? g.students_count ?? 0), 0);
  const filteredRows = search
    ? rows.filter(g => g.name?.toLowerCase().includes(search.toLowerCase()) || g.mentor?.name?.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const openCreate = () => setForm({ ...emptyForm });
  const openEdit = (g) => {
    const scheduleDays = g.schedule?.map(s => String(s.day).toLowerCase()) || [];
    const initialDays = g.days?.length > 0 ? g.days : scheduleDays;
    setForm({
      id: g.id,
      name: g.name || '',
      trainingTypeId: g.trainingTypeId || g.training_type_id || '',
      room: g.room || '',
      mentorId: g.mentor?.id || g.mentorId || '',
      days: initialDays,
      startTime: g.startTime || g.start_time || '',
      showCustomDays: initialDays.length > 0 && !PRESETS.some(p => JSON.stringify([...p.days].sort()) === JSON.stringify([...initialDays].sort())),
    });
  };

  const handleSave = async (payload) => {
    const res = payload.id
      ? await api.adminUpdateGroup(token, payload.id, payload)
      : await api.adminCreateGroup(token, payload);
    refetch();
    return res; // возвращаем созданную группу — нужна для привязки нового ученика
  };

  const handleArchiveClick = (g) => {
    // Restore (unarchive) — no reason needed, direct confirm
    if (isArchived(g)) {
      if (!window.confirm(t('admin.groups.confirmRestore', { name: g.name }))) return;
      api.adminUnarchiveGroup(token, g.id)
        .then(() => refetch())
        .catch((e) => alert(e.message || t('admin.groups.genericError')));
      return;
    }
    // Archive — ask for a reason in a modal
    setArchiveReason('');
    setArchiveTarget(g);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.adminArchiveGroup(token, archiveTarget.id, archiveReason.trim() || undefined);
      refetch();
      setArchiveTarget(null);
    } catch (e) {
      alert(e.message || t('admin.groups.genericError'));
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title={t('admin.groups.title')} subtitle={t('admin.groups.subtitle')}>
        <button className="btn btn-ghost btn-sm gap-1.5" onClick={() => setShowExport(true)} disabled={filteredRows.length === 0}>
          <Download size={14} /> {t('admin.groups.export')}
        </button>
        <button className="btn btn-primary btn-sm gap-1" onClick={openCreate}>
          <Plus size={16} /> {t('admin.groups.createGroup')}
        </button>
      </PageHeader>

      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi Icon={FolderOpen} title={t('admin.mentors.total')} value={rows.length}  tone="neutral" />
        <Kpi Icon={Users} title={t('status.active')} value={activeGroups}  tone="success" />
        <Kpi Icon={Archive} title={t('admin.groups.archived')} value={archivedGroups}  tone="warning" />
      </div>

      {/* ═══ Search + View Toggle ═══ */}
      {rows.length > 0 && (
        <div className="flex items-center gap-3 animate-fade-in stagger-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('admin.groups.searchPlaceholder')}
            className="flex-1"
          />
          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 rounded-[12px] bg-base-100 border border-base-300">
            <button
              onClick={() => setViewMode('card')}
              className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all ${viewMode === 'card' ? 'bg-primary/10 text-primary' : 'text-base-content/45 hover:text-base-content'}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all ${viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-base-content/45 hover:text-base-content'}`}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Group List ═══ */}
      {isLoading ? (
        <RowSkeleton count={4} />
      ) : error ? (
        <div className="alert alert-error mt-4">{t('admin.groups.loadError', { message: error.message })}</div>
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={search ? t('admin.groups.emptySearchTitle') : t('admin.groups.emptyTitle')}
          hint={search ? undefined : t('admin.groups.emptyHint')}
          action={!search ? (
            <button className="btn btn-primary btn-sm gap-1" onClick={openCreate}>
              <Plus size={14} /> {t('admin.groups.create')}
            </button>
          ) : undefined}
        />
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRows.map((g) => (
            <GroupCard key={g.id} g={g} onEdit={openEdit} onArchive={handleArchiveClick} onOpen={(grp) => navigate(`/groups/${grp.id}`)} isExpanded={expandedGroups.has(g.id)} students={groupStudents[g.id] ?? []} />
          ))}
        </div>
      ) : (
        /* Table view */
        <div className="card bg-base-100 overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="table w-full text-[13px]">
              <thead>
                <tr>
                  <th>{t('admin.groups.colName')}</th>
                  <th>{t('admin.groups.colMentor')}</th>
                  <th>{t('admin.groups.colStudents')}</th>
                  <th>{t('admin.groups.colSchedule')}</th>
                  <th>{t('admin.groups.colStatus')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((g) => {
                  const archived = isArchived(g);
                  const count = Number(g.students ?? g.studentsCount ?? g.students_count ?? 0);
                  return (
                    <tr key={g.id} className="hover:bg-base-200 cursor-pointer" onClick={() => navigate(`/groups/${g.id}`)}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${archived ? 'bg-base-100 text-base-content/45' : 'bg-primary/10 text-primary'}`}>
                            <FolderOpen size={14} />
                          </div>
                          <span className="font-semibold text-base-content">{g.name}</span>
                        </div>
                      </td>
                      <td className="text-base-content/70">{g.mentor?.name || g.mentorName || '—'}</td>
                      <td className="tabular-nums">
                        <span className="font-semibold">{count}</span>
                        <span className="text-base-content/45"> / {MAX_STUDENTS}</span>
                      </td>
                      <td className="text-xs text-base-content/60">
                        {g.startTime ? (
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {g.startTime}{g.endTime ? `–${g.endTime}` : ''}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${archived ? 'bg-base-100 text-base-content/45' : 'bg-success/15 text-success'}`}>
                          {archived ? t('admin.groups.archived') : t('admin.groups.active')}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          {!archived && (
                            <button
                              className="btn btn-xs btn-ghost hover:text-primary hover:bg-primary/10"
                              onClick={(e) => { e.stopPropagation(); openEdit(g); }}
                              title={t('admin.groups.editGroupTooltip')}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {!archived && (
                            <button
                              className="btn btn-xs btn-ghost hover:text-warning hover:bg-warning/10"
                              onClick={(e) => { e.stopPropagation(); handleArchiveClick(g); }}
                              title={t('admin.groups.archiveTooltip')}
                            >
                              <Archive size={14} />
                            </button>
                          )}
                          {archived && (
                            <button
                              className="btn btn-xs btn-ghost hover:text-success hover:bg-success/10"
                              onClick={(e) => { e.stopPropagation(); handleArchiveClick(g); }}
                              title={t('admin.groups.restoreTooltip')}
                            >
                              <ArchiveRestore size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExportDialog open={showExport} onClose={() => setShowExport(false)} pageKey="groups" data={filteredRows} />

      {/* ═══ Create/Edit Modal ═══ */}
      <GroupFormModal
        key={form?.id || 'create'}
        open={Boolean(form)}
        onClose={() => setForm(null)}
        mentors={mentors}
        lessonDurationMin={lessonDurationMin}
        initial={form}
        onSave={handleSave}
        token={token}
        groups={rows}
        trainingTypes={trainingTypes}
      />

      {/* ═══ Archive Confirm Modal (asks for a reason) ═══ */}
      <Modal
        isOpen={Boolean(archiveTarget)}
        onClose={() => !archiving && setArchiveTarget(null)}
        boxClass="max-w-md p-6"
        title={t('admin.groups.archiveGroupTitle')}
        actions={
          <>
            <button className="btn btn-ghost rounded-lg" onClick={() => setArchiveTarget(null)} disabled={archiving}>
              {t('admin.groups.cancel')}
            </button>
            <button className="btn btn-warning rounded-lg gap-1" onClick={confirmArchive} disabled={archiving}>
              {archiving && <span className="loading loading-spinner loading-xs" />}
              <Archive size={14} /> {t('admin.groups.toArchive')}
            </button>
          </>
        }
      >
        {archiveTarget && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/70">
              {t('admin.groups.archiveConfirm', { name: archiveTarget.name })}
            </p>
            <label className="form-control">
              <span className="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mb-1 block">
                {t('admin.groups.archiveReasonLabel')}
              </span>
              <textarea
                className="textarea textarea-bordered w-full rounded-lg"
                rows={3}
                placeholder={t('admin.groups.archiveReasonPlaceholder')}
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                autoFocus
              />
              <span className="text-[10px] text-base-content/40 mt-1">{t('admin.groups.archiveReasonHint')}</span>
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
