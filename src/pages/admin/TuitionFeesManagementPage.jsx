/**
 * TuitionFeesManagementPage.jsx - Gestion des frais de scolarité
 *
 * Fonctionnalités:
 * - Définir tarifs par année académique
 * - Tarifs par niveau (L1, L2, L3, M1, M2)
 * - Ajustements par filière
 * - Tarifs spéciaux (boursier, étranger, redoublant)
 * - Historique des tarifs
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import { ChevronLeft, DollarSign, Edit2, Save, X, Plus, TrendingUp } from 'lucide-react';

export default function TuitionFeesManagementPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { symbol, formatAmount } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [tuitionFees, setTuitionFees] = useState(null);
  const [editingLevel, setEditingLevel] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editingSpecial, setEditingSpecial] = useState(null);
  const [saving, setSaving] = useState(false);

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];
  const fields = [
    { id: 'informatique', name: 'Informatique' },
    { id: 'mathematiques', name: 'Mathématiques' },
    { id: 'physique', name: 'Physique' },
    { id: 'chimie', name: 'Chimie' },
    { id: 'biologie', name: 'Biologie' },
    { id: 'economie', name: 'Économie' },
    { id: 'gestion', name: 'Gestion' },
    { id: 'droit', name: 'Droit' },
    { id: 'medecine', name: 'Médecine' }
  ];

  const specialTypes = [
    { id: 'boursier', name: 'Boursier', icon: '🎓' },
    { id: 'etranger', name: 'Étudiant Étranger', icon: '🌍' },
    { id: 'redoublant', name: 'Redoublant', icon: '🔄' }
  ];

  useEffect(() => {
    loadTuitionFees();
  }, [academicYear, userProfile]);

  function getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    if (month >= 8) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  const loadTuitionFees = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const feesRef = ref(database, `universities/${userProfile.universityId}/tuition_fees/${academicYear}`);
      const feesSnap = await get(feesRef);

      if (feesSnap.exists()) {
        setTuitionFees(feesSnap.val());
      } else {
        // Initialiser avec valeurs par défaut
        const defaultFees = {
          defaultFee: 5000,
          byLevel: {
            L1: 4500,
            L2: 5000,
            L3: 5500,
            M1: 7000,
            M2: 8000
          },
          byField: {},
          special: {},
          currency: symbol || 'EUR',
          createdAt: Date.now(),
          createdBy: userProfile.uid
        };
        setTuitionFees(defaultFees);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading tuition fees:', err);
      alert('Erreur lors du chargement: ' + err.message);
      setLoading(false);
    }
  };

  const saveTuitionFees = async () => {
    if (!userProfile?.universityId || !tuitionFees) return;

    try {
      setSaving(true);

      const feesRef = ref(database, `universities/${userProfile.universityId}/tuition_fees/${academicYear}`);
      await set(feesRef, {
        ...tuitionFees,
        updatedAt: Date.now(),
        updatedBy: userProfile.uid
      });

      alert('✅ Tarifs enregistrés avec succès !');
      setSaving(false);
    } catch (err) {
      console.error('Error saving tuition fees:', err);
      alert('Erreur lors de la sauvegarde: ' + err.message);
      setSaving(false);
    }
  };

  const updateLevelFee = (level, value) => {
    setTuitionFees({
      ...tuitionFees,
      byLevel: {
        ...tuitionFees.byLevel,
        [level]: parseFloat(value) || 0
      }
    });
  };

  const updateFieldAdjustment = (fieldId, value) => {
    setTuitionFees({
      ...tuitionFees,
      byField: {
        ...tuitionFees.byField,
        [fieldId]: parseFloat(value) || 0
      }
    });
  };

  const removeFieldAdjustment = (fieldId) => {
    const newByField = { ...tuitionFees.byField };
    delete newByField[fieldId];
    setTuitionFees({
      ...tuitionFees,
      byField: newByField
    });
  };

  const updateSpecialRate = (specialId, value, type = 'percentage') => {
    setTuitionFees({
      ...tuitionFees,
      special: {
        ...tuitionFees.special,
        [specialId]: {
          type,
          value: parseFloat(value) || 0
        }
      }
    });
  };

  const removeSpecialRate = (specialId) => {
    const newSpecial = { ...tuitionFees.special };
    delete newSpecial[specialId];
    setTuitionFees({
      ...tuitionFees,
      special: newSpecial
    });
  };

  const calculateExampleFee = () => {
    if (!tuitionFees) return 0;

    // Exemple: L1 Informatique Boursier
    let fee = tuitionFees.byLevel?.L1 || 0;

    // Ajout filière
    if (tuitionFees.byField?.informatique) {
      fee += tuitionFees.byField.informatique;
    }

    // Ajustement boursier
    if (tuitionFees.special?.boursier) {
      const adjustment = tuitionFees.special.boursier;
      if (adjustment.type === 'percentage') {
        fee = fee * (1 + adjustment.value / 100);
      } else {
        fee += adjustment.value;
      }
    }

    return fee.toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/payments')}
              className="p-2 hover:bg-white rounded-xl transition"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">💰 Gestion des Frais de Scolarité</h1>
              <p className="text-gray-600 mt-1">Configuration des tarifs par année académique</p>
            </div>
          </div>
          <button
            onClick={saveTuitionFees}
            disabled={saving}
            className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition flex items-center gap-2 font-semibold disabled:bg-gray-300"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>

        {/* Academic Year Selector */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📅 Année Académique
          </label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="w-full md:w-64 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
          >
            <option value="2023-2024">2023-2024</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
          </select>
        </div>

        {/* Tarifs par Niveau */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            📊 Tarifs par Niveau
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {levels.map(level => (
              <div key={level} className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">{level}</span>
                  {editingLevel === level ? (
                    <button
                      onClick={() => setEditingLevel(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Save className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingLevel(level)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
                {editingLevel === level ? (
                  <input
                    type="number"
                    value={tuitionFees.byLevel?.[level] || 0}
                    onChange={(e) => updateLevelFee(level, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500"
                    step="100"
                  />
                ) : (
                  <p className="text-3xl font-black text-blue-600">
                    {tuitionFees.byLevel?.[level] || 0} {symbol}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Supplément par Filière */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              📚 Supplément par Filière (Optionnel)
            </h2>
            <button
              onClick={() => setEditingField('new')}
              className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition flex items-center gap-2 font-semibold text-sm"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            💡 Montant à ajouter (+) ou soustraire (-) au tarif de base selon la filière. Ex: Informatique +500€, Médecine +2000€
          </p>

          <div className="space-y-3">
            {Object.entries(tuitionFees.byField || {}).map(([fieldId, value]) => {
              const field = fields.find(f => f.id === fieldId);
              return (
                <div key={fieldId} className="p-4 bg-green-50 rounded-xl border border-green-200 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{field?.name || fieldId}</p>
                    {editingField === fieldId ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => updateFieldAdjustment(fieldId, e.target.value)}
                        className="w-32 px-3 py-1 rounded-lg border-2 border-green-300 focus:border-green-500 mt-2"
                        step="50"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-green-600">
                        {value >= 0 ? '+' : ''}{value} {symbol}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingField === fieldId ? (
                      <button
                        onClick={() => setEditingField(null)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingField(fieldId)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => removeFieldAdjustment(fieldId)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {editingField === 'new' && (
              <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-300">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Filière</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      updateFieldAdjustment(e.target.value, 0);
                      setEditingField(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
                >
                  <option value="">-- Sélectionner --</option>
                  {fields.filter(f => !tuitionFees.byField?.[f.id]).map(field => (
                    <option key={field.id} value={field.id}>{field.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setEditingField(null)}
                  className="mt-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tarifs Spéciaux */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">🎓 Tarifs Spéciaux</h2>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Réductions ou majorations en pourcentage selon le statut de l'étudiant
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {specialTypes.map(special => {
              const rate = tuitionFees.special?.[special.id];
              return (
                <div key={special.id} className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-gray-900">
                      {special.icon} {special.name}
                    </span>
                    {editingSpecial === special.id ? (
                      <button
                        onClick={() => setEditingSpecial(null)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingSpecial(special.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  {editingSpecial === special.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={rate?.value || 0}
                        onChange={(e) => updateSpecialRate(special.id, e.target.value)}
                        className="w-20 px-3 py-2 rounded-lg border-2 border-purple-300 focus:border-purple-500"
                        step="5"
                      />
                      <span className="font-semibold">%</span>
                      {rate && (
                        <button
                          onClick={() => removeSpecialRate(special.id)}
                          className="ml-auto text-red-600 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ) : rate ? (
                    <p className={`text-2xl font-bold ${rate.value < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {rate.value >= 0 ? '+' : ''}{rate.value}%
                    </p>
                  ) : (
                    <p className="text-gray-400">Non défini</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Exemple de Calcul */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            🧮 Exemple de Calcul
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Étudiant : L1 Informatique Boursier
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Tarif de base L1 :</span>
              <span className="font-semibold">{tuitionFees.byLevel?.L1 || 0} {symbol}</span>
            </div>
            {tuitionFees.byField?.informatique && (
              <div className="flex justify-between">
                <span className="text-gray-700">Supplément Informatique :</span>
                <span className="font-semibold text-green-600">
                  {tuitionFees.byField.informatique >= 0 ? '+' : ''}{tuitionFees.byField.informatique} {symbol}
                </span>
              </div>
            )}
            {tuitionFees.special?.boursier && (
              <div className="flex justify-between">
                <span className="text-gray-700">Réduction Boursier :</span>
                <span className="font-semibold text-green-600">
                  {tuitionFees.special.boursier.value}%
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t-2 border-gray-300">
              <span className="font-bold text-gray-900">Total :</span>
              <span className="text-2xl font-black text-blue-600">{calculateExampleFee()} {symbol}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
