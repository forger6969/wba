import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert, Plus, Trash2, MessageSquareWarning, ChevronLeft, ChevronRight, Building2,
  Hash, Eye, EyeOff, Asterisk, Info,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { useBannedWords, useFlaggedMessages } from '../queries.js';
import { dateTime } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import { EmptyState, ConfirmDialog, Avatar, StatusBadge } from '../components/_ui.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';

/**
 * Модерация чата (Karis 26.08.2026).
 *
 * Список слов ОДИН на всю платформу — настраивается здесь один раз и сразу
 * действует во всех чатах всех партнёров и филиалов, без переключателя
 * "какая организация". Это не инструмент подглядывания за перепиской, а
 * триггер "если написали — покажи мне / замени сама".
 *
 * У каждого слова два независимых переключателя:
 *   Отслеживать        — тихий флаг для Main Admin, текст не меняется;
 *   Заменять на ****    — слово реально стирается из чата для всех участников.
 *
 * Обычная переписка партнёров по-прежнему закрыта: ниже показаны ТОЛЬКО
 * сообщения, сработавшие на список слов (flagged_word).
 */

const ROLE_LABEL = {
  main_admin: 'Владелец платформы', ceo: 'CEO', admin: 'Админ', mentor: 'Ментор',
  methodist: 'Методист', branch_manager: 'Управляющий филиалом', finance_manager: 'Финансист',
  parent: 'Родитель', student: 'Ученик', employee: 'Сотрудник',
};

const LIMIT = 30;

function AddWordsForm({ token, invalidate }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const addMutation = useMutation({
    mutationFn: (list) => api.addBannedWords(token, list),
    onSuccess: () => { setText(''); setError(''); invalidate(); },
    onError: (e) => setError(e.message),
  });

  const submit = (e) => {
    e.preventDefault();
    const list = text.split('\n').map((w) => w.trim()).filter(Boolean);
    if (list.length === 0) { setError('Введите хотя бы одно слово'); return; }
    addMutation.mutate(list);
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 px-5 py-4 bg-paper/60 border-b border-base-200">
      <div className="flex-1 min-w-[240px]">
        <label className="text-xs font-semibold text-base-content/50 mb-1 block">Слова (по одному на строку)</label>
        <textarea
          className="textarea textarea-bordered textarea-sm w-full bg-base-100 font-mono"
          rows={2}
          placeholder={'дурак\nидиот'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-sm bg-limebrand hover:brightness-95 border-0 text-ink gap-1.5" disabled={addMutation.isPending}>
        {addMutation.isPending ? <span className="loading loading-spinner loading-xs" /> : <><Plus size={14} /> Добавить</>}
      </button>
      {error && <div className="text-xs text-error basis-full">{error}</div>}
    </form>
  );
}

function WordRow({ w, onToggleActive, onToggleAutoMask, onDelete }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3.5 ${!w.is_active ? 'opacity-45' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-md grid place-items-center shrink-0 bg-ink/[0.06] text-ink">
          <Hash size={15} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <div className={`font-semibold text-sm truncate ${!w.is_active ? 'line-through' : ''}`}>{w.word}</div>
          {!w.is_active && <div className="text-xs text-base-content/40">не отслеживается</div>}
        </div>
      </div>

      <div className="flex items-center gap-5 shrink-0">
        <label className="flex items-center gap-2 cursor-pointer" title="Тихий флаг вам — текст сообщения не меняется">
          {w.is_active ? <Eye size={14} className="text-success" /> : <EyeOff size={14} className="text-base-content/30" />}
          <span className="text-xs font-medium text-base-content/60 hidden sm:inline">Отслеживать</span>
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-success"
            checked={w.is_active}
            onChange={() => onToggleActive(w)}
          />
        </label>

        <label
          className={`flex items-center gap-2 pl-5 border-l border-base-200 ${w.is_active ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
          title="Все вхождения слова заменяются на **** прямо в чате — видно всем участникам"
        >
          <Asterisk size={14} className={w.auto_mask ? 'text-warning' : 'text-base-content/30'} />
          <span className="text-xs font-medium text-base-content/60 hidden sm:inline">Заменять на ****</span>
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-warning"
            checked={w.auto_mask}
            disabled={!w.is_active}
            onChange={() => onToggleAutoMask(w)}
          />
        </label>

        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle text-error/70 hover:text-error hover:bg-error/10"
          onClick={() => onDelete(w)}
          title="Удалить"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function WordsSection() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { data: words, isLoading } = useBannedWords();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['bannedWords'] });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.setBannedWordActive(token, id, isActive),
    onSuccess: invalidate,
  });
  const autoMaskMutation = useMutation({
    mutationFn: ({ id, autoMask }) => api.setBannedWordAutoMask(token, id, autoMask),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteBannedWord(token, id),
    onSuccess: () => { setDeleteTarget(null); invalidate(); },
  });

  const activeCount = (words ?? []).filter((w) => w.is_active).length;
  const maskedCount = (words ?? []).filter((w) => w.auto_mask).length;

  return (
    <section className="card bg-base-100 border border-base-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-base-200 bg-gradient-to-r from-lime-100 via-lime-50 to-transparent">
        <span className="w-9 h-9 rounded-md bg-limebrand text-ink grid place-items-center shrink-0">
          <ShieldAlert size={16} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-sm">Запрещённые слова</h2>
          <p className="text-xs text-base-content/45">
            {activeCount} отслеживается{maskedCount > 0 ? ` · ${maskedCount} с авто-заменой` : ''} · действует на всю платформу
          </p>
        </div>
      </div>

      <AddWordsForm token={token} invalidate={invalidate} />

      {isLoading ? (
        <div className="p-5"><SkeletonList rows={3} /></div>
      ) : !words?.length ? (
        <div className="text-sm text-base-content/40 p-6 text-center">Список пуст — ни одно слово не отслеживается</div>
      ) : (
        <div className="divide-y divide-base-200">
          {words.map((w) => (
            <WordRow
              key={w.id}
              w={w}
              onToggleActive={(word) => toggleMutation.mutate({ id: word.id, isActive: !word.is_active })}
              onToggleAutoMask={(word) => autoMaskMutation.mutate({ id: word.id, autoMask: !word.auto_mask })}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Удалить слово из списка?"
        text={deleteTarget ? `«${deleteTarget.word}» перестанет отслеживаться во всех чатах.` : ''}
        confirmLabel="Удалить"
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        pending={deleteMutation.isPending}
        error={deleteMutation.error?.message}
      />
    </section>
  );
}

function FlaggedRow({ m }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={`${m.sender.firstName} ${m.sender.lastName}`} size="sm" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{m.sender.firstName} {m.sender.lastName}</div>
            <div className="text-xs text-base-content/45 flex items-center gap-1 flex-wrap">
              {ROLE_LABEL[m.sender.role] ?? m.sender.role}
              {m.organization && (
                <span className="inline-flex items-center gap-0.5">
                  · <Building2 size={11} /> {m.organization.name}
                </span>
              )}
              {m.branch && <span>· {m.branch.name}</span>}
            </div>
          </div>
        </div>
        <span className="text-xs text-base-content/40 shrink-0 whitespace-nowrap">{dateTime(m.createdAt)}</span>
      </div>
      <p className="text-sm bg-base-200/50 rounded-md px-3 py-2 mb-2 break-words">{m.body}</p>
      <StatusBadge tone="danger">сработало: «{m.flaggedWord}»</StatusBadge>
    </div>
  );
}

function FlaggedSection() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isFetching } = useFlaggedMessages({ limit: LIMIT, offset });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = Math.floor(offset / LIMIT) + 1;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <section className="card bg-base-100 border border-base-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-base-200">
        <span className="w-9 h-9 rounded-md bg-ink/[0.06] text-ink grid place-items-center shrink-0">
          <MessageSquareWarning size={16} strokeWidth={2.2} />
        </span>
        <h2 className="font-bold text-sm flex-1">
          Сработавшие сообщения{total ? ` · ${total}` : ''}
        </h2>
        {isFetching && !isLoading && <span className="loading loading-spinner loading-xs text-base-content/30" />}
      </div>

      {isLoading ? (
        <div className="p-5"><SkeletonList rows={3} /></div>
      ) : items.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={MessageSquareWarning}
            title="Ничего не сработало"
            hint="Как только кто-то напишет слово из списка, сообщение появится здесь."
          />
        </div>
      ) : (
        <div className="divide-y divide-base-200">
          {items.map((m) => <FlaggedRow key={m.id} m={m} />)}
        </div>
      )}

      {total > LIMIT && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-base-200 text-sm">
          <span className="text-xs text-base-content/45">Стр. {page} из {pageCount}</span>
          <div className="join">
            <button
              className="join-item btn btn-sm btn-ghost"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            >
              <ChevronLeft size={14} /> Назад
            </button>
            <button
              className="join-item btn btn-sm btn-ghost"
              disabled={offset + LIMIT >= total}
              onClick={() => setOffset(offset + LIMIT)}
            >
              Далее <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function ChatModeration() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Модерация чата"
        subtitle="Один список слов на всю платформу — обычная переписка партнёров по-прежнему закрыта"
      />

      <div className="alert bg-info/10 border border-info/25 text-sm">
        <Info size={16} className="text-info shrink-0" />
        <span className="text-base-content/70">
          Новое срабатывание за сутки появляется предупреждением в «Центре контроля» —
          не нужно держать эту страницу открытой специально. Список ниже обновляется сам раз в минуту.
        </span>
      </div>

      <WordsSection />
      <FlaggedSection />
    </div>
  );
}
