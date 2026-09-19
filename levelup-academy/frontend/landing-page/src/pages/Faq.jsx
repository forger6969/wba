import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Cta from '../components/Cta.jsx';
import Icon from '../components/Icon.jsx';
import { breadcrumb, faqPage, useCeo } from '../lib/ceo.js';
import { useLang, useLocalizePath, useT } from '../i18n/index.js';

const extraGroupByLang = {
  en: {
    title: 'Everyday operations',
    items: [
      {
        q: 'Can one organization manage several branches?',
        a: 'Yes. The network owner sees every branch in one organization and the overall picture, while each branch administrator works only with their own students, groups, payments and reports.',
      },
      {
        q: 'Are chats updated in real time?',
        a: 'Yes. Messages between staff and parents appear without refreshing the page. Conversation history remains available after signing in again or switching devices.',
      },
      {
        q: 'Can a parent follow more than one child?',
        a: 'Yes. If several children are linked to the same parent, the parent switches between them inside one account and sees each child’s attendance, grades and outstanding balance separately.',
      },
    ],
  },
  ru: {
    title: 'Ежедневная работа',
    items: [
      {
        q: 'Можно ли вести несколько филиалов в одной организации?',
        a: 'Да. Руководитель сети видит все филиалы одной организации и общую картину, а администратор каждого филиала работает только со своими учениками, группами, оплатами и отчётами.',
      },
      {
        q: 'Сообщения в чатах приходят в реальном времени?',
        a: 'Да. Сообщения между сотрудниками и родителями появляются без перезагрузки страницы. История сохраняется после повторного входа или смены устройства.',
      },
      {
        q: 'Может ли родитель следить за несколькими детьми?',
        a: 'Да. Если к родителю привязано несколько детей, он переключается между ними в одном аккаунте и отдельно видит посещаемость, оценки и долг каждого ребёнка.',
      },
    ],
  },
  uz: {
    title: 'Kundalik ish jarayoni',
    items: [
      {
        q: 'Bitta tashkilotda bir nechta filialni boshqarish mumkinmi?',
        a: "Ha. Tarmoq rahbari tashkilotdagi barcha filiallarni va umumiy ko'rsatkichlarni ko'radi, har bir filial administratori esa faqat o'z o'quvchilari, guruhlari, to'lovlari va hisobotlari bilan ishlaydi.",
      },
      {
        q: 'Chatdagi xabarlar real vaqtda keladimi?',
        a: "Ha. Xodimlar va ota-onalar o'rtasidagi xabarlar sahifani yangilamasdan paydo bo'ladi. Suhbat tarixi qayta kirganda yoki boshqa qurilmada ham ochiladi.",
      },
      {
        q: "Ota-ona bir nechta farzandini kuzata oladimi?",
        a: "Ha. Bitta ota-onaga bir nechta farzand biriktirilgan bo'lsa, u bitta akkaunt ichida ular orasida almashadi va har birining davomati, baholari hamda qarzini alohida ko'radi.",
      },
    ],
  },
};

const newFeaturesByLang = {
  en: {
    title: 'New capabilities',
    items: [
      { q: 'What can a Finance Manager control?', a: 'The Finance Manager sees organization-wide income, expenses, salaries and reports. The role works with real data across the organization without opening student, branch-administration or learning tools.' },
      { q: 'How does the video → test → homework flow work?', a: 'A topic can guide a student through one sequence: watch the video, complete the test, then submit the homework. Progress and rewards are recorded at each step, and replaying a video does not award the same coins twice.' },
      { q: 'Can homework receive an AI review?', a: 'Yes, for supported code submissions when the center enables AI review. The system extracts the submitted file, archive, GitHub link or text and returns a structured review alongside the regular submission.' },
      { q: 'What can be sent to a parents’ Telegram group?', a: 'A branch can link its parents’ group. The system can send final attendance after a lesson, each submitted test result and a daily digest of overdue homework.' },
      { q: 'Can an administrator track students who joined and left?', a: 'Yes. The student record keeps the reason for leaving, and reports show monthly joined-versus-left statistics so churn is visible instead of disappearing from the total.' },
    ],
  },
  ru: {
    title: 'Новые возможности',
    items: [
      { q: 'Что контролирует Finance Manager?', a: 'Финансовый менеджер видит доходы, расходы, зарплаты и отчёты по всей организации. Роль работает с реальными финансовыми данными, но не получает доступ к управлению учениками, филиалами и учебным процессом.' },
      { q: 'Как работает цепочка видео → тест → домашнее задание?', a: 'Тема может последовательно провести ученика через видео, тест и домашнее задание. Прогресс и награды фиксируются на каждом шаге, а повторный просмотр видео не начисляет те же коины второй раз.' },
      { q: 'Можно ли получить AI-проверку домашнего задания?', a: 'Да, для поддерживаемых заданий с кодом, если центр включил AI-проверку. Система извлекает файл, архив, GitHub-ссылку или текст и добавляет структурированный разбор к обычной работе ученика.' },
      { q: 'Что система отправляет в Telegram-группу родителей?', a: 'Филиал может подключить группу родителей. Туда отправляется итоговая посещаемость после занятия, результат каждого теста и ежедневная сводка по просроченным домашним заданиям.' },
      { q: 'Можно ли отслеживать пришедших и ушедших учеников?', a: 'Да. В карточке сохраняется причина ухода, а отчёты показывают помесячную статистику пришедших и ушедших, поэтому отток не растворяется в общей цифре.' },
    ],
  },
  uz: {
    title: 'Yangi imkoniyatlar',
    items: [
      { q: 'Finance Manager nimalarni boshqaradi?', a: "Finance Manager butun tashkilot bo'yicha daromad, xarajat, oylik va hisobotlarni ko'radi. Rol haqiqiy moliyaviy ma'lumotlar bilan ishlaydi, lekin o'quvchilar, filial boshqaruvi va ta'lim vositalariga kirmaydi." },
      { q: 'Video → test → uy vazifasi ketma-ketligi qanday ishlaydi?', a: "Mavzu o'quvchini ketma-ket video, test va uy vazifasidan o'tkazadi. Har bir bosqichdagi progress va mukofot saqlanadi, videoni qayta ko'rish esa bir xil tangani ikkinchi marta bermaydi." },
      { q: "Uy vazifasini AI tekshira oladimi?", a: "Ha, markaz AI-tekshiruvni yoqqan bo'lsa, qo'llab-quvvatlanadigan kodli topshiriqlar tekshiriladi. Tizim fayl, arxiv, GitHub havolasi yoki matnni olib, oddiy topshiriqqa tuzilgan tahlilni qo'shadi." },
      { q: "Ota-onalar Telegram guruhiga nimalar yuboriladi?", a: "Filial ota-onalar guruhini ulashi mumkin. Guruhga darsdan keyingi yakuniy davomat, har bir test natijasi va muddati o'tgan uy vazifalari bo'yicha kundalik hisobot yuboriladi." },
      { q: "Kelgan va ketgan o'quvchilarni kuzatish mumkinmi?", a: "Ha. O'quvchi kartasida ketish sababi saqlanadi, hisobotlarda esa kelgan va ketganlar oyma-oy ko'rsatiladi. Shu sababli o'quvchi oqimi umumiy raqam ichida yo'qolmaydi." },
    ],
  },
};

export default function Faq() {
  const t = useT();
  const lang = useLang();
  const lp = useLocalizePath();
  const s = t.faqHub;
  const groups = useMemo(
    () => [
      ...s.groups,
      extraGroupByLang[lang] || extraGroupByLang.en,
      newFeaturesByLang[lang] || newFeaturesByLang.en,
    ],
    [s.groups, lang],
  );
  const items = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  const jsonLd = useMemo(
    () => [
      breadcrumb(
        [
          { name: t.ceo.breadcrumbHome, path: '/landing' },
          { name: s.badge, path: '/landing/faq' },
        ],
        lang,
      ),
      faqPage(items),
    ],
    [t.ceo.breadcrumbHome, s.badge, items, lang],
  );

  useCeo({
    title: t.ceo.faqHub.title,
    description: t.ceo.faqHub.description,
    path: '/landing/faq',
    jsonLd,
  });

  return (
    <main className="faq-page">
      <section className="faq-hero">
        <div className="faq-hero__orb" aria-hidden="true" />
        <div className="container faq-hero__layout">
          <div className="faq-hero__copy">
            <span className="badge badge--lime">{s.badge}</span>
            <h1>{s.h1}</h1>
            <p>{s.lead}</p>
          </div>
          <aside className="faq-hero__summary">
            <div><strong>{items.length}</strong><span>{s.badge}</span></div>
            <div><strong>{groups.length}</strong><span>{groups.map((group) => group.title).join(' / ')}</span></div>
          </aside>
        </div>
        <nav className="container faq-hero__topics" aria-label={s.badge}>
          {groups.map((group, index) => (
            <a href={`#faq-group-${index + 1}`} key={group.title}>
              <span>0{index + 1}</span>{group.title}
            </a>
          ))}
        </nav>
      </section>

      <section className="faq-intro">
        <div className="container"><Icon name="message" size={24} /><p>{s.intro}</p></div>
      </section>

      {groups.map((group, gi) => (
        <section className="faq-group" id={`faq-group-${gi + 1}`} key={group.title}>
          <div className="container faq-group__layout">
            <div className="faq-group__heading">
              <span>0{gi + 1}</span>
              <h2>{group.title}</h2>
              <p>{String(group.items.length).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</p>
            </div>
            <div className="faq-list">
              {group.items.map((item, fi) => (
                <details key={item.q}>
                  <summary>
                    <span>{String(fi + 1).padStart(2, '0')}</span>
                    <strong>{item.q}</strong>
                    <i aria-hidden="true" />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="section faq-more">
        <div className="container">
          <div className="section__head"><h2>{s.moreHead}</h2></div>
          <div className="faq-more__grid">
            {s.more.map((link) => (
              <article key={link.path}>
                <Icon name="book" size={20} />
                <Link to={lp(link.path)}>{link.label}</Link>
                <span aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Cta title={s.ctaTitle} text={s.ctaText} />
    </main>
  );
}
