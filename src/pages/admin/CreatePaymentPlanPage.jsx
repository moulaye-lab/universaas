/**
 * CreatePaymentPlanPage.jsx - Page création plan de paiement
 *
 * Fonctionnalités:
 * - Sélection étudiant
 * - Choix devise (toutes devises mondiales)
 * - Configuration montant et échéances
 * - Prévisualisation échéancier
 * - Validation et création
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import { CURRENCIES, getCurrencyByCode, formatAmount } from '../../utils/currencies';
import { getAcademicYears, getCurrentAcademicYear } from '../../utils/academicYearHelper';
import useDynamicFilterOptions from '../../hooks/useDynamicFilterOptions';
import {
  ChevronLeft,
  DollarSign,
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  X
} from 'lucide-react';

export default function CreatePaymentPlanPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const { symbol, formatAmount: formatCurrency } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);

  // Filtres avancés
  const { departments, fieldOfStudies, loading: optionsLoading } = useDynamicFilterOptions(userProfile?.universityId);
  const [filters, setFilters] = useState({
    academicYear: '',
    department: '',
    fieldOfStudy: '',
    level: '',
    status: ''
  });

  // Récupérer la devise sauvegardée (par université)
  const getSavedCurrency = () => {
    if (!userProfile?.universityId) return 'EUR';
    const saved = localStorage.getItem(`payment_currency_${userProfile.universityId}`);
    return saved || 'EUR';
  };

  const [formData, setFormData] = useState({
    studentId: '',
    currency: getSavedCurrency(),
    totalAmount: '',
    installmentsCount: 3,
    startDate: new Date().toISOString().split('T')[0],
    academicYear: '2025/2026',
    description: ''
  });

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [previewInstallments, setPreviewInstallments] = useState([]);

  useEffect(() => {
    loadStudents();
    // Charger la devise sauvegardée au montage
    if (userProfile?.universityId) {
      const savedCurrency = getSavedCurrency();
      if (savedCurrency !== formData.currency) {
        setFormData(prev => ({ ...prev, currency: savedCurrency }));
      }
    }
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, students, filters]);

  const applyFilters = () => {
    let filtered = [...students];

    // Filtre par recherche textuelle
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        `${s.firstName} ${s.lastName} ${s.matricule} ${s.email || ''}`.toLowerCase().includes(term)
      );
    }

    // Filtre par année académique
    if (filters.academicYear) {
      filtered = filtered.filter(s => s.academicYear === filters.academicYear);
    }

    // Filtre par département
    if (filters.department) {
      filtered = filtered.filter(s => s.department === filters.department);
    }

    // Filtre par filière (fieldOfStudy dans Firebase)
    if (filters.fieldOfStudy) {
      filtered = filtered.filter(s => s.fieldOfStudy === filters.fieldOfStudy);
    }

    // Filtre par niveau
    if (filters.level) {
      filtered = filtered.filter(s => s.level === filters.level);
    }

    // Filtre par statut
    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }

    setFilteredStudents(filtered);
  };

  const resetFilters = () => {
    setFilters({
      academicYear: '',
      department: '',
      fieldOfStudy: '',
      level: '',
      status: ''
    });
    setSearchTerm('');
  };

  useEffect(() => {
    if (formData.totalAmount && formData.installmentsCount && formData.startDate) {
      generatePreview();
    } else {
      setPreviewInstallments([]);
    }
  }, [formData.totalAmount, formData.installmentsCount, formData.startDate]);

  const loadStudents = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      const studentsData = studentsSnap.exists()
        ? Object.entries(studentsSnap.val()).map(([id, data]) => ({
            id,
            ...data
          }))
        : [];

      setStudents(studentsData);
      setFilteredStudents(studentsData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading students:', err);
      setLoading(false);
    }
  };

  const generatePreview = () => {
    const totalAmount = parseFloat(formData.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) return;

    const count = formData.installmentsCount;
    const startDate = new Date(formData.startDate);
    const installments = [];

    // Calculer le montant de base arrondi
    const baseAmount = Math.floor((totalAmount / count) * 100) / 100;

    // Calculer le montant de la dernière échéance pour avoir le total exact
    const lastAmount = totalAmount - (baseAmount * (count - 1));

    for (let i = 0; i < count; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      installments.push({
        number: i + 1,
        amount: i === count - 1 ? lastAmount : baseAmount,
        dueDate: dueDate.getTime(),
        dueDateStr: dueDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      });
    }

    setPreviewInstallments(installments);
  };

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);

    // Calculer le montant suggéré basé sur les tarifs configurés
    const suggestedAmount = await calculateSuggestedTuition(student);

    setFormData({
      ...formData,
      studentId: student.id,
      totalAmount: suggestedAmount > 0 ? suggestedAmount : formData.totalAmount
    });
  };

  const calculateSuggestedTuition = async (student) => {
    if (!userProfile?.universityId || !student) return 0;

    try {
      // Charger les tarifs de l'année académique
      const feesRef = ref(database, `universities/${userProfile.universityId}/tuition_fees/${formData.academicYear}`);
      const feesSnap = await get(feesRef);

      if (!feesSnap.exists()) return 0;

      const fees = feesSnap.val();
      let amount = 0;

      // Base : tarif du niveau
      if (fees.byLevel && student.level) {
        amount = fees.byLevel[student.level] || fees.defaultFee || 0;
      } else {
        amount = fees.defaultFee || 0;
      }

      // Ajustement par filière
      if (fees.byField && student.fieldOfStudy) {
        const fieldKey = student.fieldOfStudy.toLowerCase().replace(/\s+/g, '-');
        const fieldAdjustment = fees.byField[fieldKey] || 0;
        amount += fieldAdjustment;
      }

      // Ajustements spéciaux (boursier, étranger, etc.)
      // TODO: Ajouter champs dans profil étudiant pour déterminer ces statuts

      return amount;
    } catch (err) {
      console.error('Error calculating suggested tuition:', err);
      return 0;
    }
  };

  const handleCurrencyChange = (newCurrency) => {
    // Sauvegarder dans localStorage (par université)
    if (userProfile?.universityId) {
      localStorage.setItem(`payment_currency_${userProfile.universityId}`, newCurrency);
    }
    setFormData({ ...formData, currency: newCurrency });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStudent) {
      alert('Veuillez sélectionner un étudiant');
      return;
    }

    const totalAmount = parseFloat(formData.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      alert('Montant invalide');
      return;
    }

    try {
      setSaving(true);

      const count = formData.installmentsCount;
      const startDate = new Date(formData.startDate);

      // Calculer montants exacts (sans décimales infinies)
      const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
      const lastAmount = totalAmount - (baseAmount * (count - 1));

      const installments = [];
      for (let i = 0; i < count; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        installments.push({
          amount: i === count - 1 ? lastAmount : baseAmount,
          dueDate: dueDate.getTime(),
          status: 'pending',
          installmentNumber: i + 1,
          totalInstallments: count
        });
      }

      const paymentPlan = {
        studentId: selectedStudent.id,
        totalAmount,
        currency: formData.currency,
        installments,
        academicYear: formData.academicYear,
        description: formData.description || '',
        createdAt: Date.now(),
        createdBy: currentUser?.uid || userProfile?.uid || 'unknown'
      };

      const paymentsRef = ref(
        database,
        `universities/${userProfile.universityId}/payments/${selectedStudent.id}`
      );
      await set(paymentsRef, paymentPlan);

      alert(`✅ Plan de paiement créé avec succès pour ${selectedStudent.firstName} ${selectedStudent.lastName}`);
      navigate('/admin/payments');
    } catch (err) {
      console.error('Error creating payment plan:', err);
      alert('Erreur: ' + err.message);
      setSaving(false);
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

  const currency = getCurrencyByCode(formData.currency);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/payments')}
            className="p-2 hover:bg-white rounded-xl transition"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">📝 Créer un Plan de Paiement</h1>
            <p className="text-gray-600 mt-1">Configuration des frais de scolarité</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Étape 1: Sélection étudiant */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">1. Sélectionner l'étudiant</h2>
            </div>

            {!selectedStudent ? (
              <>
                {/* Barre de recherche */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom, prénom, matricule ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
                    />
                  </div>
                </div>

                {/* Filtres avancés */}
                <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Filter className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">Filtres avancés</h3>
                    </div>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <X className="h-4 w-4" />
                      Réinitialiser
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Année académique */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Année académique
                      </label>
                      <select
                        value={filters.academicYear}
                        onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none text-sm"
                      >
                        <option value="">Toutes</option>
                        {getAcademicYears().map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Département */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Département
                      </label>
                      <select
                        value={filters.department}
                        onChange={(e) => setFilters({ ...filters, department: e.target.value, fieldOfStudy: '' })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none text-sm"
                      >
                        <option value="">Tous</option>
                        {departments
                          .filter(dept => dept && dept.value && dept.label)
                          .map((dept) => (
                            <option key={dept.value} value={dept.value}>
                              {dept.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Filière */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Filière
                      </label>
                      <select
                        value={filters.fieldOfStudy}
                        onChange={(e) => setFilters({ ...filters, fieldOfStudy: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none text-sm"
                      >
                        <option value="">Toutes</option>
                        {fieldOfStudies
                          .filter(field => field && field.value && field.label)
                          .map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Niveau */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Niveau
                      </label>
                      <select
                        value={filters.level}
                        onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none text-sm"
                      >
                        <option value="">Tous</option>
                        <option value="L1">L1</option>
                        <option value="L2">L2</option>
                        <option value="L3">L3</option>
                        <option value="M1">M1</option>
                        <option value="M2">M2</option>
                        <option value="D1">D1</option>
                        <option value="D2">D2</option>
                        <option value="D3">D3</option>
                      </select>
                    </div>

                    {/* Statut */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Statut
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none text-sm"
                      >
                        <option value="">Tous</option>
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                        <option value="suspended">Suspendu</option>
                      </select>
                    </div>
                  </div>

                  {/* Résumé filtres actifs */}
                  <div className="mt-3 text-xs text-gray-600">
                    {filteredStudents.length} étudiant{filteredStudents.length > 1 ? 's' : ''} trouvé{filteredStudents.length > 1 ? 's' : ''}
                  </div>
                </div>

                {/* Liste étudiants */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">Aucun étudiant trouvé</p>
                      <p className="text-sm text-gray-400 mt-1">Essayez de modifier vos filtres</p>
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        className="w-full p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 group-hover:text-blue-600 transition">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {student.matricule} • {student.level} • {student.fieldOfStudy || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {student.email}
                            </p>
                          </div>
                          <ChevronLeft className="h-5 w-5 text-gray-400 group-hover:text-blue-500 rotate-180 transition" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-blue-900">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </p>
                    <p className="text-sm text-blue-700">
                      {selectedStudent.matricule} • {selectedStudent.level}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(null);
                      setFormData({ ...formData, studentId: '' });
                    }}
                    className="px-3 py-1 bg-blue-200 text-blue-800 rounded-lg hover:bg-blue-300 transition text-sm font-semibold"
                  >
                    Changer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Étape 2: Configuration montant */}
          {selectedStudent && (
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">2. Configuration du montant</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Devise */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Devise * <span className="text-xs text-gray-500 font-normal">(mémorisée automatiquement)</span>
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name} ({curr.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Montant total */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Montant total ({symbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    required
                    placeholder="3000.00"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
                  />
                </div>

                {/* Année académique */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Année académique *
                  </label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    required
                    placeholder="2025/2026"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Frais de scolarité + inscription"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Étape 3: Échéancier */}
          {selectedStudent && formData.totalAmount && (
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">3. Configuration de l'échéancier</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Nombre d'échéances */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre d'échéances *
                  </label>
                  <select
                    value={formData.installmentsCount}
                    onChange={(e) =>
                      setFormData({ ...formData, installmentsCount: parseInt(e.target.value) })
                    }
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
                  >
                    <option value="1">1 paiement (comptant)</option>
                    <option value="2">2 échéances</option>
                    <option value="3">3 échéances</option>
                    <option value="4">4 échéances</option>
                    <option value="5">5 échéances</option>
                    <option value="6">6 échéances</option>
                    <option value="8">8 échéances</option>
                    <option value="10">10 échéances</option>
                    <option value="12">12 échéances</option>
                  </select>
                </div>

                {/* Date première échéance */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date première échéance *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
                  />
                </div>
              </div>

              {/* Prévisualisation */}
              {previewInstallments.length > 0 && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Prévisualisation de l'échéancier
                  </h3>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {previewInstallments.map((inst) => (
                      <div
                        key={inst.number}
                        className="flex items-center justify-between bg-white p-3 rounded-lg"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">
                            Échéance {inst.number}/{formData.installmentsCount}
                          </p>
                          <p className="text-sm text-gray-600">{inst.dueDateStr}</p>
                        </div>
                        <p className="text-lg font-bold text-purple-700">
                          {formatCurrency(inst.amount)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t-2 border-purple-200 flex items-center justify-between">
                    <p className="font-bold text-purple-900">Total</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(parseFloat(formData.totalAmount))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {selectedStudent && formData.totalAmount && previewInstallments.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">4. Validation</h2>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                <p className="text-green-800">
                  <span className="font-bold">Résumé:</span> Plan de {formData.installmentsCount}{' '}
                  paiement{formData.installmentsCount > 1 ? 's' : ''} pour un total de{' '}
                  {formatCurrency(parseFloat(formData.totalAmount))}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/payments')}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Création en cours...' : '✅ Créer le Plan de Paiement'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
