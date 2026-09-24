import { createClient } from '@/lib/supabase/server'
import { Maydon, FormaBolim, kirishKlass } from '@/components/forma'
import { Select } from '@/components/select'
import { TimeField } from '@/components/time-field'
import { Yuborish } from '@/components/yuborish'
import { KUN_NOMI } from '@/lib/format'
import type { DayType } from '@/lib/types'

export type GuruhQiymati = {
  id?: string
  nom?: string
  subject_id?: string | null
  level_id?: number | null
  teacher_id?: string | null
  boshlanish?: string
  tugash?: string
  kun_turi?: DayType
  oylik_narx?: number
  sigim?: number
  holat?: string
}

/** Guruh qo'shish va tahrirlash — bitta forma. */
export async function GuruhFormasi({
  amal,
  qiymat = {},
  tugma,
}: {
  amal: (fd: FormData) => Promise<void>
  qiymat?: GuruhQiymati
  tugma: string
}) {
  const supabase = await createClient()
  const [{ data: fanlar }, { data: bosqichlar }, { data: ustozlar }, { data: narx }] = await Promise.all([
    supabase.from('subjects').select('id, nom').order('tartib'),
    supabase.from('levels').select('id, subject_id, nom').order('tartib'),
    supabase.from('teachers').select('id, ism').eq('holat', 'faol').order('ism'),
    supabase.from('settings').select('qiymat').eq('kalit', 'narx.standart').maybeSingle(),
  ])

  const fanNomi = new Map((fanlar ?? []).map((f) => [f.id, f.nom]))
  const standart = Number(narx?.qiymat ?? 0) || undefined

  return (
    <form action={amal} className="flex flex-col gap-4">
      {qiymat.id && <input type="hidden" name="id" value={qiymat.id} />}

      <FormaBolim nom="Yo‘nalish va ustoz">
        <div className="grid gap-3 sm:grid-cols-2">
          <Maydon nom="Yo‘nalish">
            <Select name="subject_id" defaultValue={qiymat.subject_id ?? ''}>
              <option value="">—</option>
              {(fanlar ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </Select>
          </Maydon>
          <Maydon nom="Bosqich" izoh="Ingliz tili va matematika uchun">
            <Select name="level_id" defaultValue={qiymat.level_id ?? ''}>
              <option value="">—</option>
              {(bosqichlar ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {fanNomi.get(b.subject_id)} · {b.nom}
                </option>
              ))}
            </Select>
          </Maydon>
          <Maydon nom="Ustoz">
            <Select name="teacher_id" defaultValue={qiymat.teacher_id ?? ''}>
              <option value="">[ANIQLANMAGAN]</option>
              {(ustozlar ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.ism}</option>
              ))}
            </Select>
          </Maydon>
          <Maydon nom="Guruh nomi" izoh="Bo‘sh qolsa: Yo‘nalish · Ustoz · Vaqt">
            <input name="nom" defaultValue={qiymat.nom ?? ''} placeholder="avtomatik" className={kirishKlass} />
          </Maydon>
        </div>
      </FormaBolim>

      <FormaBolim nom="Jadval va narx">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Maydon nom="Boshlanish">
            <TimeField name="boshlanish" required defaultValue={qiymat.boshlanish?.slice(0, 5)} />
          </Maydon>
          <Maydon nom="Tugash">
            <TimeField name="tugash" required defaultValue={qiymat.tugash?.slice(0, 5)} />
          </Maydon>
          <Maydon nom="Kunlar" className="col-span-2">
            <Select name="kun_turi" required defaultValue={qiymat.kun_turi ?? 'toq'}>
              {(Object.keys(KUN_NOMI) as DayType[]).map((k) => (
                <option key={k} value={k}>{KUN_NOMI[k]}</option>
              ))}
            </Select>
          </Maydon>
          <Maydon nom="Oylik narx" izoh={qiymat.id ? 'Yangi narx keyingi hisoblardan' : undefined} className="col-span-2">
            <input name="oylik_narx" required inputMode="decimal" defaultValue={qiymat.oylik_narx ?? standart ?? ''} className={kirishKlass} />
          </Maydon>
          <Maydon nom="Sig‘im" izoh="12 dan oshmaydi">
            <input type="number" name="sigim" min={1} max={12} defaultValue={qiymat.sigim ?? 12} className={kirishKlass} />
          </Maydon>
          {qiymat.id && (
            <Maydon nom="Holat">
              <Select name="holat" defaultValue={qiymat.holat ?? 'faol'}>
                <option value="faol">Faol</option>
                <option value="yopilgan">Yopilgan</option>
              </Select>
            </Maydon>
          )}
        </div>
      </FormaBolim>

      <Yuborish>{tugma}</Yuborish>
    </form>
  )
}
