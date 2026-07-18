/**
 * PaymentsManagementPage.jsx - Gestion des paiements (Admin)
 *
 * Fonctionnalités:
 * - Créer plan de paiement pour étudiant
 * - Voir tous les paiements avec filtres
 * - Marquer comme payé/en retard
 * - Statistiques revenus
 * - Export liste paiements
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set, push } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import {
  ChevronLeft,
  DollarSign,
  Plus,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  Search,
  Download,
  Wallet,
  Edit2,
  Trash2,
  Save
} from 'lucide-react';

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

export default function PaymentsManagementPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const { symbol, formatAmount } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);

  // Modal paiement libre
  const [showFreePaymentModal, setShowFreePaymentModal] = useState(false);
  const [freePaymentData, setFreePaymentData] = useState({
    studentId: '',
    amount: '',
    paymentMethod: 'cash',
    description: '',
    academicYear: getCurrentAcademicYear()
  });

  // Modal modification échéancier
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editableInstallments, setEditableInstallments] = useState([]);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, paid, pending, overdue
  const [levelFilter, setLevelFilter] = useState('all');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    totalExpected: 0
  });


  useEffect(() => {
    loadData();
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [allPayments, searchTerm, statusFilter, levelFilter, academicYearFilter, departmentFilter, classFilter]);

  const loadData = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const univId = userProfile.universityId;

      // Charger départements (globaux)
      const deptsRef = ref(database, 'departments');
      const deptsSnap = await get(deptsRef);
      const deptsData = deptsSnap.exists()
        ? Object.entries(deptsSnap.val()).map(([id, data]) => ({ id, ...data }))
        : [];
      setDepartments(deptsData);

      // Charger classes (de l'université)
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
        ? Object.entries(studentsSnap.val()).map(([id, data]) => ({
            id,
            ...data
          }))
        : [];
      setStudents(studentsData);

      // Charger tous les paiements
      const paymentsRef = ref(database, `universities/${univId}/payments`);
      const paymentsSnap = await get(paymentsRef);

      const paymentsList = [];
      if (paymentsSnap.exists()) {
        Object.entries(paymentsSnap.val()).forEach(([studentId, paymentData]) => {
          const student = studentsData.find(s => s.id === studentId);
          if (paymentData.installments && Array.isArray(paymentData.installments)) {
            paymentData.installments.forEach((inst, index) => {
              paymentsList.push({
                studentId,
                studentName: student ? `${student.firstName} ${student.lastName}` : 'Inconnu',
                studentMatricule: student?.matricule || 'N/A',
                studentLevel: student?.level || 'N/A',
                studentDepartment: student?.department || 'N/A',
                studentClass: student?.class || 'N/A',
                academicYear: paymentData.academicYear || 'N/A',
                installmentIndex: index,
                ...inst
              });
            });
          }
        });
      }

      setAllPayments(paymentsList);
      calculateStats(paymentsList);
      setLoading(false);
    } catch (err) {
      console.error('Error loading payments:', err);
      setLoading(false);
    }
  };

  const calculateStats = (payments) => {
    const now = Date.now();

    const totalRevenue = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const paidCount = payments.filter(p => p.status === 'paid').length;
    const pendingCount = payments.filter(p => p.status === 'pending' && p.dueDate >= now).length;
    const overdueCount = payments.filter(p => p.status === 'pending' && p.dueDate < now).length;

    const totalExpected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    setStats({
      totalRevenue,
      paidCount,
      pendingCount,
      overdueCount,
      totalExpected
    });
  };

  const applyFilters = () => {
    let filtered = [...allPayments];

    // Filtre statut
    const now = Date.now();
    if (statusFilter === 'paid') {
      filtered = filtered.filter(p => p.status === 'paid');
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(p => p.status === 'pending' && p.dueDate >= now);
    } else if (statusFilter === 'overdue') {
      filtered = filtered.filter(p => p.status === 'pending' && p.dueDate < now);
    }

    // Filtre niveau
    if (levelFilter !== 'all') {
      filtered = filtered.filter(p => p.studentLevel === levelFilter);
    }

    // Filtre année académique
    if (academicYearFilter !== 'all') {
      filtered = filtered.filter(p => p.academicYear === academicYearFilter);
    }

    // Filtre département
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(p => p.studentDepartment === departmentFilter);
    }

    // Filtre classe
    if (classFilter !== 'all') {
      filtered = filtered.filter(p => p.studentClass === classFilter);
    }

    // Recherche
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.studentName.toLowerCase().includes(term) ||
          p.studentMatricule.toLowerCase().includes(term)
      );
    }

    setFilteredPayments(filtered);
  };

  const handleMarkAsPaid = async (payment) => {
    // Demander le mode de paiement
    const paymentMethod = prompt(
      'Mode de paiement:\n1 = Cash\n2 = Virement\n3 = Chèque\n4 = Carte\n\nEntrez le numéro:',
      '1'
    );

    if (!paymentMethod) return;

    const methodMap = {
      '1': 'cash',
      '2': 'virement',
      '3': 'cheque',
      '4': 'carte'
    };

    const selectedMethod = methodMap[paymentMethod] || 'cash';
    const methodLabel = {
      'cash': 'Cash',
      'virement': 'Virement',
      'cheque': 'Chèque',
      'carte': 'Carte bancaire'
    }[selectedMethod];

    if (!confirm(`Confirmer le paiement de ${formatAmount(payment.amount)} par ${methodLabel} ?`)) return;

    try {
      setLoading(true);
      const now = Date.now();
      const todayDate = new Date().toISOString().split('T')[0];

      // 1. Marquer l'échéance comme payée
      console.log('🔵 Step 1: Marking installment as paid...');
      const installmentRef = ref(database, `universities/${userProfile.universityId}/payments/${payment.studentId}/installments/${payment.installmentIndex}`);

      await set(installmentRef, {
        amount: payment.amount,
        dueDate: payment.dueDate,
        status: 'paid',
        installmentNumber: payment.installmentNumber || payment.installmentIndex + 1,
        totalInstallments: payment.totalInstallments || 1,
        paidDate: now,
        paymentMethod: selectedMethod,
        paidBy: userProfile?.profileId,
        processedBy: userProfile?.displayName
      });
      console.log('✅ Step 1: Installment marked as paid');

      // 2. Créer une entrée de revenu automatiquement
      console.log('🔵 Step 2: Creating revenue entry...');
      const revenuesRef = ref(database, `universities/${userProfile.universityId}/accounting/revenues`);
        const newRevenueRef = push(revenuesRef);
        await set(newRevenueRef, {
          id: newRevenueRef.key,
          description: `Paiement scolarité - ${payment.studentName} - Échéance ${payment.installmentIndex + 1}`,
          amount: payment.amount,
          category: 'frais_scolarite',
          date: todayDate,
          academicYear: payment.academicYear || 'N/A',
          source: payment.studentName,
          studentId: payment.studentId,
          paymentMethod: selectedMethod,
          createdAt: now,
          createdBy: userProfile?.profileId || userProfile?.uid,
          createdByName: userProfile?.displayName,
          createdByRole: userProfile?.role,
          autoGenerated: true,
          linkedPayment: {
            studentId: payment.studentId,
            installmentIndex: payment.installmentIndex
          },
          notes: `Encaissé par ${userProfile?.displayName} (${methodLabel})`,
          history: []
        });
        console.log('✅ Step 2: Revenue created');

      // 3. Enregistrer dans le journal de caisse
      console.log('🔵 Step 3: Creating cash journal entry...');
      const cashJournalRef = ref(database, `universities/${userProfile.universityId}/accounting/cashJournal`);
        const newCashEntryRef = push(cashJournalRef);
        await set(newCashEntryRef, {
          id: newCashEntryRef.key,
          type: 'revenue', // revenue ou expense
          date: todayDate,
          timestamp: now,
          amount: payment.amount,
          paymentMethod: selectedMethod,
          category: 'frais_scolarite',
          description: `Scolarité ${payment.studentName} - Échéance ${payment.installmentIndex + 1}`,
          studentId: payment.studentId,
          studentName: payment.studentName,
          processedBy: userProfile?.profileId,
          processedByName: userProfile?.displayName,
          processedByRole: userProfile?.role,
          revenueId: newRevenueRef.key,
          notes: `${methodLabel} - ${payment.studentMatricule}`
        });
        console.log('✅ Step 3: Cash journal updated');

      alert('✅ Paiement enregistré avec succès!\n\n📝 Revenu créé automatiquement\n💰 Journal de caisse mis à jour');
      loadData();
      setLoading(false);
    } catch (err) {
      console.error('Error marking as paid:', err);
      alert('Erreur: ' + err.message);
      setLoading(false);
    }
  };

  const handleFreePayment = async (e) => {
    e.preventDefault();

    if (!freePaymentData.studentId || !freePaymentData.amount) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const student = students.find(s => s.id === freePaymentData.studentId);
    if (!student) {
      alert('Étudiant introuvable');
      return;
    }

    const amount = parseFloat(freePaymentData.amount);
    const methodLabel = {
      'cash': 'Cash',
      'virement': 'Virement',
      'cheque': 'Chèque',
      'carte': 'Carte bancaire'
    }[freePaymentData.paymentMethod];

    if (!confirm(`Confirmer le paiement libre de ${formatAmount(amount)} par ${methodLabel} pour ${student.firstName} ${student.lastName} ?`)) {
      return;
    }

    try {
      setLoading(true);
      const now = Date.now();
      const todayDate = new Date().toISOString().split('T')[0];

      // 1. Créer une entrée de revenu
      const revenuesRef = ref(database, `universities/${userProfile.universityId}/accounting/revenues`);
      const newRevenueRef = push(revenuesRef);
      await set(newRevenueRef, {
        id: newRevenueRef.key,
        description: freePaymentData.description || `Paiement libre - ${student.firstName} ${student.lastName}`,
        amount: amount,
        category: 'frais_scolarite',
        date: todayDate,
        academicYear: freePaymentData.academicYear,
        source: `${student.firstName} ${student.lastName}`,
        studentId: freePaymentData.studentId,
        paymentMethod: freePaymentData.paymentMethod,
        createdAt: now,
        createdBy: userProfile?.profileId || userProfile?.uid,
        createdByName: userProfile?.displayName,
        createdByRole: userProfile?.role,
        autoGenerated: false,
        freePayment: true,
        notes: `Paiement libre encaissé par ${userProfile?.displayName} (${methodLabel})`,
        history: []
      });

      // 2. Enregistrer dans le journal de caisse
      const cashJournalRef = ref(database, `universities/${userProfile.universityId}/accounting/cashJournal`);
      const newCashEntryRef = push(cashJournalRef);
      await set(newCashEntryRef, {
        id: newCashEntryRef.key,
        type: 'revenue',
        date: todayDate,
        timestamp: now,
        amount: amount,
        paymentMethod: freePaymentData.paymentMethod,
        category: 'frais_scolarite',
        description: freePaymentData.description || `Paiement libre ${student.firstName} ${student.lastName}`,
        studentId: freePaymentData.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        processedBy: userProfile?.profileId,
        processedByName: userProfile?.displayName,
        processedByRole: userProfile?.role,
        revenueId: newRevenueRef.key,
        notes: `${methodLabel} - ${student.matricule} - Paiement libre/avance`
      });

      // 3. Enregistrer dans l'historique de l'étudiant (optionnel - pour traçabilité)
      const studentPaymentHistoryRef = ref(database, `universities/${userProfile.universityId}/students/${freePaymentData.studentId}/paymentHistory`);
      const newHistoryRef = push(studentPaymentHistoryRef);
      await set(newHistoryRef, {
        amount: amount,
        date: now, // Firebase Rules exige timestamp number, pas string
        method: freePaymentData.paymentMethod, // Champ requis par rules
        status: 'completed',
        description: freePaymentData.description || 'Paiement libre'
      });

      // 4. Ajuster automatiquement les échéanciers si l'étudiant en a
      const paymentsRef = ref(database, `universities/${userProfile.universityId}/payments/${freePaymentData.studentId}`);
      const paymentsSnap = await get(paymentsRef);

      let adjustmentMessage = '';

      if (paymentsSnap.exists()) {
        const paymentData = paymentsSnap.val();
        let remainingAmount = amount;
        let adjustedCount = 0;

        // Parcourir les échéances en attente par ordre de date
        const installments = paymentData.installments || [];
        const pendingInstallments = installments
          .map((inst, idx) => ({ ...inst, originalIndex: idx }))
          .filter(inst => inst.status === 'pending')
          .sort((a, b) => a.dueDate - b.dueDate);

        for (const installment of pendingInstallments) {
          if (remainingAmount <= 0) break;

          const installmentAmount = installment.amount;

          if (remainingAmount >= installmentAmount) {
            // Payer complètement cette échéance
            paymentData.installments[installment.originalIndex].status = 'paid';
            paymentData.installments[installment.originalIndex].paidDate = now;
            paymentData.installments[installment.originalIndex].paymentMethod = freePaymentData.paymentMethod;
            paymentData.installments[installment.originalIndex].paidBy = userProfile?.profileId || userProfile?.uid;
            paymentData.installments[installment.originalIndex].processedBy = userProfile?.displayName;
            paymentData.installments[installment.originalIndex].paidViaFreePayment = true;
            paymentData.installments[installment.originalIndex].freePaymentNote = 'Payé via paiement libre/avance';

            remainingAmount -= installmentAmount;
            adjustedCount++;
          } else {
            // Paiement partiel - réduire le montant de cette échéance
            const originalAmount = installment.amount;
            paymentData.installments[installment.originalIndex].amount = originalAmount - remainingAmount;
            paymentData.installments[installment.originalIndex].partialPayment = {
              amountPaid: remainingAmount,
              originalAmount: originalAmount,
              date: now,
              method: freePaymentData.paymentMethod
            };

            remainingAmount = 0;
            adjustedCount++;
            break;
          }
        }

        // Mettre à jour le plan de paiement
        if (adjustedCount > 0) {
          await set(paymentsRef, paymentData);
          adjustmentMessage = `\n\n🔄 ${adjustedCount} échéance(s) ajustée(s) automatiquement`;

          if (remainingAmount > 0) {
            adjustmentMessage += `\n💰 Crédit restant: ${formatAmount(remainingAmount)}`;
          }
        }
      }

      alert(`✅ Paiement libre enregistré avec succès!\n\n📝 Revenu créé\n💰 Journal de caisse mis à jour\n📋 Historique étudiant enregistré${adjustmentMessage}`);

      // Reset
      setShowFreePaymentModal(false);
      setFreePaymentData({
        studentId: '',
        amount: '',
        paymentMethod: 'cash',
        description: '',
        academicYear: getCurrentAcademicYear()
      });

      loadData();
      setLoading(false);
    } catch (err) {
      console.error('Error recording free payment:', err);
      alert('Erreur: ' + err.message);
      setLoading(false);
    }
  };

  const handleEditSchedule = async (payment) => {
    try {
      const paymentsRef = ref(database, `universities/${userProfile.universityId}/payments/${payment.studentId}`);
      const paymentsSnap = await get(paymentsRef);

      if (paymentsSnap.exists()) {
        const paymentData = paymentsSnap.val();
        const student = students.find(s => s.id === payment.studentId);

        setEditingStudent({
          id: payment.studentId,
          name: student ? `${student.firstName} ${student.lastName}` : 'Inconnu',
          data: paymentData
        });

        setEditableInstallments([...paymentData.installments]);
        setShowEditScheduleModal(true);
      }
    } catch (err) {
      console.error('Error loading schedule:', err);
      alert('Erreur: ' + err.message);
    }
  };

  const handleSaveSchedule = async () => {
    if (!editingStudent) return;

    // Vérifications
    const hasInvalidAmount = editableInstallments.some(inst => !inst.amount || inst.amount <= 0);
    const hasInvalidDate = editableInstallments.some(inst => !inst.dueDate);

    if (hasInvalidAmount || hasInvalidDate) {
      alert('Toutes les échéances doivent avoir un montant > 0 et une date valide');
      return;
    }

    if (!confirm('Confirmer la modification de l\'échéancier ?')) return;

    try {
      setLoading(true);

      const paymentsRef = ref(database, `universities/${userProfile.universityId}/payments/${editingStudent.id}`);
      const updatedData = {
        ...editingStudent.data,
        installments: editableInstallments,
        totalAmount: editableInstallments.reduce((sum, inst) => sum + parseFloat(inst.amount), 0),
        lastModifiedAt: Date.now(),
        lastModifiedBy: userProfile?.displayName
      };

      await set(paymentsRef, updatedData);

      alert('✅ Échéancier modifié avec succès!');
      setShowEditScheduleModal(false);
      setEditingStudent(null);
      setEditableInstallments([]);
      loadData();
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert('Erreur: ' + err.message);
      setLoading(false);
    }
  };

  const handleAddInstallment = () => {
    const newInstallment = {
      amount: 0,
      dueDate: Date.now(),
      status: 'pending',
      installmentNumber: editableInstallments.length + 1
    };
    const updated = [...editableInstallments, newInstallment];

    // Redistribuer automatiquement les montants
    const redistributed = redistributeAmounts(updated);
    setEditableInstallments(redistributed);
  };

  const handleRemoveInstallment = (index) => {
    if (editableInstallments[index].status === 'paid') {
      alert('Impossible de supprimer une échéance déjà payée');
      return;
    }

    if (editableInstallments.length <= 1) {
      alert('Impossible de supprimer la dernière échéance');
      return;
    }

    const updated = editableInstallments.filter((_, i) => i !== index);

    // Redistribuer automatiquement les montants sur les échéances restantes
    const redistributed = redistributeAmounts(updated);
    setEditableInstallments(redistributed);
  };

  const redistributeAmounts = (updatedInstallments) => {
    // Calculer le total dû (somme de toutes les échéances)
    const totalDue = editingStudent?.data?.totalAmount || 0;

    // Calculer le total déjà payé (échéances avec status 'paid')
    const totalPaid = updatedInstallments
      .filter(inst => inst.status === 'paid')
      .reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0);

    // Calculer le restant à distribuer
    const remainingToDivide = totalDue - totalPaid;

    // Compter les échéances en attente (status 'pending')
    const pendingInstallments = updatedInstallments.filter(inst => inst.status === 'pending');

    if (pendingInstallments.length === 0) return updatedInstallments;

    // Distribuer équitablement le restant sur les échéances en attente
    const amountPerInstallment = remainingToDivide / pendingInstallments.length;

    return updatedInstallments.map(inst => {
      if (inst.status === 'pending') {
        return { ...inst, amount: Math.round(amountPerInstallment * 100) / 100 };
      }
      return inst;
    });
  };

  const handleUpdateInstallment = (index, field, value) => {
    const updated = [...editableInstallments];

    if (field === 'amount') {
      const newAmount = parseFloat(value) || 0;
      const totalDue = editingStudent?.data?.totalAmount || 0;

      updated[index].amount = newAmount;
      updated[index].manuallySet = true; // Marquer comme modifié manuellement

      // Calculer le total payé
      const totalPaid = updated
        .filter(inst => inst.status === 'paid')
        .reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0);

      // Calculer le total des échéances en attente qui ont été modifiées manuellement
      const manualPendingTotal = updated
        .filter(inst => inst.status === 'pending' && inst.manuallySet)
        .reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0);

      // Vérifier que le total ne dépasse pas
      if (totalPaid + manualPendingTotal > totalDue) {
        alert(`Le montant total des échéances ne peut pas dépasser ${formatAmount(totalDue)}`);
        delete updated[index].manuallySet;
        updated[index].amount = editableInstallments[index].amount; // Restaurer l'ancien montant
        return;
      }

      // Redistribuer le reste uniquement sur les échéances non modifiées manuellement
      const remainingToDivide = totalDue - totalPaid - manualPendingTotal;
      const autoInstallments = updated.filter(inst => inst.status === 'pending' && !inst.manuallySet);

      if (autoInstallments.length > 0 && remainingToDivide > 0) {
        const amountPerAuto = remainingToDivide / autoInstallments.length;
        updated.forEach(inst => {
          if (inst.status === 'pending' && !inst.manuallySet) {
            inst.amount = Math.round(amountPerAuto * 100) / 100;
          }
        });
      }

      setEditableInstallments(updated);
    } else if (field === 'dueDate') {
      const selectedDate = new Date(value).getTime();
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Réinitialiser à minuit pour comparer uniquement les dates
      const todayTimestamp = today.getTime();

      // Vérifier que la date n'est pas dans le passé
      if (selectedDate < todayTimestamp) {
        alert('La date d\'échéance ne peut pas être dans le passé');
        return;
      }

      updated[index][field] = selectedDate;
      setEditableInstallments(updated);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-4 sm:pt-6 lg:pt-8 pb-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 backdrop-blur-sm bg-white/80 rounded-2xl p-4 shadow-sm">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="p-2 hover:bg-gray-100 rounded-xl transition"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">💰 Gestion des Paiements</h1>
              <p className="text-gray-600 mt-1">Suivi des frais de scolarité</p>
            </div>
            {/* Boutons visibles pour admin et comptable */}
            {(userProfile?.role === 'admin_universite' || userProfile?.role === 'comptable') && (
              <>
                <button
                  onClick={() => navigate('/admin/payments/free')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 font-semibold"
                >
                  <Wallet className="h-5 w-5" />
                  Paiement Libre
                </button>
                {userProfile?.role === 'admin_universite' && (
                  <>
                    <button
                      onClick={() => navigate('/admin/payments/create-bulk')}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 font-semibold"
                    >
                      <Plus className="h-5 w-5" />
                      ⚡ Création en Masse
                    </button>
                    <button
                      onClick={() => navigate('/admin/payments/create')}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 font-semibold"
                    >
                      <Plus className="h-5 w-5" />
                      Plan Individuel
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 pb-8">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatAmount(stats.totalRevenue)}</p>
            <p className="text-sm text-gray-600">Revenus perçus</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.paidCount}</p>
            <p className="text-sm text-gray-600">Paiements validés</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingCount}</p>
            <p className="text-sm text-gray-600">En attente</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.overdueCount}</p>
            <p className="text-sm text-gray-600">En retard</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setLevelFilter('all');
                setAcademicYearFilter('all');
                setDepartmentFilter('all');
                setClassFilter('all');
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition flex items-center gap-1"
            >
              <XCircle className="h-4 w-4" />
              Réinitialiser
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nom, matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous</option>
                <option value="paid">Payés</option>
                <option value="pending">En attente</option>
                <option value="overdue">En retard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Année Académique</label>
              <select
                value={academicYearFilter}
                onChange={(e) => setAcademicYearFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Département</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.name}>{cls.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtres actifs */}
          {(searchTerm || statusFilter !== 'all' || levelFilter !== 'all' || academicYearFilter !== 'all' || departmentFilter !== 'all' || classFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Filtres actifs:</p>
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    Recherche: {searchTerm}
                    <button onClick={() => setSearchTerm('')} className="hover:bg-blue-200 rounded-full p-0.5">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    Statut: {statusFilter === 'paid' ? 'Payés' : statusFilter === 'pending' ? 'En attente' : 'En retard'}
                    <button onClick={() => setStatusFilter('all')} className="hover:bg-green-200 rounded-full p-0.5">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {academicYearFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    Année: {academicYearFilter}
                    <button onClick={() => setAcademicYearFilter('all')} className="hover:bg-purple-200 rounded-full p-0.5">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {departmentFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                    Département: {departmentFilter}
                    <button onClick={() => setDepartmentFilter('all')} className="hover:bg-orange-200 rounded-full p-0.5">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {levelFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                    Niveau: {levelFilter}
                    <button onClick={() => setLevelFilter('all')} className="hover:bg-indigo-200 rounded-full p-0.5">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {classFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
                    Classe: {classFilter}
                    <button onClick={() => setClassFilter('all')} className="hover:bg-pink-200 rounded-full p-0.5">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Liste paiements */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Liste des Paiements ({filteredPayments.length})
          </h2>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Aucun paiement trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Étudiant</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Matricule</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Niveau</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Montant</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Échéance</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Statut</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment, index) => {
                    const isOverdue = payment.status === 'pending' && payment.dueDate < Date.now();

                    return (
                      <tr key={index} className={`border-b border-gray-100 hover:bg-blue-50 transition ${isOverdue ? 'bg-red-50' : ''}`}>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-900">{payment.studentName}</p>
                        </td>
                        <td className="text-center py-3 px-4 text-gray-700">{payment.studentMatricule}</td>
                        <td className="text-center py-3 px-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {payment.studentLevel}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 font-bold text-gray-900">{formatAmount(payment.amount)}</td>
                        <td className="text-center py-3 px-4 text-gray-700 text-sm">
                          {new Date(payment.dueDate).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="text-center py-3 px-4">
                          {payment.status === 'paid' ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              ✓ Payé
                            </span>
                          ) : isOverdue ? (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              ✗ Retard
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                              ⏳ À venir
                            </span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {payment.status !== 'paid' && (
                              <button
                                onClick={() => handleMarkAsPaid(payment)}
                                className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-xs font-semibold"
                              >
                                Marquer payé
                              </button>
                            )}
                            {(userProfile?.role === 'admin_universite' || userProfile?.role === 'comptable') && (
                              <button
                                onClick={() => handleEditSchedule(payment)}
                                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-xs font-semibold flex items-center gap-1"
                                title="Modifier l'échéancier"
                              >
                                <Edit2 className="h-3 w-3" />
                                Modifier
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        </div>
      </div>

      {/* Modal Paiement Libre */}
      {showFreePaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              💰 Paiement Libre / Avance
            </h2>
            <form onSubmit={handleFreePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Étudiant *
                </label>
                <select
                  value={freePaymentData.studentId}
                  onChange={(e) => setFreePaymentData({ ...freePaymentData, studentId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                >
                  <option value="">Sélectionner un étudiant</option>
                  {students
                    .filter(s => s.status === 'active')
                    .sort((a, b) => a.lastName.localeCompare(b.lastName))
                    .map(student => (
                      <option key={student.id} value={student.id}>
                        {student.lastName} {student.firstName} - {student.matricule}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Montant ({symbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={freePaymentData.amount}
                  onChange={(e) => setFreePaymentData({ ...freePaymentData, amount: e.target.value })}
                  required
                  placeholder="Ex: 500.00"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mode de paiement *
                </label>
                <select
                  value={freePaymentData.paymentMethod}
                  onChange={(e) => setFreePaymentData({ ...freePaymentData, paymentMethod: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="virement">🏦 Virement</option>
                  <option value="cheque">📝 Chèque</option>
                  <option value="carte">💳 Carte bancaire</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Année Académique
                </label>
                <input
                  type="text"
                  value={freePaymentData.academicYear}
                  onChange={(e) => setFreePaymentData({ ...freePaymentData, academicYear: e.target.value })}
                  placeholder="2025-2026"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={freePaymentData.description}
                  onChange={(e) => setFreePaymentData({ ...freePaymentData, description: e.target.value })}
                  rows="2"
                  placeholder="Ex: Avance sur frais de scolarité, Paiement partiel..."
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none resize-none"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Ce paiement sera enregistré comme un revenu et apparaîtra dans le journal de caisse.
                  Il n'est pas lié à un échéancier existant.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFreePaymentModal(false);
                    setFreePaymentData({
                      studentId: '',
                      amount: '',
                      paymentMethod: 'cash',
                      description: '',
                      academicYear: getCurrentAcademicYear()
                    });
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modification Échéancier */}
      {showEditScheduleModal && editingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  ✏️ Modifier l'Échéancier
                </h2>
                <p className="text-gray-600 mt-1">Étudiant: {editingStudent.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditScheduleModal(false);
                  setEditingStudent(null);
                  setEditableInstallments([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition"
              >
                <XCircle className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Attention:</strong> Les modifications affectent directement le plan de paiement de l'étudiant.
                Les échéances déjà payées ne peuvent pas être supprimées.
              </p>
            </div>

            {/* Liste des échéances éditables */}
            <div className="space-y-3 mb-6">
              {editableInstallments.map((installment, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 ${
                    installment.status === 'paid'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">
                        {index + 1}
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Montant ({symbol})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={installment.amount}
                          onChange={(e) => handleUpdateInstallment(index, 'amount', e.target.value)}
                          disabled={installment.status === 'paid'}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none disabled:bg-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Date d'échéance
                        </label>
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={new Date(installment.dueDate).toISOString().split('T')[0]}
                          onChange={(e) => handleUpdateInstallment(index, 'dueDate', e.target.value)}
                          disabled={installment.status === 'paid'}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none disabled:bg-gray-100"
                        />
                      </div>

                      <div className="flex items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Statut
                          </label>
                          <span className={`inline-block px-3 py-2 rounded-lg text-xs font-semibold ${
                            installment.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {installment.status === 'paid' ? '✓ Payé' : '⏳ En attente'}
                          </span>
                        </div>
                        {installment.status !== 'paid' && (
                          <button
                            onClick={() => handleRemoveInstallment(index)}
                            className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Supprimer cette échéance"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {installment.paidDate && (
                    <div className="mt-2 text-xs text-gray-600">
                      Payé le {new Date(installment.paidDate).toLocaleDateString('fr-FR')}
                      {installment.processedBy && ` par ${installment.processedBy}`}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bouton ajouter échéance */}
            <button
              onClick={handleAddInstallment}
              className="w-full px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition flex items-center justify-center gap-2 font-semibold mb-6"
            >
              <Plus className="h-5 w-5" />
              Ajouter une échéance
            </button>

            {/* Résumé */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total échéances</p>
                  <p className="text-2xl font-bold text-gray-900">{editableInstallments.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Montant total</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {formatAmount(editableInstallments.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Déjà payé</p>
                  <p className="text-2xl font-bold text-green-600">
                    {editableInstallments.filter(inst => inst.status === 'paid').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditScheduleModal(false);
                  setEditingStudent(null);
                  setEditableInstallments([]);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="h-5 w-5" />
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
