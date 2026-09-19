import { pool } from '../config/db.js';

/**
 * Список запрещённых слов для чата — единая точка, которую спрашивают и
 * chat.service.js (на каждое сообщение), и main-модуль (админка списка)
 * (Karis 26.08.2026).
 *
 * Кэш в памяти процесса, а не Redis: Upstash сейчас упёрся в лимит
 * бесплатного плана (см. TASK.md), вешать на него ещё один запрос на
 * КАЖДОЕ сообщение чата было бы неразумно даже когда квота восстановится.
 * Список меняется редко (admin правит вручную) — сбрасываем кэш явно при
 * записи (invalidate), а не по TTL: TTL означал бы, что свежедобавленное
 * слово ещё несколько секунд не ловится, а это ровно то окно, где ребёнок
 * успевает написать то самое сообщение.
 */
let cache = null; // Array<{ word: string(нижний регистр), autoMask: boolean }>, только активные

async function loadActiveWords(db = pool) {
  const { rows } = await db.query(
    `SELECT lower(word) AS word, auto_mask FROM platform_banned_words WHERE is_active = true`,
  );
  return rows.map((r) => ({ word: r.word, autoMask: r.auto_mask }));
}

export function invalidateBannedWordsCache() {
  cache = null;
}

async function activeWords() {
  if (cache === null) cache = await loadActiveWords();
  return cache;
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Проверяет текст против списка и, если у совпавшего слова включён
 * auto_mask, заменяет ВСЕ его вхождения на **** прямо в тексте — это и есть
 * то, что видят собеседники в чате. Слова без auto_mask текст не меняют,
 * только попадают в flaggedWords для просмотра Main Admin'ом.
 *
 * Подстрочное совпадение без учёта регистра — сознательно шире, чем
 * совпадение по границе слова: дети коверкают окончания (узбекская
 * агглютинация, русские суффиксы), и для флага-без-маскировки цена лишнего
 * срабатывания — одна лишняя запись в списке, а цена пропуска — незамеченное
 * сообщение в переписке с детьми. Для auto_mask цена лишнего срабатывания
 * выше (могло стереть безобидный текст), но это осознанный выбор — включает
 * его Main Admin вручную, per-слово, после того как увидел, что слово вообще
 * встречается.
 */
export async function moderateMessage(text) {
  if (!text) return { body: text, flaggedWords: [] };
  const words = await activeWords();
  if (words.length === 0) return { body: text, flaggedWords: [] };

  const lower = text.toLowerCase();
  let body = text;
  const flagged = [];

  for (const { word, autoMask } of words) {
    if (!word || !lower.includes(word)) continue;
    flagged.push(word);
    if (autoMask) {
      body = body.replace(new RegExp(escapeRegExp(word), 'gi'), '****');
    }
  }

  return { body, flaggedWords: flagged };
}
