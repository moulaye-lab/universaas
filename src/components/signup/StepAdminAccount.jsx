import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function StepAdminAccount({ formData, updateFormData }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailCheckMessage, setEmailCheckMessage] = useState('');

  const passwordStrength = (password) => {
    if (password.length === 0) return { level: 0, label: '', color: '' };
    if (password.length < 6) return { level: 1, label: 'Faible', color: 'text-red-400' };
    if (password.length < 8) return { level: 2, label: 'Moyen', color: 'text-yellow-400' };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { level: 3, label: 'Fort', color: 'text-green-400' };
    }
    return { level: 2, label: 'Moyen', color: 'text-yellow-400' };
  };

  const strength = passwordStrength(formData.adminPassword);

  const passwordsMatch = formData.adminPassword &&
                        formData.adminPasswordConfirm &&
                        formData.adminPassword === formData.adminPasswordConfirm;

  // Générer des suggestions d'email basées sur le slug et le nom
  useEffect(() => {
    if (formData.slug && (formData.adminFirstName || formData.adminLastName)) {
      const suggestions = [];
      const firstName = formData.adminFirstName.toLowerCase().trim();
      const lastName = formData.adminLastName.toLowerCase().trim();
      const slug = formData.slug;

      // Normaliser (enlever accents)
      const normalize = (str) => str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/g, '');

      const normalizedFirst = normalize(firstName);
      const normalizedLast = normalize(lastName);

      if (normalizedFirst && normalizedLast) {
        suggestions.push(`${normalizedFirst}.${normalizedLast}@${slug}.fr`);
        suggestions.push(`admin@${slug}.fr`);
        suggestions.push(`${normalizedFirst[0]}${normalizedLast}@${slug}.fr`);
        suggestions.push(`${normalizedFirst}@${slug}.fr`);
        suggestions.push(`direction@${slug}.fr`);
      } else if (normalizedFirst || normalizedLast) {
        const name = normalizedFirst || normalizedLast;
        suggestions.push(`${name}@${slug}.fr`);
        suggestions.push(`admin@${slug}.fr`);
      } else {
        suggestions.push(`admin@${slug}.fr`);
      }

      setEmailSuggestions(suggestions.slice(0, 5));
    } else {
      setEmailSuggestions([]);
    }
  }, [formData.slug, formData.adminFirstName, formData.adminLastName]);

  // Vérifier la disponibilité de l'email en temps réel (validation format uniquement)
  const checkEmailAvailability = async (email) => {
    if (!email || !email.includes('@') || email.length < 5) {
      setEmailAvailable(null);
      setEmailCheckMessage('');
      return;
    }

    // Validation format email basique
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setEmailAvailable(false);
      setEmailCheckMessage('Format d\'email invalide');
      return;
    }

    // Format valide
    setEmailAvailable(true);
    setEmailCheckMessage('✓ Format valide');
    updateFormData('adminEmailAvailable', true);
  };

  // Debounce check email
  useEffect(() => {
    if (!formData.adminEmail) {
      setEmailCheckMessage('');
      setEmailAvailable(null);
      return;
    }

    const timer = setTimeout(() => {
      checkEmailAvailability(formData.adminEmail);
    }, 800); // Attendre 800ms après la dernière frappe

    return () => clearTimeout(timer);
  }, [formData.adminEmail]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Créez votre compte administrateur
        </h2>
        <p className="text-indigo-200">
          Ce compte aura tous les droits sur votre plateforme
        </p>
      </div>

      {/* Prénom et Nom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Prénom *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
            <input
              type="text"
              value={formData.adminFirstName}
              onChange={(e) => updateFormData('adminFirstName', e.target.value)}
              placeholder="Jean"
              className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Nom *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
            <input
              type="text"
              value={formData.adminLastName}
              onChange={(e) => updateFormData('adminLastName', e.target.value)}
              placeholder="Dupont"
              className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
              required
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Email professionnel *
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <input
            type="email"
            value={formData.adminEmail}
            onChange={(e) => updateFormData('adminEmail', e.target.value)}
            placeholder="admin@universite.fr"
            className={`w-full pl-11 pr-12 py-3 bg-white/10 border-2 rounded-xl text-white placeholder-white/50 focus:ring-4 transition outline-none ${
              emailAvailable === true
                ? 'border-green-500 focus:border-green-500 focus:ring-green-500/30'
                : emailAvailable === false
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-white/20 focus:border-indigo-500 focus:ring-indigo-500/30'
            }`}
            required
          />
          {/* Indicateur de vérification */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {checkingEmail && (
              <Loader className="w-5 h-5 text-indigo-400 animate-spin" />
            )}
            {!checkingEmail && emailAvailable === true && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
            {!checkingEmail && emailAvailable === false && (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
        </div>

        {/* Message de vérification */}
        {emailCheckMessage && (
          <div className={`mt-2 flex items-center gap-2 text-sm ${
            emailAvailable === true
              ? 'text-green-300'
              : emailAvailable === false
              ? 'text-red-300'
              : 'text-indigo-300'
          }`}>
            {checkingEmail && <Loader className="w-4 h-4 animate-spin" />}
            {!checkingEmail && emailAvailable === true && <CheckCircle className="w-4 h-4" />}
            {!checkingEmail && emailAvailable === false && <XCircle className="w-4 h-4" />}
            {!checkingEmail && emailAvailable === null && <AlertCircle className="w-4 h-4" />}
            {emailCheckMessage}
          </div>
        )}

        {/* Suggestions d'email */}
        {emailSuggestions.length > 0 && !formData.adminEmail && (
          <div className="mt-2">
            <p className="text-xs text-indigo-300 mb-2">💡 Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {emailSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => updateFormData('adminEmail', suggestion)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs rounded-lg transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-indigo-300 mt-2">
          Cet email sera votre identifiant de connexion
        </p>
      </div>

      {/* Mot de passe */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Mot de passe *
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.adminPassword}
            onChange={(e) => updateFormData('adminPassword', e.target.value)}
            placeholder="Minimum 6 caractères"
            className="w-full pl-11 pr-12 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-300 hover:text-white transition"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Password Strength */}
        {formData.adminPassword && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    strength.level === 1 ? 'w-1/3 bg-red-500' :
                    strength.level === 2 ? 'w-2/3 bg-yellow-500' :
                    strength.level === 3 ? 'w-full bg-green-500' : 'w-0'
                  }`}
                />
              </div>
              <span className={`text-xs font-semibold ${strength.color}`}>
                {strength.label}
              </span>
            </div>
            <p className="text-xs text-indigo-300">
              Utilisez au moins 8 caractères avec majuscules et chiffres pour un mot de passe fort
            </p>
          </div>
        )}
      </div>

      {/* Confirmation mot de passe */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Confirmer le mot de passe *
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <input
            type={showPasswordConfirm ? 'text' : 'password'}
            value={formData.adminPasswordConfirm}
            onChange={(e) => updateFormData('adminPasswordConfirm', e.target.value)}
            placeholder="Retapez votre mot de passe"
            className="w-full pl-11 pr-12 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
            required
          />
          <button
            type="button"
            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-300 hover:text-white transition"
          >
            {showPasswordConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Match indicator */}
        {formData.adminPasswordConfirm && (
          <div className={`mt-2 flex items-center gap-2 text-sm ${
            passwordsMatch ? 'text-green-300' : 'text-red-300'
          }`}>
            {passwordsMatch ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Les mots de passe correspondent
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Les mots de passe ne correspondent pas
              </>
            )}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="p-4 bg-indigo-500/20 border border-indigo-500/50 rounded-xl">
        <p className="text-sm text-indigo-200">
          🔐 <strong>Sécurité:</strong> Votre mot de passe est chiffré et jamais stocké en clair. Vous pourrez le modifier à tout moment depuis votre profil.
        </p>
      </div>
    </div>
  );
}
