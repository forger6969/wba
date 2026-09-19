/**
 * Единый источник правды для 3 уровней дисциплины — используется и в панели
 * CEO (pages/super/Discipline.jsx: выдача взыскания, каталог правил,
 * графики), и в самопросмотре сотрудника (components/MyDiscipline.jsx).
 *
 * От мягкого к жёсткому: sariq (жёлтое) → qizil (красное) → qora (увольнение).
 * НЕ автоматика — количество sariq/qizil нигде не считается порогом и не
 * порождает qora само.
 *
 * shtraf как отдельная 4-я категория (синяя) отменена 2026-07-29 — деньги не
 * отдельный уровень, а необязательный довесок к любому из трёх (см. amount в
 * IssuePenalty/DisciplineRule). penalty_type в БД (Postgres ENUM) технически
 * ещё содержит 'shtraf' — у старых тестовых записей может остаться, ENUM-
 * значения нельзя выпилить — но UI больше нигде его не предлагает и не создаёт.
 *
 * `dark: true` — на закраске этим цветом (hover/выбор) держим тёмный текст,
 * не белый: жёлтый (#eab308) с белым текстом читается плохо.
 */
import { useTranslation } from 'react-i18next';

export const TYPE_META = {
  sariq: { label: 'Жёлтое предупреждение', color: '#eab308', dark: true },
  qizil: { label: 'Красное предупреждение', color: '#dc2626' },
  qora: { label: 'Увольнение', color: '#111827' },
};

/** То же самое, но с переведённой подписью — для страниц, уже подключивших
    react-i18next. Цвет/dark не переводятся, берутся из TYPE_META как есть. */
export const typeMetaFor = (t) => ({
  sariq: { ...TYPE_META.sariq, label: t('discipline.typeSariq') },
  qizil: { ...TYPE_META.qizil, label: t('discipline.typeQizil') },
  qora: { ...TYPE_META.qora, label: t('discipline.typeQora') },
});

/** Бейдж уровня — рамка цвета уровня, без заливки и без иконки: серьёзный
    учебный центр, не набор стикеров. Для пассивных мест (таблицы, списки). */
export function LevelBadge({ type, size = 'md' }) {
  const { t } = useTranslation();
  const m = typeMetaFor(t)[type] ?? typeMetaFor(t).sariq;
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border-[1.5px] whitespace-nowrap ${
        size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'
      }`}
      style={{ borderColor: m.color, color: m.color }}
    >
      {m.label}
    </span>
  );
}

/** Цветной кружок — только для легенды графика (recharts), там закрашенный
    квадрат/кружок рядом с подписью — общепринятая конвенция, не «стикер». */
export function Dot({ color, size = 10 }) {
  return (
    <span
      className="rounded-full shrink-0 inline-block"
      style={{ width: size, height: size, background: color }}
    />
  );
}
