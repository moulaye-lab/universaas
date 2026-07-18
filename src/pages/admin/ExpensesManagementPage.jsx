/**
 * ExpensesManagementPage.jsx - Gestion des dépenses
 *
 * Fonctionnalités:
 * - Créer/modifier/supprimer des dépenses
 * - Catégories: salaires, infrastructure, matériel, services, autres
 * - Statuts: en_attente, validee, payee, annulee
 * - Filtres et recherche
 * - Export CSV
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronLeft,
  TrendingDown,
  Plus,
  Filter,
  Search,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Tag,
  History
} from 'lucide-react';

export default function ExpensesManagementPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all'); // Par défaut "all" au lieu de l'année courante

  // Formulaire
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'salaires',
    date: new Date().toISOString().split('T')[0],
    status: 'en_attente',
    academicYear: getCurrentAcademicYear(),
    paymentMethod: 'virement',
    recipient: '',
    notes: ''
  });


  const statuses = [
    { value: 'en_attente', label: 'En Attente', color: 'yellow', icon: Clock },
    { value: 'validee', label: 'Validée', color: 'blue', icon: CheckCircle },
    { value: 'payee', label: 'Payée', color: 'green', icon: CheckCircle },
    { value: 'annulee', label: 'Annulée', color: 'red', icon: XCircle }
  ];

  function getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }

  useEffect(() => {
    loadCategories();
    loadExpenses();
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [expenses, searchTerm, categoryFilter, statusFilter, yearFilter]);

  const loadCategories = async () => {
    if (!userProfile?.universityId) return;

    try {
      const categoriesRef = ref(database, `universities/${userProfile.universityId}/accounting/expenseCategories`);
      const snapshot = await get(categoriesRef);

      if (snapshot.exists()) {
        const categoriesData = snapshot.val();
        const categoriesArray = Object.keys(categoriesData).map(key => ({
          id: key,
          ...categoriesData[key]
        }));
        setCategories(categoriesArray);
      } else {
        // Catégories par défaut
        setCategories([
          { value: 'salaires', label: 'Salaires', color: 'blue' },
          { value: 'infrastructure', label: 'Infrastructure', color: 'purple' },
          { value: 'materiel', label: 'Matériel', color: 'green' },
          { value: 'services', label: 'Services', color: 'orange' },
          { value: 'autres', label: 'Autres', color: 'gray' }
        ]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadExpenses = async () => {
    if (!userProfile?.universityId) return;

    console.log('🔄 Loading expenses...');

    try {
      const expensesRef = ref(database, `universities/${userProfile.universityId}/accounting/expenses`);
      const snapshot = await get(expensesRef);

      if (snapshot.exists()) {
        const expensesData = snapshot.val();
        const expensesArray = Object.keys(expensesData).map(key => ({
          id: key,
          ...expensesData[key]
        }));
        console.log(`✅ Loaded ${expensesArray.length} expenses`, expensesArray);
        setExpenses(expensesArray.sort((a, b) => new Date(b.date) - new Date(a.date)));
      } else {
        console.log('⚠️ No expenses found');
        setExpenses([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading expenses:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...expenses];

    console.log('🔍 Applying filters...', {
      totalExpenses: expenses.length,
      searchTerm,
      categoryFilter,
      statusFilter,
      yearFilter
    });

    // Recherche
    if (searchTerm) {
      filtered = filtered.filter(exp =>
        exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.recipient?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Catégorie
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(exp => exp.category === categoryFilter);
    }

    // Statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(exp => exp.status === statusFilter);
    }

    // Année académique
    if (yearFilter !== 'all') {
      filtered = filtered.filter(exp => exp.academicYear === yearFilter);
    }

    console.log(`✅ Filtered: ${filtered.length} expenses out of ${expenses.length}`);
    setFilteredExpenses(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('📝 Form submission started', formData);
    console.log('🔍 Auth state:', { currentUser: currentUser?.uid, userProfile: userProfile?.role });

    // Vérifier currentUser disponible
    if (!currentUser?.uid) {
      console.error('❌ currentUser.uid is undefined!');
      alert('Erreur: Session expirée. Veuillez vous reconnecter.');
      return;
    }

    if (!formData.description || !formData.amount || !formData.recipient) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setLoading(true);

      const now = Date.now();
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        universityId: userProfile.universityId
      };

      console.log('💾 Expense data to save:', expenseData);

      if (editingExpense) {
        // Modification - ajouter traçabilité
        const expenseRef = ref(database, `universities/${userProfile.universityId}/accounting/expenses/${editingExpense.id}`);

        // Historique des modifications
        const history = editingExpense.history || [];
        history.push({
          modifiedAt: now,
          modifiedBy: userProfile.profileId,
          modifiedByName: userProfile.displayName,
          modifiedByRole: userProfile.role,
          previousValues: {
            description: editingExpense.description,
            amount: editingExpense.amount,
            category: editingExpense.category,
            status: editingExpense.status,
            recipient: editingExpense.recipient
          }
        });

        await set(expenseRef, {
          ...expenseData,
          id: editingExpense.id,
          createdAt: editingExpense.createdAt,
          createdBy: editingExpense.createdBy,
          lastModifiedAt: now,
          lastModifiedBy: currentUser.uid,
          history
        });
      } else {
        // Création
        const expensesRef = ref(database, `universities/${userProfile.universityId}/accounting/expenses`);
        const newExpenseRef = push(expensesRef);
        await set(newExpenseRef, {
          ...expenseData,
          id: newExpenseRef.key,
          createdAt: now,
          createdBy: currentUser.uid,
          createdByName: userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`,
          createdByRole: userProfile.role,
          history: []
        });
      }

      console.log('✅ Expense saved successfully');

      // Reset modal et formulaire
      setShowModal(false);
      setEditingExpense(null);
      setFormData({
        description: '',
        amount: '',
        category: 'salaires',
        date: new Date().toISOString().split('T')[0],
        status: 'en_attente',
        academicYear: getCurrentAcademicYear(),
        paymentMethod: 'virement',
        recipient: '',
        notes: ''
      });

      // Recharger les dépenses
      await loadExpenses();

      alert('✅ Dépense créée avec succès!');
      setLoading(false);
    } catch (error) {
      console.error('❌ Error saving expense:', error);
      alert('Erreur lors de l\'enregistrement: ' + error.message);
      setLoading(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      status: expense.status,
      academicYear: expense.academicYear,
      paymentMethod: expense.paymentMethod || 'virement',
      recipient: expense.recipient,
      notes: expense.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (expenseId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) return;

    try {
      const expenseRef = ref(database, `universities/${userProfile.universityId}/accounting/expenses/${expenseId}`);
      await remove(expenseRef);
      loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Catégorie', 'Montant', 'Bénéficiaire', 'Statut', 'Année Académique'];
    const rows = filteredExpenses.map(exp => [
      exp.date,
      exp.description,
      categories.find(c => c.value === exp.category)?.label,
      exp.amount,
      exp.recipient,
      statuses.find(s => s.value === exp.status)?.label,
      exp.academicYear
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `depenses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const paidAmount = filteredExpenses.filter(exp => exp.status === 'payee').reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const pendingAmount = filteredExpenses.filter(exp => exp.status === 'en_attente' || exp.status === 'validee').reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-4 pb-4 mb-6">
          <div className="flex items-center gap-4 backdrop-blur-sm bg-white/80 rounded-2xl p-4 shadow-sm">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-xl transition"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-red-600" />
                Gestion des Dépenses
              </h1>
              <p className="text-gray-600 mt-1">Suivi des dépenses de l'université</p>
            </div>
            <button
              onClick={() => navigate('/admin/accounting/expenses/categories')}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition flex items-center gap-2 font-semibold"
            >
              <Tag className="h-5 w-5" />
              Catégories
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center gap-2 font-semibold"
            >
              <Download className="h-5 w-5" />
              Export CSV
            </button>
            {(userProfile?.role === 'admin_universite' || userProfile?.role === 'comptable') && (
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 font-semibold"
              >
                <Plus className="h-5 w-5" />
                Nouvelle Dépense
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Dépenses</p>
                <p className="text-2xl font-bold text-gray-900">{totalAmount.toLocaleString()} €</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Payées</p>
                <p className="text-2xl font-bold text-green-600">{paidAmount.toLocaleString()} €</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">En Attente</p>
                <p className="text-2xl font-bold text-orange-600">{pendingAmount.toLocaleString()} €</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Search className="h-4 w-4 inline mr-1" />
                Recherche
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Description, bénéficiaire..."
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Filter className="h-4 w-4 inline mr-1" />
                Catégorie
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
              >
                <option value="all">Toutes</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
              >
                <option value="all">Tous</option>
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Année</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
              >
                <option value="all">Toutes</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des dépenses */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Catégorie</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Bénéficiaire</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Montant</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Statut</th>
                  {(userProfile?.role === 'admin_universite' || userProfile?.role === 'comptable') && (
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-semibold">Aucune dépense trouvée</p>
                      <p className="text-sm mt-1">Créez votre première dépense</p>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => {
                    const category = categories.find(c => c.value === expense.category);
                    const status = statuses.find(s => s.value === expense.status);
                    const StatusIcon = status?.icon || Clock;

                    return (
                      <tr key={expense.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-semibold">{expense.description}</div>
                          {expense.notes && <div className="text-xs text-gray-500 mt-1">{expense.notes}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${category?.color}-100 text-${category?.color}-700`}>
                            {category?.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{expense.recipient}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                          {expense.amount.toLocaleString()} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-${status?.color}-100 text-${status?.color}-700`}>
                            <StatusIcon className="h-3 w-3" />
                            {status?.label}
                          </span>
                        </td>
                        {(userProfile?.role === 'admin_universite' || userProfile?.role === 'comptable') && (
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {expense.history && expense.history.length > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setShowHistory(true);
                                  }}
                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                  title="Voir l'historique"
                                >
                                  <History className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(expense)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Formulaire */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingExpense ? 'Modifier la Dépense' : 'Nouvelle Dépense'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Montant (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Catégorie *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Statut *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                  >
                    {statuses.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bénéficiaire *</label>
                  <input
                    type="text"
                    value={formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    required
                    placeholder="Nom du bénéficiaire"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mode de paiement</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                  >
                    <option value="virement">Virement</option>
                    <option value="cheque">Chèque</option>
                    <option value="especes">Espèces</option>
                    <option value="carte">Carte bancaire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Année Académique</label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    placeholder="2024-2025"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    placeholder="Notes additionnelles..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingExpense(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {editingExpense ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {showHistory && selectedExpense && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <History className="h-6 w-6 text-purple-600" />
                Historique des Modifications
              </h2>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setSelectedExpense(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition"
              >
                <XCircle className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <h3 className="font-bold text-gray-900 mb-2">Dépense actuelle</h3>
              <p className="text-sm text-gray-700">{selectedExpense.description}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                <span>Montant: <strong>{selectedExpense.amount.toLocaleString()} €</strong></span>
                <span>Catégorie: <strong>{categories.find(c => c.value === selectedExpense.category)?.label}</strong></span>
                <span>Créé par: <strong>{selectedExpense.createdByName}</strong></span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 mb-4">Historique ({selectedExpense.history?.length || 0} modifications)</h3>
              {selectedExpense.history && selectedExpense.history.length > 0 ? (
                selectedExpense.history.map((entry, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          entry.modifiedByRole === 'admin_universite' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.modifiedByRole === 'admin_universite' ? 'Admin' : 'Comptable'}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{entry.modifiedByName}</span>
                      </div>
                      <span className="text-xs text-gray-600">
                        {new Date(entry.modifiedAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {entry.previousValues.description && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Description</p>
                          <p className="text-gray-900 font-medium">{entry.previousValues.description}</p>
                        </div>
                      )}
                      {entry.previousValues.amount && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Montant</p>
                          <p className="text-gray-900 font-medium">{entry.previousValues.amount.toLocaleString()} €</p>
                        </div>
                      )}
                      {entry.previousValues.category && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Catégorie</p>
                          <p className="text-gray-900 font-medium">{categories.find(c => c.value === entry.previousValues.category)?.label}</p>
                        </div>
                      )}
                      {entry.previousValues.status && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Statut</p>
                          <p className="text-gray-900 font-medium">{statuses.find(s => s.value === entry.previousValues.status)?.label}</p>
                        </div>
                      )}
                      {entry.previousValues.recipient && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Bénéficiaire</p>
                          <p className="text-gray-900 font-medium">{entry.previousValues.recipient}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">Aucune modification enregistrée</p>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  setShowHistory(false);
                  setSelectedExpense(null);
                }}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
