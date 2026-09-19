import { Link, useLocation } from 'react-router-dom';
import { useCeo } from '../lib/ceo.js';
import { useLocalizePath, useT } from '../i18n/index.js';

export default function NotFound() {
  const { pathname } = useLocation();
  const t = useT();
  const lp = useLocalizePath();

  useCeo({
    title: t.ceo.notFound.title,
    description: t.ceo.notFound.description,
    path: pathname,
    noindex: true,
  });

  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <span className="badge badge--lime">{t.notFound.badge}</span>
          <h1>{t.notFound.h1}</h1>
          <p>{t.notFound.text}</p>
          <Link className="btn btn--accent btn--lg" to={lp('/landing')}>
            {t.notFound.button}
          </Link>
        </div>
      </section>
    </main>
  );
}
