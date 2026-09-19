import { useState } from 'react';
import {
  Wallet, Building2, Users, GraduationCap, Download, Info, Lock, Sparkles,
} from 'lucide-react';
import { useDashboard, usePricing } from '../queries.js';
import { fmt } from '../format.js';
import { tierForUsers, tierRange, tierPriceLabel } from '../lib/pricing.js';
import PageHeader from '../components/PageHeader.jsx';
import { Kpi } from '../components/_ui.jsx';
import { SkeletonKpis, SkeletonTable } from '../components/Skeleton.jsx';

/**
 * Тарифы платформы.
 *
 * Модель с 2026-08-11: фиксированная цена по бакету всех активных аккаунтов,
 * филиалы включены безлимитом. Старая формула (первый филиал + доп. филиалы +
 * за ученика) ОТМЕНЕНА — страница была построена на ней и показывала нули,
 * потому что бэкенд таких полей больше не отдаёт.
 *
 * Почему нет формы сохранения: `PUT /api/main/pricing` на бэкенде ничего не
 * пишет — тарифы зашиты в `backend/src/config/plans.js` (TIERS), а правка их
 * через БД это задача v2. Раньше кнопка «Сохранить» рапортовала успех, хотя
 * ничего не сохраняла. Пока источник правды — конфиг, страница только читает.
 */

// Локальный Kpi убран (30.08.2026) — мигрировано на общий Kpi из _ui.jsx.

function exportCsv(partners, tiers, cur) {
  const header = ['Партнёр', 'Филиалы', 'Пользователи', 'Тариф', 'Итого/мес', 'Валюта'];
  const rows = partners.map((p) => {
    const t = tierForUsers(tiers, p.totalUsers);
    return [p.name, p.branches, p.totalUsers, t?.label ?? '—', p.monthlyBill ?? 0, cur];
  });
  const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `billing-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Billing() {
  const { data: pricing, isLoading: pLoading, error: pError } = usePricing();
  const { data: dash } = useDashboard();

  const tiers = pricing?.tiers ?? [];
  const partners = dash?.partners ?? [];
  const cur = pricing?.currency || dash?.totals?.currency || 'UZS';

  const [previewUsers, setPreviewUsers] = useState(120);
  const previewTier = tiers.length ? tierForUsers(tiers, previewUsers) : null;

  const totalIncome = dash?.totals?.ourMonthlyIncome
    ?? partners.reduce((s, p) => s + (p.monthlyBill || 0), 0);

  if (pError && pError.status !== 401) {
    return <div className="alert alert-error text-sm"><span>{pError.message}</span></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Тарифы и биллинг"
        subtitle={`Цена зависит от общего числа пользователей (ученики+родители+сотрудники), филиалы включены безлимитом (в ${cur})`}
      >
      </PageHeader>

      {pLoading ? (
        <>
          <SkeletonKpis count={3} />
          <SkeletonTable rows={6} cols={4} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Kpi
              Icon={Wallet}
              tint={{ bg: '#ECFCCB', fg: '#365314' }}
              title="Общий счёт / мес"
              value={fmt(totalIncome)}
              unit={cur}
              accent
            />
            <Kpi
              Icon={Building2}
              tint={{ bg: '#E0F2FE', fg: '#075985' }}
              title="Партнёров на биллинге"
              value={fmt(partners.length)}
              unit="учебных центров"
            />
            <Kpi
              Icon={Users}
              tint={{ bg: '#EDE9FE', fg: '#5B21B6' }}
              title="Средний счёт"
              value={fmt(partners.length ? Math.round(totalIncome / partners.length) : 0)}
              unit={cur}
            />
          </div>

          {/* Тарифная сетка — только чтение */}
          <div className="card bg-base-100 shadow-sm border border-base-200/60 overflow-hidden">
            <div className="bg-gradient-to-r from-lime-100 via-lime-50 to-transparent px-6 py-5 border-b border-base-200 flex items-center gap-3">
              <span className="w-11 h-11 rounded-md bg-lime-400 text-lime-950 grid place-items-center shrink-0">
                <Sparkles size={20} strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <h2 className="font-extrabold text-lg leading-tight">Тарифная сетка</h2>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Партнёр попадает в тариф по общему числу пользователей (ученики+родители+сотрудники)
                </p>
              </div>
              <span className="ml-auto badge badge-ghost gap-1.5 shrink-0">
                <Lock size={12} /> только чтение
              </span>
            </div>

            <div className="card-body">
              {tiers.length === 0 ? (
                <div className="text-center py-10 text-base-content/40 text-sm">
                  Сервер не вернул тарифы
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Тариф</th>
                        <th>Пользователей</th>
                        <th className="text-right">Цена / мес</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map((t) => {
                        const isPreview = previewTier?.id === t.id;
                        return (
                          <tr key={t.id} className={isPreview ? 'bg-lime-50' : undefined}>
                            <td className="font-semibold">
                              {t.label}
                              {isPreview && (
                                <span className="ml-2 badge badge-sm bg-lime-400 border-0 text-lime-950">
                                  подходит
                                </span>
                              )}
                            </td>
                            <td className="tabular-nums">{tierRange(t)}</td>
                            <td className="text-right tabular-nums font-semibold">
                              {tierPriceLabel(t, cur)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="alert bg-base-200/60 border-0 text-sm mt-4">
                <Info size={16} className="shrink-0" />
                <span>
                  Тарифы заданы в <code className="text-xs">backend/src/config/plans.js</code> и
                  меняются только вместе с кодом. Редактирование из панели — задача v2;
                  до неё формы сохранения здесь нет намеренно, чтобы страница не делала вид,
                  что что-то сохранила.
                </span>
              </div>
            </div>
          </div>

          {/* Калькулятор */}
          <div className="card bg-base-100 shadow-sm border border-base-200/60">
            <div className="card-body">
              <h2 className="card-title text-base mb-1">Калькулятор счёта</h2>
              <p className="text-xs text-base-content/55 mb-4">
                Сколько заплатит центр с таким числом пользователей (ученики+родители+сотрудники)
              </p>

              <label className="form-control w-full max-w-xs">
                <span className="label-text text-xs mb-1 flex items-center gap-1.5">
                  <GraduationCap size={13} /> Всего пользователей
                </span>
                <input
                  type="number"
                  min={0}
                  className="input input-bordered input-sm tabular-nums"
                  value={previewUsers}
                  onChange={(e) => setPreviewUsers(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>

              {previewTier && (
                <div className="mt-5 rounded-md border border-base-200 divide-y divide-base-200">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-base-content/60">Тариф</span>
                    <span className="font-semibold">
                      {previewTier.label} · {tierRange(previewTier)} пользователей
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-base-content/60">Филиалы</span>
                    <span className="font-semibold">включены безлимитом</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-base-200/40">
                    <span className="font-bold">Итого / месяц</span>
                    <span className="text-xl font-extrabold text-lime-600 tabular-nums">
                      {tierPriceLabel(previewTier, cur)}
                    </span>
                  </div>
                </div>
              )}

              {previewTier?.price == null && (
                <p className="text-xs text-base-content/55 mt-3">
                  На этом объёме цена обсуждается индивидуально — в автоматический счёт
                  попадёт 0, сумму выставляем вручную.
                </p>
              )}
            </div>
          </div>

          {/* Счета партнёров */}
          <div className="card bg-base-100 shadow-sm border border-base-200/60">
            <div className="card-body">
              <h2 className="card-title text-base mb-3">Счета партнёров ({cur}/мес)</h2>
              {partners.length === 0 ? (
                <div className="text-center py-10 text-base-content/40 text-sm">
                  Партнёров пока нет
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Партнёр</th>
                        <th className="text-right">Филиалы</th>
                        <th className="text-right">Пользователи</th>
                        <th>Тариф</th>
                        <th className="text-right">Итого / мес</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.map((p) => {
                        const t = tiers.length ? tierForUsers(tiers, p.totalUsers) : null;
                        return (
                          <tr key={p.id}>
                            <td className="font-medium">{p.name}</td>
                            <td className="text-right tabular-nums">{fmt(p.branches ?? 0)}</td>
                            <td className="text-right tabular-nums">{fmt(p.totalUsers ?? 0)}</td>
                            <td>{t?.label ?? '—'}</td>
                            <td className="text-right tabular-nums font-semibold">
                              {fmt(p.monthlyBill ?? 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="text-right text-sm opacity-60">Итого:</td>
                        <td className="text-right font-extrabold tabular-nums">{fmt(totalIncome)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
