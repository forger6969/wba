import { Select } from '@/components/select'

const SOATLAR = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const DAQIQALAR = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

/**
 * Brauzer standart vaqt tanlagichi (`<input type="time">`) o'rniga —
 * ikkita oddiy <select> (soat, daqiqa). JavaScriptsiz ham ishlaydi
 * (forma.tsx qoidasi): server tomonda `${name}_soat` va
 * `${name}_daqiqa` alohida o'qiladi va birlashtiriladi.
 */
export function TimeField({
  name,
  defaultValue,
  required,
}: {
  name: string
  defaultValue?: string
  required?: boolean
}) {
  const [soat, daqiqa] = (defaultValue ?? '').split(':')

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Select name={`${name}_soat`} required={required} defaultValue={soat ?? ''}>
        {!soat && <option value="" disabled>—</option>}
        {SOATLAR.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Select>
      <Select name={`${name}_daqiqa`} required={required} defaultValue={daqiqa ?? ''}>
        {!daqiqa && <option value="" disabled>—</option>}
        {DAQIQALAR.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </Select>
    </div>
  )
}
