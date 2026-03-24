import { Routes, Route } from 'react-router-dom'
import MapView from './components/MapView'
import BookingsList from './components/BookingsList'
import HostDashboard from './components/HostDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Routes>
        <Route path="/" element={<MapView />} />
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
