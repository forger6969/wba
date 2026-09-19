import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import { SITE_URL, breadcrumb, useCeo } from '../lib/ceo.js';
import { localizePath, useLang, useLocalizePath, useT } from '../i18n/index.js';

function Block({ block }) {
  if (block.type === 'h2') return <h2>{block.text}</h2>;
  if (block.type === 'ul') return <ul>{block.items.map((item, index) => <li key={index}>{item}</li>)}</ul>;
  return <p>{block.text}</p>;
}

export default function BlogArticle() {
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const { slug } = useParams();
  const b = t.blog;
  const article = b.articles[slug];
  const path = `/landing/blog/${slug}`;
  const tr = (uz, en, ru) => (lang === 'uz' ? uz : lang === 'en' ? en : ru);
  const headings = article?.body.filter((block) => block.type === 'h2') ?? [];

  const jsonLd = useMemo(() => {
    if (!article) return [];
    return [
      breadcrumb([{ name: t.ceo.breadcrumbHome, path: '/landing' }, { name: b.badge, path: '/landing/blog' }, { name: article.title, path }], lang),
      {
        '@context': 'https://schema.org', '@type': 'BlogPosting', headline: article.title,
        description: article.ceoDescription, datePublished: article.date, dateModified: article.date,
        inLanguage: lang === 'uz' ? 'uz' : lang === 'en' ? 'en' : 'ru',
        author: { '@type': 'Organization', name: 'LevelUp Academy' },
        publisher: { '@type': 'Organization', name: 'LevelUp Academy', logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
        mainEntityOfPage: `${SITE_URL}${localizePath(path, lang)}`,
      },
    ];
  }, [article, b.badge, t.ceo.breadcrumbHome, lang, path]);

  useCeo({ title: article ? article.ceoTitle : '', description: article ? article.ceoDescription : '', path, jsonLd, noindex: !article });

  if (!article) return <main><section className="page-hero"><div className="container"><span className="badge badge--lime">404</span><h1>{t.notFound.h1}</h1><p>{t.notFound.text}</p><Link to={lp('/landing/blog')} className="btn btn--dark">{b.backToBlog}</Link></div></section></main>;

  return (
    <main className="editorial-article-page">
      <article className="editorial-article">
        <section className="editorial-article__hero">
          <div className="container">
            <Link className="editorial-article__back-top" to={lp('/landing/blog')}>← {b.backToBlog.replace(/^←\s*/, '')}</Link>
            <div className="editorial-article__hero-grid">
              <div>
                <div className="editorial-article__meta">{b.tocLabel} · {article.date} · {article.reading} {b.minutesLabel}</div>
                <h1>{article.title}</h1><p>{article.excerpt}</p>
              </div>
              <div className="editorial-article__cover" aria-hidden="true">
                <span>LEVELUP / GUIDE 01</span><strong>{slug === 'excel-to-crm' ? 'EXCEL' : 'LEVELUP'}</strong><i>→</i><b>{slug === 'excel-to-crm' ? 'CRM' : 'GROWTH'}</b><small>2026</small>
              </div>
            </div>
          </div>
        </section>

        <section className="editorial-article__content">
          <div className="container editorial-article__layout">
            <aside className="editorial-article__aside">
              <span>{tr('Mundarija', 'Contents', 'Содержание')}</span>
              <nav>{headings.map((heading, index) => <a key={heading.text} href={`#section-${index + 1}`}><i>0{index + 1}</i>{heading.text}</a>)}</nav>
              <div><strong>{article.reading}</strong><small>{b.minutesLabel}<br />{tr('o‘qish', 'read', 'чтения')}</small></div>
            </aside>
            <div className="editorial-article__body">
              {article.body.map((block, index) => {
                if (block.type === 'h2') {
                  const position = article.body.slice(0, index + 1).filter((item) => item.type === 'h2').length;
                  return <div className="editorial-article__section-title" id={`section-${position}`} key={index}><span>0{position}</span><Block block={block} /></div>;
                }
                return <Block key={index} block={block} />;
              })}
              <div className="editorial-article__note"><span>LEVELUP</span><p>{tr('Bitta guruhdan boshlang, jarayonni tekshiring va keyin butun markazni ko‘chiring.', 'Start with one group, verify the workflow, then move the whole school.', 'Начните с одной группы, проверьте процесс, а затем перенесите весь центр.')}</p></div>
              <div className="article__back"><Link to={lp('/landing/blog')}>{b.backToBlog}</Link></div>
            </div>
          </div>
        </section>
      </article>
      <Cta />
    </main>
  );
}
