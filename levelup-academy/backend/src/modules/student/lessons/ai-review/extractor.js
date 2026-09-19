import AdmZip from 'adm-zip';
import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';
import { getObjectBuffer } from '../../../../config/s3.js';
import { logger } from '../../../../config/logger.js';

// Cost/prompt-size guard (спека, п.5/11): ≤80 файлов, ≤150KB суммарного текста
// после фильтра. Больше — 'unreadable' (mentor смотрит сам), не режем прогноз
// стоимости на глазок.
const MAX_FILES = 80;
const MAX_BUNDLE_BYTES = 150 * 1024;
// Anti zip-bomb: до распаковки — не после (спека, п.5).
const MAX_ZIP_ENTRIES = 50;
const MAX_ZIP_UNCOMPRESSED_BYTES = 10 * 1024 * 1024;

const SKIP_DIRS = ['node_modules/', 'dist/', 'build/', '.git/'];
const SKIP_EXT = new Set(['.lock', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.env', '.map']);
const CODE_EXT = new Set(['.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt']);

const GITHUB_URL_RE = /github\.com\/([\w.-]+)\/([\w.-]+)/i;
const GOOGLE_DOC_RE = /docs\.google\.com\/document\/d\/([\w-]+)/i;
const GOOGLE_SHEET_RE = /docs\.google\.com\/spreadsheets\/d\/([\w-]+)/i;

const PDF_EXT = new Set(['.pdf']);
const SPREADSHEET_EXT = new Set(['.xlsx', '.xls', '.csv']);

function shouldSkip(path) {
  const lower = path.toLowerCase();
  if (SKIP_DIRS.some((d) => lower.includes(d))) return true;
  const dot = lower.lastIndexOf('.');
  const ext = dot === -1 ? '' : lower.slice(dot);
  if (SKIP_EXT.has(ext)) return true;
  return ext !== '' && !CODE_EXT.has(ext);
}

function extOf(key) {
  const dot = key.toLowerCase().lastIndexOf('.');
  return dot === -1 ? '' : key.toLowerCase().slice(dot);
}

/** Собирает единый текст-bundle из файлов { path, content }, обрезая по лимиту
 * (по файлам сначала, потом по суммарному размеру) — детерминированный порядок
 * (path ASC), чтобы обрезка была воспроизводимой, а не зависела от порядка ZIP. */
function buildBundle(files) {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path)).slice(0, MAX_FILES);
  let used = 0;
  const parts = [];
  for (const f of sorted) {
    const block = `=== ${f.path} ===\n${f.content}\n\n`;
    if (used + block.length > MAX_BUNDLE_BYTES) break;
    used += block.length;
    parts.push(block);
  }
  return parts.length > 0 ? parts.join('') : null;
}

/** ZIP → filtered bundle. Guard'lar RASPAKOVKADAN OLDIN — entry-listni ko'rib,
 * fayl soni/hajmi va path-traversal ('..'/mutlaq yo'l) tekshiriladi. */
function extractZip(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);

  if (entries.length > MAX_ZIP_ENTRIES) return null;
  const totalUncompressed = entries.reduce((sum, e) => sum + e.header.size, 0);
  if (totalUncompressed > MAX_ZIP_UNCOMPRESSED_BYTES) return null;

  const files = [];
  for (const entry of entries) {
    const name = entry.entryName;
    // path-traversal: '..' segment yoki mutlaq yo'l — o'tkazib yuboriladi, zip
    // butunlay rad etilmaydi (bitta yomon entry qolganlarini buzmasin)
    if (name.split('/').includes('..') || name.startsWith('/')) continue;
    if (shouldSkip(name)) continue;
    try {
      files.push({ path: name, content: entry.getData().toString('utf8') });
    } catch {
      // binary/corrupt entry — shunchaki o'tkazib yuboriladi
    }
  }
  return buildBundle(files);
}

async function fetchGithubTree(owner, repo) {
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, {
    headers: { 'User-Agent': 'levelup-academy-ai-review' },
  });
  if (!treeRes.ok) return null; // 404/private/rate-limit — barchasi 'unreadable'
  const tree = await treeRes.json();
  const paths = (tree.tree ?? [])
    .filter((n) => n.type === 'blob' && !shouldSkip(n.path))
    .slice(0, MAX_FILES);

  const files = [];
  for (const node of paths) {
    // eslint-disable-next-line no-await-in-loop -- GitHub raw fayllarni ketma-ket o'qish, parallel emas (rate-limit)
    const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${node.path}`).catch(() => null);
    if (raw?.ok) files.push({ path: node.path, content: await raw.text() });
  }
  return buildBundle(files);
}

/** PDF → oddiy matn. Parolli/buzilgan fayl — null (unreadable, taxmin qilinmaydi). */
async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const { text } = await parser.getText();
    return text?.trim() || null;
  } catch (err) {
    logger.warn({ err }, 'ai-review: pdf-parse failed');
    return null;
  } finally {
    await parser.destroy().catch(() => {});
  }
}

/** Excel/CSV → har bir varaq alohida "fayl" sifatida CSV matniga aylantiriladi
 * (buildBundle o'zi === nomi === bilan bo'ladi va limit/kesishni boshqaradi). */
function extractSpreadsheetFiles(buffer, fileKey) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    logger.warn({ err, fileKey }, 'ai-review: xlsx parse failed');
    return [];
  }
  return workbook.SheetNames.map((name) => ({
    path: `${fileKey}#${name}`,
    content: XLSX.utils.sheet_to_csv(workbook.Sheets[name]),
  })).filter((f) => f.content.trim().length > 0);
}

/** Google Docs/Sheets — faqat "anyone with the link" ochiq bo'lsa ishlaydi:
 * yopiq hujjat /export login-sahifasiga (text/html) qaytaradi, shuni content-type
 * bo'yicha ajratamiz. Sheets uchun faqat birinchi (active) varaq — gid bo'lmasa
 * boshqa varaqlarga kirish yo'q, spekaga yetadi. */
async function fetchGoogleExport(url, expectedContentType) {
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return null;
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.startsWith(expectedContentType)) return null; // login-sahifa yoki xato
  const text = await res.text();
  return text.trim() || null;
}

/**
 * submission — { fileKey, textAnswer } (methodology_submissions bo'yicha).
 * Qaytaradi: { bundle: string|null, reviewSource: 'code'|'text'|'tests'|'unreadable' }.
 * bundle=null va reviewSource='unreadable'/'tests' — Groq CHAQIRILMAYDI (fallback
 * shu yerda hal bo'ladi, xarajat yo'q).
 */
export async function extractSubmission({ fileKey, textAnswer }) {
  if (fileKey) {
    let buffer;
    try {
      buffer = await getObjectBuffer(fileKey);
    } catch (err) {
      logger.warn({ err, fileKey }, 'ai-review: failed to download submission file');
      return { bundle: null, reviewSource: 'unreadable' };
    }

    if (extOf(fileKey) === '.zip') {
      const bundle = extractZip(buffer);
      return bundle ? { bundle, reviewSource: 'code' } : { bundle: null, reviewSource: 'unreadable' };
    }
    if (CODE_EXT.has(extOf(fileKey))) {
      const bundle = buildBundle([{ path: fileKey, content: buffer.toString('utf8') }]);
      return bundle ? { bundle, reviewSource: 'code' } : { bundle: null, reviewSource: 'unreadable' };
    }
    if (PDF_EXT.has(extOf(fileKey))) {
      const text = await extractPdfText(buffer);
      const bundle = text ? buildBundle([{ path: fileKey, content: text }]) : null;
      return bundle ? { bundle, reviewSource: 'text' } : { bundle: null, reviewSource: 'unreadable' };
    }
    if (SPREADSHEET_EXT.has(extOf(fileKey))) {
      const files = extOf(fileKey) === '.csv'
        ? [{ path: fileKey, content: buffer.toString('utf8') }]
        : extractSpreadsheetFiles(buffer, fileKey);
      const bundle = buildBundle(files);
      return bundle ? { bundle, reviewSource: 'text' } : { bundle: null, reviewSource: 'unreadable' };
    }
    // Rasm/boshqa binar — o'qib bo'lmaydi, taxmin qilinmaydi (spek, p.6)
    return { bundle: null, reviewSource: 'unreadable' };
  }

  if (textAnswer) {
    const githubMatch = textAnswer.match(GITHUB_URL_RE);
    if (githubMatch) {
      const [, owner, repo] = githubMatch;
      const bundle = await fetchGithubTree(owner, repo.replace(/\.git$/, ''));
      return bundle ? { bundle, reviewSource: 'code' } : { bundle: null, reviewSource: 'unreadable' };
    }
    const gdocMatch = textAnswer.match(GOOGLE_DOC_RE);
    if (gdocMatch) {
      const text = await fetchGoogleExport(`https://docs.google.com/document/d/${gdocMatch[1]}/export?format=txt`, 'text/plain');
      const bundle = text ? buildBundle([{ path: 'google-doc.txt', content: text }]) : null;
      return bundle ? { bundle, reviewSource: 'text' } : { bundle: null, reviewSource: 'unreadable' };
    }
    const gsheetMatch = textAnswer.match(GOOGLE_SHEET_RE);
    if (gsheetMatch) {
      const text = await fetchGoogleExport(`https://docs.google.com/spreadsheets/d/${gsheetMatch[1]}/export?format=csv`, 'text/csv');
      const bundle = text ? buildBundle([{ path: 'google-sheet.csv', content: text }]) : null;
      return bundle ? { bundle, reviewSource: 'text' } : { bundle: null, reviewSource: 'unreadable' };
    }
    return { bundle: textAnswer, reviewSource: 'text' };
  }

  return { bundle: null, reviewSource: 'tests' };
}
