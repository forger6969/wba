import { useMemo } from 'react';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { breadcrumb, faqPage, useCeo } from '../lib/ceo.js';
import { useLang, useT } from '../i18n/index.js';

export default function Features() {
  const t = useT();
  const lang = useLang();
  const f = t.features;
  const fresh = lang === 'uz' ? [
    ['Finance Manager', "Kassa, xarajatlar, maosh va qarzdorlik uchun alohida moliyaviy kabinet."],
    ['Video → test → uy vazifasi', "Darsning barcha bosqichlari bitta avtomatik o'quv zanjirida."],
    ['AI tekshiruvi', "Javoblarni dastlabki tekshirish va mentorga tayyor tavsiyalar."],
    ['Telegram ota-onalar guruhi', "Davomat, qarzdorlik va natijalar haqida avtomatik xabarlar."],
    ["O'quvchilar dinamikasi", "Kelgan va ketgan o'quvchilar statistikasi sabablar va davrlar bo'yicha."],
  ] : lang === 'en' ? [
    ['Finance Manager', 'A dedicated workspace for cash flow, expenses, payroll and debt.'],
    ['Video → test → homework', 'Every lesson stage connected in one automatic learning flow.'],
    ['AI review', 'Preliminary answer review and ready-to-use hints for mentors.'],
    ['Telegram parent group', 'Automatic attendance, debt and progress updates for parents.'],
    ['Student dynamics', 'Joined and left student analytics by period and reason.'],
  ] : [
    ['Finance Manager', 'Отдельный кабинет для кассы, расходов, зарплат и задолженности.'],
    ['Видео → тест → домашнее задание', 'Все этапы урока связаны в единую автоматическую цепочку обучения.'],
    ['AI-проверка', 'Предварительная проверка ответов и готовые подсказки для наставника.'],
    ['Telegram-группа родителей', 'Автоматические уведомления о посещаемости, долгах и результатах.'],
    ['Динамика учеников', 'Статистика пришедших и ушедших учеников по периодам и причинам.'],
  ];

  const jsonLd = useMemo(
    () => [
      breadcrumb(
        [
          { name: t.ceo.breadcrumbHome, path: '/landing' },
          { name: f.badge, path: '/landing/features' },
        ],
        lang,
      ),
      faqPage(f.faq),
    ],
    [t.ceo.breadcrumbHome, f.badge, f.faq, lang],
  );

  useCeo({
    title: t.ceo.features.title,
    description: t.ceo.features.description,
    path: '/landing/features',
    jsonLd,
  });

  return (
    <main className="product-page product-page--features">
      <section className="page-hero">
        <div className="container">
          <span className="badge badge--lime">{f.badge}</span>
          <h1>{f.h1}</h1>
          <p>{f.lead}</p>
          <div className="product-hero__panel"><span>PRODUCT MAP</span><strong>12+</strong><small>{lang === 'uz' ? 'bitta tizimdagi modullar' : lang === 'en' ? 'modules in one system' : 'модулей в одной системе'}</small></div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <div className="cards-3 modules-index">
            {f.modules.map((m, index) => (
              <article className="feature" key={m.title}>
                <span className="module-index__number">{String(index + 1).padStart(2, '0')}</span>
                <div className="feature__icon">
                  <Icon name={m.icon} />
                </div>
                <h3>{m.title}</h3>
                <p>{m.text}</p>
                <div className="tag-row" style={{ marginTop: 14 }}>
                  {m.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section product-new">
        <div className="container product-new__layout">
          <div className="product-new__intro">
            <span className="badge badge--lime">NEW / 2026</span>
            <h2>{lang === 'uz' ? 'Yangi imkoniyatlar' : lang === 'en' ? 'New capabilities' : 'Новые возможности'}</h2>
          </div>
          <div className="product-new__list">
            {fresh.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2>{f.flowHead}</h2>
            <p>{f.flowLead}</p>
          </div>
          <div className="steps">
            {f.flow.map((s) => (
              <article className="step" key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <div className="section__head">
            <h2>{f.faqHead}</h2>
          </div>
          <div className="faq">
            {f.faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Cta title={f.ctaTitle} text={f.ctaText} />
    </main>
  );
}
