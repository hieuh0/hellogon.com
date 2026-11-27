import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { MaintenancePage } from './components/MaintenancePage'
import { maintenanceMode } from './config/site'
import { logConsoleEgg } from './lib/console-egg'
import { initAnalytics } from './lib/analytics'

logConsoleEgg()
void initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {maintenanceMode ? <MaintenancePage /> : <App />}
  </StrictMode>,
)
