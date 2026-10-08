import React from 'react';
import { TriangleAlert } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="page page--center">
        <div className="card stack center" style={{ alignItems: 'center', padding: 'var(--s-4)' }}>
          <TriangleAlert size={40} color="var(--warning)" aria-hidden="true" />
          <h1 className="text-lg bold">Something went wrong</h1>
          <p className="muted text-sm">The app hit an unexpected error. Reloading usually fixes it.</p>
          {import.meta.env.DEV && (
            <pre className="text-xs muted" style={{ whiteSpace: 'pre-wrap', textAlign: 'left', maxWidth: '100%', overflow: 'auto' }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
          <button className="btn btn--primary btn--block" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
