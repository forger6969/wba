import type { SelectHTMLAttributes } from 'react'
import { IconChevronDown } from '@/components/icons'

/**
 * Brauzer standart <select> ko'rinishini olib tashlaydi (appearance-none),
 * o'z strelkasi va uslubi bilan — lekin ostida ODDIY <select> qoladi:
 * klaviatura, ekran o'quvchi, telefondagi tabiiy tanlov ro'yxati hammasi
 * ishlayveradi. To'liq qo'lda listbox yasashdan ko'ra xavfsizroq va
 * arzonroq — faqat ko'rinish "brauzer standart"dan chiqadi.
 */
export function Select({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select
        className={`min-h-11 w-full appearance-none rounded-[9px] border border-line bg-surface px-3 pr-9 text-[13.5px] text-ink outline-none transition-colors focus-visible:border-brand ${className}`}
        {...rest}
      >
        {children}
      </select>
      <IconChevronDown
        size={15}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-3"
      />
    </span>
  )
}
