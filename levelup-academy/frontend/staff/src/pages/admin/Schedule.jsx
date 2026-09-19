import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { Plus, Trash2, Pencil, DoorOpen, Users2, Search, Maximize2, ListFilter } from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { useAdminSchedule, useAdminRooms, useInvalidate } from '../../queries.js';
import { api } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { EmptyState, RowSkeleton } from '../mentor/_ui.jsx';

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };
/* Опорная неделя: 2024-01-01 — понедельник. Названия дней получаем через
   Intl, а не хардкодим по языкам — так формат остаётся согласованным с
   остальным приложением при добавлении нового языка. */
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const daysFor = (locale) => DAY_KEYS.map((key, i) => ({
  key,
  label: new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }),
}));
const dayModesFor = (t) => [
  { key: 'odd', label: t('admin.schedule.oddDays'), days: ['mon', 'wed', 'fri'] },
  { key: 'even', label: t('admin.schedule.evenDays'), days: ['tue', 'thu', 'sat'] },
  { key: 'other', label: t('admin.schedule.otherDays'), days: ['sun'] },
];
const NO_ROOM = '__none__';
const TONES = [
  ['#e9f8f2', '#22b98a', '#08775b'], ['#f3efff', '#9870f5', '#6842bd'],
  ['#eaf8fc', '#20b8d4', '#087b91'], ['#fff3e6', '#ef8d24', '#9b4d05'],
  ['#fff0f3', '#ef476f', '#a91f40'], ['#eef1ff', '#6878f5', '#3f49a9'],
];

function toneFor(value = '') {
  const hash = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return TONES[hash % TONES.length];
}

function shortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' })
    .format(date)
    .replace(',', '')
    .toLowerCase();
}

function GroupBlock({ group, onEdit }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: group.id,
    data: { groupId: group.id },
  });
  const [bg, accent, text] = toneFor(group.subject || group.name);
  const count = group.studentCount ?? group.studentsCount ?? (Array.isArray(group.students) ? group.students.length : null);
  const style = {
    background: bg,
    borderColor: `${accent}55`,
    color: text,
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : {}),
  };
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}
      className={`relative rounded-[8px] border px-2.5 py-1.5 text-[11px] cursor-grab active:cursor-grabbing select-none min-h-[72px] shadow-sm ${isDragging ? 'opacity-40' : ''}`}>
      <span className="absolute left-1 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background: accent }} />
      <div className="flex items-center gap-1 pl-1">
        <span className="font-extrabold text-[12px] truncate flex-1">{group.name}</span>
        {count !== null && (
          <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold" style={{ background: `${accent}18`, color: accent }}>
            <Users2 size={9} /> {count}
          </span>
        )}
        <button type="button" className="shrink-0 opacity-40 hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()} onClick={() => onEdit(group)}>
          <Pencil size={10} />
        </button>
      </div>
      <div className="pl-1 truncate opacity-70">{group.mentor?.name || '—'}</div>
      <div className="pl-1 mt-1 pt-1 border-t flex items-center justify-between gap-2 text-[9px] opacity-65" style={{ borderColor: `${accent}25` }}>
        <span className="truncate">{group.subject || t('admin.schedule.otherSubject')}</span>
        <span className="shrink-0">{shortDate(group.createdAt)}</span>
      </div>
    </div>
  );
}

function RoomRow({ room, groups, timeSlots, onEdit, showEmpty }) {
  const { setNodeRef, isOver } = useDroppable({ id: room?.id ?? NO_ROOM });
  const columns = `68px repeat(${Math.max(timeSlots.length, 1)}, minmax(128px, 1fr))`;
  return (
    <div ref={setNodeRef} className={`grid border-b border-base-300 last:border-b-0 min-h-[64px] ${isOver ? 'bg-primary/5' : ''}`}
      style={{ gridTemplateColumns: columns }}>
      <div className="px-2 py-3 flex items-start justify-center border-r border-base-300 bg-base-100 sticky left-0 z-10">
        <span className="text-[12px] font-extrabold text-base-content/75 truncate">{room?.name ?? '—'}</span>
      </div>
      {timeSlots.map((time) => {
        const cellGroups = groups.filter((g) => g.viewSlot?.start === time);
        return (
          <div key={time} className={`border-r border-base-300 last:border-r-0 p-1.5 space-y-1 ${showEmpty && cellGroups.length === 0 ? 'bg-[repeating-linear-gradient(135deg,transparent,transparent_7px,rgba(16,185,129,.035)_7px,rgba(16,185,129,.035)_14px)]' : ''}`}>
            {cellGroups.map((group) => <GroupBlock key={group.id} group={group} onEdit={onEdit} />)}
          </div>
        );
      })}
    </div>
  );
}

function EditTimeModal({ group, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const DAYS = daysFor(locale);
  const { token } = useAuth();
  const [days, setDays] = useState(group.schedule.map((s) => s.day));
  const [startTime, setStartTime] = useState(group.schedule[0]?.start || '14:00');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toggleDay = (key) => setDays((old) => old.includes(key) ? old.filter((day) => day !== key) : [...old, key]);
  const save = async () => {
    if (!days.length) { setErr(t('admin.schedule.selectDay')); return; }
    setBusy(true); setErr('');
    try { await api.adminUpdateGroup(token, group.id, { days, startTime }); onSaved(); }
    catch (e) { setErr(e.message || t('admin.schedule.saveFailed')); }
    finally { setBusy(false); }
  };
  return (
    <dialog className="modal modal-open">
      <div className="modal-box card bg-base-100 border border-base-300 max-w-sm">
        <h3 className="font-bold text-lg mb-1">{group.name}</h3>
        <p className="text-[12px] text-base-content/45 mb-4">{t('admin.schedule.timeSubtitle')}</p>
        {err && <div className="alert alert-error py-2 text-sm mb-3">{err}</div>}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {DAYS.map((day) => <button key={day.key} type="button" className={`btn btn-xs ${days.includes(day.key) ? 'btn-primary' : 'btn-ghost border border-base-300'}`} onClick={() => toggleDay(day.key)}>{day.label}</button>)}
        </div>
        <input type="time" className="input input-bordered w-full" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>{t('admin.schedule.cancel')}</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />} {t('admin.schedule.save')}</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}

export default function AdminSchedule() {
  const { t } = useTranslation();
  const DAY_MODES = dayModesFor(t);
  const { token } = useAuth();
  const invalidate = useInvalidate();
  const scheduleQ = useAdminSchedule();
  const roomsQ = useAdminRooms();
  const boardRef = useRef(null);
  const [mode, setMode] = useState('odd');
  const [search, setSearch] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [activeGroupId, setActiveGroupId] = useState(null);

  const rooms = scheduleQ.data?.rooms || [];
  const groups = scheduleQ.data?.groups || [];
  const activeDays = DAY_MODES.find((item) => item.key === mode)?.days || [];
  const visibleGroups = useMemo(() => groups.map((group) => {
    const viewSlot = (group.schedule || []).find((slot) => activeDays.includes(slot.day));
    return viewSlot ? { ...group, viewSlot } : null;
  }).filter(Boolean).filter((group) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${group.name} ${group.mentor?.name || ''} ${group.subject || ''}`.toLowerCase().includes(query);
  }), [groups, activeDays, search]);
  const timeSlots = useMemo(() => [...new Set(visibleGroups.map((group) => group.viewSlot.start).filter(Boolean))].sort(), [visibleGroups]);
  const shownTimes = timeSlots.length ? timeSlots : ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
  const columns = `68px repeat(${shownTimes.length}, minmax(128px, 1fr))`;
  const refreshAll = () => { invalidate(['admin-schedule']); invalidate(['admin-rooms']); };
  const groupsInRoom = (roomId) => visibleGroups.filter((group) => roomId === NO_ROOM ? !group.roomId : group.roomId === roomId);

  const handleDragEnd = async ({ active, over }) => {
    setActiveGroupId(null);
    if (!over) return;
    const groupId = active.data.current?.groupId;
    const targetRoomId = over.id === NO_ROOM ? null : over.id;
    const group = groups.find((item) => item.id === groupId);
    if (!group || group.roomId === targetRoomId) return;
    try { await api.adminUpdateGroup(token, groupId, { roomId: targetRoomId }); refreshAll(); }
    catch (e) { setErr(e.message || t('admin.schedule.moveGroupFailed')); }
  };
  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    setBusy(true); setErr('');
    try {
      await api.adminCreateRoom(token, { name: newRoomName.trim(), capacity: newRoomCapacity ? Number(newRoomCapacity) : undefined });
      setNewRoomOpen(false); setNewRoomName(''); setNewRoomCapacity(''); refreshAll();
    } catch (e) { setErr(e.message || t('admin.schedule.createRoomFailed')); }
    finally { setBusy(false); }
  };
  const deleteRoom = async (room) => {
    if (!confirm(t('admin.schedule.confirmDeleteRoom', { name: room.name }))) return;
    try { await api.adminDeleteRoom(token, room.id); refreshAll(); }
    catch (e) { alert(e.message || t('admin.schedule.deleteRoomFailed')); }
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await boardRef.current?.requestFullscreen();
    } catch { /* Fullscreen can be blocked by the browser. */ }
  };
  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const loading = scheduleQ.isLoading || roomsQ.isLoading;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader title={t('admin.schedule.title')} subtitle={t('admin.schedule.subtitle')}>
        <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setNewRoomOpen(true)}><Plus size={16} /> {t('admin.schedule.room')}</button>
      </PageHeader>
      {err && <div className="alert alert-error py-2 text-sm">{err}</div>}
      {loading ? <RowSkeleton count={5} height="h-16" /> : rooms.length === 0 && groups.length === 0 ? (
        <EmptyState icon={DoorOpen} title={t('admin.schedule.emptyTitle')} hint={t('admin.schedule.emptyHint')} />
      ) : (
        <DndContext onDragStart={({ active }) => setActiveGroupId(active.data.current?.groupId ?? null)} onDragEnd={handleDragEnd}>
          <div ref={boardRef} className="card bg-base-100 border border-base-300 overflow-hidden min-h-[420px]">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b border-base-300 bg-base-100">
              <div className="inline-flex rounded-[10px] bg-base-200 p-1">
                {DAY_MODES.map((item) => <button key={item.key} type="button" onClick={() => setMode(item.key)} className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition ${mode === item.key ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/55'}`}>{item.label}</button>)}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <label className="relative hidden sm:block">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/35" />
                  <input className="input input-bordered input-sm pl-9 w-52" placeholder={t('admin.schedule.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
                </label>
                <button type="button" className={`btn btn-sm gap-1.5 ${showEmpty ? 'btn-primary' : 'btn-ghost border border-base-300'}`} onClick={() => setShowEmpty((value) => !value)}><ListFilter size={14} /> {t('admin.schedule.emptySlots')}</button>
                <button type="button" className="btn btn-sm btn-square btn-ghost border border-base-300" onClick={toggleFullscreen}><Maximize2 size={15} /></button>
              </div>
            </div>
            <div className="overflow-auto flex-1">
              <div style={{ minWidth: `${68 + shownTimes.length * 128}px` }}>
                <div className="grid border-b border-base-300 bg-base-100 sticky top-0 z-20" style={{ gridTemplateColumns: columns }}>
                  <div className="p-2 text-[10px] font-bold text-base-content/45 uppercase border-r border-base-300 sticky left-0 bg-base-100">{t('admin.schedule.slots')}</div>
                  {shownTimes.map((time) => <div key={time} className="p-2 text-[11px] font-extrabold text-base-content/50 text-center border-r border-base-300 last:border-r-0">{time}</div>)}
                </div>
                {rooms.map((room) => (
                  <div key={room.id} className="group/room relative">
                    <RoomRow room={room} groups={groupsInRoom(room.id)} timeSlots={shownTimes} onEdit={setEditGroup} showEmpty={showEmpty} />
                    <button type="button" className="absolute left-1 bottom-1 text-base-content/20 hover:text-error opacity-0 group-hover/room:opacity-100 z-20" onClick={() => deleteRoom(room)}><Trash2 size={11} /></button>
                  </div>
                ))}
                <RoomRow room={null} groups={groupsInRoom(NO_ROOM)} timeSlots={shownTimes} onEdit={setEditGroup} showEmpty={showEmpty} />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 border-t border-base-300 text-[10px] text-base-content/50">
              {[...new Set(visibleGroups.map((group) => group.subject || t('admin.schedule.otherSubject')))].map((subject) => {
                const [, accent] = toneFor(subject); return <span key={subject} className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: accent }} />{subject}</span>;
              })}
            </div>
          </div>
          <DragOverlay>{activeGroup && <div className="rounded-[8px] border border-primary bg-base-100 shadow-lg px-3 py-2 text-[11px] font-bold text-primary">{activeGroup.name}</div>}</DragOverlay>
        </DndContext>
      )}

      {newRoomOpen && <dialog className="modal modal-open">
        <div className="modal-box card bg-base-100 border border-base-300 max-w-sm">
          <h3 className="font-bold text-lg mb-4">{t('admin.schedule.newRoom')}</h3>
          <div className="space-y-3">
            <input className="input input-bordered w-full" placeholder={t('admin.schedule.roomNamePlaceholder')} value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
            <input type="number" min="1" className="input input-bordered w-full" placeholder={t('admin.schedule.capacityPlaceholder')} value={newRoomCapacity} onChange={(e) => setNewRoomCapacity(e.target.value)} />
          </div>
          <div className="modal-action"><button className="btn btn-ghost" onClick={() => setNewRoomOpen(false)} disabled={busy}>{t('admin.schedule.cancel')}</button><button className="btn btn-primary" onClick={createRoom} disabled={busy || !newRoomName.trim()}>{busy && <span className="loading loading-spinner loading-xs" />} {t('admin.schedule.create')}</button></div>
        </div><div className="modal-backdrop" onClick={() => setNewRoomOpen(false)} />
      </dialog>}
      {editGroup && <EditTimeModal group={editGroup} onClose={() => setEditGroup(null)} onSaved={() => { setEditGroup(null); refreshAll(); }} />}
    </div>
  );
}
