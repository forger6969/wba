import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, Building2, CheckCircle2, HeartPulse,
  LogIn, Search, ShieldCheck, Users, Wallet, X,
} from 'lucide-react';
import { usePartnerHealth } from '../queries.js';
import { dateShort, money } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import { EmptyState } from '../components/_ui.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';
import { useDashboardLive } from '../socket.js';

const BAND = {
  danger: { label: 'В риске', color: '#f05252', soft: 'bg-error/10 text-error', border: 'border-error/25', icon: AlertTriangle },
  warning: { label: 'Нужно внимание', color: '#e6a700', soft: 'bg-warning/15 text-amber-700', border: 'border-warning/30', icon: HeartPulse },
  success: { label: 'Здоровы', color: '#63a916', soft: 'bg-success/10 text-success', border: 'border-success/20', icon: ShieldCheck },
};

function MiniFactor({ icon: Icon, label, data }) {
  const percent = Math.max(0, Math.min(100, data.score * 2));
  const color = percent >= 80 ? 'bg-success' : percent >= 40 ? 'bg-warning' : 'bg-error';
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-base-content/45"><span className="flex min-w-0 items-center gap-1"><Icon size={11} /><span className="truncate">{label}</span></span><b className="text-base-content/70">{data.score}/50</b></div>
      <div className="h-1 overflow-hidden rounded-full bg-base-200"><div className={`h-full ${color}`} style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

function PartnerCard({ partner }) {
  const meta = BAND[partner.band.tone];
  const Icon = meta.icon;
  return (
    <article className={`group relative overflow-hidden rounded-xl border bg-base-100 transition-all hover:-translate-y-0.5 hover:shadow-lg ${meta.border}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${meta.color} ${partner.score}%, color-mix(in srgb, currentColor 9%, transparent) 0)` }}>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-base-100 text-base font-extrabold tabular-nums">{partner.score}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><h3 className="truncate text-sm font-extrabold">{partner.organizationName}</h3><span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.soft}`}><Icon size={10} />{meta.label}</span></div>
              <Link to={`/organizations/${partner.organizationId}`} className="btn btn-ghost btn-xs btn-square opacity-45 group-hover:opacity-100" title="Открыть партнёра"><ArrowUpRight size={14} /></Link>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniFactor icon={Wallet} label="Оплата" data={partner.payment} />
          <MiniFactor icon={LogIn} label="Активность" data={partner.activity} />
        </div>

        <div className="mt-4 rounded-lg bg-base-200/65 px-3 py-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-base-content/35">Что сделать</div>
          <div className="mt-0.5 text-xs font-semibold leading-4">{partner.nextAction}</div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-base-content/40">
          <span className="flex items-center gap-1"><Users size={11} />{partner.students} учеников</span>
          <span>{partner.debt > 0 ? <b className="text-error">Долг {money(partner.debt)}</b> : 'Долгов нет'}</span>
          <span>до {partner.accessUntil ? dateShort(partner.accessUntil) : '—'}</span>
        </div>
      </div>
    </article>
  );
}

function HealthOverview({ items, counts, average }) {
  const total = items.length || 1;
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#172114] text-white shadow-[0_18px_55px_rgba(20,33,17,0.16)]">
      <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-lime-300/10 blur-3xl" />
      <div className="relative grid lg:grid-cols-[370px_1fr]">
        <div className="flex items-center gap-4 border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
          <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#a3e635 ${average}%, rgba(255,255,255,.10) 0)` }}>
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[#172114]"><div className="text-center"><div className="text-2xl font-black tabular-nums">{average}</div><div className="text-[8px] uppercase tracking-widest text-white/40">из 100</div></div></div>
          </div>
          <div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-widest text-lime-300/70">Общее здоровье</div><div className="mt-1 text-xl font-extrabold leading-tight">{average >= 80 ? 'Система стабильна' : average >= 50 ? 'Есть слабые места' : 'Нужна реакция'}</div><p className="mt-2 text-xs leading-4 text-white/45">Кому помочь до снижения активности.</p></div>
        </div>
        <div className="grid content-center gap-4 p-5">
          <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
            {counts.danger > 0 && <div className="bg-error" style={{ width: `${(counts.danger / total) * 100}%` }} />}
            {counts.warning > 0 && <div className="bg-warning" style={{ width: `${(counts.warning / total) * 100}%` }} />}
            {counts.success > 0 && <div className="bg-lime-400" style={{ width: `${(counts.success / total) * 100}%` }} />}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['danger', 'warning', 'success'].map((tone) => { const m = BAND[tone]; return <div key={tone} className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><div className="flex items-center gap-2 text-xs text-white/55"><span className="h-2 w-2 rounded-full" style={{ background: m.color }} />{m.label}</div><div className="mt-1 text-2xl font-extrabold tabular-nums">{counts[tone]}</div><div className="text-[10px] text-white/30">{Math.round((counts[tone] / total) * 100)}% партнёров</div></div>; })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PartnerHealth() {
  const { data: items = [], isLoading, error } = usePartnerHealth();
  const liveConnected = useDashboardLive();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const counts = useMemo(() => ({ danger: items.filter((p) => p.band.tone === 'danger').length, warning: items.filter((p) => p.band.tone === 'warning').length, success: items.filter((p) => p.band.tone === 'success').length }), [items]);
  const average = items.length ? Math.round(items.reduce((sum, p) => sum + p.score, 0) / items.length) : 0;
  const shown = useMemo(() => items.filter((p) => (filter === 'all' || p.band.tone === filter) && p.organizationName.toLowerCase().includes(query.trim().toLowerCase())), [items, filter, query]);

  if (error && error.status !== 401) return <div className="alert alert-error text-sm"><AlertTriangle size={16} />{error.message}</div>;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><PageHeader title="Здоровье партнёров" subtitle="Радар риска: оплата, доступ и реальная активность" /><span className="flex items-center gap-1.5 text-xs text-base-content/40"><span className={`h-1.5 w-1.5 rounded-full ${liveConnected ? 'bg-success' : 'animate-pulse bg-warning'}`} />{liveConnected ? 'Live' : 'Подключение…'}</span></div>
      {isLoading ? <div className="rounded-xl bg-base-100 p-6"><SkeletonList rows={5} /></div> : !items.length ? <EmptyState icon={HeartPulse} title="Партнёров пока нет" /> : <>
        <HealthOverview items={items} counts={counts} average={average} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg bg-base-200 p-1">{[{ key: 'all', label: 'Все' }, ...Object.entries(BAND).map(([key, value]) => ({ key, label: value.label }))].map((f) => <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${filter === f.key ? 'bg-base-100 shadow-sm' : 'text-base-content/45 hover:text-base-content'}`}>{f.label}{f.key !== 'all' && <span className="ml-1.5 opacity-45">{counts[f.key]}</span>}</button>)}</div>
          <label className="input input-bordered input-sm flex w-full items-center gap-2 sm:w-72"><Search size={14} /><input className="grow" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти партнёра" />{query && <button onClick={() => setQuery('')}><X size={13} /></button>}</label>
        </div>
        {!shown.length ? <EmptyState icon={Search} title="Ничего не найдено" /> : <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{shown.map((partner) => <PartnerCard key={partner.organizationId} partner={partner} />)}</div>}
        <div className="flex items-center gap-2 text-[11px] text-base-content/40"><CheckCircle2 size={12} />Сначала показываются партнёры с самым низким score. Оплата и активность дают по 50 баллов.</div>
      </>}
    </div>
  );
}
