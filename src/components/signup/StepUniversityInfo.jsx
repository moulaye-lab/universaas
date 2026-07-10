import { Building2, MapPin, Phone, Globe } from 'lucide-react';

export default function StepUniversityInfo({ formData, updateFormData }) {
  const countries = [
    'France', 'Côte d\'Ivoire', 'Sénégal', 'Maroc', 'Tunisie', 'Algérie',
    'Belgique', 'Suisse', 'Canada', 'Mali', 'Burkina Faso', 'Niger',
    'Cameroun', 'Gabon', 'Congo', 'RDC', 'Madagascar', 'Bénin', 'Togo'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Informations sur votre établissement
        </h2>
        <p className="text-indigo-200">
          Commençons par les informations de base de votre université
        </p>
      </div>

      {/* Nom université */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Nom de l'établissement *
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <input
            type="text"
            value={formData.universityName}
            onChange={(e) => updateFormData('universityName', e.target.value)}
            placeholder="Ex: Université de Paris"
            className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
            required
          />
        </div>
      </div>

      {/* Type et Pays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Type d'établissement *
          </label>
          <select
            value={formData.type}
            onChange={(e) => updateFormData('type', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
          >
            <option value="public" className="bg-gray-800">Public</option>
            <option value="private" className="bg-gray-800">Privé</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Pays *
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
            <select
              value={formData.country}
              onChange={(e) => updateFormData('country', e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
            >
              {countries.map(country => (
                <option key={country} value={country} className="bg-gray-800">
                  {country}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Adresse */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Adresse
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-5 h-5 text-indigo-300" />
          <input
            type="text"
            value={formData.address}
            onChange={(e) => updateFormData('address', e.target.value)}
            placeholder="Rue et numéro"
            className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
          />
        </div>
      </div>

      {/* Ville et Code Postal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Ville *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => updateFormData('city', e.target.value)}
            placeholder="Ex: Paris"
            className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Code Postal
          </label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => updateFormData('postalCode', e.target.value)}
            placeholder="Ex: 75001"
            className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
          />
        </div>
      </div>

      {/* Téléphone */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Téléphone
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-300" />
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateFormData('phone', e.target.value)}
            placeholder="+33 1 23 45 67 89"
            className="w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition outline-none"
          />
        </div>
      </div>

      <div className="p-4 bg-indigo-500/20 border border-indigo-500/50 rounded-xl">
        <p className="text-sm text-indigo-200">
          💡 <strong>Conseil:</strong> Ces informations apparaîtront sur vos documents officiels (bulletins, certificats).
        </p>
      </div>
    </div>
  );
}
