import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bug, ChevronLeft, ChevronRight, CheckCircle2, Wifi, ServerCrash,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { useErrorLog } from '../queries.js';
import { dateTime } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import { Panel, EmptyState, FilterPills, StatusBadge, Modal, RowSkeleton } from '../components/_ui.jsx';

/**
 * Журнал ошибок бэкенда (Karis 26.08.2026).
 *
 * Пишется сам — не нужно ничего заводить руками: errorHandler.js (5xx из
 * запросов) и server.js (падения вне запроса — unhandledRejection/
 * uncaughtException). До этого такие ошибки просто исчезали в консоли;
 * сегодняшнее падение сервера я нашёл случайно, вручную гоняя процесс.
 *
 * Одна и та же повторяющаяся ошибка — одна строка со счётчиком, не поток
 * дублей: группировка по отпечатку на бэкенде (platform_error_log).
 */

const LIMIT = 30;

const KIND_META = {
  http: { label: 'Ошибка запроса', tone: 'danger', Icon: Bug },
  infra: { label: 'Инфраструктура', tone: 'warning', Icon: Wifi },
  crash: { label: 'Падение процесса', tone: 'danger', Icon: ServerCrash },
};

const FILTERS = [
  { key: 'open', label: 'Открытые' },
  { key: 'resolved', label: 'Решённые' },
  { key: 'all', label: 'Все' },
];

function DetailModal({ entry, onClose }) {
  if (!entry) return null;
  const meta = KIND_META[entry.kind] ?? { label: entry.kind, tone: 'neutral', Icon: Bug };
  return (
    <Modal isOpen={!!entry} onClose={onClose} title={meta.label} size="lg">
      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs font-semibold text-base-content/45 mb-1">Сообщение</div>
          <p className="font-mono text-sm break-words">{entry.message}</p>
        </div>
        {entry.route && (
          <div>
            <div className="text-xs font-semibold text-base-content/45 mb-1">Маршрут</div>
            <p className="font-mono text-xs">{entry.route}{entry.statusCode ? ` · HTTP ${entry.statusCode}` : ''}</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><div className="text-base-content/45 mb-0.5">Повторов</div><div className="font-bold">{entry.occurrenceCount}</div></div>
          <div><div className="text-base-content/45 mb-0.5">Впервые</div><div>{dateTime(entry.firstSeenAt)}</div></div>
          <div><div className="text-base-content/45 mb-0.5">Последний раз</div><div>{dateTime(entry.lastSeenAt)}</div></div>
        </div>
        {entry.stack && (
          <div>
            <div className="text-xs font-semibold text-base-content/45 mb-1">Стек</div>
            <pre className="text-[11px] bg-base-200/60 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">{entry.stack}</pre>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function ErrorLog() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('open');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);

  const { data, isLoading, isFetching } = useErrorLog({ resolved: filter, limit: LIMIT, offset });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = Math.floor(offset / LIMIT) + 1;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));

  const resolveMutation = useMutation({
    mutationFn: (id) => api.resolveError(token, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['errorLog'] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Журнал ошибок"
        subtitle="Пишется сам — из необработанных исключений и 5xx-ответов бэкенда"
      />

      <FilterPills
        options={FILTERS}
        value={filter}
        onChange={(v) => { setFilter(v); setOffset(0); }}
      />

      <Panel bodyClass="p-0">
        {isLoading ? (
          <div className="p-5"><RowSkeleton count={5} height="h-14" /></div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={CheckCircle2}
              title={filter === 'open' ? 'Открытых ошибок нет' : 'Ничего не найдено'}
              hint={filter === 'open' ? 'Как только что-то упадёт — появится здесь само' : undefined}
            />
          </div>
        ) : (
          <div className={`overflow-x-auto ${isFetching ? 'opacity-60 pointer-events-none' : ''}`}>
            <table className="table table-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-base-content/40">
                  <th>Тип</th>
                  <th>Сообщение</th>
                  <th className="text-right">Повторов</th>
                  <th>Последний раз</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const meta = KIND_META[it.kind] ?? { label: it.kind, tone: 'neutral', Icon: Bug };
                  return (
                    <tr key={it.id} className="hover cursor-pointer" onClick={() => setSelected(it)}>
                      <td><StatusBadge tone={meta.tone}><meta.Icon size={11} className="inline mr-1" />{meta.label}</StatusBadge></td>
                      <td className="max-w-md">
                        <div className="font-mono text-xs truncate">{it.message}</div>
                        {it.route && <div className="text-[11px] text-base-content/40 truncate">{it.route}</div>}
                      </td>
                      <td className="text-right font-bold tabular-nums">{it.occurrenceCount}</td>
                      <td className="text-xs text-base-content/50 whitespace-nowrap">{dateTime(it.lastSeenAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {!it.resolvedAt ? (
                          <button
                            className="btn btn-xs btn-ghost gap-1"
                            onClick={() => resolveMutation.mutate(it.id)}
                            disabled={resolveMutation.isPending}
                          >
                            <CheckCircle2 size={12} /> Решено
                          </button>
                        ) : (
                          <span className="text-[11px] text-success flex items-center gap-1"><CheckCircle2 size={12} /> решено</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > LIMIT && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-base-200 text-sm">
            <span className="text-xs text-base-content/45">Стр. {page} из {pageCount} · всего {total}</span>
            <div className="join">
              <button className="join-item btn btn-sm btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
                <ChevronLeft size={14} /> Назад
              </button>
              <button className="join-item btn btn-sm btn-ghost" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>
                Далее <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Panel>

      <DetailModal entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
