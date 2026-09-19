/**
 * IndexNow — instant-indexing ping for Yandex, Bing, Seznam, Naver (one shared
 * endpoint fans out to all participants). Unlike Search Console / Webmaster this
 * needs no per-engine verification: ownership is proven by hosting the key file
 * at the site root.
 *
 * URLs come from public/sitemap.xml (single source of truth — same list crawlers
 * get), so this never drifts from what the site actually publishes.
 *
 * Run AFTER a deploy, when the key file and the pages are already live on prod:
 *   cd frontend/landing-page && npm run indexnow
 *
 * Re-run whenever pages are added/changed. Submitting an unchanged list is
 * harmless; engines de-duplicate.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = 'levelup-academy.uz';
const KEY = '8642f8830634a882439ad68ad3ab3079';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function urlsFromSitemap() {
  const xml = await readFile(resolve(root, 'public/sitemap.xml'), 'utf-8');
  // <loc>…</loc> entries only; hreflang alternates live in xhtml:link attributes,
  // not <loc>, so this yields exactly the canonical URL set.
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function main() {
  const urlList = await urlsFromSitemap();
  if (urlList.length === 0) throw new Error('No <loc> URLs found in public/sitemap.xml');

  const body = {
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList,
  };

  console.log(`IndexNow → ${ENDPOINT}`);
  console.log(`  host: ${HOST}`);
  console.log(`  urls: ${urlList.length}`);
  urlList.forEach((u) => console.log(`    • ${u}`));

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  // 200 = accepted, 202 = accepted (validation pending). Both are success.
  if (res.status === 200 || res.status === 202) {
    console.log(`\n✓ Submitted: HTTP ${res.status} ${res.statusText}`);
  } else {
    console.error(`\n✗ Failed: HTTP ${res.status} ${res.statusText}\n${text}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nindexnow failed:', err.message);
  process.exit(1);
});
