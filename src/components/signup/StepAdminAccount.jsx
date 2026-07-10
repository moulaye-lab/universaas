import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function StepAdminAccount({ formData, updateFormData }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

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
            className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
            required
          />
        </div>
        <p className="text-xs text-indigo-300 mt-1">
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
