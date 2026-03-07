// Leaflet CSS must be imported FIRST before any component that uses Leaflet
import 'leaflet/dist/leaflet.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
