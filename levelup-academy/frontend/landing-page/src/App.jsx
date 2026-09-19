import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Features from './pages/Features.jsx';
import Roles from './pages/Roles.jsx';
import Finance from './pages/Finance.jsx';
import Pricing from './pages/Pricing.jsx';
import ForLanguageSchool from './pages/ForLanguageSchool.jsx';
import ForCourses from './pages/ForCourses.jsx';
import CrmVsExcel from './pages/CrmVsExcel.jsx';
import VsCompetitor from './pages/VsCompetitor.jsx';
import Blog from './pages/Blog.jsx';
import BlogArticle from './pages/BlogArticle.jsx';
import Gamification from './pages/Gamification.jsx';
import Faq from './pages/Faq.jsx';
import About from './pages/About.jsx';
import Founder from './pages/Founder.jsx';
import Team from './pages/Team.jsx';
import Abdulloh from './pages/Abdulloh.jsx';
import Contacts from './pages/Contacts.jsx';
import NotFound from './pages/NotFound.jsx';
import { trackPageView, trackPageExit } from './lib/analytics.js';
import { PREFIXED_LANGS, useT } from './i18n/index.js';

/**
 * Канонические пути лендинга. Русская версия живёт на них как есть, остальные языки —
 * под своим префиксом (`/uz`, `/en` — см. PREFIXED_LANGS в src/i18n/index.js). Один
 * список на все языки: разойтись они не могут.
 * Держать в синхроне с ROUTES в scripts/prerender.js и с public/sitemap.xml.
 */
export const PAGES = [
  { path: '/landing', element: <Home /> },
  { path: '/landing/features', element: <Features /> },
  { path: '/landing/roles', element: <Roles /> },
  { path: '/landing/finance', element: <Finance /> },
  { path: '/landing/pricing', element: <Pricing /> },
  { path: '/landing/for-language-school', element: <ForLanguageSchool /> },
  { path: '/landing/for-courses', element: <ForCourses /> },
  { path: '/landing/crm-vs-excel', element: <CrmVsExcel /> },
  { path: '/landing/vs/modme', element: <VsCompetitor dictKey="vsModme" path="/landing/vs/modme" /> },
  { path: '/landing/vs/umai', element: <VsCompetitor dictKey="vsUmai" path="/landing/vs/umai" /> },
  { path: '/landing/blog', element: <Blog /> },
  { path: '/landing/blog/:slug', element: <BlogArticle /> },
  { path: '/landing/gamification', element: <Gamification /> },
  { path: '/landing/faq', element: <Faq /> },
  { path: '/landing/about', element: <About /> },
  { path: '/landing/team', element: <Team /> },
  { path: '/landing/team/azizbek-amangeldiev', element: <Founder /> },
  { path: '/landing/team/yunusov-abdulloh', element: <Abdulloh /> },
  { path: '/landing/contacts', element: <Contacts /> },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    // Fire after the route's useCeo effect has set document.title (child effects
    // run before this parent effect, but title is set in the page effect which
    // runs first for the new route only after paint on some paths — defer to be safe).
    const id = setTimeout(() => trackPageView(pathname), 0);
    return () => clearTimeout(id);
  }, [pathname]);
  return null;
}

/**
 * Records which page the visitor left the site from (Karis 25.08.2026).
 *
 * Deliberately NOT fired on in-app route changes: moving from one page to the
 * next is not leaving the site, and counting it would make every page look
 * like an exit.
 *
 * Two listeners, because neither alone is enough: 'pagehide' misses iOS Safari
 * being backgrounded, and visibilitychange never fires on a plain desktop tab
 * close. The `sent` guard keeps that overlap from double-counting; it resets
 * on navigation so the next page can report its own exit.
 */
function ExitTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    let sent = false;
    const report = () => {
      if (sent) return;
      sent = true;
      trackPageExit(pathname);
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') report(); };

    window.addEventListener('pagehide', report);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', report);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname]);
  return null;
}

export default function App() {
  const t = useT();
  return (
    <>
      <ScrollToTop />
      <ExitTracker />
      <a href="#main-content" className="skip-link">
        {t.nav.skipToContent}
      </a>
      <Header />
      {/* Skip-link focus target. A <div>, not <main>: each page renders its own
          <main> landmark, and nesting <main> would be invalid. */}
      <div id="main-content" tabIndex={-1}>
      <Routes>
        {/* В проде корень редиректит Vercel (308). Здесь — для dev-сервера и для
            прямого перехода внутри SPA. */}
        <Route path="/" element={<Navigate to="/landing" replace />} />
        {PREFIXED_LANGS.map((lang) => (
          <Route key={lang} path={`/${lang}`} element={<Navigate to={`/${lang}/landing`} replace />} />
        ))}

        {PAGES.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
        {PREFIXED_LANGS.flatMap((lang) =>
          PAGES.map(({ path, element }) => (
            <Route key={`${lang}${path}`} path={`/${lang}${path}`} element={element} />
          )),
        )}
        {/* Битый URL — это 404, а не повод молча увести на главную: редирект
            делал из любого несуществующего адреса «живую» страницу (soft-404). */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </div>
      <Footer />
    </>
  );
}
