# CEO / GEO / AEO — LevelUp Academy Landing

How search and AI-search are wired in this app, and how to keep them correct.

- **Domain:** `https://levelup-academy.uz` (with the hyphen — `levelupacademy.uz` does not resolve)
- **Landing base path:** `/landing`; `/` is a 308 redirect to it
- **Stack:** React 18 + Vite, **prerendered to static HTML at build time**

---

## The core constraint

A Vite SPA ships an empty `<div id="root">`. Googlebot executes JavaScript and renders it
eventually, but **the AI crawlers that produce citations do not** — ChatGPT's crawler cannot
run JS at all. An unrendered page gives them nothing to quote, no matter how good the copy is.

So every route is **prerendered**: a real HTML file with its text, headings and metadata
already inside. No part of CEO here depends on the browser running JavaScript.

---

## How the build works

```
npm run build
  ├─ sitemap        node scripts/sitemap.js   → public/sitemap.xml (generated)
  ├─ build:client   vite build                → dist/ (assets + index.html template)
  ├─ build:server   vite build --ssr          → dist/server/entry-server.js
  └─ prerender      node scripts/prerender.js → dist/landing/**/index.html
```

`sitemap` runs **first**: it writes into `public/`, and `vite build` copies that directory
into `dist/`. Run it after `build:client` and the fresh map would not ship.

`scripts/prerender.js` renders each route through `src/entry-server.jsx` and fills two
markers in the `index.html` template:

| Marker | Filled with |
|---|---|
| `<!--app-head-->` | Per-route `<title>`, description, robots, canonical, `og:url`, route JSON-LD |
| `<!--app-html-->` | The rendered page markup |

The server bundle (`dist/server/`) is deleted afterwards — it is a build tool, not a deploy
artifact. The build **fails loudly** if a route renders empty or forgets its `<title>`.

---

## Two layers of metadata

| Layer | Lives in | Seen by |
|---|---|---|
| **Static** — `og:image`, `og:type`, `twitter:card`, JSON-LD `@graph` (Organization, WebSite, SoftwareApplication, FAQPage) | `index.html` | Everyone, always |
| **Per-route** — title, description, canonical, `og:url`, BreadcrumbList / FAQ | `useCeo()` in each page | Baked into the HTML **and** re-applied client-side on navigation |

`src/lib/ceo.js` serves both: in the browser `useCeo()` writes to the DOM; during the server
pass it reports the same data through `CeoCollectorContext`, and `renderCeoHead()` turns it
into tags. **Keep the two in sync** — add a tag to one and not the other, and the crawler and
the browser end up with different heads.

---

## Languages (ru / uz / en)

The site is trilingual. **Language lives in the URL, never in state:**

| Language | URL | `<html lang>` | Targets |
|---|---|---|---|
| Russian (default) | `/landing/finance` | `ru` | Uzbekistan + CIS |
| Uzbek | `/uz/landing/finance` | `uz` | Uzbekistan |
| English | `/en/landing/finance` | `en` | global |

Russian keeps its original paths — they are already indexed, and changing a URL throws away
its ranking. Every other language is added under its own prefix.

**Adding a language** means one entry in `PREFIXED_LANGS` (`src/i18n/index.js`), the same
list in `scripts/prerender.js` and `scripts/sitemap.js` (both run in Node before the client
build and cannot import app modules), and a dictionary in `src/i18n/`. Routes, the language
switcher, the `hreflang` set and the sitemap all derive from those lists — nothing else is
enumerated by hand.

The English version is **not a translation of the Russian one**: it targets different
queries (`school management software`, `student management system`, `learning center
software`) because the search intent outside the region is different. Its `<title>` and
`<meta description>` are written for those, not converted from Russian.

`x-default` points at **English** (`X_DEFAULT_LANG` in `src/lib/ceo.js`): it is the version
served to a visitor whose language matches none of the declared ones, and for an audience
outside Uzbekistan and the CIS English is the meaningful default.

A language toggle in `localStorage` would be **invisible to search engines**: one URL cannot
rank in two languages. Each version needs its own address, and `hreflang` ties them together —
without it Google treats them as competing duplicates and may serve the wrong one.

- `src/i18n/{ru,uz,en}.js` — the dictionaries. **Structures must match key for key**; a missing
  key renders as `undefined` on the page, not a build error.
- `src/i18n/index.js` — `useT()` (dictionary), `useLang()`, `useLocalizePath()` (`lp()` for links),
  `dictOf()` (another language's dictionary — the switcher labels the others with it).
- Pages pass the **canonical** path to `useCeo` (`/landing/finance`); it localises internally
  and emits the `hreflang` set (every language + x-default, each page listing all of them —
  Google drops a cluster whose references are not reciprocal).
- FAQ/Breadcrumb JSON-LD is generated **in code**, not in `index.html`: the markup has to be in
  the language of the page. A Russian FAQ on an Uzbek page would contradict its own content —
  and FAQ is exactly what AI assistants quote.

## Adding a page

1. Add the strings to **all three** dictionaries: `src/i18n/{ru,uz,en}.js`.
2. Call `useCeo({ title, description, path, jsonLd })` with the **canonical** path.
   `jsonLd` **must have a stable reference** — wrap it in `useMemo`, otherwise the effect
   re-runs every render. A `WebPage` node with the page's language is added automatically
   by `useCeo` — do not declare it yourself.
3. Add the route to `PAGES` in `src/App.jsx` — the prefixed variants are generated from it.
4. Add the canonical path to `PAGES` in `scripts/prerender.js`. **Skip this and the page ships
   as an empty shell** — invisible to AI crawlers.
5. Add the canonical path to `PAGES` in `scripts/sitemap.js` with its `lastmod`, `changefreq`
   and `priority`. All language variants and their `hreflang` blocks are generated —
   `public/sitemap.xml` is **generated output, never edited by hand**.
6. Add the page to every `public/llms*.txt` (one per language).

Rules: one unique `<title>` (≤60 chars) and one `<meta description>` (150–160 chars) per page
**per language**. `og:image` must stay raster (1200×630 PNG) — scrapers reject SVG.

---

## Favicons

`index.html` links three icons, and the raster ones are not optional:

| File | Why it exists |
|---|---|
| `public/favicon.ico` (16/32/48) | Yandex.Webmaster reports **"favicon not found"** for an SVG-only icon. It also fetches the icon relative to `/`, which 308-redirects here, so the file must exist at the root. |
| `public/logo-mark.svg` | What modern browsers actually prefer — crisp at any size. |
| `public/apple-touch-icon.png` (180×180) | iOS home-screen bookmarks. |

The rasters are generated from `logo-mark.svg` (lime `#C6FF34` open ring on brand dark
`#1d2417`, same geometry as the SVG) — regenerate with Pillow if the mark changes; do not
hand-edit them. Same rule as `og:image`: **search engines want raster, not SVG.**

---

## Hosting (`vercel.json`)

- `/` → `/landing` is a **308 redirect**. A client-side redirect is a dead end for a crawler
  that doesn't run JS.
- **No SPA rewrite.** Every route is a real file now, so an unknown URL returns a genuine 404
  (`public/404.html`) instead of a soft-404 rendering the homepage. This matters: AI
  assistants send users to hallucinated URLs ~2.9× more often than Google does.

### Security headers

The `/(.*)` rule sends `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy` and a CSP. The CSP allowlist is **derived from what the app actually
loads**, not copied from a template — widen it only after checking the build:

| Directive | Why these hosts |
|---|---|
| `script-src` | `googletagmanager.com` (GA4 tag) + `'unsafe-inline'` — `index.html` carries an inline `gtag()` bootstrap and Vercel serves static files, so there is no nonce to issue. |
| `connect-src` | `api.levelup-academy.uz` (the lead form) and `*.google-analytics.com` — GA4 posts to regional hosts like `region1.`, so the wildcard is required. |
| `style-src` | `'unsafe-inline'` — React `style={{…}}` props compile to inline style attributes. |
| `font-src 'self'` | Manrope ships in the bundle (`@fontsource-variable/manrope`), nothing is fetched from Google Fonts. |

`frame-ancestors 'none'` duplicates `X-Frame-Options` on purpose: the latter is what older
crawlers and scanners still look for.

**HSTS is deliberately not set here.** Vercel already sends
`Strict-Transport-Security: max-age=63072000`; overriding it would only lower the max-age, and
adding `includeSubDomains` would bind `api.`, `staff.` and `member.` for two years — a call for
the Team Lead, not a landing-page commit.

Vercel applies headers server-side, so a plain static server proves nothing about them. To test
a CSP change before deploying, serve `dist/` through something that reads the same
`vercel.json` and watch the console for violations — they surface as console errors, and a
clean console after a reload is the pass condition.

---

## Verifying a change

**Do not verify with `vite preview`.** It is an SPA server: it serves the root `index.html`
for every path, so the browser gets the homepage markup while React renders the real route.
That fakes a hydration mismatch (React error #418/#423) which does **not** happen in
production. Serve `dist/` as plain static files instead:

```bash
npm run build
cd dist && python -m http.server 4179
```

Check that the content is there **before** any JS runs:

```bash
curl -s localhost:4179/landing/finance/ | grep -o '<title>[^<]*</title>'   # unique per route
curl -s localhost:4179/landing/finance/ | grep -c 'rel="canonical"'        # exactly 1
```

In the browser the console must be **clean**. React #418/#423 means the server HTML and the
client render disagree and React threw the prerendered markup away — the prerender is then
worthless for users, and the mismatch usually points at markup that depends on browser state.

External validators: Google **Rich Results Test** (JSON-LD), **Facebook Sharing Debugger**
(OG card), **GSC URL Inspection → View Crawled Page** (what Googlebot really sees).

---

## AI crawlers (GEO / AEO)

`public/robots.txt` allows two families, and the difference matters:

- `GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot` — training / indexing.
- `OAI-SearchBot`, `Claude-User`, `Claude-SearchBot`, `Perplexity-User`, `ChatGPT-User` —
  **live fetch when a user asks an assistant a question. These are the ones that generate the
  citation.** Block them and the assistant cannot cite you even if it knows you exist.

`public/llms.txt` is a plain-language product summary, and there is **one per language**
(`llms.txt` ru, `llms-uz.txt`, `llms-en.txt`, cross-linked and listed in `robots.txt`): an
assistant answering an Uzbek question should not have to read Russian to learn what the
product is. Keep them truthful, but don't lean on them — as of 2026 no major provider has
confirmed acting on the format. `robots.txt` and rendered HTML are what actually work.

**What actually blocks AI citation here is not markup.** Measured on 2026-08-05 in Search
Console: **0 external links** to the domain, and every query the site appears for is
branded (`levelup academy`, `level up academy`, …) — there are zero impressions on
commercial queries. Assistants cite what they can read *off* your own site; until mentions
exist elsewhere, on-site GEO work has nothing to amplify. See `GEO-OFFSITE.md`.

---

## Open items

- **Uzbek copy is a machine draft and needs a native review.** The structure, terms and CEO
  are correct; tone and phrasing are not guaranteed. Edit `src/i18n/uz.js` — nothing else.
- Footer Telegram link is still a placeholder (`https://t.me/`, `src/components/Footer.jsx`).
  Needs the real handle — do not guess one.
