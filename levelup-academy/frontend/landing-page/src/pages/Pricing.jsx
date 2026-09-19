import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { SITE_URL, breadcrumb, faqPage, useCeo } from '../lib/ceo.js';
import { localizePath, useLang, useLocalizePath, useT } from '../i18n/index.js';

// Space-grouped thousands ("199 000") — matches both ru and uz number style.
const nf = new Intl.NumberFormat('ru-RU');

/**
 * JSON-LD Product with AggregateOffer — the price signal AI search and Google read.
 * `lang` is needed for the offer URL: it used to be hardcoded to the Russian path, so
 * the Uzbek page priced itself against a Russian URL.
 */
function pricingLd(p, lang) {
  const offers = p.plans
    .filter((plan) => plan.amount !== null)
    .map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: String(plan.amount),
      priceCurrency: 'UZS',
      description: plan.range,
      category: plan.amount === 0 ? 'free' : 'subscription',
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'LevelUp Academy',
    description: p.lead,
    brand: { '@type': 'Brand', name: 'LevelUp Academy' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'UZS',
      lowPrice: '0',
      highPrice: '799000',
      offerCount: p.plans.length,
      url: `${SITE_URL}${localizePath('/landing/pricing', lang)}`,
      offers,
    },
  };
}

export default function Pricing() {
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const p = t.pricing;

  const jsonLd = useMemo(
    () => [
      breadcrumb(
        [
          { name: t.ceo.breadcrumbHome, path: '/landing' },
          { name: p.badge, path: '/landing/pricing' },
        ],
        lang,
      ),
      pricingLd(p, lang),
      faqPage(p.faq),
    ],
    [t.ceo.breadcrumbHome, p, lang],
  );

  useCeo({
    title: t.ceo.pricing.title,
    description: t.ceo.pricing.description,
    path: '/landing/pricing',
    jsonLd,
  });

  const renderPrice = (plan) => {
    if (plan.amount === null) return <span className="plan__price">{p.negotiable}</span>;
    if (plan.amount === 0) return <span className="plan__price">{p.free}</span>;
    return (
      <span className="plan__price">
        <span className="plan__amount">{nf.format(plan.amount)}</span>
        <span className="plan__per">{p.per}</span>
      </span>
    );
  };

  return (
    <main className="product-page product-page--pricing">
      <section className="page-hero">
        <div className="container">
          <span className="badge badge--lime">{p.badge}</span>
          <h1>{p.h1}</h1>
          <p>{p.lead}</p>
          <p className="pricing-note">{p.positioning}</p>
          <div className="product-hero__panel"><span>START</span><strong>0</strong><small>{lang === 'uz' ? "so'm / 30 akkauntgacha" : lang === 'en' ? 'UZS / up to 30 accounts' : 'сум / до 30 аккаунтов'}</small></div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <div className="section__head">
            <h2>{p.plansHead}</h2>
            <p>{p.plansLead}</p>
          </div>
          <div className="plans pricing-matrix">
            {p.plans.map((plan, index) => (
              <article
                className={`plan${plan.popular ? ' plan--popular' : ''}`}
                key={plan.id}
              >
                <span className="plan__index">0{index + 1}</span>
                {plan.popular && <span className="plan__badge">{p.popular}</span>}
                <h3 className="plan__name">{plan.name}</h3>
                {renderPrice(plan)}
                <div className="plan__range">{plan.range}</div>
                <Link to={lp('/landing/contacts')} className="btn btn--dark plan__cta">
                  {p.cardCta}
                </Link>
              </article>
            ))}
          </div>
          <ul className="perks">
            {p.perks.map((perk) => (
              <li key={perk}>
                <Icon name="check" size={16} />
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2>{p.trialHead}</h2>
            <p>{p.trialLead}</p>
          </div>
          <div className="cards-3">
            {p.trial.map((item) => (
              <article className="feature" key={item.title}>
                <div className="feature__icon">
                  <Icon name={item.icon} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <div className="section__head">
            <h2>{p.guaranteeHead}</h2>
            <p>{p.guaranteeLead}</p>
          </div>
          <div className="cards-3">
            {p.guarantee.map((item) => (
              <article className="feature" key={item.title}>
                <div className="feature__icon">
                  <Icon name={item.icon} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2>{p.extraHead}</h2>
            <p>{p.extraText}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to={lp('/landing/contacts')} className="btn btn--outline btn--lg">
              {p.extraCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--white" id="faq">
        <div className="container">
          <div className="section__head">
            <h2>{p.faqHead}</h2>
          </div>
          <div className="faq" style={{ maxWidth: 760, margin: '0 auto' }}>
            {p.faq.map((f, i) => (
              <details
                key={i}
                style={{
                  border: '1px solid var(--border, #E6EDD8)',
                  borderRadius: 14,
                  padding: '14px 18px',
                  marginBottom: 12,
                  background: '#fff',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 700, listStyle: 'none' }}>
                  {f.q}
                </summary>
                <p style={{ marginTop: 10, color: 'var(--muted, #5E6E52)', lineHeight: 1.6 }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Cta title={p.ctaTitle} text={p.ctaText} />
    </main>
  );
}
