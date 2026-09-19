import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { breadcrumb, faqPage, useCeo } from '../lib/ceo.js';
import { useLang, useLocalizePath, useT } from '../i18n/index.js';

export default function CrmVsExcel() {
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const s = t.vsExcel;
  const tr = (uz, en, ru) => (lang === 'uz' ? uz : lang === 'en' ? en : ru);

  const jsonLd = useMemo(() => [
    breadcrumb([{ name: t.ceo.breadcrumbHome, path: '/landing' }, { name: s.badge, path: '/landing/crm-vs-excel' }], lang),
    faqPage(s.faq),
  ], [t.ceo.breadcrumbHome, s, lang]);

  useCeo({ title: t.ceo.vsExcel.title, description: t.ceo.vsExcel.description, path: '/landing/crm-vs-excel', jsonLd });

  return (
    <main className="excel-page">
      <section className="excel-hero">
        <div className="container excel-hero__layout">
          <div>
            <span className="badge badge--lime">{s.badge}</span>
            <h1>{s.h1}</h1>
            <p className="excel-hero__lead">{s.lead}</p>
            <p className="excel-hero__intro">{s.intro}</p>
            <div className="excel-hero__actions">
              <Link className="btn btn--primary" to={lp('/landing/pricing')}>{s.pricingLink}</Link>
              <a className="btn btn--outline" href="#compare">{tr('Taqqoslash', 'Compare', 'Сравнить')}</a>
            </div>
          </div>
          <div className="excel-switch" aria-hidden="true">
            <div className="excel-sheet">
              <header><i /><span>students_final_v7.xlsx</span><b>×</b></header>
              <div className="excel-sheet__cells">
                {Array.from({ length: 20 }, (_, i) => <span key={i} className={i === 6 || i === 12 ? 'is-error' : ''}>{i === 6 ? '#REF!' : i === 12 ? '?' : i % 4 === 0 ? 'SUM' : ''}</span>)}
              </div>
              <footer>{tr('5 ta versiya · kim o‘zgartirdi?', '5 versions · who edited?', '5 версий · кто изменил?')}</footer>
            </div>
            <div className="excel-switch__arrow">→</div>
            <div className="crm-live">
              <header><span>LEVELUP CRM</span><b>LIVE</b></header>
              <strong>100%</strong><small>{tr('ma’lumotlar bir joyda', 'data in one place', 'данных в одном месте')}</small>
              <div><i /><span>{tr('Avtomatik yangilanadi', 'Updates automatically', 'Обновляется автоматически')}</span></div>
              <div><i /><span>{tr('Har bir amal ko‘rinadi', 'Every action is visible', 'Каждое действие видно')}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="excel-signal"><div className="container"><span>EXCEL</span><i>→</i><strong>LEVELUP ACADEMY</strong><small>{tr('tartibsizlikdan boshqaruvga', 'from spreadsheets to control', 'от таблиц к управлению')}</small></div></section>

      <section className="section section--white excel-pain">
        <div className="container">
          <div className="section__head"><h2>{s.painHead}</h2><p>{s.painLead}</p></div>
          <div className="excel-pain__grid">
            {s.pain.map((item, index) => <article key={item.title}><span>0{index + 1}</span><div className="feature__icon"><Icon name={item.icon} /></div><h3>{item.title}</h3><p>{item.text}</p></article>)}
          </div>
        </div>
      </section>

      <section className="section excel-compare" id="compare">
        <div className="container">
          <div className="section__head"><h2>{s.compareHead}</h2></div>
          <div className="excel-compare__table">
            <div className="excel-compare__head"><span>{s.compare.task}</span><b>{s.compare.before}</b><strong>{s.compare.after}</strong></div>
            {s.compare.rows.map((row, index) => (
              <article key={row.task}><span><i>0{index + 1}</i>{row.task}</span><b>× {row.before}</b><strong>✓ {row.after}</strong></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--white language-flow excel-move">
        <div className="container">
          <div className="section__head"><h2>{s.howHead}</h2><p>{s.howLead}</p></div>
          <div className="language-flow__list">
            {s.how.map((item, index) => <article key={item.title}><span>0{index + 1}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><i>↗</i></article>)}
          </div>
          <Link className="excel-guide" to={lp('/landing/blog/excel-to-crm')}>{s.guideLink} <span>→</span></Link>
        </div>
      </section>

      <section className="section excel-faq" id="faq"><div className="container"><div className="section__head"><h2>{s.faqHead}</h2></div><div className="faq language-faq__list">{s.faq.map((item, index) => <details key={item.q}><summary><span>0{index + 1}</span>{item.q}</summary><p>{item.a}</p></details>)}</div></div></section>
      <Cta title={s.ctaTitle} text={s.ctaText} />
    </main>
  );
}
