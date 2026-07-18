/**
 * CourseDetailsPage.jsx - Détails et gestion d'un cours
 *
 * Fonctionnalités:
 * - Afficher les détails du cours
 * - Inscrire des étudiants au cours
 * - Désinscrire des étudiants
 * - Voir l'enseignant assigné
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { Edit } from 'lucide-react';

export default function CourseDetailsPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { userProfile } = useAuth();

  const [course, setCourse] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showBulkEnrollModal, setShowBulkEnrollModal] = useState(false);
  const [bulkFilters, setBulkFilters] = useState({
    level: 'all',
    department: 'all',
    semester: 'all'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const loadCourse = async () => {
      if (!userProfile?.universityId || !courseId) return;

      try {
        setLoading(true);

        // Charger le cours
        const courseRef = ref(database, `universities/${userProfile.universityId}/courses/${courseId}`);
        const courseSnap = await get(courseRef);

        if (!courseSnap.exists()) {
          setError('Cours introuvable');
          return;
        }

        const courseData = courseSnap.val();
        setCourse(courseData);

        // Charger tous les étudiants
        const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
        const studentsSnap = await get(studentsRef);

        if (studentsSnap.exists()) {
          const studentsData = Object.entries(studentsSnap.val()).map(([id, data]) => ({
            id,
            ...data
          }));
          setAllStudents(studentsData);

          // Filtrer les étudiants inscrits
          const enrolledIds = courseData.enrolledStudents || [];
          const enrolled = studentsData.filter(s => enrolledIds.includes(s.id));
          setEnrolledStudents(enrolled);
        }
      } catch (err) {
        console.error('Error loading course:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId, userProfile]);

  const handleEnrollStudent = async (studentId) => {
    try {
      setSaving(true);
      setError('');

      const currentEnrolled = course.enrolledStudents || [];
      const updatedEnrolled = [...currentEnrolled, studentId];

      // Mettre à jour le cours
      const courseRef = ref(database, `universities/${userProfile.universityId}/courses/${courseId}`);
      await update(courseRef, {
        enrolledStudents: updatedEnrolled,
        updatedAt: Date.now()
      });

      // Mettre à jour l'étudiant
      const studentRef = ref(database, `universities/${userProfile.universityId}/students/${studentId}`);
      const studentSnap = await get(studentRef);

      if (studentSnap.exists()) {
        const studentData = studentSnap.val();
        const studentCourses = studentData.enrolledCourses || [];

        if (!studentCourses.includes(courseId)) {
          studentCourses.push(courseId);
          await update(studentRef, {
            enrolledCourses: studentCourses,
            updatedAt: Date.now()
          });
        }
      }

      // Recharger les données
      const updatedCourseSnap = await get(courseRef);
      const updatedCourse = updatedCourseSnap.val();
      setCourse(updatedCourse);

      const enrolledIds = updatedCourse.enrolledStudents || [];
      const enrolled = allStudents.filter(s => enrolledIds.includes(s.id));
      setEnrolledStudents(enrolled);

      setShowStudentModal(false);
      setSuccess('✅ Étudiant inscrit avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error enrolling student:', err);
      setError('Erreur lors de l\'inscription');
    } finally {
      setSaving(false);
    }
  };

  const handleUnenrollStudent = async (studentId) => {
    if (!confirm('Voulez-vous vraiment désinscrire cet étudiant du cours ?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const currentEnrolled = course.enrolledStudents || [];
      const updatedEnrolled = currentEnrolled.filter(id => id !== studentId);

      // Mettre à jour le cours
      const courseRef = ref(database, `universities/${userProfile.universityId}/courses/${courseId}`);
      await update(courseRef, {
        enrolledStudents: updatedEnrolled,
        updatedAt: Date.now()
      });

      // Mettre à jour l'étudiant
      const studentRef = ref(database, `universities/${userProfile.universityId}/students/${studentId}`);
      const studentSnap = await get(studentRef);

      if (studentSnap.exists()) {
        const studentData = studentSnap.val();
        const studentCourses = studentData.enrolledCourses || [];
        const updatedCourses = studentCourses.filter(id => id !== courseId);

        await update(studentRef, {
          enrolledCourses: updatedCourses,
          updatedAt: Date.now()
        });
      }

      // Recharger les données
      const updatedCourseSnap = await get(courseRef);
      const updatedCourse = updatedCourseSnap.val();
      setCourse(updatedCourse);

      const enrolledIds = updatedCourse.enrolledStudents || [];
      const enrolled = allStudents.filter(s => enrolledIds.includes(s.id));
      setEnrolledStudents(enrolled);

      setSuccess('✅ Étudiant désinscrit avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error unenrolling student:', err);
      setError('Erreur lors de la désinscription');
    } finally {
      setSaving(false);
    }
  };

  const getFilteredStudentsForBulk = () => {
    let filtered = allStudents.filter(s =>
      !(course.enrolledStudents || []).includes(s.id)
    );

    if (bulkFilters.level !== 'all') {
      filtered = filtered.filter(s => s.level === bulkFilters.level);
    }

    if (bulkFilters.department !== 'all') {
      filtered = filtered.filter(s => s.department === bulkFilters.department);
    }

    if (bulkFilters.semester !== 'all') {
      filtered = filtered.filter(s => s.semester === bulkFilters.semester);
    }

    return filtered;
  };

  const handleBulkEnroll = async () => {
    const studentsToEnroll = getFilteredStudentsForBulk();

    if (studentsToEnroll.length === 0) {
      setError('Aucun étudiant ne correspond aux critères');
      return;
    }

    if (!confirm(`Voulez-vous vraiment inscrire ${studentsToEnroll.length} étudiant(s) à ce cours ?`)) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const currentEnrolled = course.enrolledStudents || [];
      const newEnrolledIds = studentsToEnroll.map(s => s.id);
      const updatedEnrolled = [...new Set([...currentEnrolled, ...newEnrolledIds])];

      // Mettre à jour le cours
      const courseRef = ref(database, `universities/${userProfile.universityId}/courses/${courseId}`);
      await update(courseRef, {
        enrolledStudents: updatedEnrolled,
        updatedAt: Date.now()
      });

      // Mettre à jour chaque étudiant
      for (const student of studentsToEnroll) {
        const studentRef = ref(database, `universities/${userProfile.universityId}/students/${student.id}`);
        const studentSnap = await get(studentRef);

        if (studentSnap.exists()) {
          const studentData = studentSnap.val();
          const studentCourses = studentData.enrolledCourses || [];

          if (!studentCourses.includes(courseId)) {
            studentCourses.push(courseId);
            await update(studentRef, {
              enrolledCourses: studentCourses,
              updatedAt: Date.now()
            });
          }
        }
      }

      // Recharger les données
      const updatedCourseSnap = await get(courseRef);
      const updatedCourse = updatedCourseSnap.val();
      setCourse(updatedCourse);

      const enrolledIds = updatedCourse.enrolledStudents || [];
      const enrolled = allStudents.filter(s => enrolledIds.includes(s.id));
      setEnrolledStudents(enrolled);

      setShowBulkEnrollModal(false);
      setBulkFilters({ level: 'all', department: 'all', semester: 'all' });
      setSuccess(`✅ ${studentsToEnroll.length} étudiant(s) inscrit(s) avec succès`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error bulk enrolling students:', err);
      setError('Erreur lors de l\'inscription en masse');
    } finally {
      setSaving(false);
    }
  };

  const availableStudents = allStudents.filter(s =>
    !(course.enrolledStudents || []).includes(s.id)
  );

  const uniqueLevels = [...new Set(allStudents.map(s => s.level).filter(Boolean))];
  const uniqueDepartments = [...new Set(allStudents.map(s => s.department).filter(Boolean))];
  const uniqueSemesters = [...new Set(allStudents.map(s => s.semester).filter(Boolean))];

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Chargement...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !course) {
    return (
      <AdminLayout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="glass rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => navigate('/admin/courses')}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
              >
                ← Retour à la liste
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-black text-gray-900 mb-2">
                📚 {course.name}
              </h1>
              <p className="text-gray-600 text-lg">
                {course.code} • {course.credits} ECTS
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditForm(course);
                  setShowEditModal(true);
                }}
                className="px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition font-semibold shadow flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
              <button
                onClick={() => navigate('/admin/courses')}
                className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow"
              >
                ← Retour
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
              ❌ {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600">
              {success}
            </div>
          )}

          {/* Informations du cours */}
          <div className="glass rounded-3xl p-8 mb-8">
            <h2 className="text-2xl font-black text-gray-900 mb-6">
              Informations du Cours
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Code du cours
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  {course.code}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Niveau
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  {course.level || 'Non spécifié'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Crédits ECTS
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  {course.credits}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Capacité
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  {course.capacity || 'Illimitée'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Semestre
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  Semestre {course.semester || 1}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Enseignant
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  {course.teacherName || 'Non assigné'}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  {course.description || 'Aucune description'}
                </div>
              </div>
            </div>
          </div>

          {/* Section Étudiants Inscrits */}
          <div className="glass rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">
                  👥 Étudiants Inscrits
                </h2>
                <p className="text-gray-600">
                  {enrolledStudents.length} étudiant{enrolledStudents.length > 1 ? 's' : ''} inscrit{enrolledStudents.length > 1 ? 's' : ''}
                  {course.capacity && ` / ${course.capacity} places`}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkEnrollModal(true)}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold shadow-lg flex items-center gap-2"
                  disabled={saving || (course.capacity && enrolledStudents.length >= course.capacity)}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Inscrire en masse
                </button>
                <button
                  onClick={() => setShowStudentModal(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold shadow-lg"
                  disabled={saving || (course.capacity && enrolledStudents.length >= course.capacity)}
                >
                  ➕ Inscrire manuellement
                </button>
              </div>
            </div>

            {enrolledStudents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-gray-600">Aucun étudiant inscrit pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {enrolledStudents.map(student => (
                  <div key={student.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {student.firstName?.[0]}{student.lastName?.[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {student.firstName} {student.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {student.studentNumber} • {student.level || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnenrollStudent(student.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-semibold text-sm"
                      disabled={saving}
                    >
                      Désinscrire
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Inscrire Étudiant */}
          {showStudentModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="glass rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-gray-900">
                    Inscrire un Étudiant
                  </h2>
                  <button
                    onClick={() => setShowStudentModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {availableStudents.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎓</div>
                      <p className="text-gray-900 font-semibold mb-2">Aucun étudiant disponible</p>
                      <p className="text-gray-600 text-sm">
                        Tous les étudiants sont déjà inscrits à ce cours
                      </p>
                    </div>
                  ) : (
                    availableStudents.map(student => (
                      <button
                        key={student.id}
                        onClick={() => handleEnrollStudent(student.id)}
                        className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:bg-blue-50 transition flex items-center gap-4"
                        disabled={saving}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {student.firstName?.[0]}{student.lastName?.[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {student.firstName} {student.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {student.studentNumber} • {student.level || 'N/A'}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal Inscription en Masse */}
          {showBulkEnrollModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="glass rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-gray-900">
                    📋 Inscription en Masse
                  </h2>
                  <button
                    onClick={() => {
                      setShowBulkEnrollModal(false);
                      setBulkFilters({ level: 'all', department: 'all', semester: 'all' });
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Filtres */}
                <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    🔍 Filtrer les étudiants
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Filtre Niveau */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Niveau
                      </label>
                      <select
                        value={bulkFilters.level}
                        onChange={(e) => setBulkFilters({ ...bulkFilters, level: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="all">Tous les niveaux</option>
                        {uniqueLevels.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filtre Département */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Département
                      </label>
                      <select
                        value={bulkFilters.department}
                        onChange={(e) => setBulkFilters({ ...bulkFilters, department: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="all">Tous les départements</option>
                        {uniqueDepartments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filtre Semestre */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Semestre
                      </label>
                      <select
                        value={bulkFilters.semester}
                        onChange={(e) => setBulkFilters({ ...bulkFilters, semester: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="all">Tous les semestres</option>
                        {uniqueSemesters.map(sem => (
                          <option key={sem} value={sem}>Semestre {sem}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Aperçu */}
                <div className="mb-6 p-6 bg-green-50 rounded-2xl border border-green-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    ✅ Aperçu de l'inscription
                  </h3>
                  <p className="text-gray-700 text-lg">
                    <span className="font-black text-green-600 text-2xl">
                      {getFilteredStudentsForBulk().length}
                    </span>
                    {' '}étudiant{getFilteredStudentsForBulk().length > 1 ? 's' : ''} correspond{getFilteredStudentsForBulk().length > 1 ? 'ent' : ''} aux critères sélectionnés
                  </p>
                </div>

                {/* Liste des étudiants filtrés */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    👥 Étudiants qui seront inscrits
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {getFilteredStudentsForBulk().length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-gray-900 font-semibold mb-2">
                          Aucun étudiant ne correspond aux critères
                        </p>
                        <p className="text-gray-600 text-sm">
                          Modifiez les filtres ci-dessus pour voir plus d'étudiants
                        </p>
                      </div>
                    ) : (
                      getFilteredStudentsForBulk().map(student => (
                        <div key={student.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {student.firstName?.[0]}{student.lastName?.[0]}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {student.firstName} {student.lastName}
                            </h4>
                            <p className="text-xs text-gray-600">
                              {student.studentNumber} • {student.level || 'N/A'} • {student.department || 'N/A'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowBulkEnrollModal(false);
                      setBulkFilters({ level: 'all', department: 'all', semester: 'all' });
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleBulkEnroll}
                    disabled={saving || getFilteredStudentsForBulk().length === 0}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Inscription en cours...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Inscrire tous ({getFilteredStudentsForBulk().length})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Édition Cours */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Modifier le Cours</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom du cours *
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={editForm.code || ''}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Crédits ECTS *
                  </label>
                  <input
                    type="number"
                    value={editForm.credits || ''}
                    onChange={(e) => setEditForm({ ...editForm, credits: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Niveau
                  </label>
                  <select
                    value={editForm.level || ''}
                    onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    <option value="L1">L1</option>
                    <option value="L2">L2</option>
                    <option value="L3">L3</option>
                    <option value="M1">M1</option>
                    <option value="M2">M2</option>
                    <option value="D1">D1</option>
                    <option value="D2">D2</option>
                    <option value="D3">D3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Semestre
                  </label>
                  <select
                    value={editForm.semester || ''}
                    onChange={(e) => setEditForm({ ...editForm, semester: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    <option value="1">Semestre 1</option>
                    <option value="2">Semestre 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Département
                </label>
                <input
                  type="text"
                  value={editForm.department || ''}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={async () => {
                  if (!editForm.name || !editForm.code || !editForm.credits) {
                    alert('Veuillez remplir tous les champs obligatoires');
                    return;
                  }

                  try {
                    setSaving(true);
                    const courseRef = ref(database, `universities/${userProfile.universityId}/courses/${courseId}`);
                    await update(courseRef, {
                      name: editForm.name,
                      code: editForm.code,
                      credits: editForm.credits,
                      level: editForm.level || '',
                      semester: editForm.semester || '',
                      department: editForm.department || '',
                      description: editForm.description || '',
                      updatedAt: Date.now()
                    });

                    setCourse(editForm);
                    setShowEditModal(false);
                    setSuccess('Cours modifié avec succès');
                    setTimeout(() => setSuccess(''), 3000);
                  } catch (err) {
                    console.error('Error updating course:', err);
                    alert('Erreur lors de la modification: ' + err.message);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition font-semibold disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
