import { useTranslation } from 'react-i18next';
import { ShieldAlert, ListChecks } from 'lucide-react';
import { useMyPenalties, useMyDisciplineRules } from '../queries.js';
import { Panel, EmptyState } from '../pages/mentor/_ui.jsx';
import { LevelBadge } from '../discipline-meta.jsx';

/**
 * K-DISC-FRONT: read-only дисциплина сотрудника (mentor/methodist) — свои
 * взыскания и каталог правил организации. Только просмотр: правила заводит
 * CEO (см. pages/super/Discipline.jsx), CAN_ISSUE не даёт
 * mentor/methodist никаких прав на запись.
 *
 * Свободный текстовый устав убран 2026-07-28 — здесь теперь тот же каталог
 * правил (qoyda), что и в CEO.
 */

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

function dateTime(iso, locale) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MyDiscipline() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const ROLE_LABEL = {
    admin: t('components.myDiscipline.roleAdmin'),
    ceo: t('components.myDiscipline.roleCeo'),
  };
  const { data: penaltiesData, isLoading: penaltiesLoading } = useMyPenalties();
  const { data: rulesData, isLoading: rulesLoading } = useMyDisciplineRules();

  const items = penaltiesData?.data ?? [];
  const rules = rulesData?.data ?? [];

  return (
    <div className="space-y-5">
      <Panel title={t('components.myDiscipline.myPenaltiesTitle')} icon={ShieldAlert} bodyClass="p-0">
        {penaltiesLoading ? (
          <div className="p-4 space-y-2">
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title={t('components.myDiscipline.noPenaltiesTitle')}
            hint={t('components.myDiscipline.noPenaltiesHint')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm tabular-nums">
              <thead>
                <tr>
                  <th>{t('components.myDiscipline.colType')}</th>
                  <th className="text-right">{t('components.myDiscipline.colSalaryPercent')}</th>
                  <th>{t('components.myDiscipline.colReason')}</th>
                  <th>{t('components.myDiscipline.colIssuedBy')}</th>
                  <th>{t('components.myDiscipline.colWhen')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  return (
                    <tr key={p.id} className="hover">
                      <td>
                        <LevelBadge type={p.type} size="sm" />
                      </td>
                      <td className="text-right font-semibold">
                        {p.amount == null ? '—' : `−${Number(p.amount)}%`}
                      </td>
                      <td className="max-w-xs"><span className="text-sm">{p.reason}</span></td>
                      <td className="text-sm text-base-content/60">
                        {ROLE_LABEL[p.issuer_role] ?? p.issuer_role ?? '—'}
                      </td>
                      <td className="text-xs text-base-content/55 whitespace-nowrap">
                        {dateTime(p.created_at, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title={t('components.myDiscipline.orgRulesTitle')} icon={ListChecks}>
        {rulesLoading ? (
          <div className="space-y-2">
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
        ) : rules.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={t('components.myDiscipline.noRulesTitle')}
            hint={t('components.myDiscipline.noRulesHint')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>{t('components.myDiscipline.colRule')}</th>
                  <th>{t('components.myDiscipline.colLevel')}</th>
                  <th className="text-right">{t('components.myDiscipline.colSalaryPercent')}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="hover">
                    <td className="text-sm">{r.description}</td>
                    <td><LevelBadge type={r.type} size="sm" /></td>
                    <td className="text-right tabular-nums font-semibold">
                      {r.amount != null ? `−${Number(r.amount)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
