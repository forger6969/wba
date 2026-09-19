import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt, FilePlus2, Ban, AlertTriangle, ChevronLeft, ChevronRight, Building2,
  Wallet, Clock3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { useInvoices, useOrgDebt } from '../queries.js';
import { money, dateShort } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import { EmptyState, FilterPills, StatusBadge, Modal, RowSkeleton } from '../components/_ui.jsx';
import { SkeletonKpis } from '../components/Skeleton.jsx';
import { useDashboardLive } from '../socket.js';

/**
 * Счета и долги партнёров (Karis 26.08.2026).
 *
 * До этого истории счетов не было вообще — только кассовый журнал (что
 * реально заплатили) и access_until (до какого числа открыт доступ).
 * Спросить «сколько партнёр должен» было нечем.
 *
 * Тариф и сумма в счёте — СНИМОК на момент выставления, не пересчитываются
 * задним числом при росте числа учеников. 'overdue' нигде не хранится —
 * это производный статус (срок прошёл, счёт не закрыт), бэкенд вычисляет
 * его при каждом чтении.
 */

const STATUS_META = {
  pending: { label: 'Ожидает оплаты', tone: 'neutral' },
  partially_paid: { label: 'Частично оплачен', tone: 'warning' },
  paid: { label: 'Оплачен', tone: 'success' },
  covered: { label: 'Покрыт доступом', tone: 'success' },
  overdue: { label: 'Просрочен', tone: 'danger' },
  cancelled: { label: 'Отменён', tone: 'neutral' },
};

const FILTERS = [
  { key: '', label: 'Все' },
  { key: 'overdue', label: 'Просрочены' },
  { key: 'pending', label: 'Ожидают' },
  { key: 'partially_paid', label: 'Частично' },
  { key: 'paid', label: 'Оплачены' },
  { key: 'covered', label: 'Покрыты доступом' },
  { key: 'cancelled', label: 'Отменены' },
];

const LIMIT = 30;

function SummaryMetric({ Icon, label, value, hint, tone = 'neutral' }) {
  const tones = { danger: 'bg-error/10 text-error', warning: 'bg-warning/10 text-amber-700', neutral: 'bg-base-200 text-base-content/55' };
  return (
    <div className="flex items-center gap-3 border-b border-base-300 p-4 last:border-0 sm:border-b-0 sm:border-r">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tones[tone] || tones.neutral}`}><Icon size={18} /></span>
      <div><div className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">{label}</div><div className="mt-0.5 text-xl font-extrabold tabular-nums">{value}</div><div className="text-[10px] text-base-content/35">{hint}</div></div>
    </div>
  );
}

function GenerateButton() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: () => api.generateInvoices(token),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['orgDebt'] });
    },
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="btn btn-sm bg-lime-400 hover:bg-lime-500 border-0 text-lime-950 gap-1.5"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <span className="loading loading-spinner loading-xs" /> : <FilePlus2 size={14} />}
        Создать счета
      </button>
      {result && (
        <span className="text-xs text-base-content/45">
          {result.periodCovered}: создано {result.created} {result.created === 1 ? 'счёт' : 'счетов'}
        </span>
      )}
      {mutation.error && <span className="text-xs text-error">{mutation.error.message}</span>}
    </div>
  );
}

function DebtPanel({ debts, isLoading }) {
  const total = (debts ?? []).reduce((s, d) => s + d.debt, 0);

  return (
    <aside className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-[0_2px_12px_rgba(29,36,23,0.04)]">
      <div className="border-b border-base-300 p-4">
        <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-error/10 text-error"><AlertTriangle size={15} /></span><div><div className="text-sm font-extrabold">Кто ещё не оплатил</div><div className="text-[10px] text-base-content/40">Остаток по выставленным счетам</div></div></div>
        <div className="mt-4 text-[10px] font-bold uppercase tracking-wider text-base-content/40">Общий долг</div>
        <div className="mt-0.5 text-2xl font-extrabold tabular-nums">{money(total)}</div>
      </div>
      <div className="main-sidebar-scroll max-h-[520px] overflow-y-auto p-3">
      {isLoading ? (
        <RowSkeleton count={3} height="h-12" />
      ) : !debts?.length ? (
        <div className="text-sm text-success text-center py-6 flex flex-col items-center gap-1">
          <span className="font-semibold">Долгов нет</span>
          <span className="text-xs text-base-content/40">Все выставленные счета закрыты</span>
        </div>
      ) : (
        <div className="divide-y divide-base-200">
          {debts.map((d) => (
            <Link key={d.organizationId} to={`/organizations/${d.organizationId}`} className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-base-200/60">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 size={14} className="text-base-content/40 shrink-0" />
                <span className="text-sm font-medium truncate">{d.organizationName}</span>
                {d.overdueCount > 0 && (
                  <StatusBadge tone="danger">{d.overdueCount} просрочено</StatusBadge>
                )}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums">{money(d.debt)} <ChevronRight size={12} className="text-base-content/25 group-hover:text-base-content/60" /></span>
            </Link>
          ))}
        </div>
      )}
      </div>
    </aside>
  );
}

function CancelDialog({ invoice, onClose }) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.cancelInvoice(token, invoice.id, reason),
    onSuccess: () => {
      setReason('');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['orgDebt'] });
      onClose();
    },
  });

  const canSubmit = reason.trim().length >= 3;

  return (
    <Modal
      isOpen={!!invoice}
      onClose={onClose}
      title="Отменить счёт?"
      size="sm"
      actions={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={mutation.isPending}>Отмена</button>
          <button
            className="btn btn-error btn-sm"
            onClick={() => canSubmit && mutation.mutate()}
            disabled={mutation.isPending || !canSubmit}
          >
            {mutation.isPending ? <span className="loading loading-spinner loading-xs" /> : 'Отменить счёт'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-base-content/70">
          {invoice?.organizationName} · {invoice?.periodCovered} · {invoice ? money(invoice.amount) : ''}
        </p>
        <input
          className="input input-bordered input-sm w-full"
          placeholder="Причина отмены (обязательно)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {mutation.error && <div className="text-xs text-error">{mutation.error.message}</div>}
      </div>
    </Modal>
  );
}

export default function Invoices() {
  const liveConnected = useDashboardLive();
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data, isLoading, isFetching } = useInvoices({ status, limit: LIMIT, offset });
  const { data: debts, isLoading: debtsLoading } = useOrgDebt();
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = Math.floor(offset / LIMIT) + 1;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));
  const totalDebt = (debts ?? []).reduce((sum, item) => sum + item.debt, 0);
  const overdueTotal = (debts ?? []).reduce((sum, item) => sum + item.overdueCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Оплаты партнёров"
        subtitle="Выставляйте ежемесячные счета и контролируйте, кто уже оплатил, а у кого остался долг"
      >
        <div className="flex items-center gap-3"><span className="hidden items-center gap-1.5 text-xs text-base-content/40 sm:flex"><span className={`h-1.5 w-1.5 rounded-full ${liveConnected ? 'bg-success' : 'animate-pulse bg-warning'}`} />{liveConnected ? 'Live' : 'Подключение…'}</span><GenerateButton /></div>
      </PageHeader>

      <div className="grid overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-[0_2px_12px_rgba(29,36,23,0.04)] sm:grid-cols-3">
        <SummaryMetric Icon={Wallet} label="Общий долг" value={money(totalDebt)} hint={`${debts?.length ?? 0} партнёров`} tone="danger" />
        <SummaryMetric Icon={Clock3} label="Просроченные счета" value={overdueTotal} hint="требуют связи" tone="warning" />
        <SummaryMetric Icon={Receipt} label="Всего счетов" value={total} hint="в выбранном разделе" />
      </div>

      <div className="grid gap-2 rounded-xl border border-info/15 bg-info/[0.04] p-3 text-xs text-base-content/60 sm:grid-cols-3">
        <div className="flex items-center gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-info/10 font-bold text-info">1</span><span><b>Выставить:</b> система создаёт месячный счёт</span></div>
        <div className="flex items-center gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-info/10 font-bold text-info">2</span><span><b>Принять оплату:</b> платёж уменьшает остаток</span></div>
        <div className="flex items-center gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-info/10 font-bold text-info">3</span><span><b>Контролировать:</b> просрочка попадает в список справа</span></div>
      </div>

      <div className="grid min-h-[570px] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-[0_2px_12px_rgba(29,36,23,0.04)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-base-300 p-3"><FilterPills options={FILTERS} value={status} onChange={(v) => { setStatus(v); setOffset(0); }} /><span className="text-xs text-base-content/40 sm:ml-auto">Найдено: {total}</span></div>
        {isLoading ? (
          <div className="p-5"><RowSkeleton count={5} height="h-14" /></div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Receipt}
              title="Счетов нет"
              hint="Нажмите «Сформировать счета за месяц» выше — по одному на каждого партнёра с платным тарифом"
            />
          </div>
        ) : (
          <div className={`overflow-x-auto ${isFetching ? 'opacity-60 pointer-events-none' : ''}`}>
            <table className="table table-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-base-content/40">
                  <th>Партнёр</th>
                  <th>Период</th>
                  <th>Тариф</th>
                  <th className="text-right">Сумма</th>
                  <th className="text-right">Оплачено</th>
                  <th>Статус</th>
                  <th>Срок</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((inv) => {
                  const meta = STATUS_META[inv.status] ?? { label: inv.status, tone: 'neutral' };
                  return (
                    <tr key={inv.id} className="hover">
                      <td className="font-medium">{inv.organizationName}</td>
                      <td className="font-mono text-xs">{inv.periodCovered}</td>
                      <td className="text-xs text-base-content/50">{inv.tierId} · {inv.usersCount} польз.</td>
                      <td className="text-right font-bold tabular-nums">{money(inv.amount)}</td>
                      <td className="text-right tabular-nums text-base-content/50">{money(inv.paidAmount)}</td>
                      <td><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></td>
                      <td className="text-xs text-base-content/50 whitespace-nowrap">{dateShort(inv.dueDate)}</td>
                      <td>
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            className="btn btn-ghost btn-xs gap-1 text-error/70 hover:text-error"
                            onClick={() => setCancelTarget(inv)}
                            title="Отменить счёт"
                          >
                            <Ban size={12} />
                          </button>
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
      </div>
      <DebtPanel debts={debts} isLoading={debtsLoading} />
      </div>

      <CancelDialog invoice={cancelTarget} onClose={() => setCancelTarget(null)} />
    </div>
  );
}
