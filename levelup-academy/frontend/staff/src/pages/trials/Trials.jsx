import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { Modal } from '../mentor/_ui.jsx';

const STATUSES = ['scheduled', 'attended', 'enrolled', 'thinking', 'rejected'];

const LABELS = {
  uz: {
    title: 'Probniy darslar', sub: 'Sinov darsiga yozilganlar va natijasi',
    add: 'Probniy qoshish', name: 'Ism', phone: 'Telefon', subject: 'Yonalish',
    date: 'Sana', status: 'Holat', reason: 'Sabab', followUp: 'Keyingi aloqa', notes: 'Izoh',
    save: 'Saqlash', cancel: 'Bekor', edit: 'Natija', empty: 'Hozircha probniy yoq',
    all: 'Hammasi', confirmDel: 'Probniyni ochirasizmi?',
    st: { scheduled: 'Rejalashtirilgan', attended: 'Keldi', enrolled: 'Yozildi', thinking: 'Oylab koradi', rejected: 'Rad etdi' },
  },
  ru: {
    title: 'Пробные уроки', sub: 'Записавшиеся на пробный и результат',
    add: 'Добавить', name: 'Имя', phone: 'Телефон', subject: 'Направление',
    date: 'Дата', status: 'Статус', reason: 'Причина', followUp: 'След. контакт', notes: 'Заметка',
    save: 'Сохранить', cancel: 'Отмена', edit: 'Результат', empty: 'Пока нет пробных',
    all: 'Все', confirmDel: 'Удалить пробный?',
    st: { scheduled: 'Запланирован', attended: 'Пришёл', enrolled: 'Записался', thinking: 'Думает', rejected: 'Отказ' },
  },
  en: {
    title: 'Trial lessons', sub: 'Trial signups and outcome',
    add: 'Add trial', name: 'Name', phone: 'Phone', subject: 'Subject',
    date: 'Date', status: 'Status', reason: 'Reason', followUp: 'Follow-up', notes: 'Notes',
    save: 'Save', cancel: 'Cancel', edit: 'Outcome', empty: 'No trials yet',
    all: 'All', confirmDel: 'Delete this trial?',
    st: { scheduled: 'Scheduled', attended: 'Attended', enrolled: 'Enrolled', thinking: 'Thinking', rejected: 'Rejected' },
  },
};

const STATUS_CLS = {
  scheduled: 'bg-base-200 text-base-content/70',
  attended: 'bg-info/10 text-info',
  enrolled: 'bg-success/10 text-success',
  thinking: 'bg-warning/10 text-warning',
  rejected: 'bg-error/10 text-error',
};

const DASH = '—';

export default function Trials() {
  const { i18n } = useTranslation();
  const L = LABELS[(i18n.language || 'uz').slice(0, 2)] || LABELS.uz;
  const { token } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['trials', filter],
    queryFn: () => api.listTrials(token, filter).then((r) => r.data || []),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['trials'] });
  const createMut = useMutation({ mutationFn: (body) => api.createTrial(token, body), onSuccess: () => { invalidate(); setAddOpen(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, body }) => api.updateTrial(token, id, body), onSuccess: () => { invalidate(); setEditItem(null); } });
  const deleteMut = useMutation({ mutationFn: (id) => api.deleteTrial(token, id), onSuccess: invalidate });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{L.title}</h1>
          <p className="text-sm text-base-content/60">{L.sub}</p>
        </div>
        <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> {L.add}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <button className={`btn btn-xs ${filter === '' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('')}>{L.all}</button>
        {STATUSES.map((s) => (
          <button key={s} className={`btn btn-xs ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)}>{L.st[s]}</button>
        ))}
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-base-content/50">...</div>
        ) : data.length === 0 ? (
          <div className="p-10 text-center text-base-content/50">{L.empty}</div>
        ) : (
          <table className="table">
            <thead>
              <tr className="text-xs uppercase text-base-content/50">
                <th>{L.name}</th><th>{L.phone}</th><th>{L.subject}</th><th>{L.date}</th><th>{L.status}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="hover">
                  <td className="font-medium">{t.studentName}</td>
                  <td className="text-sm text-base-content/70">{t.phone || DASH}</td>
                  <td className="text-sm">{t.subject || DASH}</td>
                  <td className="text-sm text-base-content/70">{t.trialDate || DASH}</td>
                  <td>
                    <span className={`badge badge-sm border-0 ${STATUS_CLS[t.status] || ''}`}>{L.st[t.status] || t.status}</span>
                    {t.status === 'rejected' && t.reason ? <div className="text-[11px] text-error/70 mt-0.5 max-w-[200px] truncate">{t.reason}</div> : null}
                    {t.followUpDate ? <div className="text-[11px] text-warning/80 mt-0.5">{t.followUpDate}</div> : null}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-xs gap-1" onClick={() => setEditItem(t)}><Pencil size={13} /> {L.edit}</button>
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => { if (window.confirm(L.confirmDel)) deleteMut.mutate(t.id); }}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {addOpen && (
        <TrialForm L={L} title={L.add} busy={createMut.isPending}
          onCancel={() => setAddOpen(false)}
          onSave={(body) => createMut.mutate(body)} />
      )}
      {editItem && (
        <TrialForm L={L} title={L.edit} item={editItem} withOutcome busy={updateMut.isPending}
          onCancel={() => setEditItem(null)}
          onSave={(body) => updateMut.mutate({ id: editItem.id, body })} />
      )}
    </div>
  );
}

function TrialForm({ L, title, item, withOutcome, onSave, onCancel, busy }) {
  const [f, setF] = useState({
    studentName: item?.studentName || '', phone: item?.phone || '', subject: item?.subject || '',
    trialDate: item?.trialDate || '', status: item?.status || 'scheduled',
    reason: item?.reason || '', followUpDate: item?.followUpDate || '', notes: item?.notes || '',
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    if (!f.studentName.trim()) return;
    const body = {};
    for (const k of ['studentName', 'phone', 'subject', 'trialDate', 'status', 'reason', 'followUpDate', 'notes']) {
      if (f[k] !== '' && f[k] != null) body[k] = f[k];
    }
    onSave(body);
  };
  return (
    <Modal isOpen onClose={onCancel} title={title}>
      <form onSubmit={submit} className="space-y-3">
        <label className="form-control">
          <span className="label-text text-xs mb-1">{L.name} *</span>
          <input className="input input-bordered input-sm" value={f.studentName} onChange={set('studentName')} autoFocus required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="form-control"><span className="label-text text-xs mb-1">{L.phone}</span>
            <input className="input input-bordered input-sm" value={f.phone} onChange={set('phone')} placeholder="+998" /></label>
          <label className="form-control"><span className="label-text text-xs mb-1">{L.subject}</span>
            <input className="input input-bordered input-sm" value={f.subject} onChange={set('subject')} /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="form-control"><span className="label-text text-xs mb-1">{L.date}</span>
            <input type="date" className="input input-bordered input-sm" value={f.trialDate} onChange={set('trialDate')} /></label>
          <label className="form-control"><span className="label-text text-xs mb-1">{L.status}</span>
            <select className="select select-bordered select-sm" value={f.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{L.st[s]}</option>)}
            </select></label>
        </div>
        {withOutcome && (f.status === 'rejected' || f.status === 'thinking') && (
          <label className="form-control"><span className="label-text text-xs mb-1">{L.reason}</span>
            <input className="input input-bordered input-sm" value={f.reason} onChange={set('reason')} /></label>
        )}
        {withOutcome && (
          <label className="form-control"><span className="label-text text-xs mb-1">{L.followUp}</span>
            <input type="date" className="input input-bordered input-sm" value={f.followUpDate} onChange={set('followUpDate')} /></label>
        )}
        <label className="form-control"><span className="label-text text-xs mb-1">{L.notes}</span>
          <textarea className="textarea textarea-bordered textarea-sm" rows={2} value={f.notes} onChange={set('notes')} /></label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>{L.cancel}</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{L.save}</button>
        </div>
      </form>
    </Modal>
  );
}
