import { useMemo, useState } from 'react';
import { Receipt, PieChart as PieIcon, Plus, Pencil, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PageHeader from '../../components/PageHeader.jsx';
import { money } from '../../format.js';
import { Metric, Card, BranchSelect, MonthSelect, monthOptions, monthRange } from './_ui.jsx';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import { useFinanceBranches, useFinanceExpenses, useInvalidate } from '../../queries.js';

const CAT_COLORS = ['#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#22c55e', '#64748b'];

/* Категория — свободный текст на бэке (createOrgExpenseSchema.category, max
   60), не enum. Список ниже — только подсказки в datalist, не ограничение:
   раньше 6 захардкоженных узбекских слов были единственным вариантом даже
   в русском/английском интерфейсе. */
function categorySuggestions(t) {
  return [t('finance.common.category')].filter(Boolean); // подсказки минимальны, свобода ввода важнее
}

function ExpenseForm({ initial, branches, onSubmit, onCancel, t }) {
  const [form, setForm] = useState(() => ({
    branchId: initial?.branchId ?? '',
    category: initial?.category ?? '',
    amount: initial?.amount ?? '',
    spentAt: initial?.spentAt ? initial.spentAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    note: initial?.note ?? '',
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await onSubmit({
        branchId: form.branchId || null,
        category: form.category.trim(),
        amount: Number(form.amount),
        spentAt: form.spentAt,
        note: form.note.trim() || undefined,
      });
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <div className="alert alert-error text-xs py-2">{err}</div>}
      <div className="grid grid-cols-2 gap-3">
        <label className="form-control">
          <span className="text-[11px] font-semibold text-base-content/50 mb-1">{t('finance.common.branch')}</span>
          <select
            className="select select-bordered select-sm"
            value={form.branchId}
            onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
          >
            <option value="">{t('finance.expenses.orgWide')}</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="form-control">
          <span className="text-[11px] font-semibold text-base-content/50 mb-1">{t('finance.common.date')}</span>
          <input
            type="date"
            required
            className="input input-bordered input-sm"
            value={form.spentAt}
            onChange={(e) => setForm((f) => ({ ...f, spentAt: e.target.value }))}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="form-control">
          <span className="text-[11px] font-semibold text-base-content/50 mb-1">{t('finance.common.category')}</span>
          <input
            type="text"
            required
            maxLength={60}
            placeholder={t('finance.expenses.categoryPlaceholder')}
            list="expense-categories"
            className="input input-bordered input-sm"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <datalist id="expense-categories">
            {categorySuggestions(t).map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label className="form-control">
          <span className="text-[11px] font-semibold text-base-content/50 mb-1">{t('finance.common.amount')}</span>
          <input
            type="number"
            required
            min="1"
            step="1"
            className="input input-bordered input-sm"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </label>
      </div>
      <label className="form-control">
        <span className="text-[11px] font-semibold text-base-content/50 mb-1">{t('finance.common.note')}</span>
        <input
          type="text"
          maxLength={1000}
          className="input input-bordered input-sm"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        />
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>{t('finance.common.cancel')}</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {busy && <span className="loading loading-spinner loading-xs" />} {t('finance.common.save')}
        </button>
      </div>
    </form>
  );
}

export default function FinanceExpenses() {
  const { t, i18n } = useTranslation(); const lang = i18n.language;
  const { token } = useAuth();
  const invalidate = useInvalidate();
  const [branchId, setBranchId] = useState('all');
  const months = monthOptions(lang);
  const [monthKey, setMonthKey] = useState(months[0].key);
  const [modal, setModal] = useState(null); // null | 'create' | expense object
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: branches } = useFinanceBranches();
  /* Расход тоже режется по месяцу (Karis 22.08.2026). Раньше params был без
     дат: страница тянула расходы за ВСЁ ВРЕМЯ, но подписывала итог как
     «расход за месяц» — в списке висел июльский расход рядом с августовским.
     Хуже того, доход на соседней странице месячный, и сравнивать их (или
     считать прибыль) было нельзя: разные периоды. */
  const { from, to } = monthRange(monthKey);
  const params = { branchId: branchId === 'all' ? '' : branchId, from, to };
  const { data, isLoading } = useFinanceExpenses(params);
  const rows = data?.expenses ?? [];
  const total = rows.reduce((a, e) => a + e.amount, 0);

  const catBreakdown = useMemo(() => {
    const map = new Map();
    rows.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [rows]);

  const branchRows = useMemo(() => {
    if (branchId !== 'all') return [];
    const map = new Map();
    for (const e of rows) {
      const key = e.branchId ?? '__org__';
      const label = e.branchId ? e.branchName : t('finance.expenses.orgWide');
      map.set(key, { key, label, value: (map.get(key)?.value ?? 0) + e.amount });
    }
    return [...map.values()];
  }, [rows, branchId, t]);

  const label = branchId === 'all' ? t('finance.common.allBranches') : (branches ?? []).find((b) => b.id === branchId)?.name ?? '';

  const refresh = () => invalidate(['finance-expenses', params]);

  const createExpense = async (body) => { await api.financeCreateExpense(token, body); refresh(); setModal(null); };
  const updateExpense = async (body) => { await api.financeUpdateExpense(token, modal.id, body); refresh(); setModal(null); };
  const deleteExpense = async (id) => { await api.financeDeleteExpense(token, id); refresh(); setConfirmDelete(null); };

  return (
    <div className="space-y-6 pb-8 animate-page-enter">
      <PageHeader title={t('finance.expenses.title')} subtitle={t('finance.expenses.subtitle')}>
        <button className="btn btn-primary btn-sm gap-2" onClick={() => setModal('create')}>
          <Plus size={14} /> {t('finance.expenses.add')}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <Metric
          Icon={Receipt}
          label={t('finance.kpi.expenses')}
          value={money(total)}
          sub={`${label} · ${months.find((m) => m.key === monthKey)?.label}`}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        <Card
          title={branchId === 'all' ? t('finance.common.branch') : t('finance.expenses.title')}
          action={
            <div className="flex items-center gap-2">
              <BranchSelect value={branchId} onChange={setBranchId} allLabel={t('finance.common.allBranches')} branches={branches ?? []} />
              <MonthSelect value={monthKey} onChange={setMonthKey} months={months} />
            </div>
          }
          className="xl:col-span-2"
          bodyClass="p-0"
        >
          {branchId === 'all' && (
            <div className="overflow-x-auto border-b border-base-200">
              <table className="table table-sm">
                <tbody>
                  {branchRows.map((r) => (
                    <tr key={r.key} className="text-sm">
                      <td className="font-medium">{r.label}</td>
                      <td className="text-right tabular-nums text-warning font-semibold">{money(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-[12px] uppercase tracking-wider text-base-content/50">
                  <th>{t('finance.common.date')}</th>
                  {branchId === 'all' && <th>{t('finance.common.branch')}</th>}
                  <th>{t('finance.common.category')}</th>
                  <th>{t('finance.common.note')}</th>
                  <th className="text-right">{t('finance.common.amount')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-6 text-base-content/50">{t('finance.common.loading')}</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-6 text-base-content/50">{t('finance.common.noData')}</td></tr>
                ) : rows.map((e) => (
                  <tr key={e.id} className="text-sm">
                    <td className="tabular-nums whitespace-nowrap">{new Date(e.spentAt).toLocaleDateString()}</td>
                    {branchId === 'all' && <td className="text-base-content/70">{e.branchName ?? t('finance.expenses.orgWide')}</td>}
                    <td><span className="badge badge-sm badge-outline">{e.category}</span></td>
                    <td className="text-base-content/70">{e.note}</td>
                    <td className="text-right tabular-nums font-semibold text-warning">{money(e.amount)}</td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <button className="btn btn-ghost btn-square btn-xs" onClick={() => setModal(e)}><Pencil size={13} /></button>
                        <button className="btn btn-ghost btn-square btn-xs" onClick={() => setConfirmDelete(e.id)}><Trash2 size={13} className="text-error" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-base-300 bg-base-200/50 font-bold text-sm">
                    <td colSpan={branchId === 'all' ? 4 : 3}>{t('finance.common.total')}</td>
                    <td className="text-right tabular-nums">{money(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        <Card title={t('finance.expenses.catBreakdown')} bodyClass="p-4 h-[340px]">
          {catBreakdown.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {catBreakdown.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center">
              <div className="flex flex-col items-center gap-2 text-base-content/40">
                <PieIcon size={28} />
                <p className="text-sm">{t('finance.common.noData')}</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {modal && (
        <dialog className="modal modal-open">
          <div className="modal-backdrop" onClick={() => setModal(null)} />
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-base mb-4">{modal === 'create' ? t('finance.expenses.add') : t('finance.expenses.edit')}</h3>
            <ExpenseForm
              initial={modal === 'create' ? null : modal}
              branches={branches ?? []}
              onSubmit={modal === 'create' ? createExpense : updateExpense}
              onCancel={() => setModal(null)}
              t={t}
            />
          </div>
        </dialog>
      )}

      {confirmDelete && (
        <dialog className="modal modal-open">
          <div className="modal-backdrop" onClick={() => setConfirmDelete(null)} />
          <div className="modal-box max-w-sm">
            <p className="text-sm mb-4">{t('finance.common.confirmDelete')}</p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>{t('finance.common.cancel')}</button>
              <button className="btn btn-error btn-sm" onClick={() => deleteExpense(confirmDelete)}>{t('finance.common.delete')}</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
