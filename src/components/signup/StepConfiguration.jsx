import { DollarSign, Globe, Calendar, Languages } from 'lucide-react';
import { CURRENCIES } from '../../utils/currencies';

export default function StepConfiguration({ formData, updateFormData }) {
  const TIMEZONES = [
    { value: 'Africa/Abidjan', label: 'Afrique/Abidjan (GMT+0)', country: 'CI' },
    { value: 'Africa/Dakar', label: 'Afrique/Dakar (GMT+0)', country: 'SN' },
    { value: 'Africa/Lagos', label: 'Afrique/Lagos (GMT+1)', country: 'NG' },
    { value: 'Africa/Casablanca', label: 'Afrique/Casablanca (GMT+1)', country: 'MA' },
    { value: 'Africa/Algiers', label: 'Afrique/Alger (GMT+1)', country: 'DZ' },
    { value: 'Africa/Tunis', label: 'Afrique/Tunis (GMT+1)', country: 'TN' },
    { value: 'Africa/Cairo', label: 'Afrique/Le Caire (GMT+2)', country: 'EG' },
    { value: 'Europe/Paris', label: 'Europe/Paris (GMT+1)', country: 'FR' },
    { value: 'Europe/Brussels', label: 'Europe/Bruxelles (GMT+1)', country: 'BE' },
    { value: 'Europe/Zurich', label: 'Europe/Zurich (GMT+1)', country: 'CH' },
    { value: 'America/Montreal', label: 'Amérique/Montréal (GMT-5)', country: 'CA' },
  ];

  const LANGUAGES = [
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'ar', label: 'العربية', flag: '🇸🇦' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
  ];

  // Filtrer les devises les plus utilisées
  const popularCurrencies = CURRENCIES.filter(c =>
    ['EUR', 'USD', 'XOF', 'MAD', 'TND', 'DZD', 'CAD', 'GBP', 'CHF'].includes(c.code)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Configuration initiale
        </h2>
        <p className="text-indigo-200">
          Définissez les paramètres régionaux de votre plateforme
        </p>
      </div>

      {/* Devise */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Devise principale *
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <select
            value={formData.currency}
            onChange={(e) => updateFormData('currency', e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none appearance-none cursor-pointer"
          >
            <optgroup label="Devises populaires" className="bg-gray-800">
              {popularCurrencies.map((curr) => (
                <option key={curr.code} value={curr.code} className="bg-gray-800">
                  {curr.code} - {curr.name} ({curr.symbol})
                </option>
              ))}
            </optgroup>
            <optgroup label="Toutes les devises" className="bg-gray-800">
              {CURRENCIES.filter(c => !popularCurrencies.find(p => p.code === c.code)).map((curr) => (
                <option key={curr.code} value={curr.code} className="bg-gray-800">
                  {curr.code} - {curr.name} ({curr.symbol})
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <p className="text-xs text-indigo-300 mt-1">
          Cette devise sera utilisée pour tous les paiements et frais de scolarité
        </p>
      </div>

      {/* Fuseau horaire */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Fuseau horaire *
        </label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <select
            value={formData.timezone}
            onChange={(e) => updateFormData('timezone', e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none appearance-none cursor-pointer"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value} className="bg-gray-800">
                {tz.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-indigo-300 mt-1">
          Détermine l'heure locale pour les cours, examens et notifications
        </p>
      </div>

      {/* Année académique */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Année académique en cours *
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <input
            type="text"
            value={formData.academicYear}
            onChange={(e) => updateFormData('academicYear', e.target.value)}
            placeholder="2025/2026"
            className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
            required
          />
        </div>
      </div>

      {/* Langue */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Langue de l'interface *
        </label>
        <div className="relative">
          <Languages className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <select
            value={formData.language}
            onChange={(e) => updateFormData('language', e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none appearance-none cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value} className="bg-gray-800">
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-indigo-300 mt-1">
          La langue peut être modifiée ultérieurement dans les paramètres
        </p>
      </div>

      {/* Preview Summary */}
      <div className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-2xl">
        <p className="text-sm font-semibold text-white mb-3">
          ✨ Récapitulatif de votre configuration:
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-white">
            <span className="text-green-200">Université:</span>
            <span className="font-semibold">{formData.universityName || 'Non défini'}</span>
          </div>
          <div className="flex items-center justify-between text-white">
            <span className="text-green-200">Identifiant:</span>
            <span className="font-mono font-semibold">{formData.slug || 'Non défini'}</span>
          </div>
          <div className="flex items-center justify-between text-white">
            <span className="text-green-200">Administrateur:</span>
            <span className="font-semibold">
              {formData.adminFirstName} {formData.adminLastName}
            </span>
          </div>
          <div className="flex items-center justify-between text-white">
            <span className="text-green-200">Email:</span>
            <span className="font-semibold">{formData.adminEmail || 'Non défini'}</span>
          </div>
          <div className="flex items-center justify-between text-white">
            <span className="text-green-200">Devise:</span>
            <span className="font-semibold">{formData.currency}</span>
          </div>
          <div className="flex items-center justify-between text-white">
            <span className="text-green-200">Fuseau horaire:</span>
            <span className="font-semibold">
              {TIMEZONES.find(tz => tz.value === formData.timezone)?.label.split(' ')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-indigo-500/20 border border-indigo-500/50 rounded-xl">
        <p className="text-sm text-indigo-200">
          ⚙️ <strong>Note:</strong> Tous ces paramètres pourront être modifiés ultérieurement depuis la page "Paramètres" de votre tableau de bord.
        </p>
      </div>
    </div>
  );
}
