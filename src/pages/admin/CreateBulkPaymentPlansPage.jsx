/**
 * CreateBulkPaymentPlansPage.jsx - Création en masse de plans de paiement
 *
 * Fonctionnalités:
 * - Sélection par classe, niveau ou filière
 * - Calcul automatique des montants selon tarifs configurés
 * - Prévisualisation des plans à créer
 * - Création groupée en un clic
 * - Exclusion des étudiants ayant déjà un plan
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import { ChevronLeft, Users, DollarSign, Calendar, CheckCircle, AlertCircle, Eye } from 'lucide-react';

export default function CreateBulkPaymentPlansPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const { symbol, formatAmount } = useCurrency();

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectionMode, setSelectionMode] = useState('class'); // 'class', 'level', 'field'

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedField, setSelectedField] = useState('');

  const [students, setStudents] = useState([]);
  const [existingPlans, setExistingPlans] = useState({});
  const [tuitionFees, setTuitionFees] = useState(null);

  const [formData, setFormData] = useState({
    academicYear: getCurrentAcademicYear(),
    installmentsCount: 3,
    startDate: new Date().toISOString().split('T')[0],
    currency: 'EUR'
  });

  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);

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

  useEffect(() => {
    loadInitialData();
  }, [userProfile]);

  useEffect(() => {
    if (selectionMode && (selectedClassId || selectedLevel || selectedField)) {
      loadStudents();
    }
  }, [selectionMode, selectedClassId, selectedLevel, selectedField]);

  const loadInitialData = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);

      // Charger classes
      const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
      const classesSnap = await get(classesRef);
      if (classesSnap.exists()) {
        const classesData = Object.entries(classesSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        setClasses(classesData);
      }

      // Charger plans existants
      const paymentsRef = ref(database, `universities/${userProfile.universityId}/payments`);
      const paymentsSnap = await get(paymentsRef);
      if (paymentsSnap.exists()) {
        setExistingPlans(paymentsSnap.val());
      }

      // Charger tarifs
      const feesRef = ref(database, `universities/${userProfile.universityId}/tuition_fees/${formData.academicYear}`);
      const feesSnap = await get(feesRef);
      if (feesSnap.exists()) {
        setTuitionFees(feesSnap.val());
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      alert('Erreur lors du chargement: ' + err.message);
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      if (!studentsSnap.exists()) {
        setStudents([]);
        setLoading(false);
        return;
      }

      let allStudents = Object.entries(studentsSnap.val()).map(([id, data]) => ({
        id,
        ...data
      }));

      // Filtrer selon le mode de sélection
      let filtered = [];

      if (selectionMode === 'class' && selectedClassId) {
        const selectedClass = classes.find(c => c.id === selectedClassId);
        if (selectedClass?.students) {
          filtered = allStudents.filter(s => selectedClass.students.includes(s.id));
        }
      } else if (selectionMode === 'level' && selectedLevel) {
        filtered = allStudents.filter(s => s.level === selectedLevel);
      } else if (selectionMode === 'field' && selectedField) {
        filtered = allStudents.filter(s => {
          const studentField = s.fieldOfStudy?.toLowerCase().replace(/\s+/g, '-') || '';
          return studentField === selectedField || s.fieldOfStudy?.toLowerCase().includes(selectedField);
        });
      }

      // Ne plus filtrer - on affiche tout le monde
      setStudents(filtered);
      setLoading(false);
    } catch (err) {
      console.error('Error loading students:', err);
      setLoading(false);
    }
  };

  const calculateTuitionForStudent = (student) => {
    if (!tuitionFees) {
      console.warn('⚠️ Pas de tarifs configurés');
      return 5000;
    }

    console.log('💰 Calcul tarif pour:', {
      studentName: `${student.firstName} ${student.lastName}`,
      fieldOfStudy: student.fieldOfStudy,
      level: student.level,
      tuitionFeesStructure: Object.keys(tuitionFees),
      availableFields: tuitionFees.byFieldAndLevel ? Object.keys(tuitionFees.byFieldAndLevel) : []
    });

    // Nouveau format: byFieldAndLevel[filière][niveau]
    if (tuitionFees.byFieldAndLevel && student.fieldOfStudy && student.level) {
      // Normaliser le nom de la filière pour correspondre aux IDs
      const fieldKey = student.fieldOfStudy.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Retirer accents
        .replace(/\s+/g, '_'); // Remplacer espaces par underscores

      // Mapper les variations possibles (anglais -> français)
      const fieldMapping = {
        // Français
        'informatique': 'informatique',
        'mathematiques': 'mathematiques',
        'mathématiques': 'mathematiques',
        'physique': 'physique',
        'chimie': 'chimie',
        'biologie': 'biologie',
        'economie': 'economie',
        'économie': 'economie',
        'gestion': 'gestion',
        'droit': 'droit',
        'medecine': 'medecine',
        'médecine': 'medecine',
        'ingenerie': 'ingenerie',
        'ingenierie': 'ingenerie',
        'ingénierie': 'ingenerie',
        'lettres': 'lettres',
        'sciences_sociales': 'sciences_sociales',
        // Anglais -> Français
        'computer_science': 'informatique',
        'mathematics': 'mathematiques',
        'physics': 'physique',
        'chemistry': 'chimie',
        'biology': 'biologie',
        'economics': 'economie',
        'management': 'gestion',
        'law': 'droit',
        'medicine': 'medecine',
        'engineering': 'ingenerie',
        'literature': 'lettres',
        'social_sciences': 'sciences_sociales'
      };

      const normalizedFieldKey = fieldMapping[fieldKey] || fieldKey;

      console.log('🔍 Normalisation filière:', {
        original: student.fieldOfStudy,
        fieldKey,
        normalizedFieldKey,
        found: !!tuitionFees.byFieldAndLevel[normalizedFieldKey],
        tarif: tuitionFees.byFieldAndLevel[normalizedFieldKey]?.[student.level]
      });

      if (tuitionFees.byFieldAndLevel[normalizedFieldKey]?.[student.level]) {
        const amount = tuitionFees.byFieldAndLevel[normalizedFieldKey][student.level];
        console.log('✅ Tarif trouvé:', amount);
        return amount;
      } else {
        console.warn('⚠️ Pas de tarif pour', normalizedFieldKey, student.level);
      }
    }

    // Fallback: ancien format (pour compatibilité)
    let amount = 0;
    if (tuitionFees.byLevel && student.level) {
      amount = tuitionFees.byLevel[student.level] || tuitionFees.defaultFee || 5000;

      // Ajustement par filière (ancien format)
      if (tuitionFees.byField && student.fieldOfStudy) {
        const fieldKey = student.fieldOfStudy.toLowerCase().replace(/\s+/g, '-');
        const fieldAdjustment = tuitionFees.byField[fieldKey] || 0;
        amount += fieldAdjustment;
      }
      return amount;
    }

    return tuitionFees.defaultFee || 5000;
  };

  const handlePreview = () => {
    // Filtrer selon l'option "remplacer"
    let studentsToProcess = students;
    if (!replaceExisting) {
      studentsToProcess = students.filter(s => !existingPlans[s.id]);
    }

    if (studentsToProcess.length === 0) {
      alert('Aucun plan à créer. Tous les étudiants ont déjà un plan. Cochez "Remplacer les plans existants" pour les écraser.');
      return;
    }

    const preview = studentsToProcess.map(student => {
      const totalAmount = calculateTuitionForStudent(student);
      const installmentsCount = formData.installmentsCount;

      // Calculer échéances
      const baseAmount = Math.floor((totalAmount / installmentsCount) * 100) / 100;
      const lastAmount = totalAmount - (baseAmount * (installmentsCount - 1));

      const installments = [];
      for (let i = 0; i < installmentsCount; i++) {
        const dueDate = new Date(formData.startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        installments.push({
          amount: i === installmentsCount - 1 ? lastAmount : baseAmount,
          dueDate: dueDate.getTime(),
          status: 'pending',
          installmentNumber: i + 1,
          totalInstallments: installmentsCount
        });
      }

      return {
        student,
        totalAmount,
        installments
      };
    });

    setPreviewData(preview);
    setShowPreview(true);
  };

  const handleCreateAll = async () => {
    if (previewData.length === 0) {
      alert('Aucun plan à créer');
      return;
    }

    const confirmMsg = `Vous allez créer ${previewData.length} plan(s) de paiement.\n\nContinuer ?`;
    if (!confirm(confirmMsg)) return;

    try {
      setCreating(true);
      let successCount = 0;
      let failedCount = 0;

      for (const preview of previewData) {
        try {
          const paymentPlan = {
            studentId: preview.student.id,
            totalAmount: preview.totalAmount,
            currency: formData.currency,
            installments: preview.installments,
            academicYear: formData.academicYear,
            description: `Créé en masse - ${new Date().toLocaleDateString('fr-FR')}`,
            createdAt: Date.now(),
            createdBy: currentUser?.uid || userProfile?.uid || 'unknown'
          };

          const paymentRef = ref(
            database,
            `universities/${userProfile.universityId}/payments/${preview.student.id}`
          );
          await set(paymentRef, paymentPlan);

          successCount++;
        } catch (err) {
          console.error(`Error creating plan for ${preview.student.id}:`, err);
          failedCount++;
        }
      }

      setCreating(false);
      alert(`✅ Création terminée !\n\nSuccès: ${successCount}\nÉchecs: ${failedCount}`);

      if (successCount > 0) {
        navigate('/admin/payments');
      }
    } catch (err) {
      console.error('Error creating bulk plans:', err);
      alert('Erreur: ' + err.message);
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/payments')}
            className="p-2 hover:bg-white rounded-xl transition"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">⚡ Création en Masse de Plans de Paiement</h1>
            <p className="text-gray-600 mt-1">Créer plusieurs plans en un seul clic</p>
          </div>
        </div>

        {/* Mode de sélection */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">1️⃣ Sélectionner les étudiants</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => {
                setSelectionMode('class');
                setStudents([]);
              }}
              className={`p-4 rounded-xl border-2 transition ${
                selectionMode === 'class'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="font-bold text-gray-900">Par Classe</p>
              <p className="text-xs text-gray-600">Tous les étudiants d'une classe</p>
            </button>

            <button
              onClick={() => {
                setSelectionMode('level');
                setStudents([]);
              }}
              className={`p-4 rounded-xl border-2 transition ${
                selectionMode === 'level'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-gray-900">Par Niveau</p>
              <p className="text-xs text-gray-600">L1, L2, L3, M1, M2...</p>
            </button>

            <button
              onClick={() => {
                setSelectionMode('field');
                setStudents([]);
              }}
              className={`p-4 rounded-xl border-2 transition ${
                selectionMode === 'field'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="font-bold text-gray-900">Par Filière</p>
              <p className="text-xs text-gray-600">Info, Maths, Physique...</p>
            </button>
          </div>

          {/* Sélecteurs */}
          {selectionMode === 'class' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Classe</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500"
              >
                <option value="">-- Sélectionner une classe --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.students?.length || 0} étudiants)
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectionMode === 'level' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Niveau</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500"
              >
                <option value="">-- Sélectionner un niveau --</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          )}

          {selectionMode === 'field' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filière</label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500"
              >
                <option value="">-- Sélectionner une filière --</option>
                {fields.map(field => (
                  <option key={field.id} value={field.id}>{field.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Résultats */}
        {students.length > 0 && (
          <>
            {/* Configuration */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">2️⃣ Configuration des plans</h2>

              <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">
                      ⚠️ Remplacer les plans existants
                    </p>
                    <p className="text-sm text-gray-600">
                      Si coché, les plans de paiement existants seront écrasés. Sinon, seuls les étudiants sans plan seront traités.
                    </p>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Année académique</label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre d'échéances</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={formData.installmentsCount}
                    onChange={(e) => setFormData({ ...formData, installmentsCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500"
                    placeholder="Ex: 3"
                  />
                  <p className="text-xs text-gray-500 mt-1">Entre 1 et 24 échéances</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date de début</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Liste étudiants */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  3️⃣ Étudiants trouvés ({students.length})
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={handlePreview}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition flex items-center gap-2 font-semibold disabled:bg-gray-300"
                  >
                    <Eye className="h-5 w-5" />
                    Prévisualiser
                  </button>
                </div>
              </div>

              {!tuitionFees && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0" />
                  <p className="text-sm text-orange-800">
                    ⚠️ Aucun tarif configuré pour {formData.academicYear}. Montant par défaut : {formatAmount(5000)}.
                    <a href="/admin/tuition-fees" className="underline ml-2">Configurer les tarifs</a>
                  </p>
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {students.map(student => {
                  const amount = calculateTuitionForStudent(student);
                  const hasExistingPlan = !!existingPlans[student.id];
                  return (
                    <div key={student.id} className={`p-4 rounded-xl border flex justify-between items-center ${
                      hasExistingPlan
                        ? 'bg-orange-50 border-orange-300'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-900">
                            {student.firstName} {student.lastName}
                          </p>
                          {hasExistingPlan && (
                            <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs font-semibold rounded-full">
                              ⚠️ Plan existant
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {student.level} - {student.fieldOfStudy} | Matricule: {student.matricule}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-blue-600">{formatAmount(amount)}</p>
                        <p className="text-xs text-gray-600">{formData.installmentsCount} échéances</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Pas de résultats */}
        {!loading && students.length === 0 && (selectionMode && (selectedClassId || selectedLevel || selectedField)) && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Tous les étudiants ont déjà un plan !</h3>
            <p className="text-gray-600">Aucun plan à créer pour cette sélection.</p>
          </div>
        )}

        {/* Modal Prévisualisation */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                📋 Prévisualisation ({previewData.length} plans)
              </h2>

              <div className="space-y-3 mb-6">
                {previewData.slice(0, 10).map((preview, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold text-gray-900">
                        {preview.student.firstName} {preview.student.lastName}
                      </p>
                      <p className="text-xl font-black text-blue-600">{formatAmount(preview.totalAmount)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {preview.installments.map((inst, i) => (
                        <div key={i} className="text-gray-600">
                          Éch. {i + 1}: {formatAmount(inst.amount)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {previewData.length > 10 && (
                  <p className="text-center text-gray-500 text-sm">
                    ... et {previewData.length - 10} autre(s)
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateAll}
                  disabled={creating}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  {creating ? 'Création en cours...' : `Créer ${previewData.length} plan(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
