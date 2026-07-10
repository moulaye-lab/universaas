/**
 * useAISettings.js - Hook pour accéder aux paramètres IA de l'université
 *
 * Utilisation:
 * const { aiEnabled, assistantName, personality, features } = useAISettings();
 */

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useAISettings() {
  const { userProfile } = useAuth();
  const [aiSettings, setAISettings] = useState({
    aiEnabled: true,
    aiAssistantName: 'Assistant Académique',
    aiPersonality: 'professional',
    aiLanguage: 'fr',
    aiFeatures: {
      studentSupport: true,
      teacherSupport: true,
      adminSupport: true,
      parentSupport: true,
      paymentReminders: true,
      gradeNotifications: true,
      scheduleAssistance: true,
      dataAnalytics: true
    },
    aiResponseStyle: 'balanced',
    aiContextAwareness: 'full'
  });

  useEffect(() => {
    if (!userProfile?.universityId) return;

    // Écouter les changements des paramètres IA en temps réel
    const univRef = ref(database, `universities/${userProfile.universityId}`);
    const unsubscribe = onValue(univRef, (snapshot) => {
      if (snapshot.exists()) {
        const univData = snapshot.val();

        setAISettings({
          aiEnabled: univData.aiEnabled !== undefined ? univData.aiEnabled : true,
          aiAssistantName: univData.aiAssistantName || 'Assistant Académique',
          aiPersonality: univData.aiPersonality || 'professional',
          aiLanguage: univData.aiLanguage || 'fr',
          aiFeatures: univData.aiFeatures || {
            studentSupport: true,
            teacherSupport: true,
            adminSupport: true,
            parentSupport: true,
            paymentReminders: true,
            gradeNotifications: true,
            scheduleAssistance: true,
            dataAnalytics: true
          },
          aiResponseStyle: univData.aiResponseStyle || 'balanced',
          aiContextAwareness: univData.aiContextAwareness || 'full'
        });
      }
    });

    return () => unsubscribe();
  }, [userProfile?.universityId]);

  /**
   * Vérifie si une fonctionnalité IA est activée
   * @param {string} feature - Clé de la fonctionnalité
   * @returns {boolean}
   */
  const isFeatureEnabled = (feature) => {
    return aiSettings.aiEnabled && aiSettings.aiFeatures[feature];
  };

  /**
   * Vérifie si l'IA est activée pour un rôle spécifique
   * @param {string} role - student, teacher, admin, parent
   * @returns {boolean}
   */
  const isEnabledForRole = (role) => {
    if (!aiSettings.aiEnabled) return false;

    const roleFeatureMap = {
      'student': 'studentSupport',
      'teacher': 'teacherSupport',
      'admin_universite': 'adminSupport',
      'parent': 'parentSupport'
    };

    const feature = roleFeatureMap[role];
    return feature ? aiSettings.aiFeatures[feature] : false;
  };

  /**
   * Retourne le prompt système pour l'IA selon la configuration
   * @param {string} userRole - Rôle de l'utilisateur actuel
   * @returns {string}
   */
  const getSystemPrompt = (userRole) => {
    if (!aiSettings.aiEnabled) return '';

    const personalityPrompts = {
      professional: "Tu es un assistant professionnel et formel. Tu fournis des informations precises et factuelles.",
      friendly: "Tu es un assistant chaleureux et encourageant. Tu es accessible et bienveillant dans tes interactions.",
      concise: "Tu es un assistant direct et efficace. Tu vas droit au but avec des reponses courtes."
    };

    const stylePrompts = {
      detailed: "Fournis des explications completes et detaillees.",
      balanced: "Trouve un equilibre entre details et concision.",
      brief: "Sois bref et va a l'essentiel."
    };

    const roleContext = {
      student: "Tu aides un etudiant avec ses cours, notes, emploi du temps et paiements.",
      teacher: "Tu assistes un enseignant dans la gestion de ses cours, notes et emploi du temps.",
      admin_universite: "Tu aides un administrateur dans la gestion de l'universite.",
      parent: "Tu aides un parent a suivre la scolarite de son enfant."
    };

    return `Tu es ${aiSettings.aiAssistantName}, l'assistant virtuel de l'universite.
${personalityPrompts[aiSettings.aiPersonality]}
${stylePrompts[aiSettings.aiResponseStyle]}
${roleContext[userRole] || ''}
Tu communiques en ${aiSettings.aiLanguage === 'fr' ? 'francais' : aiSettings.aiLanguage === 'en' ? 'anglais' : 'arabe'}.`;
  };

  return {
    // Paramètres bruts
    ...aiSettings,

    // Fonctions utilitaires
    isFeatureEnabled,
    isEnabledForRole,
    getSystemPrompt,

    // Raccourcis
    enabled: aiSettings.aiEnabled,
    assistantName: aiSettings.aiAssistantName,
    personality: aiSettings.aiPersonality,
    language: aiSettings.aiLanguage,
    features: aiSettings.aiFeatures,
    responseStyle: aiSettings.aiResponseStyle,
    contextAwareness: aiSettings.aiContextAwareness
  };
}
