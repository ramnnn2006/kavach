import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.jsx'

// Apply saved display preferences before first paint
function readPref(key) {
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
}
document.documentElement.classList.toggle('dark', readPref('kavach_dark'));
document.documentElement.classList.toggle('large-text', readPref('kavach_largetext'));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
