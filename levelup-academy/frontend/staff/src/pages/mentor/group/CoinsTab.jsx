import { useState } from 'react';
import {
  Coins as CoinsIcon, Plus, Minus, History, ArrowUpRight, ArrowDownLeft,
  Users, AlertCircle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useMentorGroupStudents, useMentorCoinHistory } from '../../../queries.js';
import { useAuth } from '../../../auth.jsx';
import { api } from '../../../api.js';
import { Avatar, SearchInput, EmptyState, Panel, RowSkeleton } from '../_ui.jsx';

/**
 * Коины группы: разбор по конкретному ученику — начисление с обязательной
 * причиной и история операций.
 *
 * Быстрое начисление «на ходу» живёт в журнале (вкладка Davomat), здесь —
 * осознанная операция: видно, за что и когда коины уже давали.
 */

const QUICK_AMOUNTS = [5, 10, 25, 50];

export default function CoinsTab({ groupId }) {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const qc = useQueryClient();

  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [search, setSearch] = useState('');
  const [coinAmount, setCoinAmount] = useState('');
  const [coinReason, setCoinReason] = useState('');
  const [operation, setOperation] = useState('grant'); // grant | deduct
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: rosterData, isLoading: rosterLoading } = useMentorGroupStudents(groupId);
  const students = rosterData?.data || [];

  const { data: historyData, isLoading: historyLoading } = useMentorCoinHistory(selectedStudentId);
  const coinHistory = historyData?.data?.items || historyData?.data?.history || [];

  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    return `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase());
  });

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const isDeduct = operation === 'deduct';
  const canSubmit = !!selectedStudentId && Number(coinAmount) > 0 && !!coinReason.trim();

  const handleCoins = async () => {
    if (!canSubmit || saving) return;
    const magnitude = Math.abs(Number(coinAmount));
    if (!magnitude || Number.isNaN(magnitude)) return;

    setSaving(true);
    setError('');
    try {
      await api.mentorGrantCoins(token, {
        studentId: selectedStudentId,
        amount: isDeduct ? -magnitude : magnitude,
        reason: coinReason.trim(),
      });
      qc.invalidateQueries({ queryKey: ['mentor-group-students', groupId] });
      qc.invalidateQueries({ queryKey: ['mentor-coin-history', selectedStudentId] });
      setCoinAmount('');
      setCoinReason('');
    } catch (err) {
      // Было alert() — модальное окно браузера посреди работы. Ошибка остаётся
      // в форме, рядом с полем, которое её вызвало.
      setError(err.message || t('mentor.coins.genericError'));
    } finally {
      setSaving(false);
    }
  };

  const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };
  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString(LOCALE_OF[i18n.language] || 'ru-RU', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })
      : '';

  return (
    <div className="p-4 overflow-y-auto flex-1 min-h-0">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {/* ── Ученики ── */}
        <div className="lg:col-span-2">
          <Panel title={t('mentor.coins.students')} icon={Users} bodyClass="p-3">
            <SearchInput value={search} onChange={setSearch} className="mb-3" />

            {rosterLoading ? (
              <RowSkeleton count={4} height="h-12" />
            ) : filteredStudents.length === 0 ? (
              <EmptyState
                icon={Users}
                title={search ? t('mentor.coins.nobodyFound') : t('mentor.coins.noStudentsInGroup')}
              />
            ) : (
              <ul className="space-y-1">
                {filteredStudents.map((s) => {
                  const isActive = selectedStudentId === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => { setSelectedStudentId(s.id); setError(''); }}
                        aria-current={isActive ? 'true' : undefined}
                        className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-colors ${
                          isActive ? 'bg-primary text-primary-content' : 'hover:bg-base-200'
                        }`}
                      >
                        <Avatar name={`${s.firstName} ${s.lastName}`} onPrimary={isActive} />
                        <span className="flex-1 min-w-0 text-sm font-medium truncate">
                          {s.firstName} {s.lastName}
                        </span>
                        <span className="text-sm font-bold tabular-nums shrink-0">
                          {s.coinBalance ?? 0}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* ── Операция + история ── */}
        <div className="lg:col-span-3 space-y-5">
          {!selectedStudent ? (
            <div className="card bg-base-100">
              <EmptyState
                icon={CoinsIcon}
                title={t('mentor.coins.selectStudentTitle')}
                hint={t('mentor.coins.selectStudentHint')}
              />
            </div>
          ) : (
            <>
              <Panel title={t('mentor.coins.operation')} icon={CoinsIcon} bodyClass="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={`${selectedStudent.firstName} ${selectedStudent.lastName}`} size="lg" />
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </h3>
                    <p className="text-sm text-base-content/50">
                      {t('mentor.coins.balance')}:{' '}
                      <b className="text-base-content tabular-nums">
                        {selectedStudent.coinBalance ?? 0}
                      </b>{' '}
                      coin
                    </p>
                  </div>
                </div>

                  <div role="radiogroup" aria-label={t('mentor.coins.operationType')} className="flex gap-2 mb-4">
                  <button
                    role="radio"
                    aria-checked={!isDeduct}
                    onClick={() => setOperation('grant')}
                    className={`flex-1 btn btn-sm gap-1.5 ${!isDeduct ? 'btn-success text-white' : 'btn-outline'}`}
                  >
                    <Plus size={14} /> {t('mentor.coins.grant')}
                  </button>
                  <button
                    role="radio"
                    aria-checked={isDeduct}
                    onClick={() => setOperation('deduct')}
                    className={`flex-1 btn btn-sm gap-1.5 ${isDeduct ? 'btn-error text-white' : 'btn-outline'}`}
                  >
                    <Minus size={14} /> {t('mentor.coins.deduct')}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {QUICK_AMOUNTS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setCoinAmount(String(v))}
                      className={`btn btn-xs ${Number(coinAmount) === v ? 'btn-primary' : 'btn-outline'}`}
                    >
                      {isDeduct ? '−' : '+'}{v}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="form-control">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-1.5">
                      {t('mentor.coins.amount')}
                    </span>
                    <input
                      type="number"
                      min="1"
                      className="input input-bordered input-sm tabular-nums"
                      placeholder="0"
                      value={coinAmount}
                      onChange={(e) => setCoinAmount(e.target.value)}
                    />
                  </label>
                  <label className="form-control sm:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-1.5">
                      {t('mentor.coins.reason')} <span className="text-error">*</span>
                    </span>
                    <input
                      type="text"
                      className="input input-bordered input-sm"
                      placeholder={t('mentor.coins.reasonPlaceholder')}
                      value={coinReason}
                      maxLength={200}
                      onChange={(e) => setCoinReason(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCoins(); }}
                    />
                  </label>
                </div>

                {error && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-error">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <button
                    className={`btn btn-sm gap-1.5 ${isDeduct ? 'btn-error text-white' : 'btn-primary'}`}
                    onClick={handleCoins}
                    disabled={saving || !canSubmit}
                  >
                    {saving
                      ? <span className="loading loading-spinner loading-xs" />
                      : isDeduct ? <Minus size={14} /> : <Plus size={14} />}
                    {isDeduct ? t('mentor.coins.deduct') : t('mentor.coins.grant')}
                  </button>
                </div>
              </Panel>

              <Panel title={t('mentor.coins.history')} icon={History} bodyClass="p-4">
                {historyLoading ? (
                  <RowSkeleton count={3} height="h-11" />
                ) : coinHistory.length === 0 ? (
                  <EmptyState icon={History} title={t('mentor.coins.noOperations')} />
                ) : (
                  <ul className="divide-y divide-base-200">
                    {coinHistory.map((h, i) => {
                      const positive = h.amount > 0;
                      return (
                        <li key={h.id || i} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${
                                positive ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
                              }`}
                            >
                              {positive ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm truncate">{h.reason}</div>
                              <div className="text-[11px] text-base-content/40">
                                {formatDate(h.created_at)}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-sm font-bold tabular-nums shrink-0 ${
                              positive ? 'text-success' : 'text-error'
                            }`}
                          >
                            {positive ? '+' : ''}{h.amount}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
