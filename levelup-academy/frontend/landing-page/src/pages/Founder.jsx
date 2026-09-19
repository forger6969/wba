import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { breadcrumb, useCeo, SITE_URL } from '../lib/ceo.js';
import { useLang, useLocalizePath, useT } from '../i18n/index.js';

// Личные контакты — только реальные значения, подтверждённые владельцем.
const TELEGRAM_URL = 'https://t.me/Azizbek2603';
const EMAIL = 'amangeldiev.azizbek.010@gmail.com';
const LINKEDIN_URL = 'https://www.linkedin.com/in/azizbek-amangeldiev-6045a342b';

/**
 * Персональная страница основателя — та же роль, что team-страницы вроде
 * wewatch.uz/team/<slug>: отдельный URL с именем + фото + био, который поисковик
 * может процитировать при запросе по имени. About.jsx даёт факт «есть такой
 * основатель», эта страница даёт содержание для карточки/AI Overview по имени.
 *
 * Карточки контактов/стека — .info-card (левое выравнивание, мягкая
 * icon-badge), а не общий .feature (центрированный, залитая иконка):
 * сознательно другой паттерн для «список фактов», подсмотренный на
 * tezcode.dev/ru/aloqa, а не переиспользование питчевых карточек с About.
 */
export default function Founder() {
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const s = t.founder;

  const contacts = [
    { icon: 'send', label: s.contactTelegramLabel, value: '@Azizbek2603', href: TELEGRAM_URL, note: s.contactTelegramNote },
    { icon: 'mail', label: s.contactEmailLabel, value: EMAIL, href: `mailto:${EMAIL}` },
    { icon: 'linkedin', label: s.contactLinkedinLabel, value: 'in/azizbek-amangeldiev', href: LINKEDIN_URL },
  ];

  const profileFacts = [
    { value: '2026', label: s.highlights[1]?.title },
    { value: String(s.stackGroups.length).padStart(2, '0'), label: s.stackHead },
    { value: s.location.split(',')[0], label: s.highlights[2]?.title },
  ];

  const jsonLd = useMemo(
    () => [
      breadcrumb(
        [
          { name: t.ceo.breadcrumbHome, path: '/landing' },
          { name: t.about.badge, path: '/landing/about' },
          { name: s.h1, path: '/landing/team/azizbek-amangeldiev' },
        ],
        lang,
      ),
      {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': `${SITE_URL}/landing/team/azizbek-amangeldiev#profile`,
        mainEntity: { '@id': `${SITE_URL}/#founder` },
      },
    ],
    [t.ceo.breadcrumbHome, t.about.badge, s.h1, lang],
  );

  useCeo({
    title: t.ceo.founder.title,
    description: t.ceo.founder.description,
    path: '/landing/team/azizbek-amangeldiev',
    jsonLd,
  });

  return (
    <main className="founder-page">
      <section className="founder-hero">
        <div className="founder-hero__glow" aria-hidden="true" />
        <div className="container founder-hero__grid">
          <div className="founder-hero__copy">
            <span className="badge badge--lime founder-hero__badge">{s.badge}</span>
            <h1>{s.h1}</h1>
            <p className="founder-hero__meta">
              <span>{s.subName}</span>
              <span className="founder-hero__meta-separator" aria-hidden="true" />
              <span><Icon name="pin" size={16} /> {s.location}</span>
            </p>
            <p className="founder-hero__lead">{s.lead}</p>

            <div className="founder-hero__tags">
              {s.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="founder-portrait">
            <div className="founder-portrait__frame">
              <img
                src="/team/azizbek-amangeldiev.png"
                alt={s.h1}
                width={640}
                height={760}
              />
              <div className="founder-portrait__shade" aria-hidden="true" />
              <span className="founder-portrait__location">
                <Icon name="pin" size={15} /> {s.location}
              </span>
            </div>
            <span className="founder-portrait__index" aria-hidden="true">01</span>
            <span className="founder-portrait__caption" aria-hidden="true">LEVELUP / FOUNDER</span>
          </div>
        </div>
      </section>

      <section className="founder-facts" aria-label={s.bioHead}>
        <div className="container founder-facts__grid">
          {profileFacts.map((fact, index) => (
            <div className="founder-fact" key={fact.label}>
              <span className="founder-fact__index">0{index + 1}</span>
              <strong>{fact.value}</strong>
              <span>{fact.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--white founder-contacts">
        <div className="container">
          <div className="section__head">
            <h2>{s.contactsHead}</h2>
            <p>{s.contactsLead}</p>
          </div>
          <div className="founder-contact-grid">
            {contacts.map((c, index) => (
              <a
                className="founder-contact-card"
                key={c.label}
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel={c.href.startsWith('http') ? 'noreferrer' : undefined}
              >
                {c.note && (
                  <span className="badge badge--lime info-card__note">{c.note}</span>
                )}
                <div className="info-card__icon">
                  <Icon name={c.icon} />
                </div>
                <div className="founder-contact-card__body">
                  <span>{c.label}</span>
                  <strong>{c.value}</strong>
                </div>
                <span className="founder-contact-card__number">0{index + 1}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section founder-highlights">
        <div className="container">
          <div className="founder-bento">
            {s.highlights.map((item, index) => (
              <article className={`founder-bento__card founder-bento__card--${index + 1}`} key={item.title}>
                <div className="info-card__icon">
                  <Icon name={item.icon} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--white founder-stack">
        <div className="container">
          <div className="section__head">
            <h2>{s.stackHead}</h2>
            <p>{s.stackLead}</p>
          </div>
          <div className="founder-stack__grid">
            {s.stackGroups.map((group, index) => (
              <article className="founder-stack__card" key={group.label}>
                <span className="founder-stack__number">0{index + 1}</span>
                <div className="info-card__icon">
                  <Icon name={group.icon} />
                </div>
                <h3>{group.label}</h3>
                <div className="tag-row founder-stack__tags">
                  {group.items.map((item) => (
                    <span className="tag" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section founder-bio">
        <div className="container">
          <div className="founder-bio__layout">
            <div>
              <span className="founder-bio__eyebrow">LEVELUP ACADEMY</span>
              <h2>{s.bioHead}</h2>
            </div>
            <p>{s.bioText}</p>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <div className="section__head">
            <h2>{s.linksHead}</h2>
          </div>
          <div className="hero__actions" style={{ justifyContent: 'center' }}>
            {s.links.map((link) => (
              <Link to={lp(link.path)} className="btn btn--outline" key={link.path}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Cta title={t.about.ctaTitle} text={t.about.ctaText} />
    </main>
  );
}
