import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  Settings,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import StepUniversityInfo from '../../components/signup/StepUniversityInfo';
import StepSlugConfig from '../../components/signup/StepSlugConfig';
import StepAdminAccount from '../../components/signup/StepAdminAccount';
import StepConfiguration from '../../components/signup/StepConfiguration';

export default function SignupPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Étape 1: Informations établissement
    universityName: '',
    country: 'France',
    type: 'public', // public, private
    address: '',
    city: '',
    postalCode: '',
    phone: '',

    // Étape 2: Configuration slug
    slug: '',
    slugAvailable: null,

    // Étape 3: Compte administrateur
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminEmailAvailable: null,
    adminPassword: '',
    adminPasswordConfirm: '',

    // Étape 4: Configuration initiale
    currency: 'EUR',
    timezone: 'Europe/Paris',
    academicYear: '2025/2026',
    language: 'fr'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    {
      number: 1,
      title: "Informations de l'établissement",
      icon: Building2,
      description: "Nom, pays et coordonnées"
    },
    {
      number: 2,
      title: "Identifiant unique",
      icon: Sparkles,
      description: "Votre URL personnalisée"
    },
    {
      number: 3,
      title: "Compte administrateur",
      icon: User,
      description: "Votre accès principal"
    },
    {
      number: 4,
      title: "Configuration",
      icon: Settings,
      description: "Devise et fuseau horaire"
    }
  ];

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.universityName.trim().length >= 3 &&
               formData.country &&
               formData.city.trim().length >= 2;
      case 2:
        return formData.slug.trim().length >= 3 &&
               formData.slugAvailable === true;
      case 3:
        return formData.adminFirstName.trim() &&
               formData.adminLastName.trim() &&
               formData.adminEmail.includes('@') &&
               formData.adminEmailAvailable === true &&
               formData.adminPassword.length >= 6 &&
               formData.adminPassword === formData.adminPasswordConfirm;
      case 4:
        return true; // Configuration a des valeurs par défaut
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNextStep()) {
      setCurrentStep(prev => prev + 1);
      setError('');
    } else {
      setError('Veuillez remplir tous les champs requis correctement');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!canProceedToNextStep()) {
      setError('Veuillez vérifier tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Appel API backend pour créer l'université
      const response = await fetch(`${import.meta.env.VITE_AI_API_URL || 'http://localhost:3001'}/api/onboarding/create-university`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création');
      }

      const result = await response.json();

      // Rediriger vers page de succès
      navigate('/signup/success', {
        state: {
          universityId: result.universityId,
          adminEmail: formData.adminEmail
        }
      });

    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
      // Revenir à l'étape 3 (compte admin) si erreur d'email
      if (err.message?.includes('email') || err.message?.includes('EMAIL_EXISTS')) {
        setCurrentStep(3);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
      {/* Header */}
      <nav className="backdrop-blur-xl bg-white/10 border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">UniversaSaaS</span>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition"
            >
              Déjà inscrit ? Se connecter
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Créez votre université en 4 étapes
          </h1>
          <p className="text-xl text-indigo-200">
            Rejoignez des centaines d'établissements qui gèrent leur organisation avec UniversaSaaS
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      currentStep > step.number
                        ? 'bg-green-500'
                        : currentStep === step.number
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 ring-4 ring-indigo-500/30'
                        : 'bg-white/10 border-2 border-white/30'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <step.icon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="text-center mt-2">
                    <p className={`text-sm font-semibold ${
                      currentStep >= step.number ? 'text-white' : 'text-white/50'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-indigo-300 hidden md:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-4 transition-all duration-300 ${
                      currentStep > step.number
                        ? 'bg-green-500'
                        : 'bg-white/20'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div className="mb-8">
            {currentStep === 1 && (
              <StepUniversityInfo
                formData={formData}
                updateFormData={updateFormData}
              />
            )}
            {currentStep === 2 && (
              <StepSlugConfig
                formData={formData}
                updateFormData={updateFormData}
              />
            )}
            {currentStep === 3 && (
              <StepAdminAccount
                formData={formData}
                updateFormData={updateFormData}
              />
            )}
            {currentStep === 4 && (
              <StepConfiguration
                formData={formData}
                updateFormData={updateFormData}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-white/20">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5" />
              Précédent
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={!canProceedToNextStep()}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !canProceedToNextStep()}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Créer mon université
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-indigo-300 text-sm">
          En créant votre compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
        </div>
      </div>
    </div>
  );
}
