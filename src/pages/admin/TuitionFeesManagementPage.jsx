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
import { ref, get, set, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import { ChevronLeft, DollarSign, Edit2, Save, X, Plus, TrendingUp, Users } from 'lucide-react';

export default function TuitionFeesManagementPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { currency, symbol, formatAmount } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [tuitionFees, setTuitionFees] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editingSpecial, setEditingSpecial] = useState(null);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2'];
  const fields = [
    { id: 'informatique', name: 'Informatique', icon: '💻' },
    { id: 'mathematiques', name: 'Mathématiques', icon: '📐' },
    { id: 'physique', name: 'Physique', icon: '⚛️' },
    { id: 'chimie', name: 'Chimie', icon: '🧪' },
    { id: 'biologie', name: 'Biologie', icon: '🧬' },
    { id: 'economie', name: 'Économie', icon: '📊' },
    { id: 'gestion', name: 'Gestion', icon: '💼' },
    { id: 'droit', name: 'Droit', icon: '⚖️' },
    { id: 'medecine', name: 'Médecine', icon: '🏥' },
    { id: 'ingenerie', name: 'Ingénierie', icon: '⚙️' },
    { id: 'lettres', name: 'Lettres', icon: '📚' },
    { id: 'sciences_sociales', name: 'Sciences Sociales', icon: '🌍' }
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
        const data = feesSnap.val();

        // Migration: convertir ancien format vers nouveau format
        if (data.byLevel && !data.byFieldAndLevel) {
          const migrated = {
            byFieldAndLevel: {},
            special: data.special || {},
            currency: data.currency || symbol || 'EUR',
            createdAt: data.createdAt || Date.now(),
            createdBy: data.createdBy || userProfile.profileId
          };

          // Créer la matrice filière x niveau
          fields.forEach(field => {
            migrated.byFieldAndLevel[field.id] = {};
            levels.forEach(level => {
              const baseFee = data.byLevel[level] || 0;
              const fieldAdjustment = data.byField?.[field.id] || 0;
              migrated.byFieldAndLevel[field.id][level] = baseFee + fieldAdjustment;
            });
          });

          setTuitionFees(migrated);
        } else {
          setTuitionFees(data);
        }
      } else {
        // Initialiser avec valeurs par défaut
        const defaultFees = {
          byFieldAndLevel: {},
          special: {},
          currency: symbol || 'EUR',
          createdAt: Date.now(),
          createdBy: userProfile.profileId
        };

        // Initialiser toutes les filières avec des valeurs par défaut
        fields.forEach(field => {
          defaultFees.byFieldAndLevel[field.id] = {
            L1: 4500,
            L2: 5000,
            L3: 5500,
            M1: 7000,
            M2: 8000
          };
        });

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
        updatedBy: userProfile.profileId
      });

      alert('✅ Tarifs enregistrés avec succès !');
      setSaving(false);
    } catch (err) {
      console.error('Error saving tuition fees:', err);
      alert('Erreur lors de la sauvegarde: ' + err.message);
      setSaving(false);
    }
  };

  const updateFee = (fieldId, level, value) => {
    setTuitionFees({
      ...tuitionFees,
      byFieldAndLevel: {
        ...tuitionFees.byFieldAndLevel,
        [fieldId]: {
          ...tuitionFees.byFieldAndLevel[fieldId],
          [level]: parseFloat(value) || 0
        }
      }
    });
  };

  const copyFeesToLevel = (sourceLevel, targetLevel) => {
    const updated = { ...tuitionFees };
    fields.forEach(field => {
      const sourceFee = updated.byFieldAndLevel[field.id]?.[sourceLevel] || 0;
      if (!updated.byFieldAndLevel[field.id]) {
        updated.byFieldAndLevel[field.id] = {};
      }
      updated.byFieldAndLevel[field.id][targetLevel] = sourceFee;
    });
    setTuitionFees(updated);
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
    let fee = tuitionFees.byFieldAndLevel?.informatique?.L1 || 0;

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

  const applyToAllStudents = async () => {
    if (!confirm('Appliquer ces tarifs à TOUS les étudiants selon leur filière et niveau ?\n\nCela va mettre à jour tous les plans de paiement automatiquement.')) {
      return;
    }

    setApplying(true);

    try {
      // Charger tous les étudiants
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      if (!studentsSnap.exists()) {
        alert('Aucun étudiant trouvé');
        setApplying(false);
        return;
      }

      const students = Object.entries(studentsSnap.val()).map(([id, data]) => ({ id, ...data }));
      let updated = 0;
      let errors = 0;

      for (const student of students) {
        try {
          // Calculer le montant selon filière et niveau
          let totalAmount = 0;

          if (tuitionFees.byFieldAndLevel && student.fieldOfStudy && student.level) {
            const fieldKey = student.fieldOfStudy.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/\s+/g, '_');

            const fieldMapping = {
              'computer-science': 'informatique',
              'computer_science': 'informatique',
              'mathematics': 'mathematiques',
              'physics': 'physique',
              'chemistry': 'chimie',
              'biology': 'biologie',
              'literature': 'lettres',
              'history': 'lettres',
              'geography': 'sciences_sociales',
              'languages': 'lettres',
              'economics': 'economie',
              'management': 'gestion',
              'law': 'droit',
              'medicine': 'medecine',
              'engineering': 'ingenerie',
              'informatique': 'informatique',
              'mathematiques': 'mathematiques',
              'physique': 'physique',
              'chimie': 'chimie',
              'biologie': 'biologie',
              'economie': 'economie',
              'gestion': 'gestion',
              'droit': 'droit',
              'medecine': 'medecine',
              'ingenerie': 'ingenerie',
              'lettres': 'lettres',
              'sciences_sociales': 'sciences_sociales'
            };

            const normalizedFieldKey = fieldMapping[fieldKey] || fieldKey;

            if (tuitionFees.byFieldAndLevel[normalizedFieldKey]?.[student.level]) {
              totalAmount = tuitionFees.byFieldAndLevel[normalizedFieldKey][student.level];
            }
          }

          if (totalAmount === 0) {
            console.warn(`Pas de tarif pour ${student.firstName} ${student.lastName} (${student.fieldOfStudy} ${student.level})`);
            continue;
          }

          // Générer les échéances (3 échéances tous les 3 mois)
          const installmentAmount = Math.floor(totalAmount / 3);
          const remainder = totalAmount - (installmentAmount * 3);
          const startDate = new Date();
          const installments = {};

          for (let i = 0; i < 3; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + (i * 3));

            installments[i] = {
              amount: i === 0 ? installmentAmount + remainder : installmentAmount,
              dueDate: dueDate.getTime(),
              status: 'pending',
              installmentNumber: i + 1
            };
          }

          // Charger le plan existant pour garder paidAmount et autres champs
          const paymentRef = ref(database, `universities/${userProfile.universityId}/payments/${student.id}`);
          const paymentSnap = await get(paymentRef);

          const existingPlan = paymentSnap.exists() ? paymentSnap.val() : {};
          const existingPaidAmount = existingPlan.paidAmount || 0;

          // Skip si l'étudiant a déjà tout payé
          if (existingPaidAmount >= totalAmount) {
            console.log(`✅ ${student.firstName} ${student.lastName} a déjà payé l'intégralité (${existingPaidAmount}/${totalAmount})`);
            updated++;
            continue;
          }

          // Construire l'objet de mise à jour
          const updateData = {
            studentId: student.id,
            totalAmount,
            paidAmount: existingPaidAmount,
            installments,
            currency: currency || 'EUR',
            academicYear,
            status: existingPaidAmount >= totalAmount ? 'completed' : 'active',
            updatedAt: Date.now(),
            updatedBy: userProfile.profileId
          };

          // Si createdAt n'existe pas, l'ajouter
          if (!existingPlan.createdAt) {
            updateData.createdAt = Date.now();
          }

          // Si createdBy n'existe pas, l'ajouter
          if (!existingPlan.createdBy) {
            updateData.createdBy = userProfile.profileId;
          }

          // Utiliser set() pour garantir tous les champs
          await set(paymentRef, updateData);

          updated++;
        } catch (err) {
          console.error(`Erreur pour ${student.firstName} ${student.lastName}:`, err);
          errors++;
        }
      }

      alert(`✅ Application terminée !\n\n${updated} plan(s) mis à jour\n${errors} erreur(s)`);
      setApplying(false);
    } catch (err) {
      console.error('Erreur application tarifs:', err);
      alert('Erreur: ' + err.message);
      setApplying(false);
    }
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
          <div className="flex gap-3">
            <button
              onClick={saveTuitionFees}
              disabled={saving}
              className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition flex items-center gap-2 font-semibold disabled:bg-gray-300"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={applyToAllStudents}
              disabled={applying || !tuitionFees}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition flex items-center gap-2 font-semibold disabled:bg-gray-300"
            >
              <Users className="h-5 w-5" />
              {applying ? 'Application en cours...' : 'Appliquer aux étudiants'}
            </button>
          </div>
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

        {/* Tableau Filière x Niveau */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-blue-600" />
            📊 Frais de Scolarité par Filière et Niveau
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            💡 Cliquez sur un montant pour le modifier. Chaque filière peut avoir des tarifs différents selon le niveau.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <th className="p-3 text-left font-bold text-gray-900 border-b-2 border-gray-300 sticky left-0 bg-blue-50 z-10">
                    Filière
                  </th>
                  {levels.map(level => (
                    <th key={level} className="p-3 text-center font-bold text-gray-900 border-b-2 border-gray-300 min-w-[120px]">
                      {level}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map((field, fieldIndex) => (
                  <tr key={field.id} className={`hover:bg-blue-50 transition ${fieldIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-3 font-semibold text-gray-900 border-b border-gray-200 sticky left-0 bg-inherit z-10">
                      <span className="flex items-center gap-2">
                        <span className="text-xl">{field.icon}</span>
                        {field.name}
                      </span>
                    </td>
                    {levels.map(level => {
                      const cellKey = `${field.id}-${level}`;
                      const value = tuitionFees.byFieldAndLevel?.[field.id]?.[level] || 0;
                      const isEditing = editingCell === cellKey;

                      return (
                        <td key={level} className="p-3 text-center border-b border-gray-200">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={value}
                                onChange={(e) => updateFee(field.id, level, e.target.value)}
                                className="w-full px-2 py-1 rounded-lg border-2 border-blue-400 focus:border-blue-600 text-center font-semibold"
                                step="100"
                                autoFocus
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') setEditingCell(null);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingCell(cellKey)}
                              className="w-full px-3 py-2 rounded-lg hover:bg-blue-100 transition text-center group"
                            >
                              <span className="font-bold text-blue-600 text-lg block">
                                {value.toLocaleString()} {symbol}
                              </span>
                              <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition">
                                Cliquer pour modifier
                              </span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-gray-700 font-semibold mb-2">🎯 Raccourcis</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (confirm('Appliquer les mêmes tarifs à tous les niveaux pour toutes les filières ?')) {
                    const baseFee = tuitionFees.byFieldAndLevel?.informatique?.L1 || 5000;
                    const updated = { ...tuitionFees };
                    fields.forEach(field => {
                      updated.byFieldAndLevel[field.id] = {};
                      levels.forEach(level => {
                        updated.byFieldAndLevel[field.id][level] = baseFee;
                      });
                    });
                    setTuitionFees(updated);
                  }
                }}
                className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Uniformiser tous les tarifs
              </button>
              <button
                onClick={() => {
                  if (confirm('Augmenter tous les tarifs de 10% ?')) {
                    const updated = { ...tuitionFees };
                    fields.forEach(field => {
                      levels.forEach(level => {
                        const current = updated.byFieldAndLevel[field.id]?.[level] || 0;
                        if (!updated.byFieldAndLevel[field.id]) {
                          updated.byFieldAndLevel[field.id] = {};
                        }
                        updated.byFieldAndLevel[field.id][level] = Math.round(current * 1.1);
                      });
                    });
                    setTuitionFees(updated);
                  }
                }}
                className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
              >
                +10% sur tous
              </button>
            </div>
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
              <span className="text-gray-700">Tarif L1 Informatique :</span>
              <span className="font-semibold">{tuitionFees.byFieldAndLevel?.informatique?.L1 || 0} {symbol}</span>
            </div>
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
