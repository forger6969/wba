import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { breadcrumb, faqPage, useCeo } from '../lib/ceo.js';
import { useLang, useLocalizePath, useT } from '../i18n/index.js';

export default function ForLanguageSchool() {
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const s = t.langSchool;
  const tr = (uz, en, ru) => (lang === 'uz' ? uz : lang === 'en' ? en : ru);

  const jsonLd = useMemo(() => [
    breadcrumb([
      { name: t.ceo.breadcrumbHome, path: '/landing' },
      { name: s.badge, path: '/landing/for-language-school' },
    ], lang),
    faqPage(s.faq),
  ], [t.ceo.breadcrumbHome, s, lang]);

  useCeo({
    title: t.ceo.langSchool.title,
    description: t.ceo.langSchool.description,
    path: '/landing/for-language-school',
    jsonLd,
  });

  return (
    <main className="language-page">
      <section className="language-hero">
        <div className="container language-hero__grid">
          <div className="language-hero__copy">
            <span className="badge badge--lime">{s.badge}</span>
            <h1>{s.h1}</h1>
            <p className="language-hero__lead">{s.lead}</p>
            <p className="language-hero__intro">{s.intro}</p>
            <div className="language-hero__actions">
              <Link className="btn btn--primary" to={lp('/landing/pricing')}>{s.pricingLink}</Link>
              <a className="btn btn--outline" href="#how">{tr('Qanday ishlaydi', 'How it works', 'Как это работает')}</a>
            </div>
          </div>

          <div className="language-board" aria-hidden="true">
            <div className="language-board__top"><div><i /><i /><i /></div><span>LEVELUP / LIVE</span></div>
            <div className="language-board__headline">
              <div><small>{tr('Guruh', 'Group', 'Группа')}</small><strong>IELTS 7.0</strong></div>
              <span>{tr('Bugun', 'Today', 'Сегодня')}</span>
            </div>
            <div className="language-board__stats">
              <article><span>18</span><small>{tr("o'quvchi", 'students', 'учеников')}</small></article>
              <article><span>94%</span><small>{tr('davomat', 'attendance', 'посещаемость')}</small></article>
              <article><span>82%</span><small>{tr('uy vazifasi', 'homework', 'домашняя работа')}</small></article>
            </div>
            <div className="language-board__lesson">
              <span>18:00</span><div><strong>Speaking practice</strong><small>Room 04 · Teacher Anna</small></div><b>LIVE</b>
            </div>
            <div className="language-board__people">
              {['AM', 'SB', 'NK', 'DS'].map((name, index) => <i key={name} style={{ '--i': index }}>{name}</i>)}
              <span>+14</span>
            </div>
          </div>
        </div>
      </section>

      <section className="language-proof">
        <div className="container language-proof__grid">
          {[
            ['A1–C1', tr('darajalar va guruhlar', 'levels and groups', 'уровни и группы')],
            ['24/7', tr('markaz nazorati', 'school visibility', 'контроль школы')],
            ['1 CRM', tr('barcha filiallar uchun', 'for every branch', 'для всех филиалов')],
          ].map(([value, label]) => <div key={value}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
      </section>

      <section className="section section--white language-fit">
        <div className="container">
          <div className="section__head"><h2>{s.fitHead}</h2><p>{s.fitLead}</p></div>
          <div className="language-fit__grid">
            {s.fit.map((item, index) => (
              <article className="language-feature" key={item.title}>
                <span className="language-feature__index">0{index + 1}</span>
                <div className="feature__icon"><Icon name={item.icon} /></div>
                <h3>{item.title}</h3><p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section language-flow" id="how">
        <div className="container">
          <div className="section__head"><h2>{s.howHead}</h2><p>{s.howLead}</p></div>
          <div className="language-flow__list">
            {s.how.map((item, index) => (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><h3>{item.title}</h3><p>{item.text}</p></div><i>↗</i>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--white language-faq" id="faq">
        <div className="container">
          <div className="section__head"><h2>{s.faqHead}</h2></div>
          <div className="faq language-faq__list">
            {s.faq.map((item, index) => (
              <details key={item.q}>
                <summary><span>0{index + 1}</span>{item.q}</summary><p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Cta title={s.ctaTitle} text={s.ctaText} />
    </main>
  );
}
