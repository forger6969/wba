import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loginEmail, loginNomi } from './login'

test('loginEmail — oddiy so‘zga markaz domeni qo‘shiladi', () => {
  assert.equal(loginEmail('Aziza'), 'aziza@wba.uz')
  assert.equal(loginEmail(' s001 '), 's001@wba.uz')
  assert.equal(loginEmail('aziza.k'), 'aziza.k@wba.uz')
  assert.equal(loginEmail('aziza@gmail.com'), 'aziza@gmail.com')
})

test('loginEmail — noto‘g‘ri login rad etiladi', () => {
  assert.equal(loginEmail(''), null)
  assert.equal(loginEmail('ab'), null)            // juda qisqa
  assert.equal(loginEmail('Азиза'), null)          // kirill
  assert.equal(loginEmail('aziza karim'), null)   // bo'sh joy
  assert.equal(loginEmail('aziza@'), null)
})

test('loginNomi — ko‘rsatishda domen yashiriladi', () => {
  assert.equal(loginNomi('aziza@wba.uz'), 'aziza')
  assert.equal(loginNomi('aziza@gmail.com'), 'aziza@gmail.com')
  assert.equal(loginNomi(null), '')
})
