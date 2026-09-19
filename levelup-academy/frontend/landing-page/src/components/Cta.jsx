import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useLocalizePath, useT } from '../i18n/index.js';

export default function Cta({ title, text }) {
  const t = useT();
  const lp = useLocalizePath();

  return (
    <section className="cta">
      <div className="container">
        <h2>{title ?? t.cta.defaultTitle}</h2>
        <p>{text ?? t.cta.defaultText}</p>
        <Link to={lp('/landing/contacts')} className="btn btn--dark btn--lg">
          {t.cta.button}
        </Link>
        <div className="trial-note trial-note--cta">
          <Icon name="check" size={16} />
          {t.common.trial}
        </div>
      </div>
    </section>
  );
}
