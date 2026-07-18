/**
 * Dashboard Super Admin Plateforme
 * Vue globale de tous les tenants (universités)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import CreateUniversityModal from '../components/CreateUniversityModal';
import {
  changerStatutTenant,
  mettreAJourPlanAbonnement,
  obtenirStatistiquesGlobales,
  obtenirListeTenants,
  synchroniserTenants
} from '../services/superAdminService';
import {
  GraduationCap,
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  BarChart3,
  Globe,
  Shield,
  LogOut,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Settings,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Ban,
  RefreshCw
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUniversities: 0,
    activeUniversities: 0,
    totalStudents: 0,
    totalTeachers: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    growthRate: 0,
  });
  const [universities, setUniversities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Attendre que userProfile soit chargé
    if (userProfile) {
      loadDashboardData();
    }
  }, [userProfile]);

  const loadDashboardData = async () => {
    try {
      // Vérifier le rôle avant de charger les données
      if (userProfile?.role !== 'super_admin_plateforme') {
        console.error('Accès refusé : rôle incorrect');
        setLoading(false);
        return;
      }

      // Charger les stats RÉELLES depuis system_admin
      const globalStats = await obtenirStatistiquesGlobales(userProfile.profileId);

      setStats({
        totalUniversities: globalStats.totalUniversities,
        activeUniversities: globalStats.activeUniversities,
        totalStudents: globalStats.totalStudents,
        totalTeachers: globalStats.totalTeachers,
        monthlyRevenue: globalStats.finance.monthlyRecurringRevenue,
        yearlyRevenue: globalStats.finance.yearlyRecurringRevenue,
        growthRate: 15.2, // TODO: Calculer le taux de croissance réel
      });

      // Charger les universités DEPUIS system_admin/tenants_management
      const universitiesList = await obtenirListeTenants(userProfile.profileId);
      universitiesList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setUniversities(universitiesList);

      setLoading(false);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      alert('Erreur de chargement: ' + error.message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleUniversityCreated = (data) => {
    setSuccessMessage(`Université "${data.universityName}" créée avec succès ! Email admin: ${data.adminEmail}`);
    setTimeout(() => setSuccessMessage(''), 8000);
    loadDashboardData(); // Recharger la liste
  };

  const handleSuspendTenant = async (tenantId) => {
    const reason = prompt('Raison de la suspension (obligatoire) :');
    if (!reason || reason.trim() === '') {
      alert('La raison de suspension est obligatoire');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir suspendre cette université ?\nRaison : ${reason}`)) {
      return;
    }

    try {
      await changerStatutTenant({
        tenantId,
        status: 'suspended',
        reason: reason.trim(),
        adminUid: userProfile.profileId
      });
      setSuccessMessage('Université suspendue avec succès');
      setTimeout(() => setSuccessMessage(''), 5000);
      loadDashboardData();
    } catch (error) {
      console.error(error);
      alert('Erreur : ' + error.message);
    }
  };

  const handleActivateTenant = async (tenantId) => {
    if (!confirm('Êtes-vous sûr de vouloir réactiver cette université ?')) {
      return;
    }

    try {
      await changerStatutTenant({
        tenantId,
        status: 'active',
        adminUid: userProfile.profileId
      });
      setSuccessMessage('Université réactivée avec succès');
      setTimeout(() => setSuccessMessage(''), 5000);
      loadDashboardData();
    } catch (error) {
      console.error(error);
      alert('Erreur : ' + error.message);
    }
  };

  const handleChangePlan = async (tenantId, currentPlan) => {
    const newPlan = prompt(`Plan actuel : ${currentPlan}\nNouveau plan (basic, standard, premium, enterprise) :`);

    if (!newPlan) return;

    const validPlans = ['basic', 'standard', 'premium', 'enterprise'];
    if (!validPlans.includes(newPlan.toLowerCase())) {
      alert('Plan invalide. Choisissez parmi : basic, standard, premium, enterprise');
      return;
    }

    if (!confirm(`Changer le plan de ${currentPlan} vers ${newPlan} ?`)) {
      return;
    }

    try {
      await mettreAJourPlanAbonnement({
        tenantId,
        newPlan: newPlan.toLowerCase(),
        adminUid: userProfile.profileId
      });
      setSuccessMessage('Plan mis à jour avec succès');
      setTimeout(() => setSuccessMessage(''), 5000);
      loadDashboardData();
    } catch (error) {
      console.error(error);
      alert('Erreur : ' + error.message);
    }
  };

  const handleSyncTenants = async () => {
    if (!confirm('Synchroniser toutes les universités dans system_admin ? Cette opération peut prendre quelques secondes.')) {
      return;
    }

    try {
      await synchroniserTenants(userProfile.profileId);
      setSuccessMessage('Synchronisation terminée avec succès');
      setTimeout(() => setSuccessMessage(''), 5000);
      loadDashboardData();
    } catch (error) {
      console.error(error);
      alert('Erreur : ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Actif' },
      trial: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock, label: 'Essai' },
      suspended: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Suspendu' },
      cancelled: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: AlertCircle, label: 'Annulé' },
    };
    const badge = badges[status] || badges.active;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border-2 ${badge.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {badge.label}
      </span>
    );
  };

  const getPlanBadge = (plan) => {
    const colors = {
      standard: 'bg-gray-100 text-gray-700',
      premium: 'bg-indigo-100 text-indigo-700',
      enterprise: 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${colors[plan] || colors.standard}`}>
        {plan}
      </span>
    );
  };

  const filteredUniversities = universities.filter(uni => {
    const matchesSearch = uni.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || uni.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUniversities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUniversities = filteredUniversities.slice(startIndex, endIndex);

  // Reset page quand on change le filtre/recherche
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar */}
      <nav className="glass border-b border-white/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-900">UniverSaaS</h1>
                <p className="text-xs text-gray-600 font-medium">Super Admin</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 glass px-4 py-2 rounded-xl">
                <Shield className="h-5 w-5 text-indigo-600" />
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{userProfile?.displayName || 'Super Admin'}</p>
                  <p className="text-xs text-gray-600">{userProfile?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white hover:bg-red-50 text-red-600 p-2 rounded-xl border-2 border-red-200 transition-all hover:scale-105"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3 animate-slide-up">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-4xl font-black text-gray-900 mb-2">
            Tableau de bord
          </h2>
          <p className="text-gray-600 text-lg">
            Vue d'ensemble de la plateforme UniverSaaS
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Universités */}
          <div className="glass p-6 rounded-3xl hover-lift group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                <ArrowUpRight className="h-4 w-4" />
                <span>+12%</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Universités</p>
            <p className="text-3xl font-black text-gray-900">{stats.totalUniversities || universities.length}</p>
            <p className="text-xs text-gray-500 mt-2">{stats.activeUniversities || 0} actives</p>
          </div>

          {/* Total Étudiants */}
          <div className="glass p-6 rounded-3xl hover-lift group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                <ArrowUpRight className="h-4 w-4" />
                <span>+23%</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Étudiants</p>
            <p className="text-3xl font-black text-gray-900">{(stats.totalStudents || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">+2.5K ce mois</p>
          </div>

          {/* Revenus Mensuels */}
          <div className="glass p-6 rounded-3xl hover-lift group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                <ArrowUpRight className="h-4 w-4" />
                <span>+18%</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Revenus / mois</p>
            <p className="text-3xl font-black text-gray-900">{(stats.monthlyRevenue || 12558).toLocaleString()}€</p>
            <p className="text-xs text-gray-500 mt-2">MRR (Monthly Recurring)</p>
          </div>

          {/* Taux de Croissance */}
          <div className="glass p-6 rounded-3xl hover-lift group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                <Activity className="h-4 w-4" />
                <span>+8%</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Croissance</p>
            <p className="text-3xl font-black text-gray-900">{stats.growthRate || 15.2}%</p>
            <p className="text-xs text-gray-500 mt-2">vs mois dernier</p>
          </div>
        </div>

        {/* Universities List */}
        <div className="glass p-8 rounded-3xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-black text-gray-900 mb-1">Universités clientes</h3>
              <p className="text-gray-600">Gérez vos clients et abonnements</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSyncTenants}
                className="bg-white border-2 border-indigo-300 text-indigo-600 px-4 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                Synchroniser
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2"
              >
                <Sparkles className="h-5 w-5" />
                Nouvelle université
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une université..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
              />
            </div>

            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-medium"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="trial">Essai</option>
              <option value="suspended">Suspendu</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-600 uppercase">Université</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-600 uppercase">Plan</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-600 uppercase">Statut</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-600 uppercase">Étudiants</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-600 uppercase">Revenus</th>
                  <th className="text-right py-4 px-4 text-sm font-bold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUniversities.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">Aucune université trouvée</p>
                    </td>
                  </tr>
                ) : (
                  paginatedUniversities.map((uni) => (
                    <tr key={uni.id} className="border-b border-gray-100 hover:bg-white/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                            {uni.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{uni.name || 'Université'}</p>
                            <p className="text-sm text-gray-600">{uni.slug || uni.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getPlanBadge(uni.plan || 'standard')}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(uni.status || 'active')}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-gray-900">{uni.currentStudents || 0}</p>
                        <p className="text-sm text-gray-600">/ {uni.maxStudents || 500}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-gray-900">{(uni.price || 149)}€</p>
                        <p className="text-sm text-gray-600">/mois</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Bouton Suspendre/Activer */}
                          {uni.status === 'active' ? (
                            <button
                              onClick={() => handleSuspendTenant(uni.universityId)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                              title="Suspendre l'accès"
                            >
                              <Ban className="h-5 w-5" />
                            </button>
                          ) : uni.status === 'suspended' ? (
                            <button
                              onClick={() => handleActivateTenant(uni.universityId)}
                              className="p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600"
                              title="Réactiver l'accès"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                          ) : null}

                          {/* Bouton Changer Plan */}
                          <button
                            onClick={() => handleChangePlan(uni.universityId, uni.plan)}
                            className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-indigo-600"
                            title="Modifier le plan"
                          >
                            <Settings className="h-5 w-5" />
                          </button>

                          {/* Menu Plus d'options */}
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredUniversities.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t-2 border-gray-200">
              <p className="text-sm text-gray-600">
                Affichage de <span className="font-bold">{startIndex + 1}-{Math.min(endIndex, filteredUniversities.length)}</span> sur <span className="font-bold">{filteredUniversities.length}</span> université(s)
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  {/* Bouton Précédent */}
                  {currentPage > 1 && (
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg font-medium text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      Précédent
                    </button>
                  )}

                  {/* Indicateur de page */}
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page <span className="font-bold">{currentPage}</span> / {totalPages}
                  </span>

                  {/* Bouton Suivant */}
                  {currentPage < totalPages && (
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold hover:scale-105 transition-all"
                    >
                      Suivant
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal de création d'université */}
      <CreateUniversityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleUniversityCreated}
      />
    </div>
  );
}
