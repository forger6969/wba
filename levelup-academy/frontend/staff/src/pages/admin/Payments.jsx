import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Wallet, CreditCard, Banknote, Clock, CheckCircle2, AlertTriangle,
  AlertCircle, TrendingUp, Search, ChevronLeft, ChevronRight, Plus, X,
  Upload, RotateCcw, Ban, Info, Download
} from 'lucide-react';
import { money, dateShort } from '../../format.js';
import { useAuth } from '../../auth.jsx';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdminInvoices, useAdminStudents } from '../../queries.js';
import { api } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import ExportDialog from '../../components/ExportDialog.jsx';
import { Avatar, Kpi, RowSkeleton, Tip } from '../mentor/_ui.jsx';
import { paymentMethodLabel } from '../finance/_ui.jsx';

const statusMap = (t) => ({
  paid: { label: t('status.paid'), className: 'bg-success/10 text-success', icon: CheckCircle2 },
  partially_paid: { label: t('status.partiallyPaid'), className: 'bg-success/10 text-success', icon: Clock },
  pending: { label: t('status.pending'), className: 'bg-base-200 text-base-content/70', icon: AlertCircle },
  overdue: { label: t('status.overdue'), className: 'bg-error/10 text-error', icon: AlertTriangle },
  cancelled: { label: t('status.cancelled'), className: 'bg-base-200 text-base-content/70', icon: AlertCircle },
});

const STATUS_LIST = ['all', 'pending', 'partially_paid', 'paid', 'overdue', 'cancelled'];
const statusLabelsMap = (t) => ({
  all: t('admin.payments.filterAll'), pending: t('status.pending'), partially_paid: t('status.partiallyPaid'),
  paid: t('status.paid'), overdue: t('status.overdue'), cancelled: t('status.cancelled'),
});

/* ══════════ StatCard ══════════ */
/* ══════════ SplitPartsForm (reused in pay + ad-hoc modals) ══════════ */
function SplitPartsForm({ parts, onChange, onAdd, onRemove, maxParts = 5 }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      {parts.map((part, i) => (
        <div key={i} className="flex items-center gap-2">
          <select className="select select-bordered select-sm w-[120px]" value={part.method}
            onChange={(e) => onChange(i, 'method', e.target.value)}>
            <option value="cash">{paymentMethodLabel('cash', t)}</option>
            <option value="card">{paymentMethodLabel('card', t)}</option>
            <option value="transfer">{paymentMethodLabel('transfer', t)}</option>
          </select>
          <input className="input input-bordered input-sm flex-1" type="number" placeholder={t('admin.payments.amountPlaceholder')}
            value={part.amount} onChange={(e) => onChange(i, 'amount', e.target.value)} />
          {parts.length > 1 && (
            <button className="btn btn-ghost btn-xs text-error" onClick={() => onRemove(i)}><X size={14} /></button>
          )}
        </div>
      ))}
      {parts.length < maxParts && (
        <button className="btn btn-ghost btn-xs gap-1" onClick={onAdd}>
          <Plus size={12} /> {t('admin.payments.addPart')}
        </button>
      )}
    </div>
  );
}

/* ══════════ Invoice Card ══════════ */
function InvoiceCard({ inv, onPay, onDetail, onStudentClick }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const STATUS = statusMap(t);
  const st = STATUS[inv.status] || STATUS.pending;
  const StIcon = st.icon;
  const total = Number(inv.totalAmount || inv.amount || 0);
  const paid = Number(inv.paidAmount || inv.paid_amount || 0);
  const remaining = total - paid;
  const paidPercent = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const studentName = inv.student || inv.studentName || '';

  return (
    <div className="card bg-base-100 p-5 card-hover-premium group">
      <div className="flex items-start gap-3 mb-3">
        {/* Student avatar */}
        <div onClick={() => onStudentClick(inv)} title={t('admin.payments.openStudentProfile')} className="shrink-0 cursor-pointer">
          <Avatar name={studentName} size="lg" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-base-content truncate cursor-pointer hover:text-secondary transition-colors"
            onClick={() => onStudentClick(inv)}>
            {studentName || '—'}
          </h3>
          <p className="text-[11px] text-base-content/45 mt-0.5 truncate">{inv.group || inv.groupName || '—'}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ml-2 ${st.className}`}>
          <StIcon size={12} /> {st.label}
        </span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-bold text-base-content/45 uppercase tracking-wider">{t('admin.payments.amount')}</div>
          <div className="text-[18px] font-extrabold text-base-content tabular-nums">{money(total, 'UZS', lang)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-base-content/45 uppercase tracking-wider">{t('admin.payments.paidAmount')}</div>
          <div className="text-[14px] font-bold tabular-nums text-success">{money(paid, 'UZS', lang)}</div>
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full bg-base-100 mb-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 bg-success" style={{ width: `${paidPercent}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <button className="flex items-center gap-1 text-[11px] text-base-content/45 hover:text-secondary transition-colors"
          onClick={() => onDetail(inv)}>
          <Info size={10} /> {t('admin.payments.details')}
        </button>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] text-base-content/45">
            <Clock size={10} /> {dateShort(inv.dueDate || inv.due_date, lang)}
          </span>
          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
            <button className="btn btn-primary btn-sm gap-1 h-7 px-3" onClick={() => onPay(inv)}>
              <Wallet size={12} /> {remaining > 0 ? money(remaining, 'UZS', lang) : t('admin.payments.pay')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ Main Payments ═══════════════ */
export default function AdminPayments() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const STATUS = statusMap(t);
  const STATUS_LABELS = statusLabelsMap(t);
  const { token } = useAuth();
  const navigate = useNavigate();
  const params = useParams();

  // Filter & pagination
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 15;
  const [searchQuery, setSearchQuery] = useState('');

  // Pay modal
  const [pay, setPay] = useState(null);
  const [payParts, setPayParts] = useState([{ method: 'cash', amount: '' }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Ad-hoc modal - pre-fill from URL params if provided
  const [showAdHoc, setShowAdHoc] = useState(false);
  const [adhocForm, setAdhocForm] = useState({
    studentName: '',
    studentId: params.studentId || '',
    totalAmount: params.amount || '',
  });
  const [adhocParts, setAdhocParts] = useState([{ method: 'cash', amount: '' }]);
  const [studentSearch, setStudentSearch] = useState('');
  const [adhocLoading, setAdhocLoading] = useState(false);

  // Stale-fetch guard: student tez-tez almashtirilsa, eski adminStudentDetail
  // natijasi yangi tanlangan student ustiga yozilmasligi uchun.
  const adhocSelectRef = useRef(null);

  // Clear params after using them
  useEffect(() => {
    if (params.studentId || params.amount) {
      // Params will be used on first render
    }
  }, []);

  // Backend requires parts sum == totalAmount exactly (validation would fail
  // otherwise). With a single part we mirror the invoice amount automatically.
  useEffect(() => {
    if (adhocParts.length === 1 && adhocForm.totalAmount) {
      const v = String(Number(adhocForm.totalAmount) || '');
      if (adhocParts[0].amount !== v) {
        setAdhocParts([{ method: adhocParts[0].method, amount: v }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adhocForm.totalAmount]);

  // Invoice detail modal
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('transactions');
  const [reverseTxId, setReverseTxId] = useState(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseMode, setReverseMode] = useState('refund');

  // Receipt upload
  const [uploadTxId, setUploadTxId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Export dialog
  const [showExport, setShowExport] = useState(false);

  // Store transactions from pay responses (keyed by invoice ID)
  const txStore = useRef({});
  const storeTx = useCallback((invoiceId, transactions) => {
    txStore.current[invoiceId] = [
      ...(txStore.current[invoiceId] || []),
      ...transactions,
    ];
  }, []);

  const qs = `?page=${page}&limit=${limit}`;
  const { data, isLoading, error, refetch } = useAdminInvoices(qs);
  const { data: studentsData } = useAdminStudents('?limit=100');

  const raw = data?.data || data || {};
  const allRows = raw.invoices || [];
  const meta = raw.meta || {};
  const totalPages = meta.totalPages || Math.ceil((meta.total || allRows.length) / limit) || 1;
  const students = studentsData?.data?.students || studentsData?.students || [];

  // Client-side search + status filter
  const rows = useMemo(() => {
    let result = allRows;
    if (statusFilter !== 'all') {
      result = result.filter((inv) => inv.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((inv) => {
        const name = (inv.student || inv.studentName || '').toLowerCase();
        const group = (inv.group || inv.groupName || '').toLowerCase();
        return name.includes(q) || group.includes(q);
      });
    }
    return result;
  }, [allRows, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = allRows.reduce((s, inv) => s + Number(inv.totalAmount || inv.amount || 0), 0);
    return {
      total,
      paid: allRows.filter((inv) => inv.status === 'paid').length,
      waiting: allRows.filter((inv) => inv.status === 'pending' || inv.status === 'partially_paid').length,
      overdue: allRows.filter((inv) => inv.status === 'overdue').length,
    };
  }, [allRows]);

  /* ─── Pay Invoice ─── */
  const openPay = (inv) => {
    const remaining = Number(inv.totalAmount || inv.amount || 0) - Number(inv.paidAmount || inv.paid_amount || 0);
    setPay(inv);
    setPayParts([{ method: 'cash', amount: String(remaining) }]);
    setErr('');
  };
  const payPartsSum = payParts.reduce((s, p) => s + Number(p.amount || 0), 0);
  const submitPay = async () => {
    setBusy(true); setErr('');
    try {
      const res = await api.adminPayInvoice(token, pay.id, {
        parts: payParts.map((p) => ({ method: p.method, amount: Number(p.amount) })),
      });
      if (res.transactions) storeTx(pay.id, res.transactions);
      setPay(null);
      refetch();
    } catch (e) {
      setErr(e.message || t('admin.payments.genericError'));
    } finally {
      setBusy(false);
    }
  };

  /* ─── Filtered students for ad-hoc search ─── */
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter((s) => {
      const name = [s.firstName || '', s.lastName || ''].filter(Boolean).join(' ').toLowerCase();
      const date = s.createdAt || s.created_at || '';
      return name.includes(q) || date.includes(q);
    });
  }, [students, studentSearch]);

  /* ─── Ad-hoc Payment ─── */
  const adhocTotal = adhocParts.reduce((s, p) => s + Number(p.amount || 0), 0);
  const submitAdHoc = async () => {
    const total = Number(adhocForm.totalAmount) || 0;
    // Backend createAdHocPaymentSchema parts yig'indisi aynan totalAmount ga
    // teng bo'lishini talab qiladi — oldindan tekshirib friendly xato beramiz.
    if (Math.abs(adhocTotal - total) > 0.005) {
      setErr(t('admin.payments.sumMismatch', { parts: money(adhocTotal, 'UZS', lang), total: money(total, 'UZS', lang) }));
      return;
    }
    setBusy(true); setErr('');
    try {
      const body = {
        studentId: adhocForm.studentId,
        totalAmount: total,
        parts: adhocParts.map((p) => ({ method: p.method, amount: Number(p.amount) })),
      };
      const res = await api.adminAdHocPayment(token, body);
      if (res.transactions) storeTx(res.invoice?.id || 'adhoc', res.transactions);
      setShowAdHoc(false);
      setAdhocForm({ studentName: '', studentId: '', totalAmount: '' });
      setAdhocParts([{ method: 'cash', amount: '' }]);
      setStudentSearch('');
      refetch();
    } catch (e) {
      setErr(e.message || t('admin.payments.genericError'));
    } finally {
      setBusy(false);
    }
  };

  const selectStudent = async (s) => {
    const id = s.id;
    adhocSelectRef.current = id; // eng oxirgi tanlovni belgilaymiz
    setAdhocLoading(true); setErr('');
    setAdhocForm((f) => ({
      ...f,
      studentId: id,
      studentName: [s.firstName || '', s.lastName || ''].filter(Boolean).join(' '),
    }));
    setStudentSearch('');
    try {
      // Guruh narxini student detail dan olamiz va summani avtomatik to'ldiramiz
      const detail = await api.adminStudentDetail(token, id);
      // Stale guard: shu orada boshqa student tanlangan bo'lsa, eski natijani qo'llamaymiz
      if (adhocSelectRef.current !== id) return;
      const st = detail?.student || detail || {};
      const stGroups = Array.isArray(st.groups) ? st.groups : [];
      const price = stGroups.map((g) => Number(g.monthlyPrice) || 0).find((v) => v > 0) || 0;
      if (price > 0) {
        const v = String(price);
        setAdhocForm((f) => ({ ...f, totalAmount: v }));
        setAdhocParts((parts) =>
          parts.length === 1 ? [{ method: parts[0].method, amount: v }] : parts
        );
      }
    } catch (e) {
      setErr(e.message || t('admin.payments.studentFetchFailed'));
    } finally {
      setAdhocLoading(false);
    }
  };

  /* ─── Invoice Detail ─── */
  const openDetail = (inv) => {
    setDetail(inv);
    setDetailTab('transactions');
    setReverseTxId(null);
    setUploadTxId(null);
  };
  const invoiceTx = detail ? (txStore.current[detail.id] || []) : [];

  /* ─── Refund / Void ─── */
  const submitReverse = async () => {
    if (!reverseTxId || !reverseReason.trim()) return;
    setBusy(true);
    try {
      if (reverseMode === 'refund') {
        await api.adminRefundTransaction(token, reverseTxId, { reason: reverseReason });
      } else {
        await api.adminVoidTransaction(token, reverseTxId, { reason: reverseReason });
      }
      // Mark transaction locally
      const txs = txStore.current[detail?.id] || [];
      txStore.current[detail?.id] = txs.map((t) =>
        t.id === reverseTxId ? { ...t, status: reverseMode === 'refund' ? 'refunded' : 'voided' } : t
      );
      setReverseTxId(null);
      setReverseReason('');
      refetch();
    } catch (e) {
      setErr(e.message || t('admin.payments.genericError'));
    } finally {
      setBusy(false);
    }
  };

  /* ─── Receipt Upload ─── */
  const handleReceiptFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTxId) return;
    setUploading(true);
    try {
      const { uploadUrl, receiptKey } = await api.adminReceiptUploadUrl(
        token, uploadTxId, file.name, file.type
      );
      // Upload file to presigned URL
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      // Attach receipt key to transaction
      await api.adminAttachReceipt(token, uploadTxId, receiptKey);
      // Update local store
      const txs = txStore.current[detail?.id] || [];
      txStore.current[detail?.id] = txs.map((t) =>
        t.id === uploadTxId ? { ...t, receiptKey, receiptUploaded: true } : t
      );
      setUploadTxId(null);
      setUploadFile(null);
    } catch (er) {
      setErr(er.message || t('admin.payments.receiptUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-page-enter">
      <PageHeader title={t('admin.payments.title')} subtitle={t('admin.payments.subtitle')}>
        <div className="flex items-center gap-2.5">
          {allRows.length > 0 && (
            <span className="text-sm text-base-content/45 tabular-nums">{t('admin.payments.invoicesCount', { count: meta.total || allRows.length })}</span>
          )}
          <button className="btn btn-ghost btn-sm gap-1.5" onClick={() => setShowExport(true)} disabled={rows.length === 0}>
            <Download size={14} /> {t('admin.payments.export')}
          </button>
          <button
            className="btn btn-primary btn-sm gap-1.5"
            onClick={() => { setShowAdHoc(true); setErr(''); setStudentSearch(''); }}
          >
            <Plus size={14} /> {t('admin.payments.oneTimePayment')}
          </button>
        </div>
      </PageHeader>

      {/* ═══ Search & Filters ═══ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/45" />
          <input type="text" placeholder={t('admin.payments.searchPlaceholder')}
            className="w-full h-10 pl-9 pr-4 rounded-[12px] text-[13px] font-medium bg-base-100 border border-base-300 text-base-content placeholder:text-base-content/45 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_LIST.map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`h-8 px-3 rounded-lg text-[12px] font-bold transition-all ${statusFilter === s
                ? 'bg-secondary text-secondary-content shadow-sm'
                : 'bg-base-100 text-base-content/45 border border-base-300 hover:border-secondary/40'
              }`}>
              {STATUS_LABELS[s]}
              {s !== 'all' && (
                <span className="ml-1.5 text-[10px] opacity-70">{allRows.filter((inv) => inv.status === s).length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi Icon={TrendingUp} title={t('admin.payments.totalInvoices')} value={allRows.length}  tone="neutral" />
        <Kpi Icon={CheckCircle2} title={t('admin.payments.paid')} value={stats.paid}  tone="success" />
        <Kpi Icon={Clock} title={t('admin.payments.waiting')} value={stats.waiting}  tone="warning" />
        <Kpi Icon={AlertTriangle} title={t('admin.payments.overdue')} value={stats.overdue}  tone="danger" />
      </div>

      {/* ═══ Invoice List ═══ */}
      {isLoading ? (
        <div className="mt-4"><RowSkeleton count={6} /></div>
      ) : error ? (
        <div className="alert alert-error mt-4">{t('admin.payments.loadError', { message: error.message })}</div>
      ) : allRows.length === 0 ? (
        <div className="card bg-base-100 p-12 text-center animate-fade-in mt-4">
          <Wallet size={40} className="mx-auto mb-3 text-base-content/45 opacity-30" />
          <p className="text-[14px] font-medium text-base-content/45">{t('admin.payments.noInvoicesTitle')}</p>
          <p className="text-[12px] text-base-content/45 mt-1 opacity-60">{t('admin.payments.noInvoicesHint')}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card bg-base-100 p-8 text-center animate-fade-in mt-4">
          <Search size={32} className="mx-auto mb-2 text-base-content/45 opacity-30" />
          <p className="text-[13px] font-medium text-base-content/45">{t('admin.payments.nothingFoundTitle')}</p>
          <p className="text-[11px] text-base-content/45 mt-1 opacity-60">{t('admin.payments.nothingFoundHint')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((inv) => (
              <InvoiceCard key={inv.id} inv={inv} onPay={openPay} onDetail={openDetail} onStudentClick={(inv) => {
                let sid = inv.studentId || inv.student_id;
                // Fallback: studentId bo'lmasa, student nomi bo'yicha students list dan qidiramiz
                if (!sid && students.length > 0) {
                  const name = (inv.student || inv.studentName || '').toLowerCase();
                  const found = students.find((s) => {
                    const full = [s.firstName || '', s.lastName || ''].filter(Boolean).join(' ').toLowerCase();
                    return full === name || full.includes(name) || name.includes(full);
                  });
                  if (found) sid = found.id;
                }
                if (sid) navigate(`/students/${sid}`);
              }} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-base-content/45 tabular-nums">{t('admin.payments.pageOf', { page: meta.page || page, total: totalPages })}</span>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" disabled={(meta.page || page) <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={16} /></button>
                <button className="btn btn-ghost btn-sm" disabled={(meta.page || page) >= totalPages}
                  onClick={() => setPage((p) => p + 1)}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </>
      )}

      <ExportDialog open={showExport} onClose={() => setShowExport(false)} pageKey="payments" data={rows} />

      {/* ═══════════════ MODAL: Pay Invoice ═══════════════ */}
      {pay && createPortal(
        <dialog className="modal modal-open">
          <div className="modal-box card bg-base-100 border border-base-300">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-lg">{t('admin.payments.acceptPaymentTitle')}</h3>
              <button className="btn btn-ghost btn-sm btn-square -mt-1 -mr-1" onClick={() => setPay(null)}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
            </div>
            <p className="text-sm text-base-content/45 mb-4">{pay.student} · {pay.group || '—'}</p>
            <p className="text-xs text-base-content/45 mb-3">
              {t('admin.payments.invoiceLine', {
                date: dateShort(pay.dueDate || pay.due_date, lang),
                amount: money(Number(pay.totalAmount || pay.amount || 0) - Number(pay.paidAmount || pay.paid_amount || 0), 'UZS', lang),
              })}
            </p>
            {err && <div className="alert alert-error mb-3 py-2 text-sm">{err}</div>}
            <SplitPartsForm parts={payParts} onChange={(i, f, v) => {
              const u = [...payParts]; u[i] = { ...u[i], [f]: v }; setPayParts(u);
            }} onAdd={() => setPayParts([...payParts, { method: 'card', amount: '' }])}
              onRemove={(i) => setPayParts(payParts.filter((_, idx) => idx !== i))} />
            {payParts.length > 1 && (
              <p className="text-xs text-base-content/45 mt-2 tabular-nums">
                {t('admin.payments.total', { amount: money(payPartsSum, 'UZS', lang) })}
                {payPartsSum > Number(pay.totalAmount || pay.amount || 0) - Number(pay.paidAmount || pay.paid_amount || 0) && (
                  <span className="text-error ml-1">· {t('admin.payments.exceedsRemaining')}</span>
                )}
              </p>
            )}
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setPay(null)} disabled={busy}>{t('admin.payments.cancel')}</button>
              <button className="btn btn-primary" onClick={submitPay}
                disabled={busy || payParts.some((p) => !p.amount || Number(p.amount) <= 0) || payPartsSum > Number(pay.totalAmount || pay.amount || 0) - Number(pay.paidAmount || pay.paid_amount || 0)}>
                {busy && <span className="loading loading-spinner loading-xs" />} {t('admin.payments.accept')}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setPay(null)} />
        </dialog>
      , document.body)}

      {/* ═══════════════ MODAL: Razoviy (Ad-hoc) Payment ═══════════════ */}
      {showAdHoc && createPortal(
        <dialog className="modal modal-open">
          <div className="modal-box card bg-base-100 border border-base-300 max-w-lg">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-lg">{t('admin.payments.oneTimeTitle')}</h3>
              <button className="btn btn-ghost btn-sm btn-square -mt-1 -mr-1" onClick={() => { setShowAdHoc(false); setErr(''); setStudentSearch(''); }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
            </div>
            <p className="text-sm text-base-content/45 mb-4">{t('admin.payments.oneTimeHint')}</p>
            {err && <div className="alert alert-error mb-3 py-2 text-sm">{err}</div>}

            <div className="space-y-3">
              {/* Searchable student selection */}
              <div>
                <label className="text-[11px] font-bold text-base-content/45 uppercase tracking-wider block mb-1">{t('admin.payments.studentLabel')}</label>
                {adhocForm.studentId && adhocForm.studentName ? (
                  <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-base-100 border border-base-300">
                    <div className="flex items-center gap-2">
                      <Avatar name={adhocForm.studentName} size="sm" />
                      <span className="text-[13px] font-bold text-base-content">{adhocForm.studentName}</span>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={() => {
                      setAdhocForm({ ...adhocForm, studentId: '', studentName: '' });
                      setStudentSearch('');
                    }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/45" />
                    <input type="text" className="w-full h-10 pl-9 pr-4 rounded-[10px] text-[13px] bg-base-100 border border-base-300 text-base-content placeholder:text-base-content/45 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
                      placeholder={t('admin.payments.studentSearchPlaceholder')}
                      value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                      autoFocus />
                    {studentSearch && filteredStudents.length > 0 && (
                      <div className="popover-surface absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-[10px] border border-base-300 shadow-lg z-50">
                        {filteredStudents.map((s) => (
                          <button key={s.id} type="button"
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-base-200 transition-colors border-b border-base-300 last:border-0"
                            onClick={() => selectStudent(s)}>
                            <Avatar name={[s.firstName || '', s.lastName || ''].filter(Boolean).join(' ')} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-bold text-base-content truncate">{[s.firstName || '', s.lastName || ''].filter(Boolean).join(' ')}</div>
                              <div className="text-[10px] text-base-content/45">{Array.isArray(s.groups) && s.groups.length ? s.groups.map((g) => g.name || g.groupName).filter(Boolean).join(', ') : (s.groupName || '—')} · {s.createdAt ? dateShort(s.createdAt, lang) : ''}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {studentSearch && filteredStudents.length === 0 && (
                      <p className="text-[11px] text-base-content/45 mt-1 pl-1">{t('admin.payments.studentNotFound')}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Total amount */}
              <div>
                <label className="text-[11px] font-bold text-base-content/45 uppercase tracking-wider block mb-1">{t('admin.payments.invoiceAmountLabel')} {adhocLoading && <span className="loading loading-spinner loading-xs text-secondary ml-1 align-middle" />}</label>
                <input className="input input-bordered w-full h-10 text-[13px]" type="number" placeholder={t('admin.payments.amountPlaceholder')}
                  value={adhocForm.totalAmount}
                  onChange={(e) => setAdhocForm((f) => ({ ...f, totalAmount: e.target.value }))} />
              </div>

              {/* Split parts */}
              <div>
                <label className="text-[11px] font-bold text-base-content/45 uppercase tracking-wider block mb-1">{t('admin.payments.partsLabel')}</label>
                <SplitPartsForm parts={adhocParts}
                  onChange={(i, f, v) => {
                    const u = [...adhocParts]; u[i] = { ...u[i], [f]: v }; setAdhocParts(u);
                  }}
                  onAdd={() => setAdhocParts([...adhocParts, { method: 'card', amount: '' }])}
                  onRemove={(i) => setAdhocParts(adhocParts.filter((_, idx) => idx !== i))}
                  maxParts={5} />
              </div>

              {adhocParts.length > 1 && (
                <p className={`text-xs tabular-nums ${adhocTotal > Number(adhocForm.totalAmount) ? 'text-error' : 'text-base-content/45'}`}>
                  {t('admin.payments.partsTotal', { amount: money(adhocTotal, 'UZS', lang) })}
                  {adhocTotal > Number(adhocForm.totalAmount) && (
                    <span className="ml-1">· {t('admin.payments.exceedsInvoice')}</span>
                  )}
                  {adhocTotal < Number(adhocForm.totalAmount) && (
                    <span className="ml-1 text-success">· {t('admin.payments.remaining', { amount: money(Number(adhocForm.totalAmount) - adhocTotal, 'UZS', lang) })}</span>
                  )}
                </p>
              )}

              {/* Comment field removed: backend createAdHocPaymentSchema doesn't accept it */}

            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => { setShowAdHoc(false); setErr(''); setStudentSearch(''); }} disabled={busy}>{t('admin.payments.cancel')}</button>
              <button className="btn btn-primary" onClick={submitAdHoc}
                disabled={busy || !adhocForm.studentId || !adhocForm.totalAmount || Number(adhocForm.totalAmount) <= 0 || adhocTotal <= 0 || adhocTotal > Number(adhocForm.totalAmount)}>
                {busy && <span className="loading loading-spinner loading-xs" />} {t('admin.payments.create')}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { setShowAdHoc(false); setErr(''); setStudentSearch(''); }} />
        </dialog>
      , document.body)}

      {/* ═══════════════ MODAL: Invoice Detail ═══════════════ */}
      {detail && createPortal(
        <dialog className="modal modal-open">
          <div className="modal-box card bg-base-100 border border-base-300 max-w-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{detail.student || '—'}</h3>
                <p className="text-sm text-base-content/45">{detail.group || '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${(STATUS[detail.status] || STATUS.pending).className}`}>
                  {(STATUS[detail.status] || STATUS.pending).icon && (
                    <StatusIcon s={detail.status} />
                  )}
                  {(STATUS[detail.status] || STATUS.pending).label}
                </span>
                <button className="btn btn-ghost btn-sm btn-square -mt-1 -mr-1" onClick={() => { setDetail(null); setErr(''); }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="card bg-base-100 p-3 text-center">
                <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.payments.summary')}</div>
                <div className="text-[16px] font-extrabold tabular-nums">{money(Number(detail.totalAmount || detail.amount || 0), 'UZS', lang)}</div>
              </div>
              <div className="card bg-base-100 p-3 text-center">
                <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.payments.paidAmount')}</div>
                <div className="text-[16px] font-extrabold tabular-nums" style={{ color: '#2ECC71' }}>{money(Number(detail.paidAmount || detail.paid_amount || 0), 'UZS', lang)}</div>
              </div>
              <div className="card bg-base-100 p-3 text-center">
                <div className="text-[10px] font-bold text-base-content/45 uppercase">{t('admin.payments.dueDate')}</div>
                <div className="text-[12px] font-bold tabular-nums">{dateShort(detail.dueDate || detail.due_date, lang)}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-3 border-b border-base-300 pb-2">
              <button className={`text-[12px] font-bold px-3 py-1 rounded-lg transition-all ${detailTab === 'transactions' ? 'bg-secondary text-secondary-content' : 'text-base-content/45 hover:text-base-content'}`}
                onClick={() => setDetailTab('transactions')}>
                {t('admin.payments.transactions', { count: invoiceTx.length })}
              </button>
              <button className={`text-[12px] font-bold px-3 py-1 rounded-lg transition-all ${detailTab === 'reverse' ? 'bg-secondary text-secondary-content' : 'text-base-content/45 hover:text-base-content'}`}
                onClick={() => setDetailTab('reverse')}>
                {t('admin.payments.reverseTab')}
              </button>
              <button className={`text-[12px] font-bold px-3 py-1 rounded-lg transition-all ${detailTab === 'receipt' ? 'bg-secondary text-secondary-content' : 'text-base-content/45 hover:text-base-content'}`}
                onClick={() => setDetailTab('receipt')}>
                {t('admin.payments.receiptTab')}
              </button>
            </div>

            {/* ── Tab: Transactions ── */}
            {detailTab === 'transactions' && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {invoiceTx.length === 0 ? (
                  <p className="text-[12px] text-base-content/45 text-center py-4">{t('admin.payments.noTransactions')}</p>
                ) : (
                  invoiceTx.map((tx, i) => (
                    <div key={tx.id || i} className="flex items-center justify-between p-2.5 rounded-[10px] bg-base-100">
                      <div className="flex items-center gap-2">
                        {tx.method === 'cash' ? <Banknote size={14} className="text-base-content/45" />
                          : tx.method === 'card' ? <CreditCard size={14} className="text-base-content/45" />
                            : <Wallet size={14} className="text-base-content/45" />}
                        <div>
                          <span className="text-[12px] font-bold text-base-content">{paymentMethodLabel(tx.method, t)}</span>
                          <span className={`ml-2 text-[11px] font-semibold ${tx.status === 'completed' ? 'text-success' : tx.status === 'refunded' ? 'text-error' : 'text-warning'}`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                      <span className="text-[13px] font-bold tabular-nums">{money(Number(tx.amount), 'UZS', lang)}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Tab: Refund / Void ── */}
            {detailTab === 'reverse' && (
              <div className="space-y-3">
                <p className="text-[12px] text-base-content/45">{t('admin.payments.chooseCompletedTx')}</p>
                {invoiceTx.filter((t) => t.status === 'completed').length === 0 ? (
                  <p className="text-[12px] text-base-content/45 text-center py-4">{t('admin.payments.noCompletedTx')}</p>
                ) : (
                  <select className="select select-bordered w-full text-[13px]"
                    value={reverseTxId || ''} onChange={(e) => setReverseTxId(e.target.value)}>
                    <option value="">{t('admin.payments.chooseTx')}</option>
                    {invoiceTx.filter((t) => t.status === 'completed').map((tx, i) => (
                      <option key={tx.id || i} value={tx.id}>
                        {paymentMethodLabel(tx.method, t)} — {money(Number(tx.amount), 'UZS', lang)} ({tx.id?.slice(0, 8) || '—'})
                      </option>
                    ))}
                  </select>
                )}
                {reverseTxId && (
                  <>
                    <div className="flex gap-2">
                      <button className={`flex-1 h-9 rounded-[10px] text-[12px] font-bold transition-all ${reverseMode === 'refund' ? 'bg-error text-white' : 'bg-base-100 text-base-content/45'}`}
                        onClick={() => setReverseMode('refund')}>
                        <RotateCcw size={14} className="inline mr-1" /> {t('admin.payments.refund')}
                      </button>
                      <button className={`flex-1 h-9 rounded-[10px] text-[12px] font-bold transition-all ${reverseMode === 'void' ? 'bg-warning text-white' : 'bg-base-100 text-base-content/45'}`}
                        onClick={() => setReverseMode('void')}>
                        <Ban size={14} className="inline mr-1" /> {t('admin.payments.void')}
                      </button>
                    </div>
                    <input className="input input-bordered w-full text-[13px]" type="text"
                      placeholder={t('admin.payments.reasonPlaceholder')} value={reverseReason}
                      onChange={(e) => setReverseReason(e.target.value)} />
                    <button className="btn btn-error btn-sm w-full" onClick={submitReverse}
                      disabled={busy || (reverseMode === 'refund' && !reverseReason.trim())}>
                      {busy && <span className="loading loading-spinner loading-xs" />}
                      {reverseMode === 'refund' ? t('admin.payments.doRefund') : t('admin.payments.doVoid')}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── Tab: Receipt ── */}
            {detailTab === 'receipt' && (
              <div className="space-y-3">
                <p className="text-[12px] text-base-content/45">{t('admin.payments.uploadReceiptLabel')}</p>
                {invoiceTx.filter((t) => t.status === 'completed').length === 0 ? (
                  <p className="text-[12px] text-base-content/45 text-center py-4">{t('admin.payments.noCompletedTx')}</p>
                ) : (
                  <select className="select select-bordered w-full text-[13px]"
                    value={uploadTxId || ''} onChange={(e) => setUploadTxId(e.target.value)}>
                    <option value="">{t('admin.payments.chooseTx')}</option>
                    {invoiceTx.filter((t) => t.status === 'completed').map((tx, i) => (
                      <option key={tx.id || i} value={tx.id}>
                        {paymentMethodLabel(tx.method, t)} — {money(Number(tx.amount), 'UZS', lang)}
                        {tx.receiptKey ? t('admin.payments.receiptExists') : ''}
                      </option>
                    ))}
                  </select>
                )}
                {uploadTxId && (
                  <div className="border-2 border-dashed border-base-300 rounded-[12px] p-6 text-center hover:border-secondary/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('receipt-file-input')?.click()}>
                    <Upload size={24} className="mx-auto mb-2 text-base-content/45" />
                    <p className="text-[12px] text-base-content/45">{uploadFile ? uploadFile.name : t('admin.payments.clickToChooseFile')}</p>
                    <input id="receipt-file-input" type="file" accept="image/*,.pdf" className="hidden"
                      onChange={(e) => {
                        setUploadFile(e.target.files?.[0] || null);
                        handleReceiptFile(e);
                      }} />
                  </div>
                )}
                {uploading && (
                  <div className="flex items-center justify-center gap-2 text-[12px] text-base-content/45">
                    <span className="loading loading-spinner loading-xs" /> {t('admin.payments.uploading')}
                  </div>
                )}
              </div>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => { setDetail(null); setErr(''); }}>{t('admin.payments.close')}</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => { setDetail(null); setErr(''); }} />
        </dialog>
      , document.body)}
    </div>
  );
}

/* Tiny helper for status icon */
function StatusIcon({ s }) {
  const { t } = useTranslation();
  const STATUS = statusMap(t);
  const st = STATUS[s] || STATUS.pending;
  const Ic = st.icon;
  return <Ic size={12} className="inline" />;
}
