/**
 * RevenuesManagementPage.jsx - Gestion des revenus
 *
 * Fonctionnalités:
 * - Créer/modifier/supprimer des revenus
 * - Catégories: frais_scolarite, subventions, donations, partenariats, autres
 * - Filtres et recherche
 * - Export CSV
 * - Traçabilité complète
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import auditLogger, { AUDIT_ACTIONS, SEVERITY_LEVELS } from '../../utils/auditLogger';
import {
  ChevronLeft,
  TrendingUp,
  Plus,
  Filter,
  Search,
  Download,
  Edit,
  Trash2,
  AlertCircle,
  History,
  XCircle,
  Tag
} from 'lucide-react';

export default function RevenuesManagementPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [revenues, setRevenues] = useState([]);
  const [filteredRevenues, setFilteredRevenues] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  // Formulaire
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'subventions',
    date: new Date().toISOString().split('T')[0],
    academicYear: getCurrentAcademicYear(),
    source: '',
    notes: ''
  });

  function getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }

  useEffect(() => {
    loadCategories();
    loadRevenues();
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [revenues, searchTerm, categoryFilter, yearFilter]);

  const loadCategories = async () => {
    if (!userProfile?.universityId) return;

    try {
      const categoriesRef = ref(database, `universities/${userProfile.universityId}/accounting/revenueCategories`);
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
          { value: 'frais_scolarite', label: 'Frais de Scolarité', color: 'blue' },
          { value: 'subventions', label: 'Subventions', color: 'green' },
          { value: 'donations', label: 'Donations', color: 'purple' },
          { value: 'partenariats', label: 'Partenariats', color: 'orange' },
          { value: 'autres', label: 'Autres', color: 'gray' }
        ]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadRevenues = async () => {
    if (!userProfile?.universityId) return;

    try {
      const revenuesRef = ref(database, `universities/${userProfile.universityId}/accounting/revenues`);
      const snapshot = await get(revenuesRef);

      if (snapshot.exists()) {
        const revenuesData = snapshot.val();
        const revenuesArray = Object.keys(revenuesData).map(key => ({
          id: key,
          ...revenuesData[key]
        }));
        setRevenues(revenuesArray.sort((a, b) => new Date(b.date) - new Date(a.date)));
      } else {
        setRevenues([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading revenues:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...revenues];

    // Recherche
    if (searchTerm) {
      filtered = filtered.filter(rev =>
        rev.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rev.source?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Catégorie
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(rev => rev.category === categoryFilter);
    }

    // Année académique
    if (yearFilter !== 'all') {
      filtered = filtered.filter(rev => rev.academicYear === yearFilter);
    }

    setFilteredRevenues(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('🔍 Auth state:', { currentUser: currentUser?.uid, userProfile: userProfile?.role });

    // Vérifier currentUser disponible
    if (!currentUser?.uid) {
      console.error('❌ currentUser.uid is undefined!');
      alert('Erreur: Session expirée. Veuillez vous reconnecter.');
      return;
    }

    if (!formData.description || !formData.amount || !formData.source) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setLoading(true);

      const now = Date.now();
      const revenueData = {
        ...formData,
        amount: parseFloat(formData.amount),
        universityId: userProfile.universityId
      };

      if (editingRevenue) {
        // Modification - ajouter traçabilité
        const revenueRef = ref(database, `universities/${userProfile.universityId}/accounting/revenues/${editingRevenue.id}`);

        const history = editingRevenue.history || [];
        history.push({
          modifiedAt: now,
          modifiedBy: userProfile.profileId,
          modifiedByName: userProfile.displayName,
          modifiedByRole: userProfile.role,
          previousValues: {
            description: editingRevenue.description,
            amount: editingRevenue.amount,
            category: editingRevenue.category,
            source: editingRevenue.source
          }
        });

        await set(revenueRef, {
          ...revenueData,
          id: editingRevenue.id,
          createdAt: editingRevenue.createdAt,
          createdBy: editingRevenue.createdBy,
          lastModifiedAt: now,
          lastModifiedBy: currentUser.uid,
          history
        });
      } else {
        // Création
        const revenuesRef = ref(database, `universities/${userProfile.universityId}/accounting/revenues`);
        const newRevenueRef = push(revenuesRef);
        await set(newRevenueRef, {
          ...revenueData,
          id: newRevenueRef.key,
          createdAt: now,
          createdBy: currentUser.uid,
          createdByName: userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`,
          createdByRole: userProfile.role,
          history: []
        });
      }

      // Audit log
      await auditLogger.log({
        action: editingRevenue ? AUDIT_ACTIONS.UPDATE_REVENUE : AUDIT_ACTIONS.CREATE_REVENUE,
        severity: SEVERITY_LEVELS.HIGH,
        universityId: userProfile.universityId,
        userId: currentUser.uid,
        userName: userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`,
        targetId: editingRevenue?.id || newRevenueRef.key,
        targetName: formData.description,
        details: {
          amount: formData.amount,
          category: formData.category,
          source: formData.source,
          isUpdate: !!editingRevenue
        }
      });

      // Reset
      setShowModal(false);
      setEditingRevenue(null);
      setFormData({
        description: '',
        amount: '',
        category: 'subventions',
        date: new Date().toISOString().split('T')[0],
        academicYear: getCurrentAcademicYear(),
        source: '',
        notes: ''
      });

      await loadRevenues();
      alert('✅ Revenu enregistré avec succès!');
      setLoading(false);
    } catch (error) {
      console.error('Error saving revenue:', error);
      alert('Erreur lors de l\'enregistrement: ' + error.message);
      setLoading(false);
    }
  };

  const handleEdit = (revenue) => {
    setEditingRevenue(revenue);
    setFormData({
      description: revenue.description,
      amount: revenue.amount.toString(),
      category: revenue.category,
      date: revenue.date,
      academicYear: revenue.academicYear,
      source: revenue.source,
      notes: revenue.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (revenueId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce revenu ?')) return;

    try {
      const revenueRef = ref(database, `universities/${userProfile.universityId}/accounting/revenues/${revenueId}`);
      await remove(revenueRef);
      loadRevenues();
    } catch (error) {
      console.error('Error deleting revenue:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Catégorie', 'Montant', 'Source', 'Année Académique'];
    const rows = filteredRevenues.map(rev => [
      rev.date,
      rev.description,
      categories.find(c => c.value === rev.category)?.label,
      rev.amount,
      rev.source,
      rev.academicYear
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `revenus_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalAmount = filteredRevenues.reduce((sum, rev) => sum + (rev.amount || 0), 0);

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
                <TrendingUp className="h-8 w-8 text-green-600" />
                Gestion des Revenus
              </h1>
              <p className="text-gray-600 mt-1">Suivi des revenus de l'université</p>
            </div>
            <button
              onClick={() => navigate('/admin/accounting/revenues/categories')}
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
                  setEditingRevenue(null);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 font-semibold"
              >
                <Plus className="h-5 w-5" />
                Nouveau Revenu
              </button>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenus</p>
                <p className="text-2xl font-bold text-gray-900">{totalAmount.toLocaleString()} €</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Nombre d'Entrées</p>
                <p className="text-2xl font-bold text-gray-900">{filteredRevenues.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Filter className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Moyenne par Entrée</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredRevenues.length > 0 ? (totalAmount / filteredRevenues.length).toLocaleString(Math.floor) : 0} €
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Search className="h-4 w-4 inline mr-1" />
                Recherche
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Description, source..."
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

        {/* Liste des revenus */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Catégorie</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Montant</th>
                  {(userProfile?.role === 'admin_universite' || userProfile?.role === 'comptable') && (
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRevenues.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-semibold">Aucun revenu trouvé</p>
                      <p className="text-sm mt-1">Créez votre premier revenu</p>
                    </td>
                  </tr>
                ) : (
                  filteredRevenues.map((revenue) => {
                    const category = categories.find(c => c.value === revenue.category);

                    return (
                      <tr key={revenue.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(revenue.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-semibold">{revenue.description}</div>
                          {revenue.notes && <div className="text-xs text-gray-500 mt-1">{revenue.notes}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${category?.color}-100 text-${category?.color}-700`}>
                            {category?.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{revenue.source}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                          +{revenue.amount.toLocaleString()} €
                        </td>
                        {(userProfile?.role === 'admin_universite' || userProfile?.role === 'comptable') && (
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {revenue.history && revenue.history.length > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedRevenue(revenue);
                                    setShowHistory(true);
                                  }}
                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                  title="Voir l'historique"
                                >
                                  <History className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(revenue)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(revenue.id)}
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
              {editingRevenue ? 'Modifier le Revenu' : 'Nouveau Revenu'}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Source *</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    required
                    placeholder="Nom de l'organisation/personne"
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
                    setEditingRevenue(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {editingRevenue ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {showHistory && selectedRevenue && (
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
                  setSelectedRevenue(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition"
              >
                <XCircle className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
              <h3 className="font-bold text-gray-900 mb-2">Revenu actuel</h3>
              <p className="text-sm text-gray-700">{selectedRevenue.description}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                <span>Montant: <strong>{selectedRevenue.amount.toLocaleString()} €</strong></span>
                <span>Catégorie: <strong>{categories.find(c => c.value === selectedRevenue.category)?.label}</strong></span>
                <span>Créé par: <strong>{selectedRevenue.createdByName}</strong></span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 mb-4">Historique ({selectedRevenue.history?.length || 0} modifications)</h3>
              {selectedRevenue.history && selectedRevenue.history.length > 0 ? (
                selectedRevenue.history.map((entry, index) => (
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
                      {entry.previousValues.source && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Source</p>
                          <p className="text-gray-900 font-medium">{entry.previousValues.source}</p>
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
                  setSelectedRevenue(null);
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
