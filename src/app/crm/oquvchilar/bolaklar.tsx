import { Maydon, kirishKlass } from '@/components/forma'

/** Ikki bosqichli chegirma — Qatnashuv varag'idagi F..I ustunlar bilan bir xil. */
export function ChegirmaMaydonlari() {
  return (
    <details className="rounded-[10px] border border-line px-4 py-3">
      <summary className="cursor-pointer text-[13px] text-ink-2">Chegirma (ixtiyoriy)</summary>
      <div className="mt-3 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Maydon nom="1-chegirma, oyiga" izoh="50 yoki 50000">
            <input name="chegirma_summa" inputMode="decimal" placeholder="0" className={kirishKlass} />
          </Maydon>
          <Maydon nom="Necha oy" izoh="bo‘sh — doimiy">
            <input name="chegirma_oy" type="number" min={1} placeholder="doimiy" className={kirishKlass} />
          </Maydon>
          <Maydon nom="2-chegirma, oyiga" izoh="1-si tugagach">
            <input name="chegirma2_summa" inputMode="decimal" placeholder="0" className={kirishKlass} />
          </Maydon>
          <Maydon nom="Necha oy" izoh="bo‘sh — doimiy">
            <input name="chegirma2_oy" type="number" min={1} placeholder="doimiy" className={kirishKlass} />
          </Maydon>
        </div>
        <Maydon nom="Sababi">
          <input name="chegirma_sabab" placeholder="Masalan: 600 000 to‘lagan" className={kirishKlass} />
        </Maydon>
      </div>
    </details>
  )
}

/** Uchta telefon — botdagi Probniy va O'quvchilar varag'idagi kabi. */
export function TelefonMaydonlari({
  qiymat,
}: {
  qiymat?: { ota_tel?: string | null; ona_tel?: string | null; shaxsiy_tel?: string | null }
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Maydon nom="Shaxsiy telefon">
        <input name="shaxsiy_tel" type="tel" defaultValue={qiymat?.shaxsiy_tel ?? ''} placeholder="90 123 45 67" className={kirishKlass} />
      </Maydon>
      <Maydon nom="Ota telefoni">
        <input name="ota_tel" type="tel" defaultValue={qiymat?.ota_tel ?? ''} placeholder="90 123 45 67" className={kirishKlass} />
      </Maydon>
      <Maydon nom="Ona telefoni">
        <input name="ona_tel" type="tel" defaultValue={qiymat?.ona_tel ?? ''} placeholder="90 123 45 67" className={kirishKlass} />
      </Maydon>
    </div>
  )
}
