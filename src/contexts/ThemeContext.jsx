/**
 * ThemeContext.jsx - Gestion du thème clair/sombre
 *
 * Fonctionnalités:
 * - Toggle dark/light mode
 * - Persistence dans localStorage
 * - Application automatique des classes Tailwind
 * - Détection préférence système
 */

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Charger le thème au démarrage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
      // Utiliser le thème sauvegardé
      setIsDarkMode(savedTheme === 'dark');
    } else {
      // Détecter la préférence système
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }

    setIsLoading(false);
  }, []);

  // Appliquer le thème au DOM
  useEffect(() => {
    if (isLoading) return;

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode, isLoading]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const setTheme = (theme) => {
    setIsDarkMode(theme === 'dark');
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
