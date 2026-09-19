import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { faqPage, useCeo } from '../lib/ceo.js';
import { useLang, useLocalizePath, useT } from '../i18n/index.js';

// Числовые данные демо-дашборда — от языка не зависят.
const leaders = [
  { place: 1, name: 'Aziza R.', score: '2 480' },
  { place: 2, name: 'Bekzod K.', score: '2 190' },
  { place: 3, name: 'Dilnoza T.', score: '1 970' },
  { place: 4, name: 'Sanjar U.', score: '1 640' },
];

const bars = [
  { label: '0–59', height: 32, opacity: 0.35 },
  { label: '60–74', height: 58, opacity: 0.55 },
  { label: '75–89', height: 92, opacity: 0.78 },
  { label: '90–100', height: 100, opacity: 1 },
];

const stats = [
  { value: '6', key: 'roles' },
  { value: '12+', key: 'modules' },
  { value: 'Live', key: 'live' },
  { value: '24/7', key: 'telegram' },
];

const FOUNDER_COPY = {
  ru: { eyebrow: 'ОСНОВАТЕЛЬ И TEAM LEAD', title: 'Azizbek Amangeldiev', text: 'Основатель и руководитель команды LevelUp Academy. Отвечает за продукт, архитектуру CRM и развитие платформы для учебных центров.', link: 'Профиль основателя' },
  uz: { eyebrow: 'ASOSCHI VA JAMOA RAHBARI', title: 'Azizbek Amangeldiev', text: "LevelUp Academy asoschisi va jamoa rahbari. Mahsulot, CRM arxitekturasi va o‘quv markazlari uchun platformani rivojlantirishga javob beradi.", link: "Asoschi profilini ko‘rish" },
  en: { eyebrow: 'FOUNDER AND TEAM LEAD', title: 'Azizbek Amangeldiev', text: 'Founder and Team Lead of LevelUp Academy. Responsible for the product, CRM architecture and development of the platform for education centers.', link: 'View founder profile' },
};

export default function Home() {
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const h = t.home;
  const founder = FOUNDER_COPY[lang] || FOUNDER_COPY.ru;

  // Стабильная ссылка обязательна: иначе useCeo пересоздавал бы JSON-LD каждый рендер.
  const jsonLd = useMemo(() => [faqPage(h.faq)], [h.faq]);

  useCeo({
    title: t.ceo.home.title,
    description: t.ceo.home.description,
    path: '/landing',
    jsonLd,
  });

  return (
    <main className="home-page">
      {/* ===== Hero ===== */}
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="badge">{h.badge}</span>
            <h1>{h.h1}</h1>
            <p className="hero__lead">{h.lead}</p>
            <div className="hero__actions">
              <Link to={lp('/landing/contacts')} className="btn btn--accent btn--lg">
                {h.ctaPrimary}
              </Link>
              <Link to={lp('/landing/features')} className="btn btn--outline btn--lg">
                {h.ctaSecondary}
              </Link>
            </div>
            <div className="trial-note">
              <Icon name="check" size={16} />
              {t.common.trial}
            </div>
          </div>

          <div className="dash">
            <div className="dash__head">
              <div>
                <div className="dash__title">{h.dash.title}</div>
                <div className="dash__sub">{h.dash.sub}</div>
              </div>
            </div>
            <div className="dash__stats">
              <div className="stat-card">
                <div className="stat-card__label">{h.dash.revenue}</div>
                <div className="stat-card__value num">48.2M</div>
                <div className="delta delta--up">▲ 12%</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">{h.dash.students}</div>
                <div className="stat-card__value num">1 240</div>
                <div className="delta delta--up">▲ 34</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">{h.dash.debtors}</div>
                <div className="stat-card__value num">17</div>
                <div className="delta delta--down">▼ 5</div>
              </div>
            </div>
            <div className="dash__chart">
              <div className="dash__chart-title">{h.dash.chart}</div>
              <div className="bars">
                {bars.map((b) => (
                  <div className="bars__item" key={b.label}>
                    <div
                      className="bars__bar"
                      style={{
                        height: `${b.height}%`,
                        background: `rgba(198, 255, 52, ${b.opacity})`,
                      }}
                    />
                    <span className="bars__label">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Полоса статов ===== */}
      <section className="band">
        <div className="container band__grid">
          {stats.map((s) => (
            <div className="band__item" key={s.key}>
              <div className="band__value">{s.value}</div>
              <div className="band__label">{h.band[s.key]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Основатель ===== */}
      <section className="home-founder" aria-labelledby="home-founder-title">
        <div className="container home-founder__card">
          <div className="home-founder__portrait">
            <img src="/team/azizbek-amangeldiev.png" alt="Azizbek Amangeldiev — основатель LevelUp Academy" width="480" height="560" />
          </div>
          <div className="home-founder__copy">
            <span>{founder.eyebrow}</span>
            <h2 id="home-founder-title">{founder.title}</h2>
            <p>{founder.text}</p>
            <Link to={lp('/landing/team/azizbek-amangeldiev')} className="btn btn--dark">{founder.link} ↗</Link>
          </div>
          <Link to={lp('/landing/team')} className="home-founder__team-link">LevelUp Academy team / jamoasi / команда →</Link>
        </div>
      </section>

      {/* ===== Фичи ===== */}
      <section className="section section--white" id="features">
        <div className="container">
          <div className="section__head">
            <h2>{h.featuresHead}</h2>
            <p>{h.featuresLead}</p>
          </div>
          <div className="cards-3">
            {h.features.map((f, index) => (
              <article className="feature" key={f.title}>
                <span className="feature__number">0{index + 1}</span>
                <div className="feature__icon">
                  <Icon name={f.icon} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Роли ===== */}
      <section className="section section--roles">
        <div className="container">
          <div className="section__head">
            <h2>{h.rolesHead}</h2>
            <p>{h.rolesLead}</p>
          </div>
          <div className="roles roles--orbit">
            <div className="roles__side roles__side--left">
              {h.roles.slice(0, 3).map((r) => (
                <article className="role" key={r.tag}>
                  <div className="role__avatar">{r.tag}</div>
                  <div><h3>{r.title}</h3><p>{r.text}</p></div>
                </article>
              ))}
            </div>
            <div className="roles__hub" aria-hidden="true">
              <span>LEVELUP</span>
              <strong>6</strong>
              <small>ONE SYSTEM</small>
            </div>
            <div className="roles__side roles__side--right">
              {h.roles.slice(3).map((r) => (
                <article className="role" key={r.tag}>
                  <div className="role__avatar">{r.tag}</div>
                  <div><h3>{r.title}</h3><p>{r.text}</p></div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Мотивация (тёмная) ===== */}
      <section className="section section--dark">
        <div className="container split">
          <div>
            <span className="badge badge--lime">{h.motivationBadge}</span>
            <h2>{h.motivationH2}</h2>
            <p className="split__lead">{h.motivationLead}</p>
            <ul className="checklist">
              {h.motivationList.map((item) => (
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

      {/* ===== Финансы ===== */}
      <section className="section section--invoice">
        <div className="container split">
          <div className="invoice">
            <div className="invoice__head">
              <div>
                <div className="invoice__title">{h.invoice.title}</div>
                <div className="invoice__sub">{h.invoice.sub}</div>
              </div>
              <span className="pill pill--paid">{h.invoice.paid}</span>
            </div>
            <div className="invoice__total">
              <div className="invoice__total-label">{h.invoice.totalLabel}</div>
              <div className="invoice__total-value num">{h.invoice.total}</div>
            </div>
            <div className="invoice__caption">{h.invoice.splitCaption}</div>
            <div className="invoice__line">
              <span>{h.invoice.cash}</span>
              <b className="num">{h.invoice.cashValue}</b>
            </div>
            <div className="invoice__line">
              <span>{h.invoice.card}</span>
              <b className="num">{h.invoice.cardValue}</b>
            </div>
            <div className="invoice__caption" style={{ marginTop: 16 }}>
              {h.invoice.resultCaption}
            </div>
            <div className="invoice__line">
              <span>{h.invoice.receipt}</span>
              <b>{h.invoice.receiptValue}</b>
            </div>
            <div className="invoice__line">
              <span>{h.invoice.debt}</span>
              <b className="num">{h.invoice.debtValue}</b>
            </div>
          </div>

          <div>
            <h2>{h.financeH2}</h2>
            <p className="split__lead">{h.financeLead}</p>
            <ul className="checklist">
              {h.financeList.map((item) => (
                <li key={item}>
                  <span className="tick">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== FAQ (CEO/GEO/AEO) ===== */}
      <section className="section section--white" id="faq">
        <div className="container">
          <div className="section__head">
            <h2>{h.faqHead}</h2>
            <p>{h.faqLead}</p>
          </div>
          <div className="faq" style={{ maxWidth: 760, margin: '0 auto' }}>
            {h.faq.map((f, i) => (
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

      <Cta />
    </main>
  );
}
