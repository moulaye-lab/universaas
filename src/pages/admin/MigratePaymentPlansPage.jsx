/**
 * MigratePaymentPlansPage.jsx - Migration des plans de paiement incomplets
 *
 * Fonctionnalités:
 * - Détecte les plans incomplets (totalAmount = 0 ou pas d'installments)
 * - Calcule le bon montant selon la filière et le niveau
 * - Génère les échéances manquantes
 * - Met à jour Firebase
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import { ChevronLeft, AlertTriangle, CheckCircle, Play, Loader } from 'lucide-react';

export default function MigratePaymentPlansPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { symbol } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [students, setStudents] = useState([]);
  const [paymentPlans, setPaymentPlans] = useState({});
  const [tuitionFees, setTuitionFees] = useState(null);
  const [incompletePlans, setIncompletePlans] = useState([]);
  const [migrationResults, setMigrationResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const currentAcademicYear = getCurrentAcademicYear();

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
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);

      // Charger étudiants
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);
      const studentsData = studentsSnap.exists()
        ? Object.entries(studentsSnap.val()).map(([id, data]) => ({ id, ...data }))
        : [];
      setStudents(studentsData);

      // Charger plans de paiement
      const paymentsRef = ref(database, `universities/${userProfile.universityId}/payments`);
      const paymentsSnap = await get(paymentsRef);
      const paymentsData = paymentsSnap.exists() ? paymentsSnap.val() : {};
      setPaymentPlans(paymentsData);

      // Charger tarifs
      const feesRef = ref(database, `universities/${userProfile.universityId}/tuition_fees/${currentAcademicYear}`);
      const feesSnap = await get(feesRef);
      if (feesSnap.exists()) {
        setTuitionFees(feesSnap.val());
      }

      // Identifier les plans incomplets
      const incomplete = [];
      studentsData.forEach(student => {
        const plan = paymentsData[student.id];
        if (plan) {
          const hasIssues =
            !plan.totalAmount ||
            plan.totalAmount === 0 ||
            !plan.installments ||
            !Array.isArray(plan.installments) ||
            plan.installments.length === 0;

          if (hasIssues) {
            incomplete.push({
              studentId: student.id,
              studentName: `${student.firstName} ${student.lastName}`,
              level: student.level,
              fieldOfStudy: student.fieldOfStudy,
              currentPlan: plan,
              issue: !plan.totalAmount || plan.totalAmount === 0
                ? 'Montant = 0'
                : 'Pas d\'échéances'
            });
          }
        }
      });

      setIncompletePlans(incomplete);
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      alert('Erreur lors du chargement: ' + err.message);
      setLoading(false);
    }
  };

  const calculateTuitionForStudent = (student) => {
    if (!tuitionFees) return 5000;

    // Nouveau format: byFieldAndLevel[filière][niveau]
    if (tuitionFees.byFieldAndLevel && student.fieldOfStudy && student.level) {
      const fieldKey = student.fieldOfStudy.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '_');

      const fieldMapping = {
        'informatique': 'informatique',
        'mathematiques': 'mathematiques',
        'mathématiques': 'mathematiques',
        'mathematics': 'mathematiques',
        'physique': 'physique',
        'physics': 'physique',
        'chimie': 'chimie',
        'chemistry': 'chimie',
        'biologie': 'biologie',
        'biology': 'biologie',
        'economie': 'economie',
        'économie': 'economie',
        'economics': 'economie',
        'gestion': 'gestion',
        'management': 'gestion',
        'droit': 'droit',
        'law': 'droit',
        'medecine': 'medecine',
        'médecine': 'medecine',
        'medicine': 'medecine',
        'ingenerie': 'ingenerie',
        'ingenierie': 'ingenerie',
        'ingénierie': 'ingenerie',
        'engineering': 'ingenerie',
        'lettres': 'lettres',
        'literature': 'lettres',
        'sciences_sociales': 'sciences_sociales',
        'social_sciences': 'sciences_sociales',
        'computer_science': 'informatique'
      };

      const normalizedFieldKey = fieldMapping[fieldKey] || fieldKey;

      if (tuitionFees.byFieldAndLevel[normalizedFieldKey]?.[student.level]) {
        return tuitionFees.byFieldAndLevel[normalizedFieldKey][student.level];
      }
    }

    // Fallback
    if (tuitionFees.byLevel && student.level) {
      let amount = tuitionFees.byLevel[student.level] || 5000;
      if (tuitionFees.byField && student.fieldOfStudy) {
        const fieldKey = student.fieldOfStudy.toLowerCase().replace(/\s+/g, '-');
        amount += tuitionFees.byField[fieldKey] || 0;
      }
      return amount;
    }

    return 5000;
  };

  const generateInstallments = (totalAmount, count = 3) => {
    const installmentAmount = Math.floor(totalAmount / count);
    const remainder = totalAmount - (installmentAmount * count);

    const installments = [];
    const startDate = new Date();

    for (let i = 0; i < count; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + (i * 3)); // Tous les 3 mois

      installments.push({
        amount: i === 0 ? installmentAmount + remainder : installmentAmount,
        dueDate: dueDate.getTime(),
        status: 'pending',
        installmentNumber: i + 1
      });
    }

    return installments;
  };

  const handleMigrate = async () => {
    if (!confirm(`Migrer ${incompletePlans.length} plan(s) de paiement ?`)) {
      return;
    }

    setMigrating(true);
    const results = [];

    for (const plan of incompletePlans) {
      try {
        const student = students.find(s => s.id === plan.studentId);
        if (!student) {
          results.push({
            studentName: plan.studentName,
            status: 'error',
            message: 'Étudiant introuvable'
          });
          continue;
        }

        // Calculer le bon montant
        const totalAmount = calculateTuitionForStudent(student);

        // Générer les échéances
        const installments = generateInstallments(totalAmount, 3);

        // Calculer paidAmount (garder les paiements existants)
        const existingPaidAmount = plan.currentPlan.paidAmount || 0;

        // Mettre à jour le plan
        const paymentRef = ref(
          database,
          `universities/${userProfile.universityId}/payments/${plan.studentId}`
        );

        await update(paymentRef, {
          totalAmount,
          paidAmount: existingPaidAmount,
          installments,
          academicYear: currentAcademicYear,
          status: existingPaidAmount >= totalAmount ? 'completed' : 'active',
          migratedAt: Date.now(),
          migratedBy: userProfile.uid
        });

        results.push({
          studentName: plan.studentName,
          status: 'success',
          message: `${totalAmount} ${symbol}, ${installments.length} échéances`
        });
      } catch (err) {
        console.error(`Error migrating plan for ${plan.studentName}:`, err);
        results.push({
          studentName: plan.studentName,
          status: 'error',
          message: err.message
        });
      }
    }

    setMigrationResults(results);
    setShowResults(true);
    setMigrating(false);

    // Recharger les données
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-4 sm:p-6 lg:p-8">
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
              <h1 className="text-3xl font-bold text-gray-900">🔧 Migration Plans de Paiement</h1>
              <p className="text-gray-600 mt-1">Corriger les plans incomplets automatiquement</p>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-gray-600 mb-1">Total étudiants</p>
            <p className="text-3xl font-bold text-gray-900">{students.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-gray-600 mb-1">Plans existants</p>
            <p className="text-3xl font-bold text-blue-600">{Object.keys(paymentPlans).length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-gray-600 mb-1">Plans incomplets</p>
            <p className="text-3xl font-bold text-orange-600">{incompletePlans.length}</p>
          </div>
        </div>

        {/* Liste des plans incomplets */}
        {incompletePlans.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Tous les plans sont complets ✅</h2>
            <p className="text-gray-600">
              Aucune migration nécessaire. Tous les plans de paiement ont un montant et des échéances.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                  Plans à migrer ({incompletePlans.length})
                </h2>
                <button
                  onClick={handleMigrate}
                  disabled={migrating || !tuitionFees}
                  className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition flex items-center gap-2 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {migrating ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Migration en cours...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Lancer la migration
                    </>
                  )}
                </button>
              </div>

              {!tuitionFees && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <p className="font-semibold">⚠️ Tarifs non configurés</p>
                  <p className="text-sm">
                    Vous devez d'abord configurer les tarifs de scolarité dans{' '}
                    <button
                      onClick={() => navigate('/admin/tuition-fees')}
                      className="underline font-semibold"
                    >
                      Gestion des frais de scolarité
                    </button>
                  </p>
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {incompletePlans.map((plan, index) => {
                  const student = students.find(s => s.id === plan.studentId);
                  const calculatedAmount = student ? calculateTuitionForStudent(student) : 0;

                  return (
                    <div key={plan.studentId} className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{plan.studentName}</p>
                          <p className="text-sm text-gray-600">
                            {plan.level} - {plan.fieldOfStudy}
                          </p>
                          <p className="text-xs text-orange-700 mt-1">
                            <strong>Problème:</strong> {plan.issue}
                          </p>
                          {plan.currentPlan.totalAmount > 0 && (
                            <p className="text-xs text-gray-500">
                              Montant actuel: {plan.currentPlan.totalAmount} {symbol}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Nouveau montant:</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {calculatedAmount} {symbol}
                          </p>
                          <p className="text-xs text-gray-500">3 échéances</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Résultats de la migration */}
            {showResults && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Résultats de la migration</h2>
                <div className="space-y-2">
                  {migrationResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-xl border ${
                        result.status === 'success'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900">{result.studentName}</p>
                        <div className="flex items-center gap-2">
                          {result.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          )}
                          <span
                            className={`text-sm ${
                              result.status === 'success' ? 'text-green-700' : 'text-red-700'
                            }`}
                          >
                            {result.message}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="font-semibold text-blue-900 mb-2">✅ Migration terminée</p>
                  <p className="text-sm text-blue-700">
                    {migrationResults.filter(r => r.status === 'success').length} plan(s) migré(s) avec succès,{' '}
                    {migrationResults.filter(r => r.status === 'error').length} erreur(s)
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
