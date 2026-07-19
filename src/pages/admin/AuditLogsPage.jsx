/**
 * AuditLogsPage.jsx - Consultation des Logs d'Audit
 *
 * Interface admin pour consulter l'historique immuable:
 * - Toutes les actions critiques tracées
 * - Filtres par action, utilisateur, date
 * - Vue détaillée de chaque log
 * - Statistiques d'activité
 * - Export CSV
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAuditLogs,
  getAuditStats,
  formatAuditAction,
  getAuditActionColor,
  AUDIT_ACTIONS
} from '../../services/auditLogService';
import {
  ChevronLeft,
  Filter,
  Download,
  Eye,
  Calendar,
  User,
  Activity,
  Shield
} from 'lucide-react';

export default function AuditLogsPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [stats, setStats] = useState(null);

  const [filters, setFilters] = useState({
    action: 'all',
    userId: 'all',
    targetType: 'all',
    search: '',
    startDate: '',
    endDate: '',
    limit: 100
  });

  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [userProfile]);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const loadLogs = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const logsData = await getAuditLogs(userProfile.universityId, {
        limit: filters.limit
      });
      setLogs(logsData);
    } catch (error) {
      console.error('Erreur chargement logs:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!userProfile?.universityId) return;

    try {
      const statsData = await getAuditStats(userProfile.universityId, 'month');
      setStats(statsData);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Filtre action
    if (filters.action !== 'all') {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    // Filtre utilisateur
    if (filters.userId !== 'all') {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }

    // Filtre type cible
    if (filters.targetType !== 'all') {
      filtered = filtered.filter(log => log.targetType === filters.targetType);
    }

    // Recherche
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log =>
        log.userName?.toLowerCase().includes(searchLower) ||
        log.targetName?.toLowerCase().includes(searchLower) ||
        log.additionalInfo?.toLowerCase().includes(searchLower)
      );
    }

    // Dates
    if (filters.startDate) {
      const startTimestamp = new Date(filters.startDate).getTime();
      filtered = filtered.filter(log => log.timestamp >= startTimestamp);
    }

    if (filters.endDate) {
      const endTimestamp = new Date(filters.endDate).getTime() + (24 * 60 * 60 * 1000); // Fin de journée
      filtered = filtered.filter(log => log.timestamp < endTimestamp);
    }

    setFilteredLogs(filtered);
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('Aucun log à exporter');
      return;
    }

    const csvHeaders = ['Date', 'Heure', 'Action', 'Utilisateur', 'Rôle', 'Cible', 'Détails'];
    const csvRows = filteredLogs.map(log => {
      const date = new Date(log.timestamp);
      return [
        date.toLocaleDateString('fr-FR'),
        date.toLocaleTimeString('fr-FR'),
        formatAuditAction(log),
        log.userName,
        log.userRole,
        log.targetName || '-',
        log.additionalInfo || '-'
      ].map(cell => `"${cell}"`).join(',');
    });

    const csv = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${Date.now()}.csv`;
    link.click();
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  // Extraire utilisateurs uniques
  const uniqueUsers = [...new Set(logs.map(log => log.userId))].map(userId => {
    const log = logs.find(l => l.userId === userId);
    return { id: userId, name: log.userName };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="h-8 w-8 text-indigo-600" />
                Logs d'Audit
              </h1>
              <p className="text-gray-600 mt-1">Traçabilité immuable des actions critiques</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold"
            >
              <Download className="h-5 w-5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Total (30j)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Actions uniques</p>
              <p className="text-2xl font-bold text-blue-600">{Object.keys(stats.byAction).length}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Utilisateurs actifs</p>
              <p className="text-2xl font-bold text-purple-600">{Object.keys(stats.byUser).length}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Moyenne / jour</p>
              <p className="text-2xl font-bold text-green-600">
                {Object.keys(stats.byDay).length > 0
                  ? Math.round(stats.total / Object.keys(stats.byDay).length)
                  : 0
                }
              </p>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="glass rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Filter className="h-4 w-4 inline mr-1" />
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Toutes les actions</option>
                <optgroup label="Notes">
                  <option value={AUDIT_ACTIONS.GRADE_CREATE}>Création note</option>
                  <option value={AUDIT_ACTIONS.GRADE_UPDATE}>Modification note</option>
                  <option value={AUDIT_ACTIONS.GRADE_DELETE}>Suppression note</option>
                </optgroup>
                <optgroup label="Utilisateurs">
                  <option value={AUDIT_ACTIONS.USER_CREATE}>Création utilisateur</option>
                  <option value={AUDIT_ACTIONS.USER_UPDATE}>Modification utilisateur</option>
                  <option value={AUDIT_ACTIONS.USER_DELETE}>Suppression utilisateur</option>
                </optgroup>
                <optgroup label="Année Académique">
                  <option value={AUDIT_ACTIONS.SEMESTER_CLOSE}>Clôture semestre</option>
                  <option value={AUDIT_ACTIONS.SEMESTER_REOPEN}>Réouverture semestre</option>
                  <option value={AUDIT_ACTIONS.PROMOTION_EXECUTE}>Promotion</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Utilisateur
              </label>
              <select
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tous les utilisateurs</option>
                {uniqueUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date début
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date fin
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Recherche
              </label>
              <input
                type="text"
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date & Heure</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Cible</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Détails</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      Aucun log trouvé
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => {
                    const date = new Date(log.timestamp);
                    return (
                      <tr key={log.id} className="hover:bg-indigo-50 transition">
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-semibold text-gray-900">
                              {date.toLocaleDateString('fr-FR')}
                            </p>
                            <p className="text-gray-500">
                              {date.toLocaleTimeString('fr-FR')}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getAuditActionColor(log.action)}`}>
                            {formatAuditAction(log)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-semibold text-gray-900">{log.userName}</p>
                            <p className="text-gray-500">{log.userRole}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="text-gray-900">{log.targetName || '-'}</p>
                            {log.targetType && (
                              <p className="text-gray-500 text-xs">{log.targetType}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600 truncate max-w-xs">
                            {log.additionalInfo || log.reason || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewDetails(log)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Voir détails"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          Affichage de {filteredLogs.length} log{filteredLogs.length > 1 ? 's' : ''} sur {logs.length}
        </div>
      </div>

      {/* Modal Détails */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Détails du Log</h2>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Action</p>
                  <p className="text-lg font-bold text-gray-900">{formatAuditAction(selectedLog)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Date</p>
                    <p className="text-gray-900">{new Date(selectedLog.timestamp).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Heure</p>
                    <p className="text-gray-900">{new Date(selectedLog.timestamp).toLocaleTimeString('fr-FR')}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Utilisateur</p>
                  <p className="text-gray-900">{selectedLog.userName}</p>
                  <p className="text-sm text-gray-500">{selectedLog.userRole} • {selectedLog.userId}</p>
                </div>

                {selectedLog.targetName && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Cible</p>
                    <p className="text-gray-900">{selectedLog.targetName}</p>
                    <p className="text-sm text-gray-500">{selectedLog.targetType} • {selectedLog.targetId}</p>
                  </div>
                )}

                {selectedLog.oldValue && (
                  <div className="bg-red-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-red-700 mb-1">Ancienne valeur</p>
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.oldValue, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.newValue && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-green-700 mb-1">Nouvelle valeur</p>
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.newValue, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.reason && (
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-yellow-700 mb-1">Raison</p>
                    <p className="text-gray-900">{selectedLog.reason}</p>
                  </div>
                )}

                {selectedLog.additionalInfo && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-blue-700 mb-1">Informations supplémentaires</p>
                    <p className="text-gray-900">{selectedLog.additionalInfo}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
