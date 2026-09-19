import { test } from 'node:test'
import assert from 'node:assert/strict'
import { elonFormadan, filtrOqi, shaxsiyMatn } from './elon'

test('filtrOqi — faqat ma’lum ko‘rinishlar, qolgani "hammasi"', () => {
  assert.deepEqual(filtrOqi('hammasi'), {})
  assert.deepEqual(filtrOqi('qarzdor'), { qarzdor: true })
  assert.deepEqual(filtrOqi('guruh:G05'), { guruh: 'G05' })
  assert.deepEqual(filtrOqi('fan:ingliz-tili'), { fan: 'ingliz-tili' })
  assert.deepEqual(filtrOqi('guruh:G05; drop table'), {})
  assert.deepEqual(filtrOqi('fan:'), {})
})

test('elonFormadan — noma’lum turi va kimga tashlanadi, takror yo‘q', () => {
  const q = new URLSearchParams('turi=buzuq&matn=%20Salom%20&k=oquvchi&k=ota_ona&k=oquvchi&k=admin&f=qarzdor')
  const e = elonFormadan(q)
  assert.equal(e.turi, 'umumiy')
  assert.equal(e.matn, 'Salom')
  assert.deepEqual(e.kimga, ['oquvchi', 'ota_ona'])
  assert.deepEqual(e.filtr, { qarzdor: true })
})

test('shaxsiyMatn — {ism}, {qarz}; manfiy qarz 0 bo‘ladi', () => {
  assert.equal(shaxsiyMatn('{ism}: {qarz}', { ism: 'Ali', qarz: 650000 }), 'Ali: 650 000 so‘m')
  assert.equal(shaxsiyMatn('{qarz}', { ism: 'Ali', qarz: -1350000 }), '0 so‘m')
  assert.equal(shaxsiyMatn('Salom {ism}{qarz}', { ism: 'Diana', qarz: null }), 'Salom Diana')
})
