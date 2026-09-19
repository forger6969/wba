/**
 * Hisob ro'yxatini @WBAlcBot orqali yuborish.
 *   npx tsx scripts/hisob-yubor.ts <chat_id> <fayl> "<izoh>"
 * Token .env.local dagi TELEGRAM_BOT_TOKEN yoki TG_TOKEN muhitidan olinadi.
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
config({ path: '.env.local' })

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TG_TOKEN
const [, , chatId, fayl, izoh] = process.argv
if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN topilmadi (.env.local yoki TG_TOKEN)')
if (!chatId || !fayl) throw new Error('Foydalanish: hisob-yubor.ts <chat_id> <fayl> "<izoh>"')

const buf = readFileSync(fayl)
const form = new FormData()
form.set('chat_id', chatId)
if (izoh) form.set('caption', izoh)
form.set('document', new Blob([buf]), basename(fayl))

const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, { method: 'POST', body: form })
const j = await r.json()
console.log(j.ok ? `OK yuborildi → ${chatId} (${basename(fayl)})` : `XATO: ${JSON.stringify(j)}`)
