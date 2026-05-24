import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, errorInfo: info });
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--card-bg, #1a1a2e)',
          padding: '2rem',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '1.75rem',
            }}
          >
            ⚠️
          </div>

          <h1
            style={{
              margin: '0 0 0.5rem',
              fontSize: '1.4rem',
              fontWeight: '700',
              color: 'var(--text-main, #f1f5f9)',
              letterSpacing: '-0.01em',
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              margin: '0 0 1.5rem',
              fontSize: '0.9rem',
              color: 'rgba(241, 245, 249, 0.55)',
              lineHeight: '1.6',
            }}
          >
            An unexpected error occurred. The details are shown below.
          </p>

          {this.state.error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.75rem',
                textAlign: 'left',
                overflowX: 'auto',
              }}
            >
              <p
                style={{
                  margin: '0 0 0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'rgba(239, 68, 68, 0.9)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Error
              </p>
              <code
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-main, #f1f5f9)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </code>
            </div>
          )}

          <button
            onClick={this.handleReload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.7rem 1.75rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease, transform 0.15s ease',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.88';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
