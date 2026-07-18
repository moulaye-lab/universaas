/**
 * FreePaymentPage.jsx - Page de paiement libre
 *
 * Fonctionnalités:
 * - Recherche d'étudiant avec filtres avancés
 * - Enregistrement de paiement libre (avance)
 * - Ajustement automatique des échéances
 * - Création automatique de revenu + entrée journal de caisse
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set, push } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import { createNotification, NOTIFICATION_TYPES } from '../../services/notificationService';
import {
  ChevronLeft,
  Search,
  Users,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Wallet,
  Filter,
  XCircle
} from 'lucide-react';

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export default function FreePaymentPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { symbol, formatAmount } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Données
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  // Étudiant sélectionné
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentPaymentPlan, setStudentPaymentPlan] = useState(null);

  // Formulaire paiement
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'cash',
    description: '',
    academicYear: getCurrentAcademicYear()
  });

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [allStudents, searchTerm, departmentFilter, levelFilter, classFilter]);

  const loadData = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const univId = userProfile.universityId;

      // Charger départements
      const deptsRef = ref(database, 'departments');
      const deptsSnap = await get(deptsRef);
      const deptsData = deptsSnap.exists()
        ? Object.entries(deptsSnap.val()).map(([id, data]) => ({ id, ...data }))
        : [];
      setDepartments(deptsData);

      // Charger classes
      const classesRef = ref(database, `universities/${univId}/classes`);
      const classesSnap = await get(classesRef);
      const classesData = classesSnap.exists()
        ? Object.entries(classesSnap.val()).map(([id, data]) => ({ id, ...data }))
        : [];
      setClasses(classesData);

      // Charger étudiants
      const studentsRef = ref(database, `universities/${univId}/students`);
      const studentsSnap = await get(studentsRef);
      const studentsData = studentsSnap.exists()
        ? Object.entries(studentsSnap.val()).map(([id, data]) => ({ id, ...data }))
        : [];
      setAllStudents(studentsData);

      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allStudents];

    // Filtre recherche
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.firstName?.toLowerCase().includes(term) ||
          s.lastName?.toLowerCase().includes(term) ||
          s.matricule?.toLowerCase().includes(term) ||
          s.email?.toLowerCase().includes(term)
      );
    }

    // Filtre département
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(s => s.department === departmentFilter);
      if (filtered.length === 0 && allStudents.length > 0) {
      }
    }

    // Filtre niveau
    if (levelFilter !== 'all') {
      filtered = filtered.filter(s => s.level === levelFilter);
    }

    // Filtre classe
    if (classFilter !== 'all') {
      filtered = filtered.filter(s => s.class === classFilter);
    }

    setFilteredStudents(filtered);
  };

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setError('');
    setSuccess('');

    // Charger le plan de paiement de l'étudiant
    try {
      const paymentRef = ref(database, `universities/${userProfile.universityId}/payments/${student.id}`);
      const paymentSnap = await get(paymentRef);

      if (paymentSnap.exists()) {
        const plan = paymentSnap.val();
        setStudentPaymentPlan(plan);

        // Vérifier si le solde est à 0
        const totalAmount = plan.totalAmount || 0;
        const paidAmount = plan.paidAmount || 0;
        const remainingBalance = totalAmount - paidAmount;

        if (remainingBalance <= 0) {
          setError('✅ Cet étudiant a déjà payé l\'intégralité de ses frais de scolarité. Aucun paiement supplémentaire n\'est nécessaire.');
        }
      } else {
        setStudentPaymentPlan(null);
        setError('Cet étudiant n\'a pas de plan de paiement. Veuillez d\'abord créer un plan de paiement.');
      }
    } catch (err) {
      console.error('Error loading payment plan:', err);
      setError('Erreur lors du chargement du plan de paiement');
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentUser || !userProfile) {
      setError('Session invalide. Veuillez vous reconnecter.');
      return;
    }

    if (!selectedStudent || !studentPaymentPlan) {
      setError('Veuillez sélectionner un étudiant avec un plan de paiement');
      return;
    }

    const amount = parseFloat(paymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Veuillez entrer un montant valide');
      return;
    }

    // Vérifier si le solde est à 0
    const totalAmount = studentPaymentPlan.totalAmount || 0;
    const paidAmount = studentPaymentPlan.paidAmount || 0;
    const remainingBalance = totalAmount - paidAmount;

    if (remainingBalance <= 0) {
      setError('✅ Cet étudiant a déjà payé l\'intégralité de ses frais. Aucun paiement supplémentaire n\'est possible.');
      return;
    }

    if (amount > remainingBalance) {
      setError(`Le montant saisi (${formatAmount(amount)}) dépasse le solde restant (${formatAmount(remainingBalance)})`);
      return;
    }

    if (!confirm(`Confirmer le paiement libre de ${formatAmount(amount)} pour ${selectedStudent.firstName} ${selectedStudent.lastName} ?`)) {
      return;
    }

    try {
      setProcessing(true);
      const now = Date.now();
      const todayDate = new Date().toISOString().split('T')[0];

      // 1. Ajuster les échéances automatiquement
      const updatedInstallments = [...studentPaymentPlan.installments];
      const pendingInstallments = updatedInstallments
        .map((inst, idx) => ({ ...inst, originalIndex: idx }))
        .filter(inst => inst.status === 'pending')
        .sort((a, b) => a.dueDate - b.dueDate);

      let remainingAmount = amount;
      let adjustedCount = 0;

      for (const installment of pendingInstallments) {
        if (remainingAmount <= 0) break;

        const installmentAmount = installment.amount;
        const originalAmount = installment.originalAmount || installment.amount;

        if (remainingAmount >= installmentAmount) {
          // Paiement complet de l'échéance
          updatedInstallments[installment.originalIndex].status = 'paid';
          updatedInstallments[installment.originalIndex].paidDate = now;
          updatedInstallments[installment.originalIndex].paidAmount = installmentAmount;
          updatedInstallments[installment.originalIndex].paymentMethod = paymentData.paymentMethod;
          remainingAmount -= installmentAmount;
          adjustedCount++;
        } else {
          // Paiement partiel de l'échéance
          updatedInstallments[installment.originalIndex].amount = originalAmount - remainingAmount;
          updatedInstallments[installment.originalIndex].partialPayment = {
            amount: remainingAmount,
            date: now,
            method: paymentData.paymentMethod
          };
          remainingAmount = 0;
          adjustedCount++;
        }
      }

      // 2. Mettre à jour le plan de paiement
      const paymentsRef = ref(database, `universities/${userProfile.universityId}/payments/${selectedStudent.id}`);
      await set(paymentsRef, {
        ...studentPaymentPlan,
        installments: updatedInstallments
      });

      // 3. Créer l'entrée de revenu
      const revenuesRef = ref(database, `universities/${userProfile.universityId}/accounting/revenues`);
      const newRevenueRef = push(revenuesRef);
      await set(newRevenueRef, {
        description: paymentData.description || `Paiement libre - ${selectedStudent.firstName} ${selectedStudent.lastName}`,
        amount: amount,
        category: 'Frais de scolarité',
        date: todayDate,
        academicYear: paymentData.academicYear,
        status: 'received',
        paymentMethod: paymentData.paymentMethod,
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        studentMatricule: selectedStudent.matricule,
        createdAt: now,
        createdBy: userProfile.profileId,
        createdByName: userProfile.displayName,
        createdByRole: userProfile.role
      });

      // 4. Créer l'entrée dans le journal de caisse
      const cashJournalRef = ref(database, `universities/${userProfile.universityId}/accounting/cashJournal`);
      const newCashEntryRef = push(cashJournalRef);
      await set(newCashEntryRef, {
        type: 'revenue',
        description: paymentData.description || `Paiement libre - ${selectedStudent.firstName} ${selectedStudent.lastName}`,
        amount: amount,
        date: todayDate,
        paymentMethod: paymentData.paymentMethod,
        category: 'Frais de scolarité',
        processedBy: currentUser?.uid || 'unknown',
        processedByName: userProfile?.displayName || 'Unknown',
        processedByRole: userProfile?.role || 'unknown',
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        createdAt: now
      });

      // 5. Notifier l'étudiant du paiement reçu
      await createNotification(userProfile.universityId, {
        type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
        title: '✅ Paiement reçu',
        message: `Votre paiement de ${formatAmount(amount)} a été enregistré avec succès`,
        recipientId: selectedStudent.id,
        priority: 'normal',
        metadata: {
          amount: amount,
          paymentMethod: paymentData.paymentMethod,
          description: paymentData.description
        }
      }).catch(err => console.error('Error sending notification:', err));

      setSuccess(`Paiement de ${formatAmount(amount)} enregistré avec succès. ${adjustedCount} échéance(s) ajustée(s).`);
      setPaymentData({
        amount: '',
        paymentMethod: 'cash',
        description: '',
        academicYear: getCurrentAcademicYear()
      });

      // Recharger le plan de paiement
      setTimeout(() => {
        handleSelectStudent(selectedStudent);
      }, 1500);

      setProcessing(false);
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Erreur lors de l\'enregistrement du paiement');
      setProcessing(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('all');
    setLevelFilter('all');
    setClassFilter('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/admin/payments')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="h-8 w-8 text-blue-600" />
                Paiement Libre
              </h1>
              <p className="text-gray-600 mt-1">Enregistrer un paiement en avance</p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 rounded-2xl p-6 border-l-4 border-blue-500">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Comment fonctionne le paiement libre ?
            </h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>L'étudiant paie un montant en avance (cash, virement, chèque, carte)</li>
              <li>Le système ajuste automatiquement les échéances en attente par ordre chronologique</li>
              <li>Une entrée de revenu et une entrée de journal de caisse sont créées automatiquement</li>
              <li>La traçabilité complète est assurée (qui, quand, combien, comment)</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche: Recherche d'étudiant */}
          <div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-6 w-6 text-indigo-600" />
                  Sélectionner un étudiant
                </h2>
                <button
                  onClick={resetFilters}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition flex items-center gap-1"
                >
                  <XCircle className="h-4 w-4" />
                  Réinitialiser
                </button>
              </div>

              {/* Filtres */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Nom, matricule, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Département</label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Tous</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Niveau</label>
                    <select
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Tous</option>
                      <option value="L1">L1</option>
                      <option value="L2">L2</option>
                      <option value="L3">L3</option>
                      <option value="M1">M1</option>
                      <option value="M2">M2</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Classe</label>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Toutes</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.name}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Liste étudiants */}
              <div className="border border-gray-200 rounded-xl max-h-96 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">Aucun étudiant trouvé</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredStudents.map(student => (
                      <button
                        key={student.id}
                        onClick={() => handleSelectStudent(student)}
                        className={`w-full text-left p-4 hover:bg-blue-50 transition ${
                          selectedStudent?.id === student.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{student.matricule}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-700">{student.level || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{student.department || 'N/A'}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Colonne droite: Formulaire de paiement */}
          <div>
            <div className="glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                Enregistrer le paiement
              </h2>

              {!selectedStudent ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Sélectionnez un étudiant pour continuer</p>
                </div>
              ) : !studentPaymentPlan ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Cet étudiant n'a pas de plan de paiement</p>
                  <button
                    onClick={() => navigate('/admin/payments/create')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                  >
                    Créer un plan de paiement
                  </button>
                </div>
              ) : (
                <>
                  {/* Info étudiant sélectionné */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <p className="text-sm text-gray-600 mb-1">Étudiant sélectionné</p>
                    <p className="font-bold text-gray-900 text-lg">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </p>
                    <p className="text-sm text-gray-700">{selectedStudent.matricule}</p>
                  </div>

                  {/* Résumé du plan de paiement */}
                  <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">Résumé du plan de paiement</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold text-gray-900">{formatAmount(studentPaymentPlan.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payé:</span>
                        <span className="font-semibold text-green-600">
                          {formatAmount(studentPaymentPlan.installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Restant:</span>
                        <span className="font-semibold text-orange-600">
                          {formatAmount(studentPaymentPlan.installments.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.amount || 0), 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Formulaire */}
                  <form onSubmit={handleSubmitPayment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Montant ({symbol}) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: 500.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mode de paiement <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={paymentData.paymentMethod}
                        onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="cash">Cash</option>
                        <option value="virement">Virement bancaire</option>
                        <option value="cheque">Chèque</option>
                        <option value="carte">Carte bancaire</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Année académique</label>
                      <input
                        type="text"
                        value={paymentData.academicYear}
                        onChange={(e) => setPaymentData({ ...paymentData, academicYear: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: 2026-2027"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnelle)</label>
                      <textarea
                        rows={3}
                        value={paymentData.description}
                        onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Informations supplémentaires..."
                      />
                    </div>

                    {error && (
                      <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{success}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={processing}
                      className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Traitement...' : 'Enregistrer le paiement'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
