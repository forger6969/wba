import { Component } from 'react';
import i18n from '../i18n.js';

// После каждого деплоя старые вкладки ссылаются на JS-чанки с прежним
// content-hash'ем, которых уже нет — Vercel отдаёт на них index.html (200,
// а не 404), и Vite падает с "Failed to fetch dynamically imported module".
// Чинится одним reload (новый index.html → новые хэши), поэтому здесь это
// делается автоматически один раз за вкладку, не заставляя жать кнопку.
const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;
const RELOAD_FLAG = 'levelup-chunk-reload-attempted';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    if (CHUNK_ERROR_RE.test(error?.message || '') && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="card bg-base-100 max-w-md w-full">
            <div className="card-body text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="card-title justify-center text-lg">{i18n.t('components.errorBoundary.title')}</h2>
              <p className="text-sm text-base-content/60 mt-1">
                {this.state.error?.message || i18n.t('components.errorBoundary.unexpectedError')}
              </p>
              <div className="card-actions justify-center mt-4">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    window.location.reload();
                  }}
                >
                  {i18n.t('components.errorBoundary.reload')}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
