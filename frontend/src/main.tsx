import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './host/style.css'
import './host/redesign.css'
import './host/atlas-theme.css'
import './host/notifications.css'
import { I18nProvider } from './i18n'

createRoot(document.getElementById('root')!).render(<React.StrictMode><I18nProvider><HashRouter><App/></HashRouter></I18nProvider></React.StrictMode>)
