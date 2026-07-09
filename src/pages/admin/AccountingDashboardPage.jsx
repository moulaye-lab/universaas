/**
 * AccountingDashboardPage.jsx - Tableau de bord comptable
 *
 * Fonctionnalités:
 * - KPIs financiers (CA total, payé, en attente, retards)
 * - Graphiques évolution mensuelle
 * - Répartition par niveau/devise
 * - Top retards à traiter
 * - Export comptable
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { CURRENCIES, getCurrencyByCode } from '../../utils/currencies';
import {
  ChevronLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Download,
  FileText,
  Calendar,
  Users,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function AccountingDashboardPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [allPayments, setAllPayments] = useState([]);

  // Stats globales
  const [stats, setStats] = useState({
    totalRevenue: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    totalStudentsWithPlan: 0,
    averageAmount: 0,
    collectionRate: 0
  });

  // Données graphiques
  const [monthlyData, setMonthlyData] = useState([]);
  const [levelDistribution, setLevelDistribution] = useState([]);
  const [currencyDistribution, setCurrencyDistribution] = useState([]);
  const [topOverdue, setTopOverdue] = useState([]);

  useEffect(() => {
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const univId = userProfile.universityId;

      // Charger étudiants
      const studentsRef = ref(database, `universities/${univId}/students`);
      const studentsSnap = await get(studentsRef);
      const studentsData = studentsSnap.exists()
        ? Object.entries(studentsSnap.val()).map(([id, data]) => ({ id, ...data }))
        : [];
      setStudents(studentsData);

      // Charger tous les paiements
      const paymentsRef = ref(database, `universities/${univId}/payments`);
      const paymentsSnap = await get(paymentsRef);

      const paymentsList = [];
      if (paymentsSnap.exists()) {
        Object.entries(paymentsSnap.val()).forEach(([studentId, paymentData]) => {
          const student = studentsData.find(s => s.id === studentId);
          paymentsList.push({
            studentId,
            studentName: student ? `${student.firstName} ${student.lastName}` : 'Inconnu',
            studentLevel: student?.level || 'N/A',
            currency: paymentData.currency || 'EUR',
            totalAmount: paymentData.totalAmount || 0,
            installments: paymentData.installments || [],
            academicYear: paymentData.academicYear || 'N/A',
            createdAt: paymentData.createdAt || Date.now()
          });
        });
      }

      setAllPayments(paymentsList);
      calculateStats(paymentsList);
      generateChartData(paymentsList);
      setLoading(false);
    } catch (err) {
      console.error('Error loading accounting data:', err);
      setLoading(false);
    }
  };

  const calculateStats = (payments) => {
    const now = Date.now();
    let totalRevenue = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    payments.forEach(payment => {
      totalRevenue += payment.totalAmount;

      payment.installments.forEach(inst => {
        if (inst.status === 'paid') {
          paidAmount += inst.amount;
        } else if (inst.status === 'pending') {
          if (inst.dueDate < now) {
            overdueAmount += inst.amount;
          } else {
            pendingAmount += inst.amount;
          }
        }
      });
    });

    const collectionRate = totalRevenue > 0 ? (paidAmount / totalRevenue) * 100 : 0;
    const averageAmount = payments.length > 0 ? totalRevenue / payments.length : 0;

    setStats({
      totalRevenue,
      paidAmount,
      pendingAmount,
      overdueAmount,
      totalStudentsWithPlan: payments.length,
      averageAmount,
      collectionRate
    });
  };

  const generateChartData = (payments) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    // Données mensuelles (12 derniers mois)
    const monthlyMap = {};
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentYear, now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = { month: months[date.getMonth()], paid: 0, pending: 0, overdue: 0 };
    }

    payments.forEach(payment => {
      payment.installments.forEach(inst => {
        const date = new Date(inst.paidDate || inst.dueDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (monthlyMap[key]) {
          if (inst.status === 'paid') {
            monthlyMap[key].paid += inst.amount;
          } else if (inst.dueDate < Date.now()) {
            monthlyMap[key].overdue += inst.amount;
          } else {
            monthlyMap[key].pending += inst.amount;
          }
        }
      });
    });

    setMonthlyData(Object.values(monthlyMap).reverse());

    // Répartition par niveau
    const levelMap = {};
    payments.forEach(payment => {
      const level = payment.studentLevel || 'Non défini';
      if (!levelMap[level]) {
        levelMap[level] = 0;
      }
      levelMap[level] += payment.totalAmount;
    });

    setLevelDistribution(
      Object.entries(levelMap)
        .filter(([name]) => name && name !== 'null' && name !== 'undefined' && name !== 'N/A')
        .map(([name, value]) => ({ name, value }))
    );

    // Répartition par devise
    const currencyMap = {};
    payments.forEach(payment => {
      const curr = payment.currency || 'EUR';
      if (!currencyMap[curr]) {
        currencyMap[curr] = 0;
      }
      currencyMap[curr] += payment.totalAmount;
    });

    setCurrencyDistribution(
      Object.entries(currencyMap).map(([name, value]) => ({ name, value }))
    );

    // Top 10 retards
    const overdueList = [];
    payments.forEach(payment => {
      let overdueTotal = 0;
      let overdueCount = 0;

      payment.installments.forEach(inst => {
        if (inst.status === 'pending' && inst.dueDate < Date.now()) {
          overdueTotal += inst.amount;
          overdueCount++;
        }
      });

      if (overdueTotal > 0) {
        overdueList.push({
          studentName: payment.studentName,
          level: payment.studentLevel,
          amount: overdueTotal,
          count: overdueCount,
          currency: payment.currency
        });
      }
    });

    setTopOverdue(overdueList.sort((a, b) => b.amount - a.amount).slice(0, 10));
  };

  const exportToExcel = () => {
    // Préparer données pour export
    const rows = [
      ['RAPPORT COMPTABLE - ' + (userProfile?.universityName || 'Université')],
      ['Généré le: ' + new Date().toLocaleString('fr-FR')],
      [''],
      ['STATISTIQUES GLOBALES'],
      ['Chiffre d\'affaires total', stats.totalRevenue.toFixed(2)],
      ['Montant encaissé', stats.paidAmount.toFixed(2)],
      ['En attente', stats.pendingAmount.toFixed(2)],
      ['Retards', stats.overdueAmount.toFixed(2)],
      ['Taux de recouvrement', stats.collectionRate.toFixed(2) + '%'],
      ['Nombre d\'étudiants avec plan', stats.totalStudentsWithPlan],
      ['Montant moyen par étudiant', stats.averageAmount.toFixed(2)],
      [''],
      ['TOP 10 RETARDS'],
      ['Étudiant', 'Niveau', 'Montant', 'Nombre échéances', 'Devise']
    ];

    topOverdue.forEach(item => {
      rows.push([
        item.studentName,
        item.level,
        item.amount.toFixed(2),
        item.count,
        item.currency
      ]);
    });

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_comptable_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données comptables...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="p-2 hover:bg-white rounded-xl transition"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Comptabilité</h1>
              <p className="text-gray-600 mt-1">Tableau de bord financier</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/accounting/journal')}
              className="px-4 py-2 bg-white border-2 border-blue-500 text-blue-600 rounded-xl hover:bg-blue-50 transition flex items-center gap-2 font-semibold"
            >
              <FileText className="h-5 w-5" />
              Journal
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 font-semibold"
            >
              <Download className="h-5 w-5" />
              Exporter CSV
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalRevenue.toFixed(0)}</p>
            <p className="text-sm text-gray-600">CA Total</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.paidAmount.toFixed(0)}</p>
            <p className="text-sm text-gray-600">Encaissé</p>
            <p className="text-xs text-green-600 mt-1">{stats.collectionRate.toFixed(1)}% recouvrement</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingAmount.toFixed(0)}</p>
            <p className="text-sm text-gray-600">En attente</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.overdueAmount.toFixed(0)}</p>
            <p className="text-sm text-gray-600">Retards</p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Évolution mensuelle */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Évolution Mensuelle
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="paid" stroke="#10B981" name="Payé" strokeWidth={2} />
                <Line type="monotone" dataKey="pending" stroke="#F59E0B" name="En attente" strokeWidth={2} />
                <Line type="monotone" dataKey="overdue" stroke="#EF4444" name="Retard" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Répartition par niveau */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PieChartIcon className="h-6 w-6 text-purple-600" />
              Répartition par Niveau
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={levelDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {levelDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Retards */}
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            Top 10 Retards à Traiter
          </h2>

          {topOverdue.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-16 w-16 text-green-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Aucun retard - Excellent!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">#</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Étudiant</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Niveau</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Montant dû</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Échéances</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topOverdue.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-red-50 transition">
                      <td className="py-3 px-4 text-gray-600 font-semibold">{index + 1}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-gray-900">{item.studentName}</p>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          {item.level}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4 font-bold text-red-600">
                        {item.amount.toFixed(2)} {getCurrencyByCode(item.currency).symbol}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          {item.count} en retard
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <button
                          onClick={() => navigate('/admin/payments')}
                          className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-xs font-semibold"
                        >
                          Gérer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats détaillées */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-6 w-6 text-blue-600" />
              <h3 className="font-bold text-gray-900">Étudiants avec plan</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.totalStudentsWithPlan}</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              <h3 className="font-bold text-gray-900">Montant moyen</h3>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.averageAmount.toFixed(0)}</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <h3 className="font-bold text-gray-900">Taux de recouvrement</h3>
            </div>
            <p className="text-3xl font-bold text-purple-600">{stats.collectionRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/admin/accounting/journal')}
            className="glass rounded-2xl p-6 hover:shadow-lg transition text-left group"
          >
            <FileText className="h-10 w-10 text-blue-600 mb-3 group-hover:scale-110 transition" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Journal des Transactions</h3>
            <p className="text-sm text-gray-600">Historique complet avec filtres avancés</p>
          </button>

          <button
            onClick={() => navigate('/admin/payments')}
            className="glass rounded-2xl p-6 hover:shadow-lg transition text-left group"
          >
            <DollarSign className="h-10 w-10 text-green-600 mb-3 group-hover:scale-110 transition" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Gestion des Paiements</h3>
            <p className="text-sm text-gray-600">Créer et gérer les plans de paiement</p>
          </button>

          <button
            onClick={exportToExcel}
            className="glass rounded-2xl p-6 hover:shadow-lg transition text-left group"
          >
            <Download className="h-10 w-10 text-purple-600 mb-3 group-hover:scale-110 transition" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Export Comptable</h3>
            <p className="text-sm text-gray-600">Télécharger rapport CSV complet</p>
          </button>
        </div>
      </div>
    </div>
  );
}
