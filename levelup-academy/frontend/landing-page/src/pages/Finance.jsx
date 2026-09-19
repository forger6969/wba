import { useMemo } from 'react';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { breadcrumb, useCeo } from '../lib/ceo.js';
import { useLang, useT } from '../i18n/index.js';

export default function Finance() {
  const t = useT();
  const lang = useLang();
  const f = t.finance;

  const jsonLd = useMemo(
    () => [
      breadcrumb(
        [
          { name: t.ceo.breadcrumbHome, path: '/landing' },
          { name: f.badge, path: '/landing/finance' },
        ],
        lang,
      ),
    ],
    [t.ceo.breadcrumbHome, f.badge, lang],
  );

  useCeo({
    title: t.ceo.finance.title,
    description: t.ceo.finance.description,
    path: '/landing/finance',
    jsonLd,
  });

  return (
    <main className="product-page product-page--finance">
      <section className="page-hero">
        <div className="container">
          <span className="badge badge--lime">{f.badge}</span>
          <h1>{f.h1}</h1>
          <p>{f.lead}</p>
          <div className="product-hero__panel"><span>FINANCE LIVE</span><strong>0</strong><small>{lang === 'uz' ? 'yashirin operatsiya' : lang === 'en' ? 'hidden transactions' : 'скрытых операций'}</small></div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <div className="section__head">
            <h2>{f.payHead}</h2>
            <p>{f.payLead}</p>
          </div>
          <div className="cards-3">
            {f.pay.map((p) => (
              <article className="feature" key={p.title}>
                <div className="feature__icon">
                  <Icon name={p.icon} />
                </div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="finance-signal">
        <div className="container finance-signal__grid">
          <div><span>LIVE</span><strong>48.2M</strong><small>{lang === 'uz' ? 'oylik tushum' : lang === 'en' ? 'monthly revenue' : 'выручка за месяц'}</small></div>
          <div><span>SYNC</span><strong>100%</strong><small>{lang === 'uz' ? 'to‘lovlar bog‘langan' : lang === 'en' ? 'payments reconciled' : 'платежей сверено'}</small></div>
          <div><span>SAFE</span><strong>0</strong><small>{lang === 'uz' ? 'yashirin o‘zgarishlar' : lang === 'en' ? 'hidden edits' : 'скрытых изменений'}</small></div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2>{f.debtHead}</h2>
            <p>{f.debtLead}</p>
          </div>
          <div className="steps">
            {f.debt.map((d) => (
              <article className="step" key={d.title}>
                <h3>{d.title}</h3>
                <p>{d.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <div className="section__head">
            <h2>{f.compareHead}</h2>
          </div>
          <table className="compare">
            <thead>
              <tr>
                <th>{f.compare.task}</th>
                <th>{f.compare.before}</th>
                <th>{f.compare.after}</th>
              </tr>
            </thead>
            <tbody>
              {f.compare.rows.map((row) => (
                <tr key={row.task}>
                  <td data-label={f.compare.task}>{row.task}</td>
                  <td className="no" data-label={f.compare.before}>
                    {row.before}
                  </td>
                  <td className="yes" data-label={f.compare.after}>
                    {row.after}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2>{f.safetyHead}</h2>
            <p>{f.safetyLead}</p>
          </div>
          <div className="cards-3">
            {f.safety.map((s) => (
              <article className="feature" key={s.title}>
                <div className="feature__icon">
                  <Icon name={s.icon} />
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Cta title={f.ctaTitle} text={f.ctaText} />
    </main>
  );
}
