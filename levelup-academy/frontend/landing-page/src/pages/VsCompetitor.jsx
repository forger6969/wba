import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { breadcrumb, faqPage, useCeo } from '../lib/ceo.js';
import { useLang, useLocalizePath, useT } from '../i18n/index.js';

export default function VsCompetitor({ dictKey, path }) {
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const s = t[dictKey];
  const competitor = dictKey === 'vsModme' ? 'MODME' : 'UMAI CRM';
  const tr = (uz, en, ru) => (lang === 'uz' ? uz : lang === 'en' ? en : ru);
  const jsonLd = useMemo(() => [breadcrumb([{ name: t.ceo.breadcrumbHome, path: '/landing' }, { name: s.h1, path }], lang), faqPage(s.faq)], [t.ceo.breadcrumbHome, s, path, lang]);

  useCeo({ title: t.ceo[dictKey].title, description: t.ceo[dictKey].description, path, jsonLd });

  return (
    <main className={`versus-page ${dictKey === 'vsUmai' ? 'versus-page--umai' : ''}`}>
      <section className="versus-hero"><div className="container">
        <div className="versus-hero__top"><span className="badge badge--lime">{s.badge}</span><small>{tr('Mustaqil taqqoslash', 'Independent comparison', 'Независимое сравнение')}</small></div>
        <div className="versus-hero__grid"><div><h1>{s.h1}</h1><p>{s.lead}</p><div className="versus-hero__actions"><a className="btn btn--primary" href="#features">{tr('Imkoniyatlarni solishtirish', 'Compare capabilities', 'Сравнить возможности')}</a><Link className="btn btn--outline" to={lp('/landing/pricing')}>{t.nav.pricing}</Link></div></div>
          <div className="versus-score" aria-hidden="true"><div><span>LEVELUP</span><strong>CRM</strong><i>{tr('Ta’lim uchun', 'For education', 'Для образования')}</i></div><b>VS</b><div><span>{competitor}</span><strong>{competitor.split(' ')[0]}</strong><i>{tr('Alternativa', 'Alternative', 'Альтернатива')}</i></div></div>
        </div>
        <p className="versus-checked">✓ {s.checkedNote}</p>
      </div></section>

      <section className="versus-price"><div className="container"><div className="section__head"><h2>{s.priceHead}</h2><p>{s.priceLead}</p></div>
        <div className="versus-table"><header><span>{s.priceTable.param}</span><strong>{s.priceTable.us}</strong><b>{s.priceTable.them}</b></header>{s.priceTable.rows.map((row, index) => <article key={row.task}><span><i>0{index + 1}</i>{row.task}</span><strong>{row.before}</strong><b>{row.after}</b></article>)}</div>
        <Link className="versus-price__link" to={lp('/landing/pricing')}>{t.nav.pricing} →</Link>
      </div></section>

      <section className="section section--white versus-features" id="features"><div className="container"><div className="section__head"><h2>{s.compareHead}</h2></div>
        <div className="versus-table versus-table--features"><header><span>{s.compare.task}</span><strong>{s.compare.before}</strong><b>{s.compare.after}</b></header>{s.compare.rows.map((row, index) => <article key={row.task}><span><i>0{index + 1}</i>{row.task}</span><strong>{row.before}</strong><b>{row.after}</b></article>)}</div>
      </div></section>

      <section className="section versus-choice"><div className="container"><div className="section__head"><span className="versus-kicker">01 / {competitor}</span><h2>{s.themHead}</h2><p>{s.themLead}</p></div><div className="versus-choice__grid">{s.them.map((item, index) => <article key={item.title}><span>0{index + 1}</span><div className="feature__icon"><Icon name={item.icon} /></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div></section>

      <section className="section section--white versus-levelup"><div className="container"><div className="section__head"><span className="versus-kicker">02 / LEVELUP</span><h2>{s.usHead}</h2></div><div className="versus-levelup__grid">{s.us.map((item, index) => <article key={item.title}><span>0{index + 1}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><i>✓</i></article>)}</div></div></section>

      <section className="section versus-faq"><div className="container"><div className="section__head"><h2>{s.faqHead}</h2></div><div className="faq language-faq__list">{s.faq.map((item, index) => <details key={item.q}><summary><span>0{index + 1}</span>{item.q}</summary><p>{item.a}</p></details>)}</div></div></section>
      <Cta title={s.ctaTitle} text={s.ctaText} />
    </main>
  );
}
