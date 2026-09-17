import { Card } from '@/components/ui'
import { Sarlavha } from '@/components/crm'

/** Yuklanish holati — sahifa "sakramasin", o'sha joylar band tursin. */
export default function Yuklanmoqda() {
  return (
    <div className="flex animate-pulse flex-col gap-4 px-5 py-5 lg:px-7">
      <Sarlavha nom="O‘quvchilar" izoh="yuklanmoqda…" />

      <div className="flex flex-wrap gap-2.5">
        <span className="h-11 w-full max-w-xs rounded-[9px] bg-surface-2 sm:w-72" />
        <span className="h-11 w-40 rounded-[9px] bg-surface-2" />
        <span className="h-11 w-32 rounded-[9px] bg-surface-2" />
      </div>

      <Card className="flex flex-col">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="flex items-center gap-3 border-b border-line-soft px-5 py-3.5 last:border-0">
            <span className="h-3.5 flex-1 rounded bg-surface-2" />
            <span className="h-3.5 w-24 rounded bg-surface-2 max-md:hidden" />
          </span>
        ))}
      </Card>
    </div>
  )
}
