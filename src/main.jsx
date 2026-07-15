import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { disableConsoleProd } from './utils/secureLogger'

// Désactiver console.log en production pour la sécurité
disableConsoleProd();

// 📱 PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('✅ PWA: Service Worker enregistré', registration.scope);

        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 PWA: Nouvelle version disponible');
              // Optionnel: Notification utilisateur pour rafraîchir
              if (confirm('Nouvelle version disponible. Recharger maintenant?')) {
                newWorker.postMessage('skipWaiting');
                window.location.reload();
              }
            }
          });
        });
      })
      .catch(err => console.error('❌ PWA: Erreur Service Worker', err));
  });

  // Rafraîchir quand le nouveau SW prend le contrôle
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
