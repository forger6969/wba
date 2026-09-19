<?xml version="1.0" encoding="UTF-8"?>
<!--
  Browser-only stylesheet for sitemap.xml. Search engines ignore it and read the
  raw XML; humans opening the sitemap get a clean, searchable table instead of a
  wall of text. Referenced from sitemap.xml via <?xml-stylesheet?>.
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <xsl:output method="html" encoding="UTF-8" indent="yes"
    doctype-system="about:legacy-compat"/>

  <xsl:template match="/">
    <html lang="ru">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title>Sitemap — LevelUp Academy</title>
        <style>
          :root {
            --bg: #f6fbea; --surface: #fff; --ink: #1d2417; --muted: #5e6e52;
            --border: #e6edd8; --accent: #c6ff34; --accent-ink: #141b10;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0; background: var(--bg); color: var(--ink);
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            line-height: 1.5; padding: 32px 20px;
          }
          .wrap { max-width: 1080px; margin: 0 auto; }
          .head { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 6px; }
          h1 { font-size: 24px; margin: 0; }
          .count {
            background: var(--accent); color: var(--accent-ink);
            font-weight: 700; font-size: 13px; padding: 3px 12px; border-radius: 999px;
          }
          .sub { color: var(--muted); font-size: 14px; margin: 0 0 20px; }
          .search {
            width: 100%; max-width: 360px; padding: 10px 14px; margin-bottom: 18px;
            border: 1px solid var(--border); border-radius: 10px; font-size: 14px;
            background: var(--surface); color: var(--ink);
          }
          .search:focus { outline: 2px solid var(--accent); border-color: transparent; }
          .card {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 14px; overflow: hidden;
            box-shadow: 0 8px 24px rgba(29,36,23,.08);
          }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          thead th {
            position: sticky; top: 0; background: var(--ink); color: #fff;
            text-align: left; font-weight: 600; padding: 12px 14px; font-size: 12.5px;
            text-transform: uppercase; letter-spacing: .03em; white-space: nowrap;
          }
          tbody td { padding: 11px 14px; border-top: 1px solid var(--border); vertical-align: top; }
          tbody tr:hover { background: #fbfdf3; }
          td.num { color: var(--muted); font-variant-numeric: tabular-nums; }
          td.url a { color: #1e6b3a; text-decoration: none; word-break: break-all; }
          td.url a:hover { text-decoration: underline; }
          .lang {
            display: inline-block; font-size: 11.5px; font-weight: 700;
            padding: 2px 8px; border-radius: 6px; background: var(--bg); color: var(--muted);
          }
          .lang.uz { background: #eaf6d6; color: #3f6b16; }
          td.meta { color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
          .prio-bar { display: inline-block; height: 6px; border-radius: 3px; background: var(--accent); vertical-align: middle; margin-right: 8px; }
          .empty { padding: 24px; text-align: center; color: var(--muted); }
          @media (max-width: 640px) {
            .hide-sm { display: none; }
            td.url a { font-size: 13px; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="head">
            <h1>Sitemap</h1>
            <span class="count"><xsl:value-of select="count(s:urlset/s:url)"/> URL</span>
          </div>
          <p class="sub">LevelUp Academy — карта сайта для поисковых систем. Введите текст, чтобы отфильтровать адреса.</p>

          <input class="search" id="q" type="search" placeholder="Поиск по URL…" autocomplete="off"/>

          <div class="card">
            <table id="t">
              <thead>
                <tr>
                  <th>#</th>
                  <th>URL</th>
                  <th>Язык</th>
                  <th class="hide-sm">Изменён</th>
                  <th class="hide-sm">Частота</th>
                  <th>Приоритет</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="s:urlset/s:url">
                  <tr>
                    <td class="num"><xsl:value-of select="position()"/></td>
                    <td class="url">
                      <a href="{s:loc}"><xsl:value-of select="s:loc"/></a>
                    </td>
                    <td>
                      <xsl:choose>
                        <xsl:when test="contains(s:loc, '/uz/')">
                          <span class="lang uz">UZ</span>
                        </xsl:when>
                        <xsl:otherwise>
                          <span class="lang">RU</span>
                        </xsl:otherwise>
                      </xsl:choose>
                    </td>
                    <td class="meta hide-sm"><xsl:value-of select="s:lastmod"/></td>
                    <td class="meta hide-sm"><xsl:value-of select="s:changefreq"/></td>
                    <td class="meta">
                      <span class="prio-bar">
                        <xsl:attribute name="style">
                          <xsl:text>width: </xsl:text>
                          <xsl:value-of select="number(s:priority) * 34"/>
                          <xsl:text>px;</xsl:text>
                        </xsl:attribute>
                      </span>
                      <xsl:value-of select="s:priority"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
            <div class="empty" id="empty" style="display:none">Ничего не найдено</div>
          </div>
        </div>

        <script>
          <![CDATA[
          (function () {
            var q = document.getElementById('q');
            var rows = Array.prototype.slice.call(document.querySelectorAll('#t tbody tr'));
            var empty = document.getElementById('empty');
            q.addEventListener('input', function () {
              var term = q.value.trim().toLowerCase();
              var shown = 0;
              rows.forEach(function (r) {
                var url = r.querySelector('.url a').textContent.toLowerCase();
                var match = url.indexOf(term) !== -1;
                r.style.display = match ? '' : 'none';
                if (match) shown++;
              });
              empty.style.display = shown === 0 ? 'block' : 'none';
            });
          })();
          ]]>
        </script>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
