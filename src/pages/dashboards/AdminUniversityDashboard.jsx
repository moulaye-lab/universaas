import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Award,
  DollarSign,
  LogOut,
  UserPlus,
  UserCheck,
  BookPlus,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  List,
  Building2,
  Settings,
  UsersIcon,
  GraduationCap,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { database } from '../../config/firebase';
import { ref, get, onValue, update } from 'firebase/database';
import CreateParentModal from '../../components/CreateParentModal';
import { getAuditStats } from '../../services/auditLogService';

const AdminUniversityDashboard = () => {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [university, setUniversity] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    pendingStudents: 0,
    inactiveStudents: 0,
    suspendedStudents: 0,
    totalTeachers: 0,
    successRate: 0,
    monthlyRevenue: 0,
    studentsVariation: 0,
    teachersVariation: 0,
    successVariation: 0,
    revenueVariation: 0
  });
  const [pendingInscriptions, setPendingInscriptions] = useState([]);
  const [latePayments, setLatePayments] = useState([]);
  const [showParentModal, setShowParentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [auditStats, setAuditStats] = useState(null);

  useEffect(() => {
    // console.log('📊 AdminDashboard useEffect:', { universityId: userProfile?.universityId });
    let cleanup;

    const loadData = async () => {
      if (!userProfile?.universityId) {
        // console.log('⚠️ AdminDashboard: Pas de universityId');
        return;
      }

      // console.log('📥 AdminDashboard: Chargement données université...');
      try {
        // Charger les données de l'université
        const universityRef = ref(database, `universities/${userProfile.universityId}`);
        const universitySnapshot = await get(universityRef);

        if (universitySnapshot.exists()) {
          // console.log('✅ AdminDashboard: Université chargée');
          setUniversity(universitySnapshot.val());
        } else {
          // console.log('⚠️ AdminDashboard: Université non trouvée');
        }

        // Écouter les changements en temps réel
        // console.log('🔄 AdminDashboard: Lancement loadDashboardData...');
        cleanup = loadDashboardData(userProfile.universityId);
        // console.log('✅ AdminDashboard: loadDashboardData terminé');

        // Charger stats audit
        loadAuditStats(userProfile.universityId);

        // Loading terminé
        setLoading(false);
        // console.log('✅ AdminDashboard: setLoading(false)');

      } catch (error) {
        console.error('❌ AdminDashboard: Error loading user data:', error);
        setLoading(false);
        navigate('/');
      }
    };

    loadData();

    // Cleanup listeners quand le composant se démonte
    return () => {
      if (cleanup) cleanup();
    };
  }, [userProfile, navigate]);

  const loadDashboardData = (universityId) => {
    // console.log('🔄 loadDashboardData: Début', { universityId });
    const unsubscribers = [];

    // Écouter les étudiants
    const studentsRef = ref(database, `universities/${universityId}/students`);
    const unsubStudents = onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const studentsData = snapshot.val();
        const studentsArray = Object.keys(studentsData).map(key => ({
          id: key,
          ...studentsData[key]
        }));

        // Filtrer les inscriptions en attente
        const pending = studentsArray.filter(s => s.status === 'pending');
        setPendingInscriptions(pending);

        // Calculer stats étudiants par statut
        const activeCount = studentsArray.filter(s => s.status === 'active').length;
        const pendingCount = studentsArray.filter(s => s.status === 'pending').length;
        const inactiveCount = studentsArray.filter(s => s.status === 'inactive').length;
        const suspendedCount = studentsArray.filter(s => s.status === 'suspended').length;

        setStats(prev => ({
          ...prev,
          totalStudents: studentsArray.length,
          activeStudents: activeCount,
          pendingStudents: pendingCount,
          inactiveStudents: inactiveCount,
          suspendedStudents: suspendedCount,
          studentsVariation: 0
        }));
      } else {
        setPendingInscriptions([]);
        setStats(prev => ({ ...prev, totalStudents: 0 }));
      }
    });

    unsubscribers.push(unsubStudents);

    // Écouter les enseignants
    const teachersRef = ref(database, `universities/${universityId}/teachers`);
    const unsubTeachers = onValue(teachersRef, (snapshot) => {
      if (snapshot.exists()) {
        const teachersData = snapshot.val();
        const teachersCount = Object.keys(teachersData).length;
        setStats(prev => ({
          ...prev,
          totalTeachers: teachersCount,
          teachersVariation: 0
        }));
      } else {
        setStats(prev => ({ ...prev, totalTeachers: 0 }));
      }
    });

    unsubscribers.push(unsubTeachers);

    // Écouter les paiements
    const paymentsRef = ref(database, `universities/${universityId}/payments`);
    const unsubPayments = onValue(paymentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const paymentsData = snapshot.val();
        const paymentsArray = Object.keys(paymentsData).map(key => ({
          id: key,
          ...paymentsData[key]
        }));

        // Filtrer les paiements en retard
        const today = new Date();
        const late = paymentsArray.filter(p => {
          const dueDate = new Date(p.dueDate);
          return p.status === 'pending' && dueDate < today;
        });
        setLatePayments(late);

        // Calculer revenus mensuels
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyPayments = paymentsArray.filter(p => {
          const paymentDate = new Date(p.date || p.createdAt);
          return p.status === 'paid' &&
                 paymentDate.getMonth() === currentMonth &&
                 paymentDate.getFullYear() === currentYear;
        });
        const revenue = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        setStats(prev => ({
          ...prev,
          monthlyRevenue: revenue,
          revenueVariation: 0
        }));
      } else {
        setLatePayments([]);
        setStats(prev => ({ ...prev, monthlyRevenue: 0 }));
      }
    });

    unsubscribers.push(unsubPayments);

    // Calculer taux de réussite réel basé sur les notes
    const gradesRef = ref(database, `universities/${universityId}/grades`);
    const unsubGrades = onValue(gradesRef, (snapshot) => {
      if (snapshot.exists()) {
        const gradesData = snapshot.val();
        const gradesArray = Object.values(gradesData);

        // Calculer la moyenne générale et le taux de réussite (>= 10/20)
        if (gradesArray.length > 0) {
          const totalGrades = gradesArray.reduce((sum, grade) => sum + (grade.value || 0), 0);
          const avgGrade = totalGrades / gradesArray.length;
          const passedGrades = gradesArray.filter(g => g.value >= 10).length;
          const successRate = (passedGrades / gradesArray.length) * 100;

          setStats(prev => ({
            ...prev,
            successRate: Math.round(successRate * 10) / 10, // Arrondi à 1 décimale
            successVariation: 0
          }));
        } else {
          setStats(prev => ({ ...prev, successRate: 0, successVariation: 0 }));
        }
      } else {
        setStats(prev => ({ ...prev, successRate: 0, successVariation: 0 }));
      }
    });

    unsubscribers.push(unsubGrades);

    // Retourner fonction de nettoyage
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  };

  const handleAcceptInscription = async (studentId) => {
    if (!userProfile?.universityId) return;

    try {
      const studentRef = ref(database, `universities/${userProfile.universityId}/students/${studentId}`);
      await update(studentRef, {
        status: 'active',
        acceptedAt: new Date().toISOString(),
        acceptedBy: userProfile.displayName
      });
    } catch (error) {
      console.error('Error accepting inscription:', error);
      alert('Erreur lors de l\'acceptation de l\'inscription');
    }
  };

  const handleRejectInscription = async (studentId) => {
    if (!userProfile?.universityId) return;

    try {
      const studentRef = ref(database, `universities/${userProfile.universityId}/students/${studentId}`);
      await update(studentRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: userProfile.displayName
      });
    } catch (error) {
      console.error('Error rejecting inscription:', error);
      alert('Erreur lors du rejet de l\'inscription');
    }
  };

  const loadAuditStats = async (universityId) => {
    try {
      const stats = await getAuditStats(universityId, 'week');
      setAuditStats(stats);
    } catch (error) {
      console.error('Erreur chargement stats audit:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleQuickAction = (action) => {
    switch(action) {
      case 'manage-classes':
        navigate('/admin/classes');
        break;
      case 'manage-students':
        navigate('/admin/manage-students');
        break;
      case 'manage-teachers':
        navigate('/admin/manage-teachers');
        break;
      case 'manage-courses':
        navigate('/admin/manage-courses');
        break;
      case 'parents-list':
        navigate('/admin/parents');
        break;
      case 'library-management':
        navigate('/admin/library/management');
        break;
      case 'calendar-management':
        navigate('/admin/calendar');
        break;
      case 'academic-promotion':
        navigate('/admin/academic-promotion');
        break;
      case 'academic-menu':
        navigate('/admin/academic-menu');
        break;
      case 'finances-menu':
        navigate('/admin/finances-menu');
        break;
      case 'rooms-management':
        navigate('/admin/rooms');
        break;
      case 'schedules-management':
        navigate('/admin/schedules');
        break;
      case 'academic-data':
        navigate('/admin/academic-data');
        break;
      case 'absences-management':
        navigate('/admin/absences');
        break;
      case 'payments-management':
        navigate('/admin/payments');
        break;
      case 'tuition-fees':
        navigate('/admin/tuition-fees');
        break;
      case 'accounting-dashboard':
        navigate('/admin/accounting');
        break;
      case 'create-comptable':
        navigate('/admin/comptable/create');
        break;
      case 'settings':
        navigate('/admin/settings');
        break;
      case 'audit-logs':
        navigate('/admin/audit-logs');
        break;
      case 'close-year':
        if (confirm('Êtes-vous sûr de vouloir clôturer l\'année académique ?')) {
          // Logique de clôture
          alert('Fonctionnalité de clôture à implémenter');
        }
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Étudiants',
      value: stats.totalStudents,
      variation: stats.studentsVariation,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Total Enseignants',
      value: stats.totalTeachers,
      variation: stats.teachersVariation,
      icon: BookOpen,
      gradient: 'from-green-500 to-green-600'
    },
    {
      title: 'Taux de Réussite',
      value: `${stats.successRate}%`,
      variation: stats.successVariation,
      icon: Award,
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Revenus Mensuels',
      value: `${stats.monthlyRevenue.toLocaleString()} €`,
      variation: stats.revenueVariation,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-emerald-600'
    }
  ];

  const quickActions = [
    {
      title: '🎓 Gestion Académique',
      icon: BookOpen,
      action: 'academic-menu',
      gradient: 'from-blue-500 to-indigo-600',
      description: 'Étudiants, enseignants, classes, notes, calendrier'
    },
    {
      title: '💰 Gestion Financière',
      icon: DollarSign,
      action: 'finances-menu',
      gradient: 'from-green-500 to-emerald-600',
      description: 'Comptabilité, paiements, recettes, dépenses'
    },
    {
      title: 'Messagerie',
      icon: FileText,
      action: 'messages',
      gradient: 'from-purple-500 to-pink-600',
      description: 'Communication interne'
    },
    {
      title: 'Bibliothèque',
      icon: BookOpen,
      action: 'library-management',
      gradient: 'from-indigo-500 to-purple-600',
      description: 'Livres, ressources et emprunts'
    },
    {
      title: 'Tableau de Bord Financier',
      icon: FileText,
      action: 'accounting-dashboard',
      gradient: 'from-lime-500 to-lime-600',
      description: 'Vue d\'ensemble comptable'
    },
    {
      title: 'Créer un Comptable',
      icon: UserPlus,
      action: 'create-comptable',
      gradient: 'from-yellow-500 to-yellow-600',
      description: 'Nouveau compte comptable'
    },
    {
      title: 'Paramètres',
      icon: Settings,
      action: 'settings',
      gradient: 'from-gray-500 to-slate-600',
      description: 'Configuration de l\'université'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
      {/* Navbar Sticky */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {university?.name || 'Université'}
                </h1>
                <p className="text-sm text-indigo-200">Dashboard Administrateur</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{userProfile?.displayName}</p>
                <p className="text-xs text-indigo-200">{userProfile?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-300 hover:scale-110"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Carte Logs d'Audit */}
        {auditStats && (
          <button
            onClick={() => navigate('/admin/audit-logs')}
            className="w-full backdrop-blur-xl bg-gradient-to-r from-red-500/20 to-pink-500/20 border-2 border-red-400/30 rounded-3xl p-6 mb-8 hover:from-red-500/30 hover:to-pink-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 shadow-lg group-hover:scale-110 transition-transform">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-bold text-white mb-1">🛡️ Logs d'Audit - Traçabilité</h3>
                  <p className="text-red-200">Historique immuable des actions critiques (7 derniers jours)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-white">{auditStats.total}</p>
                <p className="text-sm text-red-200">actions tracées</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{Object.keys(auditStats.byAction).length}</p>
                <p className="text-xs text-red-200">types d'actions</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{Object.keys(auditStats.byUser).length}</p>
                <p className="text-xs text-red-200">utilisateurs actifs</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">
                  {Object.keys(auditStats.byDay).length > 0
                    ? Math.round(auditStats.total / Object.keys(auditStats.byDay).length)
                    : 0
                  }
                </p>
                <p className="text-xs text-red-200">actions / jour</p>
              </div>
            </div>
          </button>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in" data-tour="stats-dashboard">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="group relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 hover:bg-white/20 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${stat.variation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <span>{stat.variation >= 0 ? '+' : ''}{stat.variation}%</span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">{stat.value}</h3>
              <p className="text-sm text-indigo-200">{stat.title}</p>

              {/* Détail des statuts étudiants */}
              {stat.title === 'Total Étudiants' && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-300 flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Actifs
                    </span>
                    <span className="text-white font-semibold">{stats.activeStudents}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-yellow-300 flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      En attente
                    </span>
                    <span className="text-white font-semibold">{stats.pendingStudents}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      Inactifs
                    </span>
                    <span className="text-white font-semibold">{stats.inactiveStudents}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-300 flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      Suspendus
                    </span>
                    <span className="text-white font-semibold">{stats.suspendedStudents}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions Rapides */}
        <div className="animate-fade-in mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <div key={index} className="relative">
                <button
                  onClick={() => handleQuickAction(action.action)}
                  className="group relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 hover:bg-white/20 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:-translate-y-1 text-left w-full"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${action.gradient} shadow-lg mb-4 inline-flex group-hover:scale-110 transition-transform duration-300`}>
                    <action.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">{action.title}</h3>
                  <p className="text-sm text-indigo-200">{action.description}</p>
                </button>

                {/* Sous-menus */}
                {action.isFinancial && openFinancialMenu && (
                  <div className="mt-4 space-y-3 animate-fade-in">
                    {action.subActions.map((subAction, subIndex) => (
                      <button
                        key={subIndex}
                        onClick={() => handleQuickAction(subAction.action)}
                        className="w-full flex items-start gap-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 text-left group"
                      >
                        <div className="p-2 rounded-lg bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                          <subAction.icon className="w-5 h-5 text-emerald-300" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{subAction.title}</h4>
                          <p className="text-xs text-indigo-300 mt-0.5">{subAction.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {action.isAcademic && openAcademicMenu && (
                  <div className="mt-4 space-y-3 animate-fade-in">
                    {action.subActions.map((subAction, subIndex) => (
                      <button
                        key={subIndex}
                        onClick={() => handleQuickAction(subAction.action)}
                        className="w-full flex items-start gap-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 text-left group"
                      >
                        <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                          <subAction.icon className="w-5 h-5 text-purple-300" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{subAction.title}</h4>
                          <p className="text-xs text-indigo-300 mt-0.5">{subAction.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {action.isPeople && openPeopleMenu && (
                  <div className="mt-4 space-y-3 animate-fade-in">
                    {action.subActions.map((subAction, subIndex) => (
                      <button
                        key={subIndex}
                        onClick={() => handleQuickAction(subAction.action)}
                        className="w-full flex items-start gap-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 text-left group"
                      >
                        <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                          <subAction.icon className="w-5 h-5 text-blue-300" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{subAction.title}</h4>
                          <p className="text-xs text-indigo-300 mt-0.5">{subAction.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Inscriptions en Attente */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 mb-8 animate-fade-in" data-tour="students-management">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">Inscriptions en Attente</h2>
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-semibold">
              {pendingInscriptions.length}
            </span>
          </div>

          {pendingInscriptions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-indigo-200">Aucune inscription en attente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-indigo-200">Nom</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-indigo-200">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-indigo-200">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-indigo-200">Documents</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-indigo-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInscriptions.map((student, index) => (
                    <tr
                      key={student.id}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <p className="text-white font-medium">{student.name}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-indigo-200 text-sm">{student.email}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-indigo-200 text-sm">
                          {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <button className="flex items-center gap-2 text-indigo-300 hover:text-white transition-colors">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">Voir</span>
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowParentModal(true);
                            }}
                            className="p-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 hover:scale-110 transition-all duration-300"
                            title="Créer compte parent"
                          >
                            <Users className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleAcceptInscription(student.id)}
                            className="p-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:scale-110 transition-all duration-300"
                            title="Accepter"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRejectInscription(student.id)}
                            className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:scale-110 transition-all duration-300"
                            title="Refuser"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paiements en Retard */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 mb-8 animate-fade-in" data-tour="accounting">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-6 h-6 text-red-400" />
            <h2 className="text-2xl font-bold text-white">Paiements en Retard</h2>
            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-semibold">
              {latePayments.length}
            </span>
          </div>

          {latePayments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-indigo-200">Aucun paiement en retard</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-indigo-200">Étudiant</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-indigo-200">Montant Dû</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-indigo-200">Échéance</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-indigo-200">Retard</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-indigo-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {latePayments.map((payment, index) => {
                    const dueDate = new Date(payment.dueDate);
                    const today = new Date();
                    const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

                    return (
                      <tr
                        key={payment.id}
                        className="border-b border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <p className="text-white font-medium">{payment.studentName || 'N/A'}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-white font-semibold">{payment.amount?.toLocaleString()} €</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-indigo-200 text-sm">{dueDate.toLocaleDateString()}</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-semibold">
                            {daysLate} jours
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button className="px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white transition-all duration-300 text-sm font-medium">
                              Relancer
                            </button>
                            <button className="px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-all duration-300 text-sm font-medium">
                              Marquer payé
                            </button>
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

      {/* Animations CSS */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>

      {/* Modal Créer/Lier Compte Parent */}
      {selectedStudent && (
        <CreateParentModal
          isOpen={showParentModal}
          onClose={() => {
            setShowParentModal(false);
            setSelectedStudent(null);
          }}
          studentData={selectedStudent}
          universityId={userProfile?.universityId}
          adminUid={userProfile?.uid}
        />
      )}
    </div>
  );
};

export default AdminUniversityDashboard;
