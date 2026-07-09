/**
 * ComptableDashboard.jsx - Tableau de bord pour les comptables
 *
 * Fonctionnalités:
 * - Vue d'ensemble comptabilité générale (revenus, dépenses, budget)
 * - Consultation des paiements étudiants (lecture seule)
 * - Pas d'accès aux notes, cours, emplois du temps
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  LogOut,
  BookOpen as BookOpenIcon,
  Users,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
const BookOpen = BookOpenIcon;
import { useAuth } from '../../contexts/AuthContext';
import { database } from '../../config/firebase';
import { ref, get, onValue } from 'firebase/database';

export default function ComptableDashboard() {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [university, setUniversity] = useState(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    balance: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    studentsWithPlan: 0,
    paidPayments: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.universityId) return;

      try {
        // Charger les données de l'université
        const universityRef = ref(database, `universities/${userProfile.universityId}`);
        const universitySnapshot = await get(universityRef);

        if (universitySnapshot.exists()) {
          setUniversity(universitySnapshot.val());
        }

        // Écouter les dépenses
        const expensesRef = ref(database, `universities/${userProfile.universityId}/accounting/expenses`);
        onValue(expensesRef, (snapshot) => {
          let totalExpenses = 0;
          if (snapshot.exists()) {
            const expensesData = snapshot.val();
            const expensesArray = Object.keys(expensesData).map(key => ({
              id: key,
              ...expensesData[key]
            }));

            totalExpenses = expensesArray.reduce((sum, exp) => sum + (exp.amount || 0), 0);
          }

          setStats(prev => ({
            ...prev,
            totalExpenses,
            balance: prev.totalRevenue - totalExpenses
          }));
        });

        // Écouter les revenus
        const revenuesRef = ref(database, `universities/${userProfile.universityId}/accounting/revenues`);
        onValue(revenuesRef, (snapshot) => {
          let totalOtherRevenues = 0;
          if (snapshot.exists()) {
            const revenuesData = snapshot.val();
            const revenuesArray = Object.keys(revenuesData).map(key => ({
              id: key,
              ...revenuesData[key]
            }));

            totalOtherRevenues = revenuesArray.reduce((sum, rev) => sum + (rev.amount || 0), 0);
          }

          setStats(prev => ({
            ...prev,
            totalRevenue: prev.totalRevenue + totalOtherRevenues
          }));
        });

        // Écouter les paiements en temps réel
        const paymentsRef = ref(database, `universities/${userProfile.universityId}/payments`);
        onValue(paymentsRef, (snapshot) => {
          if (snapshot.exists()) {
            const paymentsData = snapshot.val();
            const paymentsArray = Object.keys(paymentsData).map(key => ({
              id: key,
              ...paymentsData[key]
            }));

            const totalRevenue = paymentsArray
              .filter(p => p.status === 'paid')
              .reduce((sum, p) => sum + (p.amount || 0), 0);

            const studentsSet = new Set(paymentsArray.map(p => p.studentId));
            const paidCount = paymentsArray.filter(p => p.status === 'paid').length;
            const pendingCount = paymentsArray.filter(p => p.status === 'pending').length;

            // Calculer revenus mensuels
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyPayments = paymentsArray.filter(p => {
              const paymentDate = new Date(p.date || p.createdAt);
              return p.status === 'paid' &&
                     paymentDate.getMonth() === currentMonth &&
                     paymentDate.getFullYear() === currentYear;
            });
            const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

            setStats(prev => ({
              ...prev,
              totalRevenue,
              monthlyRevenue,
              studentsWithPlan: studentsSet.size,
              paidPayments: paidCount,
              pendingPayments: pendingCount,
              balance: totalRevenue - prev.totalExpenses
            }));
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        navigate('/');
      }
    };

    loadData();
  }, [userProfile, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const quickActions = [
    {
      title: 'Tableau de Bord Comptable',
      icon: FileText,
      action: () => navigate('/admin/accounting'),
      gradient: 'from-blue-500 to-indigo-600',
      description: 'Vue d\'ensemble financière'
    },
    {
      title: 'Journal des Transactions',
      icon: DollarSign,
      action: () => navigate('/admin/accounting/journal'),
      gradient: 'from-emerald-500 to-teal-600',
      description: 'Historique des paiements'
    },
    {
      title: 'Paiements Étudiants',
      icon: Users,
      action: () => navigate('/admin/payments'),
      gradient: 'from-purple-500 to-purple-600',
      description: 'Consulter les plans de paiement'
    },
    {
      title: 'Gestion des Dépenses',
      icon: TrendingDown,
      action: () => navigate('/admin/accounting/expenses'),
      gradient: 'from-red-500 to-orange-600',
      description: 'Suivre les dépenses'
    },
    {
      title: 'Gestion des Revenus',
      icon: TrendingUp,
      action: () => navigate('/admin/accounting/revenues'),
      gradient: 'from-green-500 to-emerald-600',
      description: 'Suivre les revenus'
    },
    {
      title: 'Journal de Caisse',
      icon: BookOpen,
      action: () => navigate('/admin/accounting/cash-journal'),
      gradient: 'from-indigo-500 to-blue-600',
      description: 'Traçabilité quotidienne'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl">Chargement...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Revenus Total',
      value: `${stats.totalRevenue.toLocaleString()} €`,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-emerald-600',
      change: '+15.2%'
    },
    {
      title: 'Dépenses Total',
      value: `${stats.totalExpenses.toLocaleString()} €`,
      icon: TrendingDown,
      gradient: 'from-red-500 to-red-600',
      change: '+8.1%'
    },
    {
      title: 'Solde',
      value: `${stats.balance.toLocaleString()} €`,
      icon: DollarSign,
      gradient: 'from-blue-500 to-blue-600',
      change: stats.balance >= 0 ? '+' : ''
    },
    {
      title: 'Revenus Mensuels',
      value: `${stats.monthlyRevenue.toLocaleString()} €`,
      icon: FileText,
      gradient: 'from-purple-500 to-purple-600',
      change: '+12.3%'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar Sticky */}
      <nav className="sticky top-0 z-50 backdrop-blur-sm bg-white/95 border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {university?.name || 'Université'}
                </h1>
                <p className="text-sm text-gray-600">Dashboard Comptable</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userProfile?.displayName}</p>
                <p className="text-xs text-gray-600">{userProfile?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all duration-300 hover:scale-110"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Info - Accès limité */}
        <div className="mb-8 bg-amber-50 rounded-2xl p-6 border-l-4 border-amber-500 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Accès Comptabilité Générale
          </h3>
          <p className="text-sm text-gray-700">
            Vous avez accès à la comptabilité générale (revenus, dépenses, budget) et aux paiements étudiants en lecture seule.
            Vous n'avez pas accès aux notes, cours, ou emplois du temps.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                {stat.change && (
                  <span className={`text-sm font-semibold ${
                    stat.change.includes('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Étudiants avec Plan</p>
                <p className="text-2xl font-bold text-gray-900">{stats.studentsWithPlan}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Paiements Réglés</p>
                <p className="text-2xl font-bold text-gray-900">{stats.paidPayments}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Paiements En Attente</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="bg-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 text-left border border-gray-200 hover:border-indigo-300 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
