/**
 * OnboardingTour.jsx - Tour guidé première connexion
 *
 * Utilise react-joyride pour guider l'utilisateur lors de sa première connexion.
 * Le tour est personnalisé par rôle (student, teacher, admin, parent).
 * La validation est stockée dans LocalStorage pour ne s'afficher qu'une fois.
 */

import { useState, useEffect } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useAuth } from '../contexts/AuthContext';

export default function OnboardingTour() {
  const { userProfile } = useAuth();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);

  // Vérifier si l'utilisateur a déjà vu le tour
  useEffect(() => {
    if (!userProfile?.uid || !userProfile?.role) return;

    const tourKey = `onboarding_tour_completed_${userProfile.uid}`;
    const tourCompleted = localStorage.getItem(tourKey);

    if (!tourCompleted) {
      // Définir les étapes selon le rôle
      const roleSteps = getStepsByRole(userProfile.role);
      setSteps(roleSteps);

      // Démarrer le tour après un court délai (pour laisser la page se charger)
      setTimeout(() => setRun(true), 1000);
    }
  }, [userProfile]);

  // Callback quand le tour se termine
  const handleJoyrideCallback = (data) => {
    const { status, type, action } = data;

    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status) || action === ACTIONS.CLOSE) {
      // Marquer le tour comme complété
      const tourKey = `onboarding_tour_completed_${userProfile.uid}`;
      localStorage.setItem(tourKey, 'true');
      setRun(false);
    }
  };

  // Définir les étapes selon le rôle
  const getStepsByRole = (role) => {
    const commonSteps = [
      {
        target: 'body',
        content: (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-purple-600 mb-3">
              👋 Bienvenue sur UniversaSaaS !
            </h2>
            <p className="text-gray-700">
              Laissez-nous vous guider à travers les fonctionnalités principales de la plateforme.
            </p>
          </div>
        ),
        placement: 'center',
        disableBeacon: true,
      },
    ];

    const roleSpecificSteps = {
      student: [
        {
          target: '[data-tour="grades-section"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">📊 Vos Notes</h3>
              <p>Consultez vos notes en temps réel et suivez vos moyennes par matière.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="courses-section"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">📚 Vos Cours</h3>
              <p>Accédez à votre emploi du temps et aux ressources pédagogiques.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="payments-section"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">💳 Paiements</h3>
              <p>Suivez vos échéances de paiement et consultez votre historique.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="ai-chatbot"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">🤖 Assistant IA</h3>
              <p>Posez vos questions à notre assistant intelligent disponible 24/7!</p>
            </div>
          ),
          placement: 'left',
        },
      ],
      teacher: [
        {
          target: '[data-tour="grades-input"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">📝 Saisie des Notes</h3>
              <p>Enregistrez les notes de vos étudiants rapidement et facilement.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="students-list"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">👥 Vos Étudiants</h3>
              <p>Consultez la liste de vos étudiants et leurs moyennes.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="schedule"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">📅 Emploi du Temps</h3>
              <p>Visualisez votre planning de cours de la semaine.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="ai-chatbot"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">🤖 Assistant IA</h3>
              <p>L'assistant peut vous aider avec la gestion de vos cours!</p>
            </div>
          ),
          placement: 'left',
        },
      ],
      admin_universite: [
        {
          target: '[data-tour="stats-dashboard"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">📊 Tableau de Bord</h3>
              <p>Consultez les statistiques globales de votre établissement.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="students-management"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">🎓 Gestion Étudiants</h3>
              <p>Créez, modifiez et gérez vos étudiants. Import CSV disponible!</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="teachers-management"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">👨‍🏫 Gestion Enseignants</h3>
              <p>Administrez votre équipe pédagogique et leurs affectations.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="accounting"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">💰 Comptabilité</h3>
              <p>Suivez les revenus, dépenses et la trésorerie de l'établissement.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="ai-chatbot"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">🤖 Assistant IA</h3>
              <p>L'assistant peut générer des rapports et répondre à vos questions administratives!</p>
            </div>
          ),
          placement: 'left',
        },
      ],
      parent: [
        {
          target: '[data-tour="children-grades"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">📊 Notes de vos enfants</h3>
              <p>Suivez en temps réel les notes et moyennes de vos enfants.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="children-absences"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">📅 Absences</h3>
              <p>Consultez l'assiduité et les absences de vos enfants.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="children-payments"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">💳 Paiements</h3>
              <p>Gérez les paiements de scolarité de vos enfants.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="ai-chatbot"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">🤖 Assistant IA</h3>
              <p>Posez vos questions sur la scolarité de vos enfants!</p>
            </div>
          ),
          placement: 'left',
        },
      ],
      comptable: [
        {
          target: '[data-tour="treasury-dashboard"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">💰 Trésorerie</h3>
              <p>Visualisez la situation financière en temps réel.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="payments-management"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">💳 Gestion Paiements</h3>
              <p>Enregistrez les paiements étudiants et gérez les relances.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="accounting-reports"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">📊 Rapports</h3>
              <p>Générez des rapports comptables et exportez en PDF/Excel.</p>
            </div>
          ),
          placement: 'bottom',
        },
        {
          target: '[data-tour="ai-chatbot"]',
          content: (
            <div>
              <h3 className="font-bold text-purple-600 mb-2">🤖 Assistant IA</h3>
              <p>L'assistant peut vous aider avec les analyses financières!</p>
            </div>
          ),
          placement: 'left',
        },
      ],
    };

    const finalStep = {
      target: 'body',
      content: (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-purple-600 mb-3">
            🎉 C'est parti !
          </h2>
          <p className="text-gray-700 mb-2">
            Vous êtes prêt à utiliser UniversaSaaS.
          </p>
          <p className="text-sm text-gray-500">
            Vous pouvez relancer ce tour à tout moment depuis les paramètres.
          </p>
        </div>
      ),
      placement: 'center',
    };

    return [...commonSteps, ...(roleSpecificSteps[role] || []), finalStep];
  };

  // Styles personnalisés avec couleurs violet/rose
  const customStyles = {
    options: {
      primaryColor: '#9333ea', // purple-600
      textColor: '#374151', // gray-700
      backgroundColor: '#ffffff',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      arrowColor: '#ffffff',
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: 12,
      padding: 20,
    },
    tooltipContainer: {
      textAlign: 'left',
    },
    tooltipTitle: {
      color: '#9333ea',
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '10px',
    },
    tooltipContent: {
      padding: '10px 0',
      fontSize: '14px',
      lineHeight: '1.6',
    },
    buttonNext: {
      backgroundColor: '#9333ea',
      borderRadius: 8,
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s',
    },
    buttonBack: {
      color: '#9333ea',
      marginRight: 10,
      fontSize: '14px',
      fontWeight: '600',
    },
    buttonSkip: {
      color: '#6b7280', // gray-500
      fontSize: '14px',
    },
    buttonClose: {
      color: '#6b7280',
      width: 24,
      height: 24,
    },
    beacon: {
      inner: '#9333ea',
      outer: '#9333ea',
    },
  };

  if (!run || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={customStyles}
      locale={{
        back: 'Retour',
        close: 'Fermer',
        last: 'Terminer',
        next: 'Suivant',
        skip: 'Passer',
      }}
      floaterProps={{
        disableAnimation: false,
        styles: {
          floater: {
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
          },
        },
      }}
    />
  );
}
