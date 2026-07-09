/**
 * useCurrency.js - Hook pour accéder à la devise de l'université
 *
 * Utilisation:
 * const { currency, symbol, formatAmount } = useCurrency();
 * formatAmount(1500) => "1 500 €" ou "1,500 $" selon la devise
 */

import { useState, useEffect } from 'react';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const CURRENCIES = {
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  USD: { code: 'USD', symbol: '$', name: 'Dollar américain' },
  GBP: { code: 'GBP', symbol: '£', name: 'Livre sterling' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Franc suisse' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Dollar canadien' },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'Franc CFA (BCEAO)' },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (BEAC)' },
  MAD: { code: 'MAD', symbol: 'DH', name: 'Dirham marocain' },
  TND: { code: 'TND', symbol: 'DT', name: 'Dinar tunisien' },
  DZD: { code: 'DZD', symbol: 'DA', name: 'Dinar algérien' }
};

export function useCurrency() {
  const { userProfile } = useAuth();
  const [currency, setCurrency] = useState('EUR');
  const [symbol, setSymbol] = useState('€');

  useEffect(() => {
    if (!userProfile?.universityId) return;

    // Écouter les changements de devise en temps réel
    const univRef = ref(database, `universities/${userProfile.universityId}`);
    const unsubscribe = onValue(univRef, (snapshot) => {
      if (snapshot.exists()) {
        const univData = snapshot.val();
        const currencyCode = univData.currency || 'EUR';
        const currencyData = CURRENCIES[currencyCode] || CURRENCIES.EUR;

        setCurrency(currencyCode);
        setSymbol(currencyData.symbol);
      }
    });

    return () => unsubscribe();
  }, [userProfile?.universityId]);

  /**
   * Formate un montant avec la devise actuelle
   * @param {number} amount - Le montant à formater
   * @param {boolean} showSymbol - Afficher le symbole ou non (défaut: true)
   * @returns {string} - Le montant formaté
   */
  const formatAmount = (amount, showSymbol = true) => {
    if (typeof amount !== 'number' || isNaN(amount)) return showSymbol ? `0 ${symbol}` : '0';

    // Formater avec espaces comme séparateur de milliers
    const formatted = amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

    return showSymbol ? `${formatted} ${symbol}` : formatted;
  };

  return {
    currency,
    symbol,
    formatAmount,
    currencyInfo: CURRENCIES[currency] || CURRENCIES.EUR
  };
}
