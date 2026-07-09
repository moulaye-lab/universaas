/**
 * CashJournalPage.jsx - Journal de caisse journalier
 *
 * Fonctionnalités:
 * - Voir toutes les entrées/sorties de caisse
 * - Filtre par date, type, mode de paiement
 * - Traçabilité complète (qui, quand, combien)
 * - Export CSV
 * - Solde journalier
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronLeft,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Download,
  Calendar,
  User,
  DollarSign,
  AlertCircle
} from 'lucide-react';

export default function CashJournalPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, revenue, expense
  const [dateFilter, setDateFilter] = useState('today'); // today, week, month, all
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    loadEntries();
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [entries, searchTerm, typeFilter, dateFilter, methodFilter]);

  const loadEntries = async () => {
    if (!userProfile?.universityId) return;

    try {
      const journalRef = ref(database, `universities/${userProfile.universityId}/accounting/cashJournal`);
      const snapshot = await get(journalRef);

      if (snapshot.exists()) {
        const journalData = snapshot.val();
        const entriesArray = Object.keys(journalData).map(key => ({
          id: key,
          ...journalData[key]
        }));
        setEntries(entriesArray.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setEntries([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading cash journal:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...entries];

    // Filtre type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(e => e.type === typeFilter);
    }

    // Filtre date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (dateFilter === 'today') {
      filtered = filtered.filter(e => new Date(e.date) >= today);
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(e => new Date(e.date) >= weekAgo);
    } else if (dateFilter === 'month') {
      filtered = filtered.filter(e => new Date(e.date) >= monthAgo);
    }

    // Filtre mode de paiement
    if (methodFilter !== 'all') {
      filtered = filtered.filter(e => e.paymentMethod === methodFilter);
    }

    // Recherche
    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.processedByName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEntries(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Heure', 'Type', 'Montant', 'Mode', 'Description', 'Encaissé par', 'Étudiant'];
    const rows = filteredEntries.map(entry => [
      entry.date,
      new Date(entry.timestamp).toLocaleTimeString('fr-FR'),
      entry.type === 'revenue' ? 'Entrée' : 'Sortie',
      entry.amount,
      entry.paymentMethod,
      entry.description,
      entry.processedByName,
      entry.studentName || '-'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `journal_caisse_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalRevenue = filteredEntries
    .filter(e => e.type === 'revenue')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalExpense = filteredEntries
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const balance = totalRevenue - totalExpense;

  const cashCount = filteredEntries.filter(e => e.paymentMethod === 'cash').length;
  const virementCount = filteredEntries.filter(e => e.paymentMethod === 'virement').length;

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
                <BookOpen className="h-8 w-8 text-indigo-600" />
                Journal de Caisse
              </h1>
              <p className="text-gray-600 mt-1">Traçabilité complète des encaissements et décaissements</p>
            </div>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center gap-2 font-semibold"
            >
              <Download className="h-5 w-5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Entrées</p>
                <p className="text-2xl font-bold text-green-600">+{totalRevenue.toLocaleString()} €</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Sorties</p>
                <p className="text-2xl font-bold text-red-600">-{totalExpense.toLocaleString()} €</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Solde</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {balance.toLocaleString()} €
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{filteredEntries.length}</p>
                <p className="text-xs text-gray-500 mt-1">{cashCount} cash / {virementCount} virement</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <BookOpen className="h-6 w-6 text-blue-600" />
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
                placeholder="Description, étudiant, agent..."
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Filter className="h-4 w-4 inline mr-1" />
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
              >
                <option value="all">Tous</option>
                <option value="revenue">Entrées</option>
                <option value="expense">Sorties</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Période
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
              >
                <option value="today">Aujourd'hui</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
                <option value="all">Tout</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mode de paiement</label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
              >
                <option value="all">Tous</option>
                <option value="cash">Cash</option>
                <option value="virement">Virement</option>
                <option value="cheque">Chèque</option>
                <option value="carte">Carte bancaire</option>
              </select>
            </div>
          </div>
        </div>

        {/* Journal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date & Heure</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Étudiant</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Mode</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Montant</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Encaissé par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-semibold">Aucune transaction trouvée</p>
                      <p className="text-sm mt-1">Les encaissements apparaîtront ici</p>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="font-semibold text-gray-900">
                          {new Date(entry.date).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleTimeString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {entry.type === 'revenue' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                            <TrendingUp className="h-3 w-3" />
                            Entrée
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                            <TrendingDown className="h-3 w-3" />
                            Sortie
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-semibold text-gray-900">{entry.description}</div>
                        {entry.notes && <div className="text-xs text-gray-500 mt-1">{entry.notes}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {entry.studentName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {entry.paymentMethod === 'cash' ? '💵 Cash' :
                           entry.paymentMethod === 'virement' ? '🏦 Virement' :
                           entry.paymentMethod === 'cheque' ? '📝 Chèque' :
                           entry.paymentMethod === 'carte' ? '💳 Carte' :
                           entry.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-bold ${
                          entry.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {entry.type === 'revenue' ? '+' : '-'}{entry.amount.toLocaleString()} €
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-semibold text-gray-900">{entry.processedByName}</div>
                            <div className="text-xs text-gray-500">
                              {entry.processedByRole === 'admin_universite' ? 'Admin' : 'Comptable'}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
