import { useCallback, useEffect, useState } from 'react'
import { Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import LandingPage from './components/LandingPage'
import MapView from './components/MapView'
import BookingsList from './components/BookingsList'
import HostDashboard from './components/HostDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/map" element={<MapView />} />
      <Route path="/bookings" element={<BookingsList />} />
      <Route
        path="/host/dashboard"
        element={
          <ProtectedRoute requiredRole="host">
            <HostDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/map" replace />} />
    </Routes>
  )
}

function AppBootstrap({ onReady }: { onReady: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let isMounted = true

    async function bootstrapSession() {
      try {
        const searchParams = new URLSearchParams(window.location.search)
        const authCode = searchParams.get('code')

        if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode)
          if (!error && isMounted) {
            navigate('/map', { replace: true })
          }
        } else {
          const hash = window.location.hash
          const tokenFragmentIndex = hash.indexOf('#access_token=')

          if (tokenFragmentIndex !== -1) {
            const tokenFragment = hash.slice(tokenFragmentIndex + 1)
            const tokenParams = new URLSearchParams(tokenFragment)
            const accessToken = tokenParams.get('access_token')
            const refreshToken = tokenParams.get('refresh_token')

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })

              if (!error && isMounted) {
                navigate('/map', { replace: true })
              }
            }
          }
        }

        const { data } = await supabase.auth.getSession()
        const hasSession = !!data.session?.user

        if (hasSession && location.pathname === '/') {
          navigate('/map', { replace: true })
        }
      } catch (error) {
        console.error('App bootstrap failed:', error)
      } finally {
        if (isMounted) {
          onReady()
        }
      }
    }

    void bootstrapSession()

    const fallbackTimer = window.setTimeout(() => {
      if (isMounted) {
        onReady()
      }
    }, 4000)

    return () => {
      isMounted = false
      window.clearTimeout(fallbackTimer)
    }
  }, [location.pathname, navigate, onReady])

  return null
}

function App() {
  const [ready, setReady] = useState(false)
  const handleReady = useCallback(() => {
    setReady(true)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBootstrap onReady={handleReady} />
      {!ready ? (
        <div
          style={{
            flex: 1,
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-dark)',
            color: 'var(--color-text-secondary)',
            fontWeight: 600,
          }}
        >
          Chargement…
        </div>
      ) : (
        <AppRoutes />
      )}
    </div>
  )
}

export default App
