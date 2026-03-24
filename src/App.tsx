import { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import LandingPage from './components/LandingPage'
import MapView from './components/MapView'
import BookingsList from './components/BookingsList'
import HostDashboard from './components/HostDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function OAuthRecovery() {
  const navigate = useNavigate()

  useEffect(() => {
    async function recoverOAuthSession() {
      const searchParams = new URLSearchParams(window.location.search)
      const authCode = searchParams.get('code')

      if (authCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode)
        if (!error) {
          navigate('/map', { replace: true })
        }
        return
      }

      const hash = window.location.hash
      const tokenFragmentIndex = hash.indexOf('#access_token=')
      if (tokenFragmentIndex === -1) return

      const tokenFragment = hash.slice(tokenFragmentIndex + 1)
      const tokenParams = new URLSearchParams(tokenFragment)
      const accessToken = tokenParams.get('access_token')
      const refreshToken = tokenParams.get('refresh_token')

      if (!accessToken || !refreshToken) return

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (!error) {
        navigate('/map', { replace: true })
      }
    }

    void recoverOAuthSession()
  }, [navigate])

  return null
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <OAuthRecovery />
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
      </Routes>
    </div>
  )
}

export default App
