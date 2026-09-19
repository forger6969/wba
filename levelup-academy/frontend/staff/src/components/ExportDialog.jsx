import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, FileText, FileDown, FileCode2, X, Check, AlertTriangle } from 'lucide-react';
import { exportData, pageExportConfigFor } from '../utils/exportUtils.js';

const formatOptionsFor = (t) => [
  {
    key: 'excel',
    label: 'Excel',
    ext: '.xlsx',
    icon: FileSpreadsheet,
    color: '#217346',
    bg: 'rgba(33,115,70,0.10)',
    desc: t('components.exportDialog.excelDesc'),
  },
  {
    key: 'pdf',
    label: 'PDF',
    ext: '.pdf',
    icon: FileDown,
    color: '#E8543E',
    bg: 'rgba(232,84,62,0.10)',
    desc: t('components.exportDialog.pdfDesc'),
  },
];

/**
 * ExportDialog — modal for choosing export format and triggering download.
 *
 * Props:
 *   open       — boolean
 *   onClose    — () => void
 *   pageKey    — key into PAGE_EXPORT_CONFIG (e.g. 'students', 'groups', etc.)
 *   data       — array of current filtered rows to export
 *   filename   — optional override for filename (without extension)
 *   columns    — optional column defs, overriding the pageKey lookup. Needed by
 *                attendance, whose columns depend on the month and the group's
 *                schedule and so cannot be a fixed entry in the registry.
 *   title      — optional starting title, overriding the registry's
 */
export default function ExportDialog({ open, onClose, pageKey, data = [], filename, columns, title: titleProp }) {
  const { t } = useTranslation();
  const FORMAT_OPTIONS = formatOptionsFor(t);
  const config = pageExportConfigFor()[pageKey] || {};
  const cols = columns ?? config.columns ?? [];
  const [format, setFormat] = useState('excel');
  const [title, setTitle] = useState(titleProp || config.title || t('components.exportDialog.defaultTitle'));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const handleExport = useCallback(async () => {
    if (!data.length || busy) return;
    setBusy(true);
    setError('');
    setWarning('');
    try {
      const fn = filename || config.filenamePrefix || 'export';
      const result = await exportData(format, data, cols, fn, title, pageKey);
      setDone(true);
      // PDF reports which font it ended up with. A helvetica fallback means
      // Cyrillic will not render — say so instead of handing over a broken file
      // that looks like a success. The file downloaded either way, so this is a
      // warning, not an error; keep the dialog open so it can actually be read.
      if (format === 'pdf' && result && result.hasCyrillic === false) {
        setWarning(t('components.exportDialog.cyrillicWarning'));
        return;
      }
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Export error:', err);
      setError(err?.message || t('components.exportDialog.genericError'));
    } finally {
      setBusy(false);
    }
  }, [format, data, config, title, filename, busy, onClose]);

  const getThemeByPage = (key) => {
    switch (key) {
      case 'payments':
      case 'expenses':
        return { iconBg: 'bg-emerald-500', iconColor: 'text-white', btnColor: 'bg-emerald-500 hover:bg-emerald-600 text-white border-none', borderColor: '#10b981' };
      case 'reports':
        return { iconBg: 'bg-purple-500', iconColor: 'text-white', btnColor: 'bg-purple-500 hover:bg-purple-600 text-white border-none', borderColor: '#a855f7' };
      case 'groups':
      case 'groupStudents':
        return { iconBg: 'bg-amber-500', iconColor: 'text-white', btnColor: 'bg-amber-500 hover:bg-amber-600 text-white border-none', borderColor: '#f59e0b' };
      case 'students':
      case 'studentDetail':
        return { iconBg: 'bg-blue-500', iconColor: 'text-white', btnColor: 'bg-blue-500 hover:bg-blue-600 text-white border-none', borderColor: '#3b82f6' };
      default:
        return { iconBg: 'bg-primary', iconColor: 'text-primary-content', btnColor: 'btn-primary', borderColor: 'var(--primary)' };
    }
  };
  const theme = getThemeByPage(pageKey);

  if (!open) return null;

  return createPortal(
    <dialog className="modal modal-open">
      <div className="modal-box card bg-base-100 border border-base-300 max-w-md shadow-2xl p-0 overflow-hidden" style={{ borderTop: `4px solid ${theme.borderColor}` }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-base-200" style={{ background: `linear-gradient(to right, ${theme.borderColor}10, transparent)` }}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shadow-sm ${theme.iconBg}`}>
              <Download size={20} className={theme.iconColor} />
            </div>
            <div>
              <h3 className="font-extrabold text-[16px] text-base-content">{t('components.exportDialog.headerTitle')}</h3>
              <p className="text-[12px] font-semibold text-base-content/60 mt-0.5">{t('components.exportDialog.recordsCount', { count: data.length })}</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle hover:bg-base-200" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Format selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {FORMAT_OPTIONS.map((f) => {
              const active = format === f.key;
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  className="relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-300 hover:shadow-md cursor-pointer overflow-hidden group"
                  style={{
                    borderColor: active ? f.color : 'var(--border)',
                    background: active ? f.bg : 'var(--surface)',
                  }}
                >
                  {active && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                      style={{ background: f.color }}
                    >
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                  <div
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: active ? f.color : 'var(--border)' }}
                  >
                    <Icon size={20} style={{ color: active ? '#fff' : 'var(--text-secondary)' }} />
                  </div>
                  <div className="text-center w-full mt-1">
                    <div className="text-[13px] font-extrabold truncate" style={{ color: active ? f.color : 'var(--text)' }}>
                      {f.label}
                    </div>
                    <div className="text-[10px] font-semibold text-base-content/50 mt-0.5">{f.ext}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Title input */}
          <div className="mb-5">
          <label className="text-[10px] font-bold text-base-content/70 uppercase tracking-wider mb-1.5 block">
            {t('components.exportDialog.documentTitleLabel')}
          </label>
          <input
            className="input input-bordered w-full text-[13px]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('components.exportDialog.titlePlaceholder')}
          />
        </div>

        {/* Preview info */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] bg-base-200 mb-5">
          <div className="text-[11px] text-base-content/60">
            <span className="font-semibold">{data.length}</span> {t('components.exportDialog.rows')} ·{' '}
            <span className="font-semibold">{(config.columns || []).filter((c) => !c.hidden).length}</span> {t('components.exportDialog.columns')} ·{' '}
            <span className="font-semibold uppercase">{format}</span>
          </div>
        </div>

        {/* ── Error / warning ────────────────────────────── */}
        {(error || warning) && (
          <div className="px-5 pb-3">
            <div
              className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl"
              style={{
                background: error ? 'rgba(220,38,38,0.08)' : 'rgba(180,83,9,0.08)',
                border: `1px solid ${error ? 'rgba(220,38,38,0.35)' : 'rgba(180,83,9,0.35)'}`,
              }}
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: error ? '#dc2626' : '#b45309' }} />
              <div className="text-[11px] leading-snug" style={{ color: error ? '#dc2626' : '#b45309' }}>
                {error || warning}
              </div>
            </div>
          </div>
        )}

        </div> {/* Close the .p-5 div */}

        {/* ── Actions ────────────────────────────────────── */}
        <div className="px-5 py-4 border-t flex justify-end items-center gap-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={busy || done}
          >
            {t('components.exportDialog.cancel')}
          </button>
          <button
            className={`btn btn-sm ${theme.btnColor} gap-1.5`}
            onClick={handleExport}
            disabled={busy || !data.length || done}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : done ? (
              <Check size={14} />
            ) : (
              <Download size={14} />
            )}
            {done ? t('components.exportDialog.done') : busy ? t('components.exportDialog.creating') : t('components.exportDialog.download')}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>,
    document.body
  );
}
