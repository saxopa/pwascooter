import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error)
    console.error('📋 Component stack:', errorInfo.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: 'var(--color-bg-dark, #0F0F1A)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: 'min(100%, 480px)',
              padding: '32px',
              textAlign: 'center',
              background: 'rgba(26, 26, 46, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(108, 92, 231, 0.2)',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #6C5CE7, #00CEC9)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Oups !
            </h1>
            <p
              style={{
                fontSize: '1.1rem',
                color: 'var(--color-text-secondary, #A0A0B8)',
                marginBottom: '24px',
                lineHeight: 1.5,
              }}
            >
              Une erreur inattendue est survenue dans l'application.
            </p>
            <pre
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #6C5CE7',
                color: '#ff6b6b',
                fontSize: '0.85rem',
                marginBottom: '24px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.message || 'Erreur inconnue'}
            </pre>
            <button
              onClick={this.handleReload}
              className="btn-primary"
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #6C5CE7, #4834D4)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
