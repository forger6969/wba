import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import { breadcrumb, useCeo } from '../lib/ceo.js';
import { useLang, useLocalizePath, useT } from '../i18n/index.js';

export default function Blog() {
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const b = t.blog;
  const entries = Object.entries(b.articles);
  const [featured, ...rest] = entries;
  const tr = (uz, en, ru) => (lang === 'uz' ? uz : lang === 'en' ? en : ru);
  const jsonLd = useMemo(() => [breadcrumb([{ name: t.ceo.breadcrumbHome, path: '/landing' }, { name: b.badge, path: '/landing/blog' }], lang)], [t.ceo.breadcrumbHome, b.badge, lang]);

  useCeo({ title: t.ceo.blog.title, description: t.ceo.blog.description, path: '/landing/blog', jsonLd });

  return (
    <main className="editorial-page">
      <section className="editorial-hero">
        <div className="container editorial-hero__grid">
          <div><span className="badge badge--lime">{b.badge}</span><h1>{b.h1}</h1></div>
          <div><span>LEVELUP / INSIGHTS</span><p>{b.lead}</p><small>{tr('Ta’lim biznesi uchun amaliy qo‘llanmalar', 'Practical guides for education businesses', 'Практические материалы для образовательного бизнеса')}</small></div>
        </div>
      </section>

      {featured && <section className="editorial-featured"><div className="container"><Link to={lp(`/landing/blog/${featured[0]}`)} className="editorial-featured__card">
        <div className="editorial-featured__visual"><span>01</span><strong>CRM</strong><i>→</i><b>GROWTH</b></div>
        <div className="editorial-featured__copy"><span>{featured[1].date} · {featured[1].reading} {b.minutesLabel}</span><h2>{featured[1].title}</h2><p>{featured[1].excerpt}</p><strong>{b.readMore} →</strong></div>
      </Link></div></section>}

      <section className="section section--white editorial-feed"><div className="container">
        <div className="editorial-feed__head"><div><span>02—{String(entries.length).padStart(2, '0')}</span><h2>{tr('Yangi maqolalar', 'Latest articles', 'Новые статьи')}</h2></div><p>{tr('Moliya, davomat va markaz boshqaruvi haqida.', 'Finance, attendance and school operations.', 'О финансах, посещаемости и управлении центром.')}</p></div>
        <div className="editorial-grid">{rest.map(([slug, article], index) => <article key={slug}>
          <Link to={lp(`/landing/blog/${slug}`)} className="editorial-card__visual"><span>0{index + 2}</span><i>{index % 2 ? 'FINANCE' : 'OPERATIONS'}</i><b>↗</b></Link>
          <div className="editorial-card__meta">{article.date} · {article.reading} {b.minutesLabel}</div>
          <h2><Link to={lp(`/landing/blog/${slug}`)}>{article.title}</Link></h2><p>{article.excerpt}</p>
          <Link className="editorial-card__more" to={lp(`/landing/blog/${slug}`)}>{b.readMore} →</Link>
        </article>)}</div>
      </div></section>
      <Cta />
    </main>
  );
}
