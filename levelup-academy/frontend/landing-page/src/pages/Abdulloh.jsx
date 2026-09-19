import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { breadcrumb, SITE_URL, useCeo } from '../lib/ceo.js';
import { useLang, useLocalizePath, useT } from '../i18n/index.js';

// Реальные варианты написания одного имени для поиска на латинице и кириллице.
const NAME_ALIASES = [
  'Abdulloh Yunusov',
  'Yunusov Abdulloh',
  'Abduloh Yunusov',
  'Yunusov Abduloh',
  'Abduloh',
  'Abdulka Yunusov',
  'Yunusov Abdulka',
  'Абдуллох Юнусов',
  'Юнусов Абдуллох',
];

const TELEGRAM_URL = 'https://t.me/Corvin_0';
const EMAIL = 'yunusovabdullox36@gmail.com';

const COPY = {
  ru: {
    badge: 'FRONTEND-РАЗРАБОТЧИК · LEVELUP ACADEMY', name: 'Yunusov Abdulloh', subName: 'Abdulloh Yunusov', location: 'Ташкент, Узбекистан',
    lead: 'Frontend-разработчик с полным доступом ко всему frontend/. Ведёт Admin-панель и подключается к любому из четырёх Vite-приложений там, где нужна помощь.',
    tags: ['React', 'Vite', 'Admin panel', 'i18n', 'UI/UX'], tasks: 'выполненных задач', apps: 'Vite-приложения', access: 'доступ к frontend',
    highlightsHead: 'Ключевой вклад', highlights: [
      { n: '01', title: 'Admin-панель', text: 'Развивает административный интерфейс: группы, платежи, отчёты и рабочие процессы учебного центра.' },
      { n: '02', title: 'Весь frontend', text: 'Подключается к staff, member, main-admin и landing-page для исправлений, интеграции и выравнивания интерфейсов.' },
      { n: '03', title: 'Единая локализация', text: 'Системно развивает i18n для Admin, Mentor, Methodist и CEO-разделов.' },
    ],
    stackHead: 'Стек и зоны работы', stack: [
      { label: 'Frontend', items: ['React 18', 'Vite', 'JavaScript', 'React Router'] },
      { label: 'Интерфейсы', items: ['Tailwind CSS', 'DaisyUI', 'Responsive UI', 'i18n'] },
      { label: 'Приложения', items: ['staff', 'member', 'main-admin', 'landing-page'] },
    ],
    bioHead: 'О специалисте', bio: 'Abdulloh отвечает за стабильность и целостность frontend-части LevelUp Academy. Полный доступ ко всем frontend-приложениям позволяет ему усиливать чужие зоны без передачи владения: исправлять ошибки, подключать API, проводить рефакторинг и приводить интерфейсы к единой дизайн-системе.',
    contactsHead: 'Контакты', contactsLead: 'Связаться с Абдуллохом напрямую', links: 'Профиль и проект', team: 'Вся команда', about: 'О LevelUp Academy', taskLabel: '87+ задач', appLabel: '04 приложения', accessLabel: '100% frontend',
  },
  uz: {
    badge: 'FRONTEND DASTURCHI · LEVELUP ACADEMY', name: 'Yunusov Abdulloh', subName: 'Abdulloh Yunusov', location: "Toshkent, O'zbekiston",
    lead: "Butun frontend/ bo'yicha to'liq ruxsatga ega frontend dasturchi. Admin panelini yuritadi va yordam kerak bo'lganda to'rtta Vite ilovasining istalganiga qo'shiladi.",
    tags: ['React', 'Vite', 'Admin panel', 'i18n', 'UI/UX'], tasks: 'bajarilgan task', apps: 'Vite ilovasi', access: 'frontend ruxsati',
    highlightsHead: 'Asosiy hissa', highlights: [
      { n: '01', title: 'Admin paneli', text: "Guruhlar, to'lovlar, hisobotlar va o'quv markazi jarayonlari uchun admin interfeysini rivojlantiradi." },
      { n: '02', title: 'Butun frontend', text: "Tuzatish, integratsiya va UI birxillashtirish uchun staff, member, main-admin va landing-page'ga qo'shiladi." },
      { n: '03', title: 'Yagona lokalizatsiya', text: "Admin, Mentor, Methodist va CEO bo'limlari uchun i18n tizimini rivojlantiradi." },
    ],
    stackHead: "Stack va ish yo'nalishlari", stack: [
      { label: 'Frontend', items: ['React 18', 'Vite', 'JavaScript', 'React Router'] },
      { label: 'Interfeyslar', items: ['Tailwind CSS', 'DaisyUI', 'Responsive UI', 'i18n'] },
      { label: 'Ilovalar', items: ['staff', 'member', 'main-admin', 'landing-page'] },
    ],
    bioHead: 'Mutaxassis haqida', bio: "Abdulloh LevelUp Academy frontend qismining barqarorligi va yaxlitligi uchun ishlaydi. Barcha frontend ilovalariga to'liq ruxsat unga xatolarni tuzatish, API ulash, refactoring qilish va interfeyslarni yagona dizayn tizimiga keltirish imkonini beradi.",
    contactsHead: 'Kontaktlar', contactsLead: "Abdulloh bilan to'g'ridan-to'g'ri bog'lanish", links: 'Profil va loyiha', team: 'Butun jamoa', about: 'LevelUp Academy haqida', taskLabel: '87+ task', appLabel: '04 ilova', accessLabel: '100% frontend',
  },
  en: {
    badge: 'FRONTEND DEVELOPER · LEVELUP ACADEMY', name: 'Yunusov Abdulloh', subName: 'Abdulloh Yunusov', location: 'Tashkent, Uzbekistan',
    lead: 'Frontend developer with full access to frontend/. Leads the Admin panel and contributes to any of the four Vite applications when help is needed.',
    tags: ['React', 'Vite', 'Admin panel', 'i18n', 'UI/UX'], tasks: 'completed tasks', apps: 'Vite applications', access: 'frontend access',
    highlightsHead: 'Key contribution', highlights: [
      { n: '01', title: 'Admin panel', text: 'Develops the administrative interface for groups, payments, reports and education-center workflows.' },
      { n: '02', title: 'Full frontend', text: 'Contributes to staff, member, main-admin and landing-page for fixes, integration and UI alignment.' },
      { n: '03', title: 'Unified localization', text: 'Systematically develops i18n across Admin, Mentor, Methodist and CEO sections.' },
    ],
    stackHead: 'Stack and work areas', stack: [
      { label: 'Frontend', items: ['React 18', 'Vite', 'JavaScript', 'React Router'] },
      { label: 'Interfaces', items: ['Tailwind CSS', 'DaisyUI', 'Responsive UI', 'i18n'] },
      { label: 'Applications', items: ['staff', 'member', 'main-admin', 'landing-page'] },
    ],
    bioHead: 'About the specialist', bio: 'Abdulloh contributes to the stability and consistency of the LevelUp Academy frontend. Full access across all frontend applications lets him fix bugs, integrate APIs, refactor code and align interfaces with the shared design system.',
    contactsHead: 'Contacts', contactsLead: 'Contact Abdulloh directly', links: 'Profile and project', team: 'Full team', about: 'About LevelUp Academy', taskLabel: '87+ tasks', appLabel: '04 apps', accessLabel: '100% frontend',
  },
};

export default function Abdulloh() {
  const lang = useLang(); const lp = useLocalizePath(); const t = useT(); const c = COPY[lang] || COPY.ru;
  const profileUrl = `${SITE_URL}/landing/team/yunusov-abdulloh`;
  const jsonLd = useMemo(() => [breadcrumb([{ name: t.ceo.breadcrumbHome, path: '/landing' }, { name: t.nav.team, path: '/landing/team' }, { name: c.name, path: '/landing/team/yunusov-abdulloh' }], lang), {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${profileUrl}#profile`,
    dateCreated: '2026-08-24T00:00:00+05:00',
    dateModified: '2026-08-24T00:00:00+05:00',
    mainEntity: {
      '@type': 'Person',
      '@id': `${SITE_URL}/#yunusov-abdulloh`,
      identifier: 'yunusov-abdulloh',
      name: c.name,
      alternateName: NAME_ALIASES,
      givenName: 'Abdulloh',
      familyName: 'Yunusov',
      additionalName: 'Абдуллох Юнусов',
      url: profileUrl,
      description: c.lead,
      email: `mailto:${EMAIL}`,
      jobTitle: 'Frontend Developer',
      sameAs: [TELEGRAM_URL],
      worksFor: { '@type': 'Organization', name: 'LevelUp Academy', url: SITE_URL },
      image: { '@type': 'ImageObject', contentUrl: `${SITE_URL}/team/yunusov-abdulloh.jpg`, caption: c.name },
      address: { '@type': 'PostalAddress', addressLocality: 'Tashkent', addressCountry: 'UZ' },
      knowsAbout: ['React', 'Vite', 'JavaScript', 'Frontend development', 'Admin panel', 'i18n'],
    },
  }], [c.lead, c.name, lang, profileUrl, t.nav.team, t.ceo.breadcrumbHome]);
  useCeo({ title: `${c.name} (Abdulloh Yunusov) — LevelUp Academy`, description: `${c.name} — также Abdulloh Yunusov, Abduloh Yunusov, Yunusov Abduloh и Abdulka Yunusov. ${c.location}. ${c.lead}`, path: '/landing/team/yunusov-abdulloh', jsonLd });

  return <main className="founder-page abdulloh-page">
    <section className="founder-hero"><div className="container founder-hero__grid"><div className="founder-hero__copy"><span className="badge badge--lime founder-hero__badge">{c.badge}</span><h1>{c.name}</h1><p className="founder-hero__meta"><span>{c.subName}</span><span className="founder-hero__meta-separator" /><span>{c.location}</span></p><p className="founder-hero__lead">{c.lead}</p><div className="founder-hero__tags">{c.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div></div><div className="founder-portrait abdulloh-portrait"><div className="founder-portrait__frame"><img src="/team/yunusov-abdulloh.jpg" alt={c.name} width="3024" height="4032" /><div className="founder-portrait__shade" /></div><span className="founder-portrait__index">02</span><span className="founder-portrait__caption">LEVELUP / FRONTEND</span></div></div></section>
    <section className="founder-facts"><div className="container founder-facts__grid"><div className="founder-fact"><span className="founder-fact__index">01</span><strong>87+</strong><span>{c.tasks}</span></div><div className="founder-fact"><span className="founder-fact__index">02</span><strong>04</strong><span>{c.apps}</span></div><div className="founder-fact"><span className="founder-fact__index">03</span><strong>100%</strong><span>{c.access}</span></div></div></section>
    <section className="section founder-highlights"><div className="container"><div className="section__head"><h2>{c.highlightsHead}</h2></div><div className="founder-bento abdulloh-highlights">{c.highlights.map(item => <article className="founder-bento__card" key={item.title}><span className="abdulloh-card-number">{item.n}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div></section>
    <section className="section section--white founder-stack"><div className="container"><div className="section__head"><h2>{c.stackHead}</h2></div><div className="founder-stack__grid">{c.stack.map((group, i) => <article className="founder-stack__card" key={group.label}><span className="founder-stack__number">0{i + 1}</span><h3>{group.label}</h3><div className="tag-row founder-stack__tags">{group.items.map(item => <span className="tag" key={item}>{item}</span>)}</div></article>)}</div></div></section>
    <section className="section founder-bio"><div className="container"><div className="founder-bio__layout"><div><span className="founder-bio__eyebrow">LEVELUP ACADEMY</span><h2>{c.bioHead}</h2></div><p>{c.bio}</p></div></div></section>
    <section className="section section--white founder-contacts"><div className="container"><div className="section__head"><h2>{c.contactsHead}</h2><p>{c.contactsLead}</p></div><div className="founder-contact-grid">
      <a className="founder-contact-card" href={TELEGRAM_URL} target="_blank" rel="noreferrer"><div className="info-card__icon"><Icon name="send" /></div><div className="founder-contact-card__body"><span>Telegram</span><strong>@Corvin_0</strong></div><span className="founder-contact-card__number">01</span></a>
      <a className="founder-contact-card" href={`mailto:${EMAIL}`}><div className="info-card__icon"><Icon name="mail" /></div><div className="founder-contact-card__body"><span>Email</span><strong>{EMAIL}</strong></div><span className="founder-contact-card__number">02</span></a>
    </div></div></section>
    <section className="section section--white"><div className="container"><div className="section__head"><h2>{c.links}</h2></div><div className="hero__actions" style={{ justifyContent: 'center' }}><Link to={lp('/landing/team')} className="btn btn--outline">← {c.team}</Link><Link to={lp('/landing/about')} className="btn btn--dark">{c.about} ↗</Link></div></div></section>
    <Cta />
  </main>;
}
