import '@fontsource/alexandria/300.css'
import '@fontsource/alexandria/400.css'
import '@fontsource/alexandria/600.css'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { initInstallPrompt } from './lib/install'

// تسجيل Service Worker للتطبيق (PWA + التنبيهات). بيتحدث لحاله لما تطلع نسخة جديدة.
registerSW({ immediate: true })

// زر "ثبّتي التطبيق": لازم نمسك حدث Chrome قبل ما React يبلّش
initInstallPrompt()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
