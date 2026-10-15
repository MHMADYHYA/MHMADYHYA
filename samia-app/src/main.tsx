import '@fontsource/alexandria/300.css'
import '@fontsource/alexandria/400.css'
import '@fontsource/alexandria/600.css'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
