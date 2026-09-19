import { Component } from 'react';
import Icon from './Icons.jsx';
import { getDict } from '../i18n/index.jsx';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const t = getDict();
      return (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="card bg-base-100 max-w-md w-full">
            <div className="card-body text-center">
              <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-4">
                <Icon name="exclamation-circle" className="w-8 h-8 text-error" />
              </div>
              <h2 className="card-title justify-center text-lg">{t.common.wentWrong}</h2>
              <p className="text-sm text-base-content/60 mt-1">
                {this.state.error?.message || t.common.errorMsg}
              </p>
              <div className="card-actions justify-center mt-4">
                <button
                  className="btn btn-primary rounded-xl gap-2"
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    window.location.reload();
                  }}
                >
                  <Icon name="arrow-trending-up" className="w-4 h-4" />
                  {t.common.reload}
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
