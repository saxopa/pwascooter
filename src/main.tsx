
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import PWAManager from './components/PWAManager'
import { HostProfileProvider } from './contexts/HostProfileContext'
import { HostsProvider } from './contexts/HostsContext'

import React from 'react'

class PWAErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <>
    <PWAErrorBoundary>
      <PWAManager />
    </PWAErrorBoundary>
    <HostProfileProvider>
      <HostsProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </HostsProvider>
    </HostProfileProvider>
  </>,
)
