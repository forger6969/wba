import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { breadcrumb, faqPage, useCeo } from '../lib/ceo.js';
import { useLang, useLocalizePath, useT } from '../i18n/index.js';

export default function ForCourses() {
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const s = t.courses;
  const tr = (uz, en, ru) => (lang === 'uz' ? uz : lang === 'en' ? en : ru);

  const jsonLd = useMemo(() => [
    breadcrumb([
      { name: t.ceo.breadcrumbHome, path: '/landing' },
      { name: s.badge, path: '/landing/for-courses' },
    ], lang),
    faqPage(s.faq),
  ], [t.ceo.breadcrumbHome, s, lang]);

  useCeo({
    title: t.ceo.courses.title,
    description: t.ceo.courses.description,
    path: '/landing/for-courses',
    jsonLd,
  });

  return (
    <main className="language-page courses-page">
      <section className="language-hero courses-hero">
        <div className="container language-hero__grid">
          <div className="language-hero__copy">
            <span className="badge badge--lime">{s.badge}</span>
            <h1>{s.h1}</h1>
            <p className="language-hero__lead">{s.lead}</p>
            <p className="language-hero__intro">{s.intro}</p>
            <div className="language-hero__actions">
              <Link className="btn btn--primary" to={lp('/landing/pricing')}>{s.pricingLink}</Link>
              <a className="btn btn--outline" href="#how">{tr('Jarayonni ko‘rish', 'See the workflow', 'Посмотреть процесс')}</a>
            </div>
          </div>

          <div className="course-player" aria-hidden="true">
            <div className="course-player__bar"><span>LEVELUP / COURSE</span><b>•••</b></div>
            <div className="course-player__video">
              <div className="course-player__play">▶</div>
              <span>08:24 / 24:00</span>
              <i><b /></i>
            </div>
            <div className="course-player__title">
              <div><small>{tr('08-MODUL', 'MODULE 08', 'МОДУЛЬ 08')}</small><strong>{tr('Amaliy dars va test', 'Practical lesson and test', 'Практический урок и тест')}</strong></div>
              <b>72%</b>
            </div>
            <div className="course-player__path">
              {[
                ['01', tr('Video dars', 'Video lesson', 'Видеоурок'), true],
                ['02', tr('Test', 'Quiz', 'Тест'), true],
                ['03', tr('Uy vazifasi', 'Homework', 'Домашнее задание'), false],
              ].map(([number, label, done]) => (
                <article key={number} className={done ? 'is-done' : ''}><span>{done ? '✓' : number}</span><strong>{label}</strong><small>{done ? '100%' : '0%'}</small></article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="language-proof courses-proof">
        <div className="container language-proof__grid">
          {[
            ['3×', tr('kamroq qo‘lda ish', 'less manual work', 'меньше ручной работы')],
            ['100%', tr('o‘quv jarayoni nazoratda', 'learning flow tracked', 'учебный процесс под контролем')],
            ['1 CRM', tr('kurs, to‘lov va natijalar', 'course, payment and progress', 'курс, оплата и результаты')],
          ].map(([value, label]) => <div key={value}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
      </section>

      <section className="section section--white language-fit courses-fit">
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

      <section className="section language-flow courses-flow" id="how">
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
              <details key={item.q}><summary><span>0{index + 1}</span>{item.q}</summary><p>{item.a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <Cta title={s.ctaTitle} text={s.ctaText} />
    </main>
  );
}
