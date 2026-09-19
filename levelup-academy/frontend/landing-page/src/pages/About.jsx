import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { breadcrumb, useCeo } from '../lib/ceo.js';
import { useLang, useLocalizePath, useT } from '../i18n/index.js';

export default function About() {
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const s = t.about;
  const tr = (uz, en, ru) => (lang === 'uz' ? uz : lang === 'en' ? en : ru);
  const jsonLd = useMemo(() => [breadcrumb([{ name: t.ceo.breadcrumbHome, path: '/landing' }, { name: s.badge, path: '/landing/about' }], lang)], [t.ceo.breadcrumbHome, s.badge, lang]);

  useCeo({ title: t.ceo.about.title, description: t.ceo.about.description, path: '/landing/about', jsonLd });

  return (
    <main className="about-brand-page">
      <section className="about-brand-hero"><div className="container">
        <div className="about-brand-hero__top"><span className="badge badge--lime">{s.badge}</span><small>UZBEKISTAN / 2026</small></div>
        <div className="about-brand-hero__grid"><div><h1>{s.h1}</h1><p>{s.lead}</p><p className="about-brand-hero__intro">{s.intro}</p></div>
          <div className="about-brand-mark" aria-hidden="true"><span>LEVEL</span><strong>UP</strong><i>ACADEMY</i><b>↗</b></div>
        </div>
      </div></section>

      <section className="about-manifest"><div className="container"><span>01</span><p>{tr('Biz ta’lim markazini boshqarishni oddiy, aniq va shaffof qilamiz.', 'We make education business management simple, clear and transparent.', 'Мы делаем управление образовательным бизнесом простым, понятным и прозрачным.')}</p></div></section>

      <section className="section section--white about-why"><div className="container"><div className="section__head"><h2>{s.whyHead}</h2><p>{s.whyLead}</p></div>
        <div className="about-why__grid">{s.why.map((item, index) => <article key={item.title}><span>0{index + 1}</span><div className="feature__icon"><Icon name={item.icon} /></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
      </div></section>

      <section className="section about-principles"><div className="container about-principles__layout"><div className="about-principles__head"><span>02 / VALUES</span><h2>{s.principlesHead}</h2><p>{s.principlesLead}</p></div>
        <div className="about-principles__list">{s.principles.map((item, index) => <article key={item.title}><span>0{index + 1}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><div className="feature__icon"><Icon name={item.icon} /></div></article>)}</div>
      </div></section>

      <section className="section section--white about-facts"><div className="container"><div className="section__head"><span className="about-kicker">03 / FACTS</span><h2>{s.factsHead}</h2><p>{s.factsLead}</p></div>
        <div className="about-facts__grid">{s.facts.map((row, index) => <article key={row.label}><span>0{index + 1}</span><small>{row.label}</small><strong>{row.value}</strong></article>)}</div>
      </div></section>

      <section className="about-identity"><div className="container about-identity__grid"><div><span>04 / IDENTITY</span><h2>{s.sameHead}</h2></div><p>{s.sameText}</p></div></section>

      <section className="section section--white about-explore"><div className="container"><div className="section__head"><span className="about-kicker">05 / EXPLORE</span><h2>{s.linksHead}</h2></div>
        <div className="about-explore__grid">{s.links.map((link, index) => <Link key={link.path} to={lp(link.path)}><span>0{index + 1}</span><strong>{link.label}</strong><i>↗</i></Link>)}</div>
      </div></section>
      <Cta title={s.ctaTitle} text={s.ctaText} />
    </main>
  );
}
