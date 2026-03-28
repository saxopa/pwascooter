import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import PWAManager from './components/PWAManager'
import { HostProfileProvider } from './contexts/HostProfileContext'
import { HostsProvider } from './contexts/HostsContext'
import { registerSW } from 'virtual:pwa-register'

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
  <StrictMode>
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
  </StrictMode>,
)

if (import.meta.env.PROD) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Affiche une notification de mise à jour à l'utilisateur
      const shouldUpdate = window.confirm(
        '📦 Une nouvelle version de ScootSafe est disponible. Mettre à jour maintenant ?'
      )
      if (shouldUpdate) {
        updateSW(true)
      }
    },
    onOfflineReady() {
      console.log('[ScootSafe] Application prête pour une utilisation hors-ligne.')
    },
    onRegistered(registration) {
      if (registration) {
        // Vérifie les mises à jour toutes les heures
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error('[ScootSafe] Échec enregistrement Service Worker:', error)
    },
    immediate: true,
  })
}
