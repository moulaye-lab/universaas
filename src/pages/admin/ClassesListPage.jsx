/**
 * ClassesListPage.jsx - Liste de toutes les classes
 *
 * Fonctionnalités:
 * - Affichage de toutes les classes avec taux d'occupation
 * - Filtrage par niveau, domaine
 * - Recherche par nom
 * - Bouton pour créer une nouvelle classe
 * - Accès aux détails de chaque classe
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { sanitizeHtml } from '../../utils/sanitize';

export default function ClassesListPage() {
  const navigate = useNavigate();
  const { userProfile, loading: authLoading } = useAuth();

  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDomain, setFilterDomain] = useState('all');

  // Charger les classes
  useEffect(() => {
    const loadClasses = async () => {
      if (authLoading) return;

      if (!userProfile?.universityId) {
        setError('Erreur: Aucune université associée');
        setLoading(false);
        return;
      }

      try {
        const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
        const classesSnap = await get(classesRef);

        if (classesSnap.exists()) {
          const classesData = classesSnap.val();
          const classesList = Object.entries(classesData).map(([id, data]) => ({
            id,
            ...data
          }));
          setClasses(classesList);
          setFilteredClasses(classesList);
        } else {
          setClasses([]);
          setFilteredClasses([]);
        }
      } catch (err) {
        console.error('Error loading classes:', err);
        setError('Erreur lors du chargement des classes');
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, [userProfile, authLoading]);

  // Appliquer les filtres
  useEffect(() => {
    let filtered = [...classes];

    // Recherche par nom
    if (searchTerm && searchTerm.trim()) {
      filtered = filtered.filter(cls =>
        (cls.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre niveau
    if (filterLevel !== 'all') {
      filtered = filtered.filter(cls => cls.level === filterLevel);
    }

    // Filtre domaine
    if (filterDomain !== 'all') {
      filtered = filtered.filter(cls => cls.domain === filterDomain);
    }

    setFilteredClasses(filtered);
  }, [searchTerm, filterLevel, filterDomain, classes]);

  // Extraire les valeurs uniques pour les filtres
  const levels = [...new Set(classes.map(c => c.level).filter(Boolean))];
  const domains = [...new Set(classes.map(c => c.domain).filter(Boolean))];

  const getOccupationColor = (occupied, capacity) => {
    const percentage = (occupied / capacity) * 100;
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 70) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Chargement des classes...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-black text-gray-900 mb-2">
                🎓 Gestion des Classes
              </h1>
              <p className="text-gray-600">
                {filteredClasses.length} classe{filteredClasses.length > 1 ? 's' : ''} disponible{filteredClasses.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/dashboard/admin')}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
              >
                ← Retour
              </button>
              <button
                onClick={() => navigate('/admin/classes/create')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold"
              >
                + Nouvelle Classe
              </button>
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="glass rounded-3xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Recherche */}
              <div>
                <input
                  type="text"
                  placeholder="🔍 Rechercher une classe..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filtre Niveau */}
              <div>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les niveaux</option>
                  {levels.sort().map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* Filtre Domaine */}
              <div>
                <select
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les domaines</option>
                  {domains.sort().map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-6">
              <p className="text-red-700 font-semibold">❌ {error}</p>
            </div>
          )}

          {/* Liste des classes */}
          {filteredClasses.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center">
              <div className="text-6xl mb-4">🎓</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Aucune classe trouvée
              </h3>
              <p className="text-gray-600 mb-6">
                {classes.length === 0
                  ? 'Commencez par créer votre première classe'
                  : 'Aucune classe ne correspond à vos critères de recherche'}
              </p>
              {classes.length === 0 && (
                <button
                  onClick={() => navigate('/admin/classes/create')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold"
                >
                  + Créer la première classe
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map(cls => (
                <div key={cls.id} className="glass rounded-3xl p-6 hover:shadow-xl transition">
                  {/* En-tête classe */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {sanitizeHtml(cls.name)}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                        {cls.level}
                      </span>
                      <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold">
                        {cls.domain}
                      </span>
                    </div>
                  </div>

                  {/* Capacité */}
                  <div className="mb-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-600">Occupation</span>
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getOccupationColor(cls.occupiedSeats || 0, cls.capacity)}`}>
                        {cls.occupiedSeats || 0}/{cls.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all"
                        style={{ width: `${((cls.occupiedSeats || 0) / cls.capacity) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Période académique */}
                  {cls.period && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                      <p className="text-xs text-gray-600 mb-1">Période</p>
                      <p className="text-sm font-semibold text-gray-900">
                        📅 {new Date(cls.period.start).toLocaleDateString('fr-FR')} → {new Date(cls.period.end).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}

                  {/* Année académique */}
                  {cls.academicYear && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-600">Année académique</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {cls.academicYear}
                      </p>
                    </div>
                  )}

                  {/* Nombre de cours */}
                  <div className="mb-4 p-3 bg-amber-50 rounded-xl">
                    <p className="text-xs text-gray-600 mb-1">Cours au planning</p>
                    <p className="text-lg font-bold text-gray-900">
                      📚 {cls.schedule?.length || 0} cours
                    </p>
                  </div>

                  {/* Bouton Voir Détails */}
                  <button
                    onClick={() => navigate(`/admin/classes/${cls.id}`)}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold text-sm"
                  >
                    👁️ Voir Détails
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
