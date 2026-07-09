/**
 * TransactionJournalPage.jsx - Journal des transactions
 *
 * Fonctionnalités:
 * - Liste chronologique de toutes les transactions
 * - Filtres: date, étudiant, statut, devise
 * - Export Excel pour comptable
 * - Audit trail complet
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrencyByCode } from '../../utils/currencies';
import {
  ChevronLeft,
  Download,
  Filter,
  Search,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  FileText
} from 'lucide-react';

export default function TransactionJournalPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    currency: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: ''
  });

  useEffect(() => {
    loadTransactions();
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, filters]);

  const loadTransactions = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const univId = userProfile.universityId;

      // Charger étudiants
      const studentsRef = ref(database, `universities/${univId}/students`);
      const studentsSnap = await get(studentsRef);
      const studentsMap = {};
      if (studentsSnap.exists()) {
        Object.entries(studentsSnap.val()).forEach(([id, data]) => {
          studentsMap[id] = data;
        });
      }

      // Charger paiements et créer liste transactions
      const paymentsRef = ref(database, `universities/${univId}/payments`);
      const paymentsSnap = await get(paymentsRef);

      const transactionsList = [];
      if (paymentsSnap.exists()) {
        Object.entries(paymentsSnap.val()).forEach(([studentId, paymentData]) => {
          const student = studentsMap[studentId];

          paymentData.installments?.forEach((inst, index) => {
            transactionsList.push({
              id: `${studentId}-${index}`,
              studentId,
              studentName: student ? `${student.firstName} ${student.lastName}` : 'Inconnu',
              studentMatricule: student?.matricule || 'N/A',
              studentLevel: student?.level || 'N/A',
              amount: inst.amount,
              dueDate: inst.dueDate,
              paidDate: inst.paidDate || null,
              status: inst.status,
              paymentMethod: inst.paymentMethod || 'N/A',
              installmentNumber: inst.installmentNumber || index + 1,
              totalInstallments: inst.totalInstallments || paymentData.installments.length,
              currency: paymentData.currency || 'EUR',
              academicYear: paymentData.academicYear || 'N/A',
              createdAt: paymentData.createdAt || Date.now()
            });
          });
        });
      }

      // Trier par date (plus récent d'abord)
      transactionsList.sort((a, b) => {
        const dateA = a.paidDate || a.dueDate;
        const dateB = b.paidDate || b.dueDate;
        return dateB - dateA;
      });

      setTransactions(transactionsList);
      setLoading(false);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Recherche textuelle
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.studentName.toLowerCase().includes(term) ||
        t.studentMatricule.toLowerCase().includes(term)
      );
    }

    // Filtre statut
    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    // Filtre devise
    if (filters.currency) {
      filtered = filtered.filter(t => t.currency === filters.currency);
    }

    // Filtre date début
    if (filters.startDate) {
      const startTimestamp = new Date(filters.startDate).getTime();
      filtered = filtered.filter(t => {
        const date = t.paidDate || t.dueDate;
        return date >= startTimestamp;
      });
    }

    // Filtre date fin
    if (filters.endDate) {
      const endTimestamp = new Date(filters.endDate).getTime();
      filtered = filtered.filter(t => {
        const date = t.paidDate || t.dueDate;
        return date <= endTimestamp;
      });
    }

    // Filtre montant min
    if (filters.minAmount) {
      filtered = filtered.filter(t => t.amount >= parseFloat(filters.minAmount));
    }

    // Filtre montant max
    if (filters.maxAmount) {
      filtered = filtered.filter(t => t.amount <= parseFloat(filters.maxAmount));
    }

    setFilteredTransactions(filtered);
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      currency: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: ''
    });
    setSearchTerm('');
  };

  const exportToExcel = () => {
    const rows = [
      ['JOURNAL DES TRANSACTIONS - ' + (userProfile?.universityName || 'Université')],
      ['Généré le: ' + new Date().toLocaleString('fr-FR')],
      ['Nombre de transactions: ' + filteredTransactions.length],
      [''],
      [
        'Date',
        'Étudiant',
        'Matricule',
        'Niveau',
        'Montant',
        'Devise',
        'Statut',
        'Méthode',
        'Échéance',
        'Année académique'
      ]
    ];

    filteredTransactions.forEach(t => {
      const date = new Date(t.paidDate || t.dueDate).toLocaleDateString('fr-FR');
      rows.push([
        date,
        t.studentName,
        t.studentMatricule,
        t.studentLevel,
        t.amount.toFixed(2),
        t.currency,
        t.status === 'paid' ? 'Payé' : t.dueDate < Date.now() ? 'Retard' : 'En attente',
        t.paymentMethod,
        `${t.installmentNumber}/${t.totalInstallments}`,
        t.academicYear
      ]);
    });

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `journal_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du journal...</p>
        </div>
      </div>
    );
  }

  const uniqueCurrencies = [...new Set(transactions.map(t => t.currency))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/accounting')}
              className="p-2 hover:bg-white rounded-xl transition"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📒 Journal des Transactions</h1>
              <p className="text-gray-600 mt-1">Historique complet des paiements</p>
            </div>
          </div>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 font-semibold"
          >
            <Download className="h-5 w-5" />
            Exporter CSV
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-gray-600">Total transactions</p>
            <p className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-gray-600">Payées</p>
            <p className="text-2xl font-bold text-green-600">
              {filteredTransactions.filter(t => t.status === 'paid').length}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-gray-600">En attente</p>
            <p className="text-2xl font-bold text-orange-600">
              {filteredTransactions.filter(t => t.status === 'pending' && t.dueDate >= Date.now()).length}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-gray-600">En retard</p>
            <p className="text-2xl font-bold text-red-600">
              {filteredTransactions.filter(t => t.status === 'pending' && t.dueDate < Date.now()).length}
            </p>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="glass rounded-2xl p-6 mb-6">
          {/* Recherche */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou matricule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
              />
            </div>
          </div>

          {/* Filtres */}
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filtres</h3>
            <button
              onClick={resetFilters}
              className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Réinitialiser
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Statut */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none text-sm"
              >
                <option value="">Tous</option>
                <option value="paid">Payé</option>
                <option value="pending">En attente</option>
              </select>
            </div>

            {/* Devise */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Devise</label>
              <select
                value={filters.currency}
                onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none text-sm"
              >
                <option value="">Toutes</option>
                {uniqueCurrencies.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>

            {/* Date début */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none text-sm"
              />
            </div>

            {/* Date fin */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none text-sm"
              />
            </div>

            {/* Montant min */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Montant min</label>
              <input
                type="number"
                step="0.01"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none text-sm"
              />
            </div>

            {/* Montant max */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Montant max</label>
              <input
                type="number"
                step="0.01"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                placeholder="10000.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Tableau des transactions */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Transactions ({filteredTransactions.length})
          </h2>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Aucune transaction trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Étudiant</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Niveau</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Montant</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Échéance</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Statut</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Méthode</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const date = new Date(transaction.paidDate || transaction.dueDate);
                    const isOverdue = transaction.status === 'pending' && transaction.dueDate < Date.now();

                    return (
                      <tr
                        key={transaction.id}
                        className={`border-b border-gray-100 hover:bg-blue-50 transition ${
                          isOverdue ? 'bg-red-50' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-sm text-gray-700">
                          {date.toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-900 text-sm">{transaction.studentName}</p>
                          <p className="text-xs text-gray-500">{transaction.studentMatricule}</p>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {transaction.studentLevel}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 font-bold text-gray-900 text-sm">
                          {transaction.amount.toFixed(2)} {getCurrencyByCode(transaction.currency).symbol}
                        </td>
                        <td className="text-center py-3 px-4 text-sm text-gray-600">
                          {transaction.installmentNumber}/{transaction.totalInstallments}
                        </td>
                        <td className="text-center py-3 px-4">
                          {transaction.status === 'paid' ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Payé
                            </span>
                          ) : isOverdue ? (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              Retard
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4 text-sm text-gray-600">
                          {transaction.paymentMethod}
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
  );
}
