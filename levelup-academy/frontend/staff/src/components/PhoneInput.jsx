/**
 * Ввод узбекского номера.
 *
 * Показывает `+998 90 123 45 67`, а наружу отдаёт `+998901234567` — ровно то,
 * что ждут схемы валидации (`/^\+998\d{9}$/`) и бэкенд. Раньше в каждом месте
 * стоял просто `<input placeholder="+998901234567">`: человек видел пример
 * слитным числом, набирал с пробелами или без кода страны, и получал ошибку
 * формата уже после отправки.
 *
 * `+998` показан всегда и не стирается — его незачем набирать руками.
 * Пустой ввод отдаёт пустую строку, потому что телефон почти везде
 * необязателен, и `+998` без цифр не должен считаться заполненным.
 */

/** Цифры номера без кода страны, максимум девять. */
function digitsOf(v) {
  return String(v ?? '').replace(/\D/g, '').replace(/^998/, '').slice(0, 9);
}

/** `+998901234567` — то, что уходит в форму и на бэкенд. */
export function phoneRaw(v) {
  const d = digitsOf(v);
  return d ? `+998${d}` : '';
}

/** `+998 90 123 45 67` — то, что видит человек. */
export function phoneDisplay(v) {
  const d = digitsOf(v);
  const groups = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return groups.length ? `+998 ${groups.join(' ')}` : '+998 ';
}

export default function PhoneInput({ value, onChange, className = '', ...rest }) {
  return (
    <input
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      value={phoneDisplay(value)}
      onChange={(e) => onChange?.(phoneRaw(e.target.value))}
      placeholder="+998 00 000 00 00"
      className={className}
      {...rest}
    />
  );
}
