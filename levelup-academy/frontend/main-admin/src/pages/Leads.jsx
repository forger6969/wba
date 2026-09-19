import { useState, useMemo } from 'react';
import {
  X, UserPlus, Sparkles, PhoneCall, CheckCircle2, XCircle,
  Inbox, Search, Mail, Phone, RotateCcw, Send, MessageSquare, Calendar, User,
  ChevronRight, TrendingUp,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useLeads, useInvalidate } from '../queries.js';
import { dateShort, LEAD_STATUS } from '../format.js';
import OnboardModal from '../components/OnboardModal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/Avatar.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';

const STATUS_ICON = { new: Sparkles, contacted: PhoneCall, onboarded: CheckCircle2, rejected: XCircle };

const STEPS = [
  { key: 'new', label: 'Новая', Icon: Sparkles },
  { key: 'contacted', label: 'Связались', Icon: PhoneCall },
  { key: 'onboarded', label: 'Онбординг', Icon: CheckCircle2 },
];

function FunnelMetric({ Icon, title, value, active, onClick, last }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-w-[150px] flex-1 p-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${last ? '' : 'border-r border-base-300'} ${active ? 'bg-primary/[0.12]' : 'hover:bg-base-200/60'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/45 group-hover:text-base-content/70'}`}><Icon size={15} /></span>
        <ChevronRight size={13} className="text-base-content/20 group-hover:text-base-content/45" />
      </div>
      <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-base-content/40">{title}</div>
      <div className="mt-0.5 text-2xl font-extrabold tabular-nums">{value}</div>
    </button>
  );
}

export default function Leads() {
  const { token } = useAuth();
  const invalidate = useInvalidate();
  const { data: leads, isLoading, error } = useLeads();

  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [onboard, setOnboard] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');

  const counts = useMemo(() => {
    const c = { new: 0, contacted: 0, onboarded: 0, rejected: 0 };
    (leads || []).forEach((l) => { c[l.status] = (c[l.status] || 0) + 1; });
    return c;
  }, [leads]);

  const changeStatus = async (id, status) => {
    setBusyId(id);
    setErr('');
    try {
      await api.updateLead(token, id, { status });
      invalidate('leads', 'dashboard');
      // если это open detail — обновляем локально сразу
      setSelectedLead((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const saveNotes = async (id, notes) => {
    setBusyId(id);
    setErr('');
    try {
      await api.updateLead(token, id, { notes });
      invalidate('leads', 'dashboard');
      setSelectedLead((prev) => (prev && prev.id === id ? { ...prev, notes } : prev));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(() => {
    const priority = { new: 0, contacted: 1, onboarded: 2, rejected: 3 };
    return (leads || [])
      .filter((l) => tab === 'all' || l.status === tab)
      .filter((l) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return (l.centerName || '').toLowerCase().includes(s)
          || (l.name || '').toLowerCase().includes(s)
          || (l.phone || '').toLowerCase().includes(s)
          || (l.email || '').toLowerCase().includes(s);
      })
      .sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9) || new Date(b.createdAt) - new Date(a.createdAt));
  }, [leads, tab, q]);

  const showErr = err || (error && error.status !== 401 ? error.message : '');
  const total = (leads || []).length;
  const conversion = total ? Math.round((counts.onboarded / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Заявки
            {counts.new > 0 && <span className="badge badge-error">{counts.new} новых</span>}
          </span>
        }
        subtitle="Воронка новых учебных центров: от первого обращения до подключения"
      >
        <button
          className="btn bg-lime-400 hover:bg-lime-500 border-0 text-lime-950 gap-2"
          onClick={() => setOnboard({})}
        >
          <UserPlus size={17} /> Новый партнёр
        </button>
      </PageHeader>

      {showErr && <div className="alert alert-error text-sm"><span>{showErr}</span></div>}

      <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100 shadow-[0_2px_12px_rgba(29,36,23,0.04)]">
        <div className="flex min-w-max">
          <FunnelMetric Icon={Inbox} title="Все заявки" value={total} active={tab === 'all'} onClick={() => setTab('all')} />
          <FunnelMetric Icon={Sparkles} title="Новые" value={counts.new || 0} active={tab === 'new'} onClick={() => setTab('new')} />
          <FunnelMetric Icon={PhoneCall} title="Связались" value={counts.contacted || 0} active={tab === 'contacted'} onClick={() => setTab('contacted')} />
          <FunnelMetric Icon={CheckCircle2} title="Подключены" value={counts.onboarded || 0} active={tab === 'onboarded'} onClick={() => setTab('onboarded')} />
          <FunnelMetric Icon={XCircle} title="Отклонены" value={counts.rejected || 0} active={tab === 'rejected'} onClick={() => setTab('rejected')} last />
          <div className="min-w-[150px] bg-ink p-4 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-content"><TrendingUp size={15} /></span>
            <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">Конверсия</div>
            <div className="mt-0.5 text-2xl font-extrabold tabular-nums">{conversion}%</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : (
        <div className="grid min-h-[560px] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-[0_2px_12px_rgba(29,36,23,0.04)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-base-300 p-3">
              <label className="input input-bordered input-sm flex w-full items-center gap-2 sm:max-w-sm">
                <Search size={14} className="text-base-content/40" />
                <input className="grow" placeholder="Центр, контакт, телефон или email" value={q} onChange={(e) => setQ(e.target.value)} />
                {q && <button type="button" onClick={() => setQ('')} className="text-base-content/35 hover:text-base-content" aria-label="Очистить поиск"><X size={13} /></button>}
              </label>
              <span className="text-xs font-medium text-base-content/45 sm:ml-auto">Показано: {visible.length} из {total}</span>
          </div>

            <div className="min-h-[490px] overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Учебный центр</th>
                    <th>Контакт</th>
                    <th>Телефон / Email</th>
                    <th>Дата</th>
                    <th>Статус</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-14">
                        <Inbox size={32} className="mx-auto text-base-content/25 mb-2" />
                        <div className="opacity-50 text-sm">
                          {q || tab !== 'all' ? 'Ничего не найдено' : 'Заявок пока нет'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visible.map((l) => {
                      const s = LEAD_STATUS[l.status] || { label: l.status, cls: 'badge-ghost' };
                      const StatusIcon = STATUS_ICON[l.status];
                      return (
                        <tr
                          key={l.id}
                          className={`cursor-pointer transition-colors hover:bg-primary/[0.06] ${selectedLead?.id === l.id ? 'bg-primary/[0.09]' : ''}`}
                          onClick={() => setSelectedLead(l)}
                        >
                          <td>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={l.centerName || l.name} size={36} />
                              <div className="min-w-0">
                                <div className="font-semibold truncate">{l.centerName || '—'}</div>
                                {l.message && (
                                  <div className="text-xs text-base-content/50 truncate max-w-[220px]" title={l.message}>
                                    {l.message}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-sm">{l.name || '—'}</td>
                          <td>
                            <div className="text-sm space-y-0.5">
                              {l.phone && (
                                <div className="flex items-center gap-1.5 text-base-content/80">
                                  <Phone size={11} className="text-base-content/40" />
                                  {l.phone}
                                </div>
                              )}
                              {l.email && (
                                <div className="flex items-center gap-1.5 text-xs text-base-content/60">
                                  <Mail size={11} className="text-base-content/40" />
                                  {l.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap text-sm text-base-content/60">{dateShort(l.createdAt)}</td>
                          <td>
                            <span className={`badge badge-sm gap-1 ${s.cls}`}>
                              {StatusIcon && <StatusIcon size={11} />}
                              {s.label}
                            </span>
                          </td>
                          <td><ChevronRight size={15} className="text-base-content/25" /></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
        </div>
        <LeadInspector
          key={(selectedLead || visible[0])?.id || 'empty'}
          lead={selectedLead || visible[0] || null}
          busy={busyId === (selectedLead || visible[0])?.id}
          onChangeStatus={(status) => {
            const lead = selectedLead || visible[0];
            if (lead) changeStatus(lead.id, status);
          }}
          onSaveNotes={(notes) => {
            const lead = selectedLead || visible[0];
            if (lead) saveNotes(lead.id, notes);
          }}
          onOnboard={() => {
            const lead = selectedLead || visible[0];
            if (lead) setOnboard(lead);
          }}
        />
        </div>
      )}

      {onboard && (
        <OnboardModal
          lead={onboard.id ? onboard : null}
          onClose={() => setOnboard(null)}
          onDone={() => { setOnboard(null); invalidate('leads', 'dashboard'); }}
        />
      )}

      {selectedLead && (
        <div className="xl:hidden">
          <LeadDetail
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onChangeStatus={(status) => changeStatus(selectedLead.id, status)}
            onSaveNotes={(notes) => saveNotes(selectedLead.id, notes)}
            onOnboard={() => { setOnboard(selectedLead); setSelectedLead(null); }}
            busy={busyId === selectedLead.id}
          />
        </div>
      )}

    </div>
  );
}

function LeadInspector({ lead, busy, onChangeStatus, onSaveNotes, onOnboard }) {
  const [notes, setNotes] = useState(lead?.notes || '');
  if (!lead) {
    return (
      <aside className="hidden min-h-[560px] place-items-center rounded-xl border border-dashed border-base-300 bg-base-100/60 p-8 text-center xl:grid">
        <div><Inbox size={30} className="mx-auto mb-3 text-base-content/20" /><div className="text-sm font-bold">Нет заявок</div><p className="mt-1 text-xs text-base-content/40">Новые обращения появятся здесь автоматически</p></div>
      </aside>
    );
  }
  const s = LEAD_STATUS[lead.status] || { label: lead.status, cls: 'badge-ghost' };
  const rejected = lead.status === 'rejected';
  const onboarded = lead.status === 'onboarded';
  const notesChanged = notes !== (lead.notes || '');

  return (
    <aside className="hidden min-h-[560px] overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-[0_2px_12px_rgba(29,36,23,0.04)] xl:flex xl:flex-col">
      <div className="border-b border-base-300 p-4">
        <div className="flex items-start gap-3">
          <Avatar name={lead.centerName || lead.name} size={44} />
          <div className="min-w-0 flex-1"><div className="truncate text-base font-extrabold">{lead.centerName || 'Без названия'}</div><div className="mt-1 flex items-center gap-2"><span className={`badge badge-sm ${s.cls}`}>{s.label}</span><span className="text-[10px] text-base-content/40">{dateShort(lead.createdAt)}</span></div></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {lead.phone ? <a href={`tel:${lead.phone}`} className="btn btn-sm btn-outline gap-1.5"><Phone size={13} /> Позвонить</a> : <button className="btn btn-sm btn-disabled">Нет телефона</button>}
          {lead.email ? <a href={`mailto:${lead.email}`} className="btn btn-sm btn-outline gap-1.5"><Mail size={13} /> Написать</a> : <button className="btn btn-sm btn-disabled">Нет email</button>}
        </div>
      </div>

      <div className="main-sidebar-scroll flex-1 space-y-4 overflow-y-auto p-4">
        <div><div className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Контакт</div><div className="mt-1 text-sm font-semibold">{lead.name || 'Не указан'}</div><div className="mt-1 text-xs text-base-content/50">{lead.phone || lead.email || 'Контакты не указаны'}</div></div>
        {lead.message && <div><div className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Сообщение</div><div className="mt-1.5 rounded-lg bg-base-200/70 p-3 text-xs leading-relaxed">{lead.message}</div></div>}
        <div>
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Заметка</span><span className="text-[9px] text-base-content/30">Для команды</span></div>
          <textarea className="textarea textarea-bordered mt-1.5 min-h-28 w-full resize-y text-xs focus:border-primary focus:outline-none" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="Результат звонка, следующий шаг…" />
          <button className="btn btn-sm btn-outline mt-2 w-full" disabled={!notesChanged || busy} onClick={() => onSaveNotes(notes)}>{busy ? <span className="loading loading-spinner loading-xs" /> : 'Сохранить заметку'}</button>
        </div>
      </div>

      <div className="border-t border-base-300 bg-base-200/40 p-3">
        {onboarded ? <div className="py-2 text-center text-xs font-semibold text-success">Партнёр уже подключён</div> : rejected ? (
          <button className="btn btn-sm btn-outline w-full gap-2" disabled={busy} onClick={() => onChangeStatus('new')}><RotateCcw size={13} /> Восстановить</button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {lead.status === 'new' && <button className="btn btn-sm btn-outline gap-1" disabled={busy} onClick={() => onChangeStatus('contacted')}><PhoneCall size={13} /> Связались</button>}
            <button className="btn btn-sm bg-primary text-primary-content gap-1" disabled={busy} onClick={onOnboard}><UserPlus size={13} /> Подключить</button>
            <button className="btn btn-sm btn-ghost text-error col-span-2" disabled={busy} onClick={() => onChangeStatus('rejected')}>Отклонить заявку</button>
          </div>
        )}
      </div>
    </aside>
  );
}

function LeadDetail({ lead, onClose, onChangeStatus, onSaveNotes, onOnboard, busy }) {
  const s = LEAD_STATUS[lead.status] || { label: lead.status, cls: 'badge-ghost' };
  const currentStep = STEPS.findIndex((st) => st.key === lead.status);
  const isRejected = lead.status === 'rejected';
  const isOnboarded = lead.status === 'onboarded';
  const [notes, setNotes] = useState(lead.notes || '');
  const notesChanged = notes !== (lead.notes || '');

  return (
    <div className="modal modal-open modal-bottom sm:modal-middle">
      <div className="modal-box max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-br from-lime-50 to-transparent border-b border-base-200 flex items-start gap-4">
          <Avatar name={lead.centerName || lead.name} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-xl truncate">{lead.centerName || '—'}</h3>
              <span className={`badge ${s.cls}`}>{s.label}</span>
            </div>
            <div className="text-xs text-base-content/50 mt-1 flex items-center gap-1.5">
              <Calendar size={12} /> Подано: {dateShort(lead.createdAt)}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Stepper */}
          {!isRejected && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50 mb-3">Прогресс</div>
              <div className="flex items-center">
                {STEPS.map((step, i) => {
                  const done = i <= currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-9 h-9 rounded-full grid place-items-center shrink-0 transition-colors ${
                          done ? 'bg-lime-400 text-lime-950' : 'bg-base-200 text-base-content/40'
                        } ${active ? 'ring-4 ring-lime-100' : ''}`}>
                          <step.Icon size={15} />
                        </div>
                        <span className={`text-[10.5px] font-semibold ${done ? 'text-lime-700' : 'text-base-content/40'}`}>
                          {step.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-2 -mt-4 ${i < currentStep ? 'bg-lime-400' : 'bg-base-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {isRejected && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 flex items-center gap-2">
              <XCircle size={16} /> Заявка отклонена — можно восстановить.
            </div>
          )}

          {/* Contacts */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50 mb-2">Контакты</div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-md border border-base-200">
                <User size={16} className="text-base-content/40 shrink-0" />
                <span className="text-sm font-medium">{lead.name || '—'}</span>
              </div>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-3 p-3 rounded-md border border-base-200 hover:border-lime-400 hover:bg-lime-50/40 transition-colors">
                  <Phone size={16} className="text-base-content/40 shrink-0" />
                  <span className="text-sm font-medium">{lead.phone}</span>
                  <span className="ml-auto text-xs text-lime-600 font-semibold">Позвонить</span>
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-3 p-3 rounded-md border border-base-200 hover:border-lime-400 hover:bg-lime-50/40 transition-colors">
                  <Mail size={16} className="text-base-content/40 shrink-0" />
                  <span className="text-sm font-medium truncate">{lead.email}</span>
                  <span className="ml-auto text-xs text-lime-600 font-semibold">Написать</span>
                </a>
              )}
            </div>
          </div>

          {/* Message */}
          {lead.message && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50 mb-2 flex items-center gap-1.5">
                <MessageSquare size={12} /> Сообщение
              </div>
              <div className="rounded-md bg-base-200/60 p-3 text-sm whitespace-pre-wrap leading-relaxed">
                {lead.message}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">Внутренняя заметка</div>
              <span className="text-[10px] text-base-content/35">Видна только команде</span>
            </div>
            <textarea
              className="textarea textarea-bordered min-h-24 w-full resize-y text-sm focus:border-primary focus:outline-none"
              value={notes}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Например: созвон в пятницу, интересует тариф…"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-base-content/35">{notes.length}/2000</span>
              <button type="button" className="btn btn-sm btn-outline" disabled={!notesChanged || busy} onClick={() => onSaveNotes(notes)}>
                {busy ? <span className="loading loading-spinner loading-xs" /> : 'Сохранить заметку'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-base-200 bg-base-100 flex flex-wrap gap-2">
          {busy ? (
            <div className="flex-1 flex items-center justify-center py-2">
              <span className="loading loading-spinner loading-sm" />
            </div>
          ) : isOnboarded ? (
            <span className="text-sm text-base-content/50 py-2 flex-1 text-center">Партнёр уже онбордингован</span>
          ) : isRejected ? (
            <button className="btn btn-outline gap-2 flex-1" onClick={() => onChangeStatus('new')}>
              <RotateCcw size={15} /> Восстановить
            </button>
          ) : (
            <>
              {lead.status === 'new' && (
                <button className="btn btn-outline gap-2" onClick={() => onChangeStatus('contacted')}>
                  <PhoneCall size={15} /> Связались
                </button>
              )}
              <button className="btn bg-lime-400 hover:bg-lime-500 border-0 text-lime-950 gap-2 flex-1" onClick={onOnboard}>
                <Send size={15} /> Онбордить
              </button>
              <button className="btn btn-outline btn-error gap-2" onClick={() => onChangeStatus('rejected')}>
                <X size={15} /> Отклонить
              </button>
            </>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
