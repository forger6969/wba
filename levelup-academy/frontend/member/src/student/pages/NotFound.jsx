import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ErrorScene from '../components/ErrorScene.jsx';
import { useI18n } from '../../i18n/index.jsx';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <ErrorScene
      variant="404"
      title={t.notFound.title}
      text={t.notFound.text}
      action={
        <Link to="/student" className="err-cta">
          <ArrowLeft size={16} strokeWidth={2.5} />
          {t.notFound.action}
        </Link>
      }
    />
  );
}
