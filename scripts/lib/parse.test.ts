import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  pulga, telefonga, sanaga, davrga, usulga, bosqichNormal,
  yonalishAniqla, guruhParse, guruhlarniAjrat, ismVaId, axlatmi,
} from './parse'

test('pulga — Sheets formatlari', () => {
  assert.equal(pulga('650,000'), 650000)
  assert.equal(pulga('1 950 000'), 1950000)
  assert.equal(pulga('550000.00'), 550000)
  assert.equal(pulga(650000), 650000)
  assert.equal(pulga(''), 0)
  assert.equal(pulga('—'), 0)
})

test('telefonga — turli ko‘rinishlar bitta formatga tushadi', () => {
  assert.equal(telefonga('+998-90-968-07-12'), '+998909680712')
  assert.equal(telefonga('90 968 07 12'), '+998909680712')
  assert.equal(telefonga('998909680712'), '+998909680712')
  assert.equal(telefonga('nomalum'), null)
  assert.equal(telefonga(''), null)
})

test('sanaga', () => {
  assert.equal(sanaga('15.09.2026'), '2026-09-15')
  assert.equal(sanaga('2026-09-15'), '2026-09-15')
  assert.equal(sanaga('1.9.2026'), '2026-09-01')
  assert.equal(sanaga(''), null)
})

test('davrga', () => {
  assert.equal(davrga('2026-09'), '2026-09')
  assert.equal(davrga('2026-9'), '2026-09')
  assert.equal(davrga('15.09.2026'), '2026-09')
  assert.equal(davrga('axlat'), null)
})

test('usulga — aniqlanmasa null', () => {
  assert.equal(usulga('Naqd'), 'naqd')
  assert.equal(usulga('karta orqali'), 'karta')
  assert.equal(usulga('CLICK'), 'click')
  assert.equal(usulga('Payme'), 'payme')
  assert.equal(usulga(''), null)
  assert.equal(usulga('???'), null)
})

test('bosqichNormal — Pre-Inter va Pre-Intermediate birlashadi', () => {
  assert.equal(bosqichNormal('Pre-Inter'), 'Pre-Intermediate')
  assert.equal(bosqichNormal('Pre-Intermediate'), 'Pre-Intermediate')
  assert.equal(bosqichNormal('Beginner'), 'Beginner')
})

test('yonalishAniqla', () => {
  assert.equal(yonalishAniqla('Beginner'), 'ingliz-tili')
  assert.equal(yonalishAniqla('IELTS'), 'ingliz-tili')
  assert.equal(yonalishAniqla('Rus tili'), 'rus-tili')
  assert.equal(yonalishAniqla('Arab tili'), 'arab-tili')
  assert.equal(yonalishAniqla('Matematika'), 'matematika')
  assert.equal(yonalishAniqla('Scratch'), 'scratch')
  assert.equal(yonalishAniqla('Nomalum fan'), null)
})

test('guruhParse — haqiqiy qatorlar', () => {
  const g = guruhParse('Beginner · Diana · 08:30-10:00, Toq kun')
  assert.equal(g?.nom, 'Beginner')
  assert.equal(g?.ustoz, 'Diana')
  assert.equal(g?.boshlanish, '08:30')
  assert.equal(g?.tugash, '10:00')
  assert.equal(g?.kunTuri, 'toq')
  assert.equal(g?.yonalish, 'ingliz-tili')

  const j = guruhParse('IELTS · Komila Bozorova · 16:30-18:00, Juft kun')
  assert.equal(j?.kunTuri, 'juft')
  assert.equal(j?.ustoz, 'Komila Bozorova')

  const q = guruhParse('Matematika · Jamshid Abdialimov · 18:30-20:00, Juft kun')
  assert.equal(q?.yonalish, 'matematika')

  // Vaqti yo'q
  const v = guruhParse('Arab tili · Abu Tolib aka')
  assert.equal(v?.boshlanish, null)
  assert.equal(v?.nom, 'Arab tili')
})

test('guruhlarniAjrat — bitta katakda ikkita guruh', () => {
  const r = guruhlarniAjrat(
    'Elementary · Madina Berdiyeva · 19:30-21:00, Toq kun + Matematika · Jamshid Abdialimov · 18:30-20:00, Juft kun',
  )
  assert.equal(r.length, 2)
  assert.ok(r[0].startsWith('Elementary'))
  assert.ok(r[1].startsWith('Matematika'))

  assert.deepEqual(guruhlarniAjrat(''), [])
  assert.equal(guruhlarniAjrat('Beginner · Diana · 08:30-10:00, Toq kun').length, 1)
})

test('ismVaId', () => {
  assert.deepEqual(ismVaId('Madina Abduganiyeva (S015)'), {
    fish: 'Madina Abduganiyeva',
    id: 'S015',
  })
  assert.deepEqual(ismVaId('Dilbek'), { fish: 'Dilbek', id: null })
})

test('axlatmi — buzilgan qatorlarni ushlaydi', () => {
  assert.equal(axlatmi('Dars Soati: 19:30-21:00'), true)
  assert.equal(axlatmi('namuna'), true)
  assert.equal(axlatmi('sdfd'), true)
  assert.equal(axlatmi(''), true)
  assert.equal(axlatmi('123'), true)
  assert.equal(axlatmi('—'), true)
  assert.equal(axlatmi('Muslima G‘ayratova'), false)
  assert.equal(axlatmi('Dilbek'), false)
})
