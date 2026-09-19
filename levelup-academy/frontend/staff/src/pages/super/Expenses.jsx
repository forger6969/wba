import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Receipt, X, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import { useSuperDashboard } from '../../queries.js';
import { money } from '../../format.js';
import PageHeader from '../../components/PageHeader.jsx';
import { EmptyState, RowSkeleton } from '../mentor/_ui.jsx';

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

const emptyForm = () => ({
  branchId: 'organization', category: '', amount: '',
  spentAt: new Date().toISOString().slice(0, 10), note: '',
});

export default function SuperExpenses() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const { token } = useAuth();
  const { data, isLoading, error, refetch } = useSuperDashboard();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [branchId, setBranchId] = useState('');
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const branches = data?.branches || [];

  const loadExpenses = async () => {
    setListLoading(true);
    setListError('');
    try {
      const result = await api.superExpenses(token, branchId);
      setRows(result?.expenses || []);
    } catch (e) {
      setListError(e.message || t('super.expenses.loadError'));
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { loadExpenses(); }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        category: form.category.trim(),
        amount: Number(form.amount),
        spentAt: form.spentAt || undefined,
        note: form.note.trim() || undefined,
      };
      if (form.id) await api.superUpdateExpense(token, form.id, payload);
      else await api.superCreateExpense(token, {
        ...payload,
        branchId: form.branchId === 'organization' ? null : form.branchId,
      });
      setForm(null);
      await Promise.all([refetch(), loadExpenses()]);
    } catch (e) {
      setFormError(e.message || t('super.expenses.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expense) => {
    if (!confirm(t('super.expenses.deleteConfirm', { category: expense.category, amount: money(expense.amount) }))) return;
    try {
      await api.superDeleteExpense(token, expense.id);
      await Promise.all([refetch(), loadExpenses()]);
    } catch (e) {
      setListError(e.message || t('super.expenses.deleteError'));
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title={t('super.expenses.title')} subtitle={t('super.expenses.subtitle')}>
        <button className="btn btn-primary btn-sm gap-1.5" onClick={() => setForm({ ...emptyForm(), branchId: branchId || 'organization' })}>
          <Plus size={15} /> {t('super.expenses.addExpense')}
        </button>
      </PageHeader>

      {isLoading ? <RowSkeleton count={4} /> : error ? (
        <div className="alert alert-error">{error.message}</div>
      ) : branches.length > 0 ? (
        <div className="card bg-base-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>{t('super.expenses.colBranch')}</th><th className="text-right">{t('super.expenses.colRevenue')}</th><th className="text-right">{t('super.expenses.colExpense')}</th><th className="text-right">{t('super.expenses.colProfit')}</th></tr></thead>
              <tbody>{branches.map((b) => (
                <tr key={b.id}>
                  <td className="font-semibold">{b.name}</td>
                  <td className="text-right tabular-nums text-success">{money(b.revenue || 0)}</td>
                  <td className="text-right tabular-nums text-error">{money(b.expenses || 0)}</td>
                  <td className="text-right tabular-nums font-bold">{money((b.revenue || 0) - (b.expenses || 0))}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ) : null}

      {(
        <div className="card bg-base-100 overflow-hidden">
          <div className="p-4 border-b border-base-200 flex flex-wrap items-center justify-between gap-3">
            <select className="select select-bordered select-sm min-w-56" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{t('super.expenses.allCenterExpenses')}</option>
              <option value="organization">{t('super.expenses.wholeCenter')}</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm gap-1.5" onClick={loadExpenses} disabled={listLoading}><RefreshCw size={14} /> {t('super.expenses.refresh')}</button>
          </div>
          {listLoading ? <div className="p-5"><RowSkeleton count={3} /></div> : listError ? (
            <div className="alert alert-error m-4">{listError}</div>
          ) : rows.length === 0 ? (
            <EmptyState icon={Receipt} title={branchId === 'organization' ? t('super.expenses.emptyOrg') : branchId ? t('super.expenses.emptyBranch') : t('super.expenses.emptyAll')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>{t('super.expenses.colDate')}</th><th>{t('super.expenses.colBelongsTo')}</th><th>{t('super.expenses.colCategory')}</th><th>{t('super.expenses.colNote')}</th><th className="text-right">{t('super.expenses.colAmount')}</th><th className="w-24" /></tr></thead>
                <tbody>{rows.map((expense) => (
                  <tr key={expense.id}>
                    <td className="whitespace-nowrap">{new Date(expense.spentAt).toLocaleDateString(locale)}</td>
                    <td><span className={`badge ${expense.scope === 'organization' ? 'badge-primary' : 'badge-ghost'}`}>{expense.scope === 'organization' ? t('super.expenses.wholeCenter') : expense.branchName || branches.find((b) => b.id === expense.branchId)?.name || t('super.expenses.branchFallback')}</span></td>
                    <td><span className="badge badge-ghost">{expense.category}</span></td>
                    <td className="max-w-64 truncate text-base-content/60">{expense.note || '—'}</td>
                    <td className="text-right font-bold tabular-nums">{money(expense.amount)}</td>
                    <td><div className="flex justify-end gap-1">
                      <button className="btn btn-ghost btn-xs btn-square" aria-label={t('super.expenses.editTooltip')} onClick={() => setForm({ ...expense, branchId: expense.branchId || 'organization', amount: String(expense.amount), spentAt: String(expense.spentAt).slice(0, 10), note: expense.note || '' })}><Pencil size={14} /></button>
                      <button className="btn btn-ghost btn-xs btn-square text-error" aria-label={t('super.expenses.deleteTooltip')} onClick={() => remove(expense)}><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {form && (
        <div className="modal modal-open" role="dialog">
          <div className="modal-box max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <div><h3 className="font-extrabold text-lg">{form.id ? t('super.expenses.editExpenseTitle') : t('super.expenses.newExpenseTitle')}</h3><p className="text-xs text-base-content/50">{t('super.expenses.modalHint')}</p></div>
              <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setForm(null)}><X size={17} /></button>
            </div>
            <div className="grid gap-4">
              <select className="select select-bordered" value={form.branchId} disabled={!!form.id} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                <option value="organization">{t('super.expenses.wholeCenter')}</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input className="input input-bordered" placeholder={t('super.expenses.categoryPlaceholder')} maxLength={60} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <div className="grid sm:grid-cols-2 gap-4">
                <input className="input input-bordered" type="number" min="1" placeholder={t('super.expenses.amountPlaceholder')} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <input className="input input-bordered" type="date" value={form.spentAt} onChange={(e) => setForm({ ...form, spentAt: e.target.value })} />
              </div>
              <textarea className="textarea textarea-bordered" placeholder={t('super.expenses.notePlaceholder')} maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              {formError && <div className="alert alert-error text-sm">{formError}</div>}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setForm(null)} disabled={saving}>{t('super.expenses.cancel')}</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.branchId || !form.category.trim() || !(Number(form.amount) > 0)}>{saving ? t('super.expenses.saving') : t('super.expenses.save')}</button>
            </div>
          </div>
          <button className="modal-backdrop" onClick={() => setForm(null)}>close</button>
        </div>
      )}
    </div>
  );
}
