import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ScrollText, ChevronLeft, ChevronRight, Building2, User, Globe, Clock, ShieldCheck, SearchCheck, Undo2,
} from 'lucide-react';
import { useAuditLog } from '../queries.js';
import { dateTime } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import { Panel, EmptyState, SearchInput, StatusBadge, FilterPills, Modal, RowSkeleton } from '../components/_ui.jsx';

/**
 * Журнал действий платформы — кто, что и когда сделал вне рамок одной
 * организации (заморозка партнёра, платёж, бонус, фича, онбординг, расход).
 * Источник — audit_log (миграция 1787100000000, снявшая NOT NULL с
 * organization_id: до неё main_admin вообще не мог туда попасть).
 *
 * Пагинация здесь настоящая: offset/limit уходят на бэкенд, total считается
 * SQL-окном count(*) OVER() (main.repository.js:listPlatformAudit). Поиск
 * внизу — НЕ то же самое: бэкенд не хранит full-text индекс по журналу,
 * поэтому строка ищет только по уже загруженной странице. Помечено явно,
 * чтобы не выглядело как поиск по всей истории.
 */

const LIMIT = 50;

const SCOPES = [
  { key: 'platform', label: 'Управление платформой' },
  { key: 'org', label: 'Учебные центры' },
  { key: 'security', label: 'Безопасность и входы' },
  { key: 'all', label: 'Всё' },
];

const FIELD_LABEL = {
  status: 'Статус',
  accessUntil: 'Доступ до',
  amount: 'Сумма',
  method: 'Способ оплаты',
  periodCovered: 'Оплаченный период',
  monthsGranted: 'Добавлено месяцев',
  label: 'Название',
  category: 'Категория',
  title: 'Заголовок',
  targetType: 'Получатели',
  enabled: 'Состояние',
};

// Читаемые подписи для action-строк, которые реально пишет backend
// (main.controller.js:audit). Незнакомый action — просто показываем как есть.
const ACTION_META = {
  'auth.login_succeeded': { label: 'Успешный вход', tone: 'success' },
  'auth.login_failed': { label: 'Неудачная попытка входа', tone: 'danger' },
  'partner.onboarded': { label: 'Партнёр подключён', tone: 'success' },
  'partner.status_changed': { label: 'Статус партнёра изменён', tone: 'warning' },
  'partner.payment_recorded': { label: 'Платёж зафиксирован', tone: 'success' },
  'partner.bonus_granted': { label: 'Бонусные месяцы начислены', tone: 'info' },
  'partner.feature_enabled': { label: 'Фича включена партнёру', tone: 'success' },
  'partner.feature_disabled': { label: 'Фича отключена у партнёра', tone: 'neutral' },
  'partner.feature_request_approve': { label: 'Заявка на фичу одобрена', tone: 'success' },
  'partner.feature_request_reject': { label: 'Заявка на фичу отклонена', tone: 'danger' },
  'platform_invoice.generated': { label: 'Счета выставлены', tone: 'info' },
  'platform_invoice.cancelled': { label: 'Счёт отменён', tone: 'danger' },
  'platform_expense.created': { label: 'Расход платформы добавлен', tone: 'neutral' },
  'platform_expense.deleted': { label: 'Расход платформы удалён', tone: 'danger' },
  'platform.feature_created': { label: 'Платная фича создана', tone: 'success' },
  'platform.feature_updated': { label: 'Платная фича изменена', tone: 'warning' },
  'platform.feature_deactivated': { label: 'Платная фича снята с продажи', tone: 'danger' },
  'platform.lead_updated': { label: 'Заявка обновлена', tone: 'info' },
  'platform.announcement_created': { label: 'Объявление создано', tone: 'success' },
  'platform.announcement_deleted': { label: 'Объявление удалено', tone: 'danger' },
  'platform.profile_updated': { label: 'Профиль Main Admin изменён', tone: 'warning' },
};

const ENTITY_LABEL = {
  organization: 'Организация',
  org_payment: 'Платёж',
  feature_flag: 'Фича',
  feature_request: 'Заявка на фичу',
  platform_expense: 'Расход платформы',
};

function actionMeta(action) {
  return ACTION_META[action] || { label: action, tone: 'neutral' };
}

/** Было/стало — плоский список полей, а не сырой JSON.stringify. */
function DiffBlock({ title, data, tone }) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return (
      <div className="flex-1 min-w-[160px]">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40 mb-1.5">{title}</div>
        <div className="text-xs text-base-content/35 italic">нет данных</div>
      </div>
    );
  }
  return (
    <div className="flex-1 min-w-[160px]">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40 mb-1.5">{title}</div>
      <div className={`rounded-md border p-2.5 space-y-1 ${tone === 'before' ? 'border-base-300 bg-base-200/40' : 'border-primary/25 bg-primary/[0.06]'}`}>
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-base-content/45 shrink-0">{FIELD_LABEL[k] || k}</span>
            <span className="font-mono font-semibold text-right break-all">
              {v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailModal({ entry, onClose }) {
  if (!entry) return null;
  const meta = actionMeta(entry.action);
  return (
    <Modal isOpen={!!entry} onClose={onClose} title={meta.label} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/55">
          <span className="inline-flex items-center gap-1"><Clock size={12} /> {dateTime(entry.createdAt)}</span>
          {entry.organizationName && (
            <span className="inline-flex items-center gap-1"><Building2 size={12} /> {entry.organizationName}</span>
          )}
          {entry.ip && <span className="inline-flex items-center gap-1"><Globe size={12} /> {entry.ip}</span>}
        </div>

        <div className="flex items-center gap-3 p-3 rounded-md bg-base-200/50">
          <span className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
            <User size={14} />
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{entry.actorName || '—'}</div>
            <div className="text-xs text-base-content/45">{entry.actorRole || '—'}</div>
          </div>
        </div>

        {entry.entityLabel && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40 mb-1">
              {ENTITY_LABEL[entry.entityType] || entry.entityType || 'Объект'}
            </div>
            <div className="text-sm font-semibold">{entry.entityLabel}</div>
          </div>
        )}

        {(entry.before || entry.after) && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-base-200">
            <DiffBlock title="Было" data={entry.before} tone="before" />
            <DiffBlock title="Стало" data={entry.after} tone="after" />
          </div>
        )}

        {entry.reason && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40 mb-1">Причина</div>
            <div className="text-sm italic text-base-content/70">«{entry.reason}»</div>
          </div>
        )}

        {entry.userAgent && (
          <div className="text-[11px] text-base-content/35 font-mono break-all pt-2 border-t border-base-200">
            {entry.userAgent}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Audit() {
  const [params, setParams] = useSearchParams();
  const scope = params.get('scope') || 'platform';
  const action = params.get('action') || '';
  const offset = Number(params.get('offset') || 0);
  const q = params.get('search') || '';
  const [selected, setSelected] = useState(null);

  const { data, isLoading, isFetching, error } = useAuditLog({ scope, action, search: q, limit: LIMIT, offset });

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'offset') next.delete('offset'); // смена фильтра — назад на первую страницу
    setParams(next, { replace: true });
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const actions = data?.actions ?? [];

  const shown = items;

  const page = Math.floor(offset / LIMIT) + 1;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      <PageHeader
        title={<span className="flex items-center gap-2"><ScrollText size={22} /> История изменений</span>}
        subtitle="Здесь сохраняются важные действия Main Admin: кто, когда и что изменил"
      />

      <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4 sm:p-5">
        <div className="font-semibold text-sm mb-3">Зачем нужна эта страница?</div>
        <div className="grid gap-3 sm:grid-cols-3 text-xs text-base-content/65 leading-relaxed">
          <div className="flex gap-2.5"><ShieldCheck className="text-primary shrink-0" size={18} /><span><b className="text-base-content">Контроль.</b> Видно, кто принял платёж, изменил доступ или удалил расход.</span></div>
          <div className="flex gap-2.5"><SearchCheck className="text-primary shrink-0" size={18} /><span><b className="text-base-content">Разбор ошибок.</b> Если данные изменились неожиданно, здесь можно найти причину.</span></div>
          <div className="flex gap-2.5"><Undo2 className="text-primary shrink-0" size={18} /><span><b className="text-base-content">Восстановление.</b> Значения «было / стало» помогают вернуть правильные данные.</span></div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterPills options={SCOPES} value={scope} onChange={(v) => setParam('scope', v)} />

        <select
          className="select select-bordered select-sm rounded-md"
          value={action}
          onChange={(e) => setParam('action', e.target.value)}
        >
          <option value="">Любое действие</option>
          {actions.map((a) => (
            <option key={a} value={a}>{actionMeta(a).label}</option>
          ))}
        </select>

        <SearchInput
          value={q}
          onChange={(value) => setParam('search', value)}
          placeholder="Сотрудник, центр или действие"
          className="w-full sm:w-72 sm:ml-auto"
        />
      </div>

      <Panel bodyClass="p-0">
        {isLoading ? (
          <div className="p-5"><RowSkeleton count={6} height="h-12" /></div>
        ) : error ? (
          <div className="p-6">
            <EmptyState title="Не удалось загрузить журнал" hint={error.message} />
          </div>
        ) : shown.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={ScrollText}
              title={items.length === 0 ? 'Записей пока нет' : 'Ничего не найдено'}
              hint={items.length === 0 ? 'Действия платформы появятся здесь по мере работы' : 'Попробуйте изменить фильтр или поиск'}
            />
          </div>
        ) : (
          <div className={`overflow-x-auto ${isFetching ? 'opacity-60 pointer-events-none' : ''}`}>
            <table className="table table-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-base-content/40">
                  <th>Когда</th>
                  <th>Действие</th>
                  <th>Сотрудник</th>
                  <th>Что изменили</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((it) => {
                  const meta = actionMeta(it.action);
                  return (
                    <tr
                      key={it.id}
                      className="cursor-pointer hover:bg-base-200/40"
                      onClick={() => setSelected(it)}
                    >
                      <td className="whitespace-nowrap text-xs text-base-content/60">{dateTime(it.createdAt)}</td>
                      <td><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></td>
                      <td className="text-sm">
                        <div className="font-medium">{it.actorName || '—'}</div>
                        {it.organizationName && (
                          <div className="text-xs text-base-content/40">{it.organizationName}</div>
                        )}
                      </td>
                      <td className="text-sm text-base-content/70 max-w-[220px] truncate">{it.entityLabel || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > LIMIT && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-base-200 text-sm">
            <span className="text-xs text-base-content/45">
              Стр. {page} из {pageCount} · всего {total}
            </span>
            <div className="join">
              <button
                className="join-item btn btn-sm btn-ghost"
                disabled={offset === 0}
                onClick={() => setParam('offset', String(Math.max(0, offset - LIMIT)))}
              >
                <ChevronLeft size={14} /> Назад
              </button>
              <button
                className="join-item btn btn-sm btn-ghost"
                disabled={offset + LIMIT >= total}
                onClick={() => setParam('offset', String(offset + LIMIT))}
              >
                Далее <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Panel>

      {shown.length > 0 && (
        <p className="text-xs text-base-content/40 text-center">Нажмите на строку, чтобы увидеть подробности и значения «было / стало».</p>
      )}

      <DetailModal entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
