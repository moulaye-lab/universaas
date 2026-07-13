import { useState, useEffect } from 'react';
import { Link, CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import { ref, query, orderByChild, equalTo, get } from 'firebase/database';
import { database } from '../../config/firebase';

export default function StepSlugConfig({ formData, updateFormData }) {
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');

  // Générer slug automatiquement depuis le nom
  useEffect(() => {
    if (!formData.slug && formData.universityName) {
      const autoSlug = formData.universityName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/-+/g, '-') // Remove multiple -
        .substring(0, 30); // Max 30 chars

      updateFormData('slug', autoSlug);
    }
  }, [formData.universityName]);

  const checkSlugAvailability = async (slug) => {
    if (slug.length < 3) {
      updateFormData('slugAvailable', null);
      setCheckMessage('Le slug doit contenir au moins 3 caractères');
      return;
    }

    // Validation format
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      updateFormData('slugAvailable', false);
      setCheckMessage('Le slug ne peut contenir que des lettres minuscules, chiffres et tirets');
      return;
    }

    setChecking(true);
    setCheckMessage('Vérification de la disponibilité...');

    try {
      // Option 1: Essayer via le backend API
      try {
        const response = await fetch(`${import.meta.env.VITE_AI_API_URL || 'http://localhost:3001'}/api/onboarding/check-slug`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ slug })
        });

        const result = await response.json();

        if (result.available) {
          updateFormData('slugAvailable', true);
          setCheckMessage('✓ Ce slug est disponible!');
        } else {
          updateFormData('slugAvailable', false);
          setCheckMessage('✗ Ce slug est déjà utilisé');
        }
        return;
      } catch (apiError) {
        console.warn('Backend API non disponible, utilisation Firebase directement:', apiError);
      }

      // Option 2: Fallback - vérifier dans Firebase directement (sans index)
      const universitiesRef = ref(database, 'universities');
      const snapshot = await get(universitiesRef);

      if (snapshot.exists()) {
        const universities = snapshot.val();
        const slugExists = Object.values(universities).some(
          univ => univ.slug === slug
        );

        if (slugExists) {
          updateFormData('slugAvailable', false);
          setCheckMessage('✗ Ce slug est déjà utilisé');
        } else {
          updateFormData('slugAvailable', true);
          setCheckMessage('✓ Ce slug est disponible!');
        }
      } else {
        // Aucune université n'existe encore
        updateFormData('slugAvailable', true);
        setCheckMessage('✓ Ce slug est disponible!');
      }
    } catch (err) {
      console.error('Error checking slug:', err);
      updateFormData('slugAvailable', null);
      setCheckMessage('Erreur lors de la vérification');
    } finally {
      setChecking(false);
    }
  };

  // Debounce check
  useEffect(() => {
    if (!formData.slug) {
      setCheckMessage('');
      return;
    }

    const timer = setTimeout(() => {
      checkSlugAvailability(formData.slug);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.slug]);

  const handleSlugChange = (e) => {
    let value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 30);

    updateFormData('slug', value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Votre identifiant unique
        </h2>
        <p className="text-indigo-200">
          Choisissez un identifiant court et mémorable pour votre établissement
        </p>
      </div>

      {/* Slug Input */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Identifiant (slug) *
        </label>
        <div className="relative">
          <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <input
            type="text"
            value={formData.slug}
            onChange={handleSlugChange}
            placeholder="universite-paris"
            className="w-full pl-11 pr-12 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none font-mono"
            required
          />
          {checking && (
            <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-400 animate-spin" />
          )}
          {!checking && formData.slugAvailable === true && (
            <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-400" />
          )}
          {!checking && formData.slugAvailable === false && (
            <XCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-400" />
          )}
        </div>

        {/* Status Message */}
        {checkMessage && (
          <div className={`mt-2 flex items-center gap-2 text-sm ${
            formData.slugAvailable === true
              ? 'text-green-300'
              : formData.slugAvailable === false
              ? 'text-red-300'
              : 'text-indigo-300'
          }`}>
            {checking && <Loader className="w-4 h-4 animate-spin" />}
            {!checking && formData.slugAvailable === true && <CheckCircle className="w-4 h-4" />}
            {!checking && formData.slugAvailable === false && <XCircle className="w-4 h-4" />}
            {!checking && formData.slugAvailable === null && <AlertCircle className="w-4 h-4" />}
            {checkMessage}
          </div>
        )}
      </div>

      {/* Preview URL */}
      <div className="p-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-indigo-500/50 rounded-2xl">
        <p className="text-sm text-indigo-200 mb-2">
          Votre URL personnalisée sera:
        </p>
        <div className="bg-white/10 px-4 py-3 rounded-xl font-mono text-white break-all">
          https://{formData.slug || 'votre-slug'}.universaas.com
        </div>
        <p className="text-xs text-indigo-300 mt-2">
          ou: https://universaas.com/u/{formData.slug || 'votre-slug'}
        </p>
      </div>

      {/* Rules */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <p className="text-sm font-semibold text-white mb-2">
          Règles pour l'identifiant:
        </p>
        <ul className="space-y-1 text-sm text-indigo-200">
          <li>• Minimum 3 caractères</li>
          <li>• Uniquement lettres minuscules, chiffres et tirets</li>
          <li>• Doit être unique (non utilisé par une autre université)</li>
          <li>• Évitez les caractères spéciaux et espaces</li>
        </ul>
      </div>

      {/* Examples */}
      <div>
        <p className="text-sm text-white mb-2">💡 Exemples:</p>
        <div className="flex flex-wrap gap-2">
          {['sorbonne', 'sciences-po', 'polytechnique', 'paris-dauphine', 'essec'].map(example => (
            <button
              key={example}
              onClick={() => updateFormData('slug', example)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-indigo-200 rounded-lg text-sm transition"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
