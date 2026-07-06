/**
 * CoursesListPage.jsx - Liste de tous les cours de l'université
 *
 * Fonctionnalités:
 * - Affichage de tous les cours avec leurs informations
 * - Filtrage par département, niveau, semestre
 * - Recherche par nom ou code
 * - Bouton pour créer un nouveau cours
 * - Détails: enseignant, horaires, salle, capacité
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function CoursesListPage() {
  const navigate = useNavigate();
  const { userProfile, loading: authLoading } = useAuth();

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');

  // Charger les cours
  useEffect(() => {
    const loadCourses = async () => {
      if (authLoading) {
        console.log('⏳ Waiting for auth...');
        return;
      }

      if (!userProfile) {
        console.log('❌ No userProfile');
        setLoading(false);
        return;
      }

      if (!userProfile.universityId) {
        console.log('❌ No universityId');
        setError('Erreur: Aucune université associée');
        setLoading(false);
        return;
      }

      console.log('🔍 Loading courses for:', userProfile.universityId);

      try {
        const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
        const coursesSnap = await get(coursesRef);

        if (coursesSnap.exists()) {
          const coursesData = coursesSnap.val();
          const coursesList = Object.entries(coursesData).map(([id, data]) => ({
            id,
            ...data
          }));
          setCourses(coursesList);
          setFilteredCourses(coursesList);
        } else {
          setCourses([]);
          setFilteredCourses([]);
        }
      } catch (err) {
        console.error('Error loading courses:', err);
        setError('Erreur lors du chargement des cours');
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [userProfile, authLoading]);

  // Appliquer les filtres
  useEffect(() => {
    try {
      let filtered = [...courses];

      // Recherche par nom ou code
      if (searchTerm && searchTerm.trim()) {
        filtered = filtered.filter(course =>
          (course.courseName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (course.courseCode || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Filtre département
      if (filterDepartment !== 'all') {
        filtered = filtered.filter(course => course.department === filterDepartment);
      }

      // Filtre niveau
      if (filterLevel !== 'all') {
        filtered = filtered.filter(course => course.level === filterLevel);
      }

      // Filtre semestre
      if (filterSemester !== 'all') {
        filtered = filtered.filter(course => course.semester === filterSemester);
      }

      setFilteredCourses(filtered);
    } catch (err) {
      console.error('Error filtering courses:', err);
      setFilteredCourses([]);
    }
  }, [searchTerm, filterDepartment, filterLevel, filterSemester, courses]);

  // Extraire les valeurs uniques pour les filtres
  const departments = [...new Set(courses.map(c => c.department).filter(Boolean))];
  const levels = [...new Set(courses.map(c => c.level).filter(Boolean))];
  const semesters = [...new Set(courses.map(c => c.semester).filter(Boolean))];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement des cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              📚 Catalogue des Cours
            </h1>
            <p className="text-gray-600">
              {filteredCourses.length} cours disponible{filteredCourses.length > 1 ? 's' : ''}
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
              onClick={() => navigate('/admin/courses/create')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold"
            >
              + Nouveau Cours
            </button>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="glass rounded-3xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="🔍 Rechercher par nom ou code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtre Département */}
            <div>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les départements</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Filtre Niveau */}
            <div>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les niveaux</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtre Semestre */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setFilterSemester('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filterSemester === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Tous
            </button>
            {semesters.sort().map(sem => (
              <button
                key={sem}
                onClick={() => setFilterSemester(sem)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filterSemester === sem
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {sem}
              </button>
            ))}
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-6">
            <p className="text-red-700 font-semibold">❌ {error}</p>
          </div>
        )}

        {/* Liste des cours */}
        {filteredCourses.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Aucun cours trouvé
            </h3>
            <p className="text-gray-600 mb-6">
              {courses.length === 0
                ? 'Commencez par créer votre premier cours'
                : 'Aucun cours ne correspond à vos critères de recherche'}
            </p>
            {courses.length === 0 && (
              <button
                onClick={() => navigate('/admin/courses/create')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold"
              >
                + Créer le premier cours
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(course => (
              <div key={course.id} className="glass rounded-3xl p-6 hover:shadow-xl transition">
                {/* En-tête cours */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {course.courseName}
                    </h3>
                    <p className="text-sm font-mono text-blue-600 font-semibold">
                      {course.courseCode}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    course.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {course.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                    {course.department}
                  </span>
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold">
                    {course.level} - {course.semester}
                  </span>
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold">
                    {course.credits} ECTS
                  </span>
                </div>

                {/* Enseignant */}
                <div className="mb-4 p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl">
                  <p className="text-xs text-gray-600 mb-1">Enseignant</p>
                  <p className="font-semibold text-gray-900">
                    👨‍🏫 {course.teacherName}
                  </p>
                </div>

                {/* Horaires */}
                {course.schedule ? (
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                    <p className="text-xs text-gray-600 mb-1">Horaires</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      🕐 {course.schedule.day} {course.schedule.startTime}-{course.schedule.endTime}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      🏢 Salle: {course.schedule.room}
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-600 mb-1">Horaires</p>
                    <p className="text-sm text-gray-500 italic">
                      ⏰ Horaire non défini
                    </p>
                  </div>
                )}

                {/* Capacité */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-600">Étudiants inscrits</p>
                    <p className="text-lg font-bold text-gray-900">
                      {course.enrolledStudents || 0} / {course.maxStudents}
                    </p>
                  </div>
                  <div className="w-16 h-16">
                    <svg className="transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeDasharray={`${((course.enrolledStudents || 0) / course.maxStudents) * 100}, 100`}
                      />
                    </svg>
                  </div>
                </div>

                {/* Description (si disponible) */}
                {course.description && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {course.description}
                    </p>
                  </div>
                )}

                {/* Bouton Voir Détails */}
                <button
                  onClick={() => navigate(`/admin/courses/${course.id}`)}
                  className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold text-sm"
                >
                  👁️ Voir Détails
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
