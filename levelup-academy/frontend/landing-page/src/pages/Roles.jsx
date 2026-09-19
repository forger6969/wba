import { useMemo } from 'react';
import Cta from '../components/Cta.jsx';
import { breadcrumb, useCeo } from '../lib/ceo.js';
import { useLang, useT } from '../i18n/index.js';

export default function Roles() {
  const t = useT();
  const lang = useLang();
  const r = t.roles;
  const financeRole = lang === 'uz'
    ? { tag: 'FM', title: 'Finance Manager', text: "Markaz moliyasini operatsion ishlardan alohida boshqaradi.", list: ["Kassa va xarajatlar", "Maosh va qarzdorlik", "Moliyaviy hisobotlar"] }
    : lang === 'en'
      ? { tag: 'FM', title: 'Finance Manager', text: 'Runs center finances independently from daily operations.', list: ['Cash flow and expenses', 'Payroll and debt', 'Financial reporting'] }
      : { tag: 'FM', title: 'Finance Manager', text: 'Управляет финансами центра отдельно от операционной работы.', list: ['Касса и расходы', 'Зарплаты и задолженность', 'Финансовые отчёты'] };

  const jsonLd = useMemo(
    () => [
      breadcrumb(
        [
          { name: t.ceo.breadcrumbHome, path: '/landing' },
          { name: r.badge, path: '/landing/roles' },
        ],
        lang,
      ),
    ],
    [t.ceo.breadcrumbHome, r.badge, lang],
  );

  useCeo({
    title: t.ceo.roles.title,
    description: t.ceo.roles.description,
    path: '/landing/roles',
    jsonLd,
  });

  return (
    <main className="product-page product-page--roles">
      <section className="page-hero">
        <div className="container">
          <span className="badge badge--lime">{r.badge}</span>
          <h1>{r.h1}</h1>
          <p>{r.lead}</p>
          <div className="product-hero__panel"><span>ACCESS MAP</span><strong>7</strong><small>{lang === 'uz' ? 'alohida kabinet' : lang === 'en' ? 'dedicated workspaces' : 'отдельных кабинетов'}</small></div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <div className="cards-2 role-stories">
            {[...r.items, financeRole].map((item, index) => (
              <article className="big-card" key={item.tag}>
                <span className="role-story__number">0{index + 1}</span>
                <div className="role__avatar">{item.tag}</div>
                <h3 style={{ marginTop: 12 }}>{item.title}</h3>
                <p>{item.text}</p>
                <ul className="checklist">
                  {item.list.map((li) => (
                    <li key={li}>
                      <span className="tick">✓</span>
                      {li}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2>{r.howHead}</h2>
            <p>{r.howLead}</p>
          </div>
          <div className="steps">
            {r.how.map((s) => (
              <article className="step" key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Cta title={r.ctaTitle} text={r.ctaText} />
    </main>
  );
}
