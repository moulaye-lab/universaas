/**
 * Layout.jsx - Layout global avec header et chatbot IA
 *
 * Enveloppe toutes les pages protégées avec un header commun et un assistant IA
 */

import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import Header from './Header';
import AIChatBot from './AIChatBot';
import SubscriptionBanner from './SubscriptionBanner';

export default function Layout({ children }) {
  const { userProfile } = useAuth();
  const { subscription, loading: subLoading } = useSubscription(userProfile?.universityId);

  // Afficher le banner uniquement pour les admins
  const showSubscriptionBanner = userProfile?.role === 'admin_universite' && subscription;

  // Debug: subscription banner
  // console.log('🎨 Layout: Banner subscription', {
  //   userRole: userProfile?.role,
  //   subscription: subscription ? 'exists' : 'null',
  //   showBanner: showSubscriptionBanner,
  //   subLoading
  // });

  return (
    <div className="min-h-screen">
      <Header />
      {showSubscriptionBanner && <SubscriptionBanner subscription={subscription} />}
      <main>
        {children}
      </main>
      <AIChatBot />
    </div>
  );
}
