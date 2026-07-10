/**
 * Layout.jsx - Layout global avec header et chatbot IA
 *
 * Enveloppe toutes les pages protégées avec un header commun et un assistant IA
 */

import Header from './Header';
import AIChatBot from './AIChatBot';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {children}
      </main>
      <AIChatBot />
    </div>
  );
}
