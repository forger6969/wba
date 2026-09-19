import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, AlertTriangle, Users, ArrowUpDown, ChevronRight, BarChart3,
} from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { useMentorGroupStats } from '../../../queries.js';
import Avatar from '../../../components/Avatar.jsx';
import { EmptyState } from '../_ui.jsx';

/**
 * Статистика группы: как класс выглядит целиком и кто в нём где.
 *
 * Главный вопрос — сравнение: кто усваивает лучше, кто отстаёт. Поэтому здесь
 * не средние по больнице, а распределение и поимённый список, отсортированный
 * по сводному баллу.
 */

/* Диапазоны и их цвета — статусная палитра, фиксированная и не пересекающаяся
   с цветами серий. Жёлтый на белом даёт меньше 3:1, поэтому у каждого столбца
   и строки рядом всегда стоит число: цвет не несёт смысл в одиночку. */
const BAND_COLOR = {
  weak: '#d03b3b',
  mid: '#fab219',
  good: '#0ca30c',
  top: '#008300',
};

const bandLabel = (t) => ({
  weak: t('mentor.stats.bandWeak'),
  mid: t('mentor.stats.bandMid'),
  good: t('mentor.stats.bandGood'),
  top: t('mentor.stats.bandTop'),
});

const scoreColor = (v) => {
  if (v === null || v === undefined) return '#c3c2b7';
  if (v >= 90) return BAND_COLOR.top;
  if (v >= 80) return BAND_COLOR.good;
  if (v >= 60) return BAND_COLOR.mid;
  return BAND_COLOR.weak;
};

/* ── Гистограмма распределения ────────────────────────────────────────────
   Своя вёрстка, а не библиотека: столбцов четыре, и здесь важнее точные
   подписи (и процент, и число человек), чем возможности графической
   библиотеки. Столбцы растут от общей базовой линии, верх скруглён,
   между ними — зазор фоном, а не обводка. */
function Distribution({ distribution, total }) {
  const { t } = useTranslation();
  const BAND_LABEL = bandLabel(t);
  const max = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div>
      <div className="flex items-end gap-2 sm:gap-3 h-[180px]">
        {distribution.map((d) => {
          const color = BAND_COLOR[d.key];
          const heightPct = (d.count / max) * 100;
          return (
            <div key={d.key} className="flex-1 flex flex-col items-center justify-end h-full">
              {/* Число людей — над столбцом: проценты сравнивают доли,
                  но ментор оперирует людьми */}
              <div className="text-sm font-extrabold" style={{ color }}>
                {d.percent}%
              </div>
              <div className="text-[11px] text-base-content/45 mb-1.5">
                {t('mentor.stats.studentsCount', { count: d.count })}
              </div>
              {/* Ширина ограничена: столбец во всю колонку читается как
                  заливка фона, а не как марка данных. */}
              <div
                className="w-full max-w-[72px] rounded-t-md transition-[height] duration-500"
                style={{
                  height: `${Math.max(heightPct, d.count > 0 ? 6 : 2)}%`,
                  background: d.count > 0 ? color : 'var(--border)',
                  opacity: d.count > 0 ? 1 : 0.5,
                }}
                title={t('mentor.stats.bandTitle', { band: BAND_LABEL[d.key], count: d.count })}
              />
            </div>
          );
        })}
      </div>

      {/* Подписи под общей осью */}
      <div className="flex gap-2 sm:gap-3 border-t border-base-300 pt-2 mt-0">
        {distribution.map((d) => (
          <div key={d.key} className="flex-1 text-center">
            <div className="text-[11px] font-semibold" style={{ color: BAND_COLOR[d.key] }}>
              {BAND_LABEL[d.key]}
            </div>
            <div className="text-[10px] text-base-content/40">{d.label}</div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-base-content/40 mt-3">
        {t('mentor.stats.overallNote', { total })}
      </p>
    </div>
  );
}

/** Полоса показателя в строке ученика: длину сравнивать легче, чем числа. */
function Bar({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-full h-1.5 rounded-full bg-base-200 overflow-hidden min-w-[40px]">
        <div
          className="h-full rounded-full"
          style={{ width: `${value ?? 0}%`, background: scoreColor(value) }}
        />
      </div>
      <span className="text-xs font-bold w-9 text-right shrink-0" style={{ color: scoreColor(value) }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

export default function StatsTab({ groupId }) {
  const { t } = useTranslation();
  const SORTS = [
    { key: 'overall', label: t('mentor.stats.overall') },
    { key: 'attendanceRate', label: t('mentor.stats.attendance') },
    { key: 'homeworkRate', label: t('mentor.stats.homework') },
    { key: 'testAvg', label: t('mentor.stats.tests') },
  ];
  const { data, isLoading } = useMentorGroupStats(groupId);
  const stats = data?.data ?? null;
  const [sortKey, setSortKey] = useState('overall');

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="skeleton h-40 w-full rounded-xl" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!stats || stats.students.length === 0) {
    return <EmptyState icon={Users} title={t('mentor.stats.noStudentsInGroup')} />;
  }

  const { summary, distribution, students } = stats;

  // Ученики без единого показателя не участвуют в сравнении: ранжировать их
  // не по чему, но и прятать из группы нельзя — они идут в конец списка.
  const sorted = [...students].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    return bv - av;
  });

  const best = sorted.filter((s) => s.overall !== null).slice(0, 3);
  const risk = [...students]
    .filter((s) => s.overall !== null && s.overall < 60)
    .sort((a, b) => a.overall - b.overall)
    .slice(0, 3);

  return (
    <div className="p-4 sm:p-5 space-y-6 overflow-y-auto flex-1 min-h-0">
      {/* ── Средние по группе ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t('mentor.stats.overall'), value: summary.overall },
          { label: t('mentor.stats.attendance'), value: summary.attendanceRate },
          { label: t('mentor.stats.homework'), value: summary.homeworkRate },
          { label: t('mentor.stats.tests'), value: summary.testAvg },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-base-200 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
              {m.label}
            </div>
            <div className="text-2xl font-extrabold mt-1.5" style={{ color: scoreColor(m.value) }}>
              {m.value ?? '—'}
              {m.value !== null && <span className="text-sm text-base-content/40">%</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Распределение ── */}
      <div className="rounded-xl border border-base-200 p-4">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
          <BarChart3 size={15} className="text-primary" /> {t('mentor.stats.distribution')}
        </h3>
        <Distribution distribution={distribution} total={summary.students} />
      </div>

      {/* ── Кто впереди, кто отстаёт ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-base-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-success/5 border-b border-base-200">
            <Trophy size={14} className="text-success" />
            <span className="text-sm font-bold">{t('mentor.stats.topStudents')}</span>
          </div>
          <ul className="divide-y divide-base-200">
            {best.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 text-sm font-bold text-base-content/35">{i + 1}</span>
                <Avatar name={`${s.firstName} ${s.lastName}`} size={32} />
                <Link
                  to={`/students/${s.id}`}
                  className="text-sm font-semibold truncate flex-1 hover:text-primary transition-colors"
                >
                  {s.firstName} {s.lastName}
                </Link>
                <span className="text-sm font-bold" style={{ color: scoreColor(s.overall) }}>
                  {s.overall}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-base-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-error/5 border-b border-base-200">
            <AlertTriangle size={14} className="text-error" />
            <span className="text-sm font-bold">{t('mentor.stats.needsAttention')}</span>
          </div>
          {risk.length === 0 ? (
            <p className="px-4 py-6 text-sm text-base-content/45 text-center">
              {t('mentor.stats.noRiskStudents')}
            </p>
          ) : (
            <ul className="divide-y divide-base-200">
              {risk.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={`${s.firstName} ${s.lastName}`} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/students/${s.id}`}
                      className="text-sm font-semibold truncate block hover:text-primary transition-colors"
                    >
                      {s.firstName} {s.lastName}
                    </Link>
                    <div className="text-[11px] text-base-content/45">
                      {t('mentor.stats.tasksAttendance', { done: s.homeworkDone, total: s.homeworkTotal, rate: s.attendanceRate ?? '—' })}
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: scoreColor(s.overall) }}>
                    {s.overall}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Поимённое сравнение ── */}
      <div className="rounded-xl border border-base-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-base-200 flex-wrap">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Users size={15} className="text-primary" /> {t('mentor.stats.allStudents')}
          </h3>
          <label className="flex items-center gap-1.5 text-xs text-base-content/50">
            <ArrowUpDown size={13} />
            <select
              className="select select-bordered select-xs rounded-md"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th>{t('mentor.stats.colStudent')}</th>
                <th className="min-w-[130px]">{t('mentor.stats.colAttendance')}</th>
                <th className="min-w-[130px]">{t('mentor.stats.colHomework')}</th>
                <th className="min-w-[130px]">{t('mentor.stats.colTests')}</th>
                <th className="min-w-[130px]">{t('mentor.stats.colOverall')}</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id} className="hover">
                  <td className="text-xs text-base-content/35 font-bold">{i + 1}</td>
                  <td>
                    <Link to={`/students/${s.id}`} className="flex items-center gap-2.5 group">
                      <Avatar name={`${s.firstName} ${s.lastName}`} size={30} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold truncate group-hover:text-primary transition-colors">
                          {s.firstName} {s.lastName}
                        </span>
                        {s.status !== 'active' && (
                          <span className="block text-[10px] text-warning font-medium">{t('mentor.stats.frozen')}</span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td><Bar value={s.attendanceRate} /></td>
                  <td>
                    <Bar value={s.homeworkRate} />
                    <div className="text-[10px] text-base-content/40 mt-0.5 tabular-nums">
                      {t('mentor.stats.doneCount', { done: s.homeworkDone, total: s.homeworkTotal })}
                    </div>
                  </td>
                  <td>
                    <Bar value={s.testAvg} />
                    <div className="text-[10px] text-base-content/40 mt-0.5 tabular-nums">
                      {t('mentor.stats.takenCount', { taken: s.testsTaken, total: s.testsTotal })}
                    </div>
                  </td>
                  <td><Bar value={s.overall} /></td>
                  <td>
                    <Link to={`/students/${s.id}`} className="text-base-content/30 hover:text-primary">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
