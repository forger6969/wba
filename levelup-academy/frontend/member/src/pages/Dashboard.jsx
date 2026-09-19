import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useParentOverview, useGroupRating } from '../queries.js';
import { useChild } from '../child-context.jsx';
import { fmt, money, dateShort, timeAgo, ATTENDANCE_STATUS } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/Avatar.jsx';
import { SkeletonKpis } from '../components/Skeleton.jsx';
import { EmptyState, ErrorState } from '../components/ui.jsx';
import Icon from '../components/Icons.jsx';
import { useI18n, fmt as fmtStr } from '../i18n/index.jsx';

export default function Dashboard() {
  const { t } = useI18n();
  const { selectedChild } = useChild();
  const { data, isLoading, error, refetch } = useParentOverview(selectedChild?.id);
  const { data: ratingData, isLoading: ratingLoading } = useGroupRating(selectedChild?.id);
  const [showRating, setShowRating] = useState(false);

  if (!selectedChild) {
    return <EmptyState icon="user-circle" title={t.dash.noChildTitle} message={t.dash.noChildMsg} />;
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title={t.dash.title} />
        <SkeletonKpis />
      </>
    );
  }

  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const d = data?.data;
  if (!d) return null;

  const att = d.attendance?.summary || {};
  const attTotal = Number(att.total) || 0;
  const attPct = attTotal > 0 ? Math.round(((att.present || 0) / attTotal) * 100) : null;

  const allGrades = [
    ...(d.grades?.homework || []).map((g) => ({ ...g, type: 'hw' })),
    ...(d.grades?.tests || []).map((g) => ({ ...g, type: 'test' })),
  ]
    .sort((a, b) => new Date(b.gradedAt || b.finishedAt) - new Date(a.gradedAt || a.finishedAt))
    .slice(0, 5);

  const avgScore =
    allGrades.length > 0
      ? Math.round(allGrades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / allGrades.length)
      : 0;

  const group = d.groups?.[0];
  const invoice = d.currentInvoice;
  const paymentBalance = Number(d.paymentBalance) || 0;
  const amountToPay = invoice ? Number(invoice.remainingAmount ?? (invoice.totalAmount - invoice.paidAmount)) : Number(d.totalDebt) || 0;
  const students = ratingData?.data?.students || [];
  const childGroupRank = students.find((student) => student.childId === selectedChild?.id)?.rank;

  // Guruh reytingi ko'rinishi
  if (showRating && group) {
    return (
      <>
        <PageHeader title={t.dash.groupRating.title} subtitle={t.dash.groupRating.subtitle} />
        <button
          onClick={() => setShowRating(false)}
          className="btn btn-ghost btn-sm gap-2 mb-5 px-2"
        >
          <Icon name="arrow-left" className="w-4 h-4" />
          {t.common.back}
        </button>

        <section className="parent-rating-head mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="parent-rating-monogram">{String(group.name || 'ГР').slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[.12em] text-slate-400 font-semibold">{t.dash.currentGroup}</p>
              <h2 className="text-lg font-semibold text-slate-900 truncate">{group.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{group.subject || t.dash.groupRating.noSubject}</p>
            </div>
          </div>
          <dl className="parent-rating-facts">
            <div><dt>{t.dash.groupRating.teacher}</dt><dd>{group.mentorName || '—'}</dd></div>
            <div><dt>{t.dash.groupRating.students}</dt><dd>{students.length || group.studentCount || 0}</dd></div>
            <div><dt>{t.dash.groupRating.placeInGroup}</dt><dd>{childGroupRank ? `№ ${childGroupRank}` : '—'}</dd></div>
            <div><dt>{t.dash.groupRating.placeInBranch}</dt><dd>{d.rank?.rank ? `№ ${d.rank.rank}` : '—'}</dd></div>
          </dl>
        </section>

        <div className="card bg-base-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-base-300 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{t.dash.groupRating.tableTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{t.dash.groupRating.tableSubtitle}</p>
            </div>
            <span className="text-xs text-slate-400">{fmtStr(t.dash.groupRating.participants, { count: students.length })}</span>
          </div>

          {ratingLoading ? (
            <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
          ) : students.length === 0 ? (
            <EmptyState icon="trophy" title={t.dash.groupRating.emptyTitle} message={t.dash.groupRating.emptyMsg} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table parent-rating-table">
                <thead><tr><th className="w-20">{t.dash.groupRating.colRank}</th><th>{t.dash.groupRating.colStudent}</th><th className="text-right">{t.dash.groupRating.colCoins}</th><th className="text-right">{t.dash.groupRating.colAvg}</th></tr></thead>
                <tbody>
                  {students.map((s, i) => {
                    const isMe = s.childId === selectedChild?.id;
                    const score = Number(s.avgScore) || 0;
                    return (
                      <tr key={s.childId} className={isMe ? 'is-current' : ''}>
                        <td><span className="parent-rank-number">{s.rank || i + 1}</span></td>
                        <td>
                          <div className="flex items-center gap-2.5 min-w-48">
                            <Avatar name={`${s.firstName} ${s.lastName}`} size={34} />
                            <div><p className="text-sm font-semibold text-slate-900">{s.firstName} {s.lastName} {isMe && <span className="parent-you-label">{t.dash.groupRating.yourChild}</span>}</p></div>
                          </div>
                        </td>
                        <td className="text-right font-medium tabular-nums">{fmt(s.coins)}</td>
                        <td className="text-right"><span className={`parent-score ${score >= 80 ? 'is-good' : score >= 60 ? 'is-medium' : 'is-low'}`}>{score}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t.dash.title} subtitle={t.dash.subtitle} />

      <section className="parent-student-summary mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={`${d.child.firstName} ${d.child.lastName}`} size={48} />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.dash.currentStudentLabel}</p>
            <h2 className="text-lg font-semibold text-slate-900 truncate">{d.child.firstName} {d.child.lastName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{group ? `${group.name} · ${group.mentorName}` : t.dash.noGroupAssigned}</p>
          </div>
        </div>
        <dl className="parent-student-facts">
          <div><dt>{t.dash.toPay}</dt><dd className={amountToPay > 0 ? 'text-warning' : 'text-success'}>{money(amountToPay)}</dd></div>
          <div><dt>{t.dash.paymentBalance}</dt><dd className="text-success">{money(paymentBalance)}</dd></div>
          <div><dt>{t.dash.attendanceLabel}</dt><dd>{attPct === null ? '—' : `${attPct}%`}</dd></div>
          <div><dt>{t.dash.groupRating.placeInBranch}</dt><dd>{d.rank?.rank ? `№ ${d.rank.rank}` : '—'}</dd></div>
          <div><dt>{t.dash.pointsLabel}</dt><dd>{fmt(d.coins)}</dd></div>
        </dl>
      </section>

      {(amountToPay > 0 || paymentBalance > 0) && <section className="card bg-base-100 mb-5 overflow-hidden">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="wallet" className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.dash.payment.label}</p>
                <h3 className="text-lg font-semibold text-slate-900">
                  {amountToPay > 0 ? fmtStr(t.dash.payment.due, { sum: money(amountToPay) }) : t.dash.payment.ok}
                </h3>
              </div>
            </div>
            <Link to="/debt" className="btn btn-outline btn-sm">{t.dash.payment.more}</Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <div className="rounded-lg border border-base-300 p-3">
              <p className="text-xs text-slate-500">{t.dash.payment.balance}</p>
              <p className="text-base font-semibold text-success mt-1">{money(paymentBalance)}</p>
              <p className="text-[11px] text-slate-400 mt-1">{t.dash.payment.balanceNote}</p>
            </div>
            <div className="rounded-lg border border-base-300 p-3">
              <p className="text-xs text-slate-500">{t.dash.payment.chargedFor}</p>
              <p className="text-base font-semibold text-slate-900 mt-1">{invoice?.groupName || group?.name || '—'}</p>
              <p className="text-[11px] text-slate-400 mt-1">{group?.subject || t.dash.payment.defaultGroupLabel}</p>
            </div>
            <div className="rounded-lg border border-base-300 p-3">
              <p className="text-xs text-slate-500">{t.dash.payment.lessonsCalc}</p>
              <p className="text-base font-semibold text-slate-900 mt-1">
                {invoice?.billableLessons != null ? fmtStr(t.dash.payment.lessonsOf, { billable: invoice.billableLessons, total: invoice.lessonsInMonth }) : '—'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {invoice?.monthlyPrice ? fmtStr(t.dash.payment.monthlyPrice, { sum: money(invoice.monthlyPrice) }) : t.dash.payment.noCurrentCharge}
              </p>
            </div>
            <div className="rounded-lg border border-base-300 p-3">
              <p className="text-xs text-slate-500">{t.dash.payment.dueDate}</p>
              <p className={`text-base font-semibold mt-1 ${amountToPay > 0 ? 'text-warning' : 'text-success'}`}>
                {invoice?.paymentDate ? dateShort(invoice.paymentDate) : t.dash.payment.paidLabel}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{t.dash.payment.blockNote}</p>
            </div>
          </div>
        </div>
      </section>}

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <Link to="/attendance" className={`parent-attention-item ${(att.absent || 0) > 0 ? 'is-warning' : 'is-ok'}`}>
          <Icon name="calendar-check" className="w-5 h-5" />
          <div className="min-w-0 flex-1"><p className="text-xs text-slate-500">{t.dash.last30Days}</p><p className="text-sm font-semibold">{attTotal > 0 ? fmtStr(t.dash.absencesLate, { absent: att.absent || 0, late: att.late || 0 }) : t.dash.noLessonsYet}</p></div>
          <Icon name="chevron-right" className="w-4 h-4 text-slate-400" />
        </Link>
        <Link to="/grades" className={`parent-attention-item ${avgScore > 0 && avgScore < 60 ? 'is-warning' : 'is-neutral'}`}>
          <Icon name="academic" className="w-5 h-5" />
          <div className="min-w-0 flex-1"><p className="text-xs text-slate-500">{t.dash.currentPerformance}</p><p className="text-sm font-semibold">{fmtStr(t.dash.avgResult, { value: `${avgScore || '—'}${avgScore ? '%' : ''}` })}</p></div>
          <Icon name="chevron-right" className="w-4 h-4 text-slate-400" />
        </Link>
      </div>

      {/* Attendance + Group */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Attendance Widget */}
        <div className="card bg-base-100">
          <div className="card-body">
            <h3 className="card-title text-sm gap-2">
              <Icon name="calendar-check" className="w-4 h-4 text-primary" />
              {t.dash.attendance30Title}
            </h3>
            <div className="parent-attendance-report mt-4">
              <div className="parent-attendance-total">
                <span>{attPct === null ? '—' : `${attPct}%`}</span>
                <small>{attPct === null ? t.dash.noLessonsAt : fmtStr(t.dash.presentOf, { present: att.present || 0, total: attTotal })}</small>
              </div>
              <div className="flex-1 space-y-3">
                {['present', 'absent', 'late', 'excused'].map((s) => {
                  const count = att[s] || 0;
                  const pct = attTotal > 0 ? Math.round((count / attTotal) * 100) : 0;
                  const st = ATTENDANCE_STATUS[s];
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: st?.color }} />
                      <span className="text-xs w-20 shrink-0">{st?.label}</span>
                      <div className="flex-1 h-1 bg-base-200 overflow-hidden">
                        <div className="h-full" style={{ width: `${pct}%`, background: st?.color }} />
                      </div>
                      <span className="text-[11px] font-mono w-6 text-right opacity-50">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Group Card — clickable → rating */}
        <div className="card bg-base-100">
          <div className="card-body">
            <h3 className="card-title text-sm gap-2">
              <Icon name="academic" className="w-4 h-4 text-primary" />
              {t.dash.currentGroup}
            </h3>
            {!group ? (
              <EmptyState icon="folder" title={t.dash.noGroupTitle} message={t.dash.noGroupMsg} />
            ) : (
              <button
                onClick={() => setShowRating(true)}
                className="flex items-center gap-3 p-4 rounded bg-base-200/25 border border-base-300 hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150 group cursor-pointer w-full text-left mt-3"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-extrabold text-primary shrink-0">
                  {String(group.name || 'ГР').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{group.name}</p>
                  <p className="text-xs opacity-40 flex items-center gap-1 mt-0.5">
                    <Icon name="user" className="w-3 h-3" />
                    {group.mentorName}
                  </p>
                  <p className="text-[11px] opacity-30 mt-0.5">{group.studentCount ? fmtStr(t.dash.studentsCount, { n: group.studentCount }) : '—'}</p>
                </div>
                <div className="flex items-center gap-1.5 text-primary shrink-0">
                  <span className="text-xs font-medium opacity-70 group-hover:opacity-100 transition-opacity">{t.leaderboard.title}</span>
                  <Icon name="chevron-right" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-4 items-start">
      {/* Recent Lessons */}
      <div className="card bg-base-100">
        <div className="card-body">
          <h3 className="card-title text-sm gap-2">
            <Icon name="clock" className="w-4 h-4 text-primary" />
            {t.dash.recentLessonsAllGroups}
          </h3>
          {d.attendance?.recent?.length === 0 ? (
            <EmptyState icon="calendar" title={t.dash.noRecords} />
          ) : (
            <div className="mt-3">
              <div className="divide-y divide-base-200">
                {d.attendance?.recent?.slice(0, 5).map((r, i) => {
                  const st = ATTENDANCE_STATUS[r.status];
                  return (
                    <div key={i} className="flex items-center gap-3 py-3 hover:bg-base-200/25 transition-colors">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: st?.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{r.groupName}</span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: st?.bg, color: st?.color }}
                          >
                            {st?.label}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="text-xs opacity-40 mt-0.5 truncate">{r.comment}</p>
                        )}
                      </div>
                      <span className="text-[11px] opacity-30 whitespace-nowrap">{dateShort(r.lessonDate)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Grades */}
      <div className="card bg-base-100">
        <div className="card-body">
          <div className="flex items-center justify-between mb-1">
            <h3 className="card-title text-sm gap-2">
              <Icon name="document-text" className="w-4 h-4 text-primary" />
              {t.dash.recentGrades}
            </h3>
            {allGrades.length > 0 && (
              <span className="text-xs opacity-40">{fmtStr(t.dash.avgLabel, { value: `${avgScore}%` })}</span>
            )}
          </div>
          {allGrades.length === 0 ? (
            <EmptyState icon="document-text" title={t.dash.noGrades} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t.dash.colName}</th>
                    <th>{t.dash.colType}</th>
                    <th>{t.dash.colScore}</th>
                    <th className="text-right">{t.dash.colDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {allGrades.map((g, i) => {
                    const pct = g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100) : 0;
                    const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
                    return (
                      <tr key={i} className="hover:bg-base-200/50 transition-colors">
                        <td className="text-sm font-medium">{g.title}</td>
                        <td>
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: g.type === 'hw' ? 'rgba(59,130,246,.1)' : 'rgba(168,85,247,.1)',
                              color: g.type === 'hw' ? '#3b82f6' : '#a855f7',
                            }}
                          >
                            {g.type === 'hw' ? t.dash.badgeHw : t.dash.badgeTest}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 bg-base-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: color }} />
                            </div>
                            <span className="text-xs font-mono" style={{ color }}>{g.score}/{g.maxScore}</span>
                          </div>
                        </td>
                        <td className="text-xs opacity-40 text-right whitespace-nowrap">
                          {timeAgo(g.gradedAt || g.finishedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
