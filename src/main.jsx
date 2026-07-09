import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { disableConsoleProd } from './utils/secureLogger'

// Désactiver // console.log en production pour la sécurité
disableConsoleProd();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
