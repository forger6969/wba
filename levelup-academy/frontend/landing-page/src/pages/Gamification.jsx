import { useMemo } from 'react';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { breadcrumb, useCeo } from '../lib/ceo.js';
import { useLang, useT } from '../i18n/index.js';

const leaders = [
  { place: 1, name: 'Aziza R.', score: '2 480' },
  { place: 2, name: 'Bekzod K.', score: '2 190' },
  { place: 3, name: 'Dilnoza T.', score: '1 970' },
  { place: 4, name: 'Sanjar U.', score: '1 640' },
  { place: 5, name: 'Madina A.', score: '1 520' },
];

export default function Gamification() {
  const t = useT();
  const lang = useLang();
  const g = t.gamification;

  const jsonLd = useMemo(
    () => [
      breadcrumb(
        [
          { name: t.ceo.breadcrumbHome, path: '/landing' },
          { name: g.badge, path: '/landing/gamification' },
        ],
        lang,
      ),
    ],
    [t.ceo.breadcrumbHome, g.badge, lang],
  );

  useCeo({
    title: t.ceo.gamification.title,
    description: t.ceo.gamification.description,
    path: '/landing/gamification',
    jsonLd,
  });

  return (
    <main className="product-page product-page--gamification">
      <section className="page-hero">
        <div className="container">
          <span className="badge badge--lime">{g.badge}</span>
          <h1>{g.h1}</h1>
          <p>{g.lead}</p>
          <div className="product-hero__panel"><span>GAME LOOP</span><strong>+10</strong><small>{lang === 'uz' ? 'faollik uchun coin' : lang === 'en' ? 'coins for activity' : 'коинов за активность'}</small></div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container split">
          <div>
            <h2>{g.earnHead}</h2>
            <p className="split__lead">{g.earnLead}</p>
            <ul className="checklist">
              {g.earnList.map((item) => (
                <li key={item}>
                  <span className="tick">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="leader">
            <div className="leader__head">
              <span className="leader__title">{t.common.leaderboardWeek}</span>
              <span className="pill pill--coins">{t.common.coins}</span>
            </div>
            {leaders.map((l) => (
              <div className="leader__row" key={l.place}>
                <span className="leader__place num">{l.place}</span>
                <span className="leader__ava" />
                <span className="leader__name">{l.name}</span>
                <span className="leader__score num">
                  {l.score} <span>★</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2>{g.spendHead}</h2>
            <p>{g.spendLead}</p>
          </div>
          <div className="steps">
            {g.spend.map((s) => (
              <article className="step" key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container split">
          <div>
            <span className="badge badge--lime">{g.journalBadge}</span>
            <h2>{g.journalH2}</h2>
            <p className="split__lead">{g.journalLead}</p>
            <ul className="checklist">
              {g.journalList.map((item) => (
                <li key={item}>
                  <span className="tick">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="leader">
            <div className="leader__head">
              <span className="leader__title">{g.journalTitle}</span>
              <span className="pill pill--coins">append-only</span>
            </div>
            {g.journalRows.map((row) => (
              <div className="leader__row" key={row.text}>
                <span className="leader__name">
                  <b>{row.amount}</b> · {row.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <div className="section__head">
            <h2>{g.boardHead}</h2>
            <p>{g.boardLead}</p>
          </div>
          <div className="cards-3">
            {g.board.map((b) => (
              <article className="feature" key={b.title}>
                <div className="feature__icon">
                  <Icon name={b.icon} />
                </div>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Cta title={g.ctaTitle} text={g.ctaText} />
    </main>
  );
}
