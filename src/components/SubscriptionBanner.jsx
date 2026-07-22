/**
 * SubscriptionBanner.jsx - Banner pour rappeler le statut d'abonnement
 *
 * Affiche un banner en haut du dashboard admin avec:
 * - Jours restants en trial
 * - Bouton CTA pour souscrire
 * - Niveau d'urgence visuel (couleurs)
 */

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import {
  getSubscriptionAlertMessage,
  getAlertColors
} from '../hooks/useSubscription';

export default function SubscriptionBanner({ subscription }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!subscription || !subscription.showAlert || dismissed) {
    return null;
  }

  const alert = getSubscriptionAlertMessage(subscription);
  const colors = getAlertColors(subscription.alertLevel);

  if (!alert) return null;

  const handleSubscribe = () => {
    navigate('/admin/subscription');
  };

  // Ne pas permettre de fermer si bloqué
  const canDismiss = !subscription.isBlocked;

  return (
    <div className={`${colors.bg} ${colors.border} border-b-2 relative`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Icon */}
            <div className={`${colors.text} flex-shrink-0`}>
              {subscription.isBlocked ? (
                <AlertTriangle className="h-6 w-6" />
              ) : subscription.daysRemaining <= 1 ? (
                <Clock className="h-6 w-6" />
              ) : (
                <Sparkles className="h-6 w-6" />
              )}
            </div>

            {/* Message */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-bold text-lg ${colors.text}`}>
                  {alert.title}
                </h3>
                {subscription.isTrialing && !subscription.isBlocked && subscription.trialDays && (
                  <span className={`px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold ${colors.text}`}>
                    Jour {subscription.trialDays - subscription.daysRemaining + 1}/{subscription.trialDays}
                  </span>
                )}
              </div>
              <p className={`text-sm ${colors.text}`}>
                {alert.message}
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleSubscribe}
              className={`${colors.button} px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 flex-shrink-0`}
            >
              {alert.cta}
              <Sparkles className="h-4 w-4" />
            </button>
          </div>

          {/* Close button (seulement si pas bloqué) */}
          {canDismiss && (
            <button
              onClick={() => setDismissed(true)}
              className={`${colors.text} hover:opacity-70 transition-opacity flex-shrink-0`}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
