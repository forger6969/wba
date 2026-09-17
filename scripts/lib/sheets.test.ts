import { test } from 'node:test'
import assert from 'node:assert/strict'
import { varaqQur, qiymat, matn, belgi, normKalit, varaq, varaqBormi } from './sheets'
import { jurnallarniOqi, J_S1, J_KALIT } from './jurnal'

/* ------------------------------------------------------------------ */
/*  Varaqni o'qish                                                     */
/* ------------------------------------------------------------------ */

test('varaqQur — "uzun" varaqning bo‘sh dumi kesiladi', () => {
  // Formulalar pastgacha qo'yilgani uchun oxirgi qatorlar bo'sh, lekin bor
  const v = varaqQur("O'quvchilar", [
    ['ID', 'Ism familya', 'Holat'],
    ['S001', "Muslima G'ayratova", 'Faol'],
    ['S002', 'Dilbek', 'Faol'],
    ['', '', ''],
    ['', '', ''],
  ])

  assert.equal(v.qatorlar.length, 2)
  assert.equal(v.qatorlar[0]._qator, 2)
  assert.equal(matn(v.qatorlar[1], 'Ism familya'), 'Dilbek')
})

test('varaqQur — kalit ustuni bo‘sh qator o‘tkazib yuboriladi', () => {
  const v = varaqQur('Tolovlar', [
    ['ID', 'Sana', "O'quvchi", 'Summa'],
    ['T001', 46276, 'Dilbek (S002) · Starter · Diana · 10:00-11:30', 650000],
    ['T002', 46277, '', 0],                       // kaliti bo'sh — hisobga olinmaydi
    ['T003', 46278, 'Dilbek (S002) · Starter · Diana · 10:00-11:30', 550000],
  ])

  assert.equal(v.qatorlar.length, 2)
  assert.equal(qiymat(v.qatorlar[1], 'Summa'), 550000)
})

test('normKalit / qiymat — apostrof va harf kattaligi ahamiyatsiz', () => {
  assert.equal(normKalit("O'quvchi"), normKalit('O‘quvchi'))
  assert.equal(normKalit("O'qituvchi"), 'oqituvchi')

  const v = varaqQur('Qatnashuv', [
    ["O'quvchi", 'Guruh', "To'lashi kerak"],
    ['Dilbek (S002)', 'Starter · Diana · 10:00-11:30', 1300000],
  ])
  // Sarlavhada tipografik apostrof bo'lsa ham topiladi
  assert.equal(matn(v.qatorlar[0], 'O‘quvchi'), 'Dilbek (S002)')
  assert.equal(qiymat(v.qatorlar[0], "to'lashi kerak"), 1300000)
  assert.equal(qiymat(v.qatorlar[0], 'yo‘q ustun'), '')
})

test('belgi — Sheets galochkasi', () => {
  const v = varaqQur('Tolovlar', [
    ['ID', "O'quvchi", 'Summa', 'Tasdiq'],
    ['T001', 'Dilbek (S002)', 650000, true],
    ['T002', 'Dilbek (S002)', 650000, false],
  ])
  assert.equal(belgi(v.qatorlar[0], 'Tasdiq'), true)
  assert.equal(belgi(v.qatorlar[1], 'Tasdiq'), false)
})

test('varaq — yo‘q varaq uchun tushunarli xato, varaqBormi esa null', () => {
  const kitob = new Map([["O'quvchilar", varaqQur("O'quvchilar", [['ID'], ['S001']])]])
  assert.equal(varaqBormi(kitob, 'Narxlar'), null)
  assert.throws(() => varaq(kitob, 'Narxlar'), /Narxlar/)
  assert.equal(varaq(kitob, "O‘quvchilar").nom, "O'quvchilar")
})

/* ------------------------------------------------------------------ */
/*  Davomat jurnali                                                    */
/* ------------------------------------------------------------------ */

/** "2026-09-02" → Sheets sana seriyasi (1899-12-30 dan beri kunlar). */
function seriya(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / 86_400_000) + 25569
}

/** Jurnal qatorini yasaydi: D..R dagi kataklar + U dagi kalit. */
function jQator(kalit: string, kataklar: unknown[] = []): unknown[] {
  const q = new Array(J_KALIT).fill('')
  kataklar.forEach((k, i) => { q[J_S1 - 1 + i] = k })
  q[J_KALIT - 1] = kalit
  return q
}

test('jurnallarniOqi — blokdan dars va belgilarni oladi', () => {
  const xom = [
    jQator('#OY:2026-09'),
    jQator('#BOSH'),
    jQator('#SANA|Starter · Diana · 10:00-11:30', [seriya('2026-09-02'), seriya('2026-09-04')]),
    jQator('Dilbek (S002) · Starter · Diana · 10:00-11:30', [true, false]),
    jQator('Aziza (S003) · Starter · Diana · 10:00-11:30', [true, true]),
  ]

  const n = jurnallarniOqi([['Davomat juft', xom]], {
    guruhId: new Map([['Starter · Diana · 10:00-11:30', 'N01']]),
    oquvchiBor: new Set(['S002', 'S003']),
  })

  assert.equal(n.darslar.length, 2)
  assert.equal(n.belgilar.length, 4)
  assert.equal(n.belgilar.filter((b) => b.holat === 'keldi').length, 3)
  assert.deepEqual(n.darslar[0], { group_id: 'N01', sana: '2026-09-02' })
  assert.equal(n.belgilar[1].holat, 'kelmadi')
})

test('jurnallarniOqi — bo‘sh katak belgi emas (o‘sha kuni guruhda bo‘lmagan)', () => {
  const xom = [
    jQator('#SANA|Starter · Diana · 10:00-11:30', [seriya('2026-09-02'), seriya('2026-09-04')]),
    jQator('Dilbek (S002) · Starter · Diana · 10:00-11:30', ['', true]),
  ]

  const n = jurnallarniOqi([['Davomat juft', xom]], {
    guruhId: new Map([['Starter · Diana · 10:00-11:30', 'N01']]),
    oquvchiBor: new Set(['S002']),
  })

  assert.equal(n.belgilar.length, 1)
  assert.equal(n.belgilar[0].sana, '2026-09-04')
})

test('jurnallarniOqi — yangi blok boshlanganda eski sanalar amal qilmaydi', () => {
  const xom = [
    jQator('#SANA|Starter · Diana · 10:00-11:30', [seriya('2026-09-02')]),
    jQator('Dilbek (S002) · Starter · Diana · 10:00-11:30', [true]),
    jQator('#BOSH'),
    // Guruhi tanilmagan blok: belgilar hech qayerga yozilmaydi
    jQator('#SANA|Yo‘q guruh', [seriya('2026-09-04')]),
    jQator('Aziza (S003) · Yo‘q guruh', [true]),
  ]

  const ogohlar: string[] = []
  const n = jurnallarniOqi([['Davomat toq', xom]], {
    guruhId: new Map([['Starter · Diana · 10:00-11:30', 'N01']]),
    oquvchiBor: new Set(['S002', 'S003']),
    ogoh: (m) => ogohlar.push(m),
  })

  assert.equal(n.belgilar.length, 1)
  assert.equal(n.belgilar[0].student_id, 'S002')
  assert.equal(ogohlar.length, 1)
  assert.match(ogohlar[0], /guruh topilmadi/)
})

test('jurnallarniOqi — bazada yo‘q o‘quvchi ogohlantirish beradi', () => {
  const xom = [
    jQator('#SANA|Starter · Diana · 10:00-11:30', [seriya('2026-09-02')]),
    jQator('Notanish (S999) · Starter · Diana · 10:00-11:30', [true]),
  ]

  const ogohlar: string[] = []
  const n = jurnallarniOqi([['Davomat toq', xom]], {
    guruhId: new Map([['Starter · Diana · 10:00-11:30', 'N01']]),
    oquvchiBor: new Set(['S002']),
    ogoh: (m) => ogohlar.push(m),
  })

  assert.equal(n.belgilar.length, 0)
  assert.match(ogohlar[0], /o'quvchi bazada yo'q/)
})
