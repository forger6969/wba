/* ─────────────────────────────────────────────────────────────────────────────
   Finance Manager — общие UI-компоненты (только для этой панели). Стили —
   DaisyUI, тон — из дизайн-системы остальных панелей.
   ────────────────────────────────────────────────────────────────────────── */
import { money } from '../../format.js';

/* Последние N календарных месяцев, самый свежий — текущий. Раньше был жёсткий
   список из 6 строк в _data.js — переставал работать в следующем месяце и не
   имел смысла привязывать к "сейчас" вручную. from/to — границы месяца в
   ISO, для query-параметров backend (listIncomeSchema/listSalariesSchema). */
const LOCALE = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

export function monthOptions(lang = 'ru', count = 12) {
  const now = new Date();
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(LOCALE[lang] ?? 'ru-RU', { month: 'long', year: 'numeric' });
    out.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return out; // [текущий, …, i месяцев назад]
}

/**
 * Границы месяца в UTC. Karis 22.08.2026 — было `new Date(y, m - 1, 1)`, то
 * есть полночь по МЕСТНОМУ времени, а `.toISOString()` дальше переводил её в
 * UTC. В Ташкенте (UTC+5) «1 августа 00:00» превращалось в `2026-07-31T19:00Z`:
 * в август затягивался хвост 31 июля и терялись последние 5 часов 31 августа.
 * Живая проверка: доход за август показывался как 7 502 030 081,63 вместо
 * 1 502 030 081,63 — ровно на 6 млрд транзакции от 31 июля больше.
 * Date.UTC берёт те же границы честно в UTC, и число сходится с месячным
 * рядом в /stats, где месяц режется на стороне БД (date_trunc).
 */
export function monthRange(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)); // последний день месяца
  return { from: from.toISOString(), to: to.toISOString() };
}

/* ── KPI-карточка с иконкой и подписью ──
   Токены и структура — те же "strict"-переменные, что у Admin/CEO дашборда
   (index.css § DASHBOARD STRICT TOKENS, components/ui.jsx KpiCard): плоская
   белая карточка, тонкая рамка вместо цветного ring-halo, компактная 8px
   плашка под иконку вместо круглой rounded-xl — раньше Finance выглядела
   заметно "мультяшнее" остальных панелей (Karis, 13.08.2026: "seryozini roq
   qil"). */
const TONES = {
  success: { bg: 'var(--bg-success)', fg: 'var(--success)' },
  warning: { bg: 'var(--bg-warning)', fg: 'var(--warning)' },
  neutral: { bg: 'var(--border-faint)', fg: 'var(--text-muted)' },
  info:    { bg: 'var(--bg-info)',    fg: 'var(--info)' },
};

export function Metric({ Icon, label, value, sub, tone = 'neutral', trend, trendLabel }) {
  const { bg, fg } = TONES[tone] ?? TONES.neutral;
  const up = (trend ?? 0) >= 0;
  return (
    <article className="
      bg-white
      border border-[var(--border-subtle)]
      rounded-[var(--radius-card)]
      p-4 md:p-5
      shadow-[var(--shadow-card)]
      transition-shadow duration-200
      hover:shadow-[var(--shadow-card-hover)]
    ">
      <div className="flex items-start justify-between gap-3">
        <span
          className="w-10 h-10 rounded-[var(--radius-tight)] grid place-items-center shrink-0"
          style={{ background: bg, color: fg }}
        >
          <Icon size={18} strokeWidth={2.2} />
        </span>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-3 truncate">
        {label}
      </p>
      <p className="text-2xl font-extrabold leading-none tracking-tight tabular-nums text-[var(--text)] mt-1.5">
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{sub}</p>}
      {trend !== undefined && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {up ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
          {trendLabel && <span className="text-[var(--text-muted)]">{trendLabel}</span>}
        </div>
      )}
    </article>
  );
}

/* ── Карточка с заголовком — тот же DashboardPanel-паттерн, что у Admin/CEO ── */
export function Card({ title, subtitle, action, children, bodyClass = 'p-4', className = '' }) {
  return (
    <section className={`
      bg-white
      border border-[var(--border-subtle)]
      rounded-[var(--radius-card)]
      shadow-[var(--shadow-card)]
      transition-shadow duration-200
      hover:shadow-[var(--shadow-card-hover)]
      ${className}
    `}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border-faint)]">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/* ── Селекты филиала и месяца ── */
export function BranchSelect({ value, onChange, allLabel, branches }) {
  return (
    <select className="select select-bordered select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">{allLabel}</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}

export function MonthSelect({ value, onChange, months }) {
  return (
    <select className="select select-bordered select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {months.map((m) => (
        <option key={m.key} value={m.key}>{m.label}</option>
      ))}
    </select>
  );
}

/* ── Подпись способа оплаты (payment_method enum) — Humo/Uzcard/Uzum/Payme/
   Click торговые марки, не переводятся ни в одном языке. ── */
const METHOD_KEY = {
  cash: 'finance.method.cash', card: 'finance.method.card', transfer: 'finance.method.transfer',
  bank_transfer: 'finance.method.bankTransfer',
};
const METHOD_BRAND = { humo: 'Humo', uzcard: 'Uzcard', uzum: 'Uzum', payme: 'Payme', click: 'Click' };
export function paymentMethodLabel(method, t) {
  return METHOD_BRAND[method] || (METHOD_KEY[method] ? t(METHOD_KEY[method]) : method);
}

/* ── Подпись статуса зарплаты (mentor_salaries.status enum) ── */
const SALARY_STATUS_KEY = {
  draft: 'finance.salaryStatus.draft', approved: 'finance.salaryStatus.approved', paid: 'finance.salaryStatus.paid',
};
export function salaryStatusLabel(status, t) {
  return SALARY_STATUS_KEY[status] ? t(SALARY_STATUS_KEY[status]) : status;
}

/* ── Деньги с компактным форматированием (млн/тыс) ── */
export function compactMoney(n) {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.0', '')} mln`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} ming`;
  return money(v);
}
