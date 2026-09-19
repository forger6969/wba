/**
 * Prerender: превращает SPA в набор готовых HTML-страниц на этапе сборки.
 *
 * Зачем: краулеры ChatGPT/Claude/Perplexity не исполняют JavaScript. Без этого шага они
 * получают пустой <div id="root"> и не видят ни текста страницы, ни её title —
 * цитировать нечего. Googlebot JS исполняет, но вторым проходом и по остаточному бюджету.
 *
 * Запускается после клиентского и серверного билдов — см. "build" в package.json.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const serverDist = resolve(dist, 'server');

// Канонические пути (src/App.jsx → PAGES). Держать в одном списке с public/sitemap.xml.
const PAGES = [
  '/landing',
  '/landing/features',
  '/landing/roles',
  '/landing/finance',
  '/landing/pricing',
  '/landing/for-language-school',
  '/landing/for-courses',
  '/landing/crm-vs-excel',
  '/landing/vs/modme',
  '/landing/vs/umai',
  '/landing/blog',
  '/landing/blog/excel-to-crm',
  '/landing/blog/student-debts',
  '/landing/blog/attendance-automation',
  '/landing/gamification',
  '/landing/faq',
  '/landing/about',
  '/landing/team',
  '/landing/team/azizbek-amangeldiev',
  '/landing/team/yunusov-abdulloh',
  '/landing/contacts',
];

// Русская версия — на своих путях, остальные языки — под своим префиксом.
// Держать в синхроне с PREFIXED_LANGS в src/i18n/index.js: этот скрипт запускается в
// Node до сборки клиента и импортировать модуль приложения не может.
const PREFIXED_LANGS = ['uz', 'en'];

const ROUTES = [...PAGES, ...PREFIXED_LANGS.flatMap((lang) => PAGES.map((p) => `/${lang}${p}`))];

const langOf = (route) => PREFIXED_LANGS.find((l) => route.startsWith(`/${l}/`)) ?? 'ru';

/** '/landing' → 'dist/landing/index.html' (directory index — Vercel отдаёт его по /landing). */
const outputFor = (route) => resolve(dist, `.${route}`, 'index.html');

async function main() {
  const template = await readFile(resolve(dist, 'index.html'), 'utf-8');

  for (const marker of ['<!--app-head-->', '<!--app-html-->']) {
    if (!template.includes(marker)) {
      throw new Error(`index.html не содержит ${marker} — prerender не сможет вставить разметку`);
    }
  }

  const { render } = await import(pathToFileURL(resolve(serverDist, 'entry-server.js')).href);

  for (const route of ROUTES) {
    const { html, head } = render(route);

    if (!head.includes('<title>')) {
      throw new Error(`${route}: страница не объявила CEO через useCeo — нет <title>`);
    }
    if (!html.trim()) {
      throw new Error(`${route}: пустая разметка`);
    }

    // Язык документа обязан совпадать с языком текста: <html lang> читают и поисковик,
    // и скринридер. Шаблон всегда приходит с lang="ru" — для /uz его надо переписать.
    const page = template
      .replace('<html lang="ru">', `<html lang="${langOf(route)}">`)
      .replace('<!--app-head-->', head)
      .replace('<!--app-html-->', html);

    const out = outputFor(route);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, page, 'utf-8');
    console.log(`  ✓ ${route.padEnd(24)} → ${out.slice(dist.length + 1)}`);
  }

  // Корень (/) редиректит на /landing (308, vercel.json), но dist/index.html — это шаблон
  // с несработавшими маркерами. Кладём на его место главную: если редирект когда-нибудь
  // отключат, отдастся нормальная страница, а не сырой шаблон.
  const home = render('/landing');
  await writeFile(
    resolve(dist, 'index.html'),
    template.replace('<!--app-head-->', home.head).replace('<!--app-html-->', home.html),
    'utf-8',
  );
  console.log(`  ✓ ${'/ (fallback → /landing)'.padEnd(24)} → index.html`);

  // Серверный бандл — инструмент сборки, в деплой ему не место.
  await rm(serverDist, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('\nprerender failed:', err.message);
  process.exit(1);
});
