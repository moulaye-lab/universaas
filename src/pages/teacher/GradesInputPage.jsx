/**
 * GradesInputPage.jsx - Saisie de notes par l'enseignant
 *
 * Fonctionnalités:
 * - Sélectionner un cours enseigné
 * - Sélectionner les étudiants inscrits au cours
 * - Entrer une note pour chaque étudiant
 * - Types de notes: Examen, Devoir, Contrôle continu
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, push, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeout } from '../../hooks/useTimeout';
import { notifyNewGrade } from '../../services/notificationService';

export default function GradesInputPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const setTimeoutSafe = useTimeout();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    gradeType: 'exam',
    coefficient: 1,
    maxGrade: 20,
    date: new Date().toISOString().split('T')[0]
  });
  const [grades, setGrades] = useState({});
  const [observations, setObservations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchCourse, setSearchCourse] = useState('');

  // Charger les cours de l'enseignant
  useEffect(() => {
    const loadCourses = async () => {
      if (!userProfile?.universityId || !currentUser?.uid) {
        return;
      }

      try {
        setLoading(true);

        const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
        const coursesSnap = await get(coursesRef);

        if (coursesSnap.exists()) {
          const allCourses = Object.entries(coursesSnap.val())
            .map(([id, data]) => ({ id, ...data }))
            .filter(course => course.teacherId === currentUser.uid);

          setCourses(allCourses);
        } else {
          setCourses([]);
        }
      } catch (err) {
        console.error('❌ Error loading courses:', err);
        setError('Erreur lors du chargement des cours: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [userProfile, currentUser]);

  // Charger les étudiants du cours sélectionné
  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedCourse || !userProfile?.universityId) return;

      try {
        const univId = userProfile.universityId;

        // CORRECTION : Trouver toutes les classes qui ont ce cours dans leur emploi du temps
        const classesRef = ref(database, `universities/${univId}/classes`);
        const classesSnap = await get(classesRef);

        const enrolledStudentIds = new Set(); // Utiliser Set pour éviter doublons

        if (classesSnap.exists()) {
          const allClasses = classesSnap.val();

          // Pour chaque classe, vérifier si elle a ce cours
          Object.entries(allClasses).forEach(([classId, classData]) => {
            if (classData.schedule && Array.isArray(classData.schedule)) {
              // Vérifier si le cours est dans l'emploi du temps
              const hasCourse = classData.schedule.some(
                scheduleItem => scheduleItem.courseId === selectedCourse
              );

              if (hasCourse && classData.students) {
                // Ajouter tous les étudiants de cette classe
                classData.students.forEach(studentId => enrolledStudentIds.add(studentId));
              }
            }
          });
        }

        if (enrolledStudentIds.size === 0) {
          setStudents([]);
          return;
        }

        // 2. Charger les détails des étudiants inscrits
        const studentsRef = ref(database, `universities/${univId}/students`);
        const studentsSnap = await get(studentsRef);

        const enrolledStudents = [];
        if (studentsSnap.exists()) {
          const allStudents = studentsSnap.val();

          enrolledStudentIds.forEach(studentId => {
            if (allStudents[studentId]) {
              const studentData = allStudents[studentId];
              enrolledStudents.push({
                id: studentId,
                ...studentData
              });
            }
          });
        }

        // 3. Trier par nom (avec vérification si lastName existe)
        enrolledStudents.sort((a, b) => {
          const lastNameA = a.lastName || '';
          const lastNameB = b.lastName || '';
          return lastNameA.localeCompare(lastNameB);
        });

        setStudents(enrolledStudents);

        // Initialiser les notes et observations à vide
        const initialGrades = {};
        const initialObservations = {};
        enrolledStudents.forEach(student => {
          initialGrades[student.id] = '';
          initialObservations[student.id] = '';
        });
        setGrades(initialGrades);
        setObservations(initialObservations);
      } catch (err) {
        console.error('❌ Error loading students:', err);
        setError('Erreur lors du chargement des étudiants: ' + err.message);
      }
    };

    if (selectedCourse) {
      loadStudents();
    }
  }, [selectedCourse, userProfile, courses]);

  const handleGradeChange = (studentId, value) => {
    setGrades(prev => ({ ...prev, [studentId]: value }));
  };

  const handleObservationChange = (studentId, value) => {
    setObservations(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!selectedCourse) {
        throw new Error('Veuillez sélectionner un cours');
      }

      if (!formData.title) {
        throw new Error('Veuillez donner un titre à l\'évaluation');
      }

      // Validation date : ne pas autoriser date future
      const evaluationDate = new Date(formData.date).setHours(0, 0, 0, 0);
      const today = new Date().setHours(0, 0, 0, 0);

      if (evaluationDate > today) {
        throw new Error('❌ La date de l\'évaluation ne peut pas être dans le futur');
      }

      // Compter les notes saisies
      const enteredGrades = Object.values(grades).filter(g => g !== '');
      if (enteredGrades.length === 0) {
        throw new Error('Veuillez saisir au moins une note');
      }

      const course = courses.find(c => c.id === selectedCourse);
      const gradesRef = ref(database, `universities/${userProfile.universityId}/grades`);

      // Créer une note par étudiant
      const promises = [];
      for (const [studentId, gradeValue] of Object.entries(grades)) {
        if (gradeValue !== '') {
          const grade = parseFloat(gradeValue);

          // Validation de la note
          if (isNaN(grade) || grade < 0 || grade > formData.maxGrade) {
            throw new Error(`Note invalide pour un étudiant (0-${formData.maxGrade})`);
          }

          // Trouver les infos de l'étudiant (nom complet et classe)
          const student = students.find(s => s.id === studentId);

          const observation = observations[studentId]?.trim() || null;

          const newGradeRef = push(gradesRef);
          promises.push(
            set(newGradeRef, {
              id: newGradeRef.key,
              studentId,
              studentName: student ? `${student.firstName} ${student.lastName}` : 'Étudiant',
              courseId: selectedCourse,
              courseName: course.courseName,
              teacherId: currentUser.uid,
              teacherName: userProfile.displayName,
              grade: grade,
              maxGrade: formData.maxGrade,
              coefficient: parseFloat(formData.coefficient),
              gradeType: formData.gradeType,
              title: formData.title,
              observation: observation,
              date: new Date(formData.date).getTime(),
              semester: course.semester || 1,
              academicYear: course.academicYear || '2025-2026',
              classId: student?.classId || null,
              className: student?.className || 'N/A',
              createdAt: Date.now(),
              updatedAt: Date.now()
            })
          );
        }
      }

      await Promise.all(promises);

      // Envoyer notifications aux étudiants
      const notificationPromises = [];
      for (const [studentId, gradeValue] of Object.entries(grades)) {
        if (gradeValue !== '' && gradeValue !== null && gradeValue !== undefined) {
          const student = students.find(s => s.id === studentId);
          notificationPromises.push(
            notifyNewGrade(userProfile.universityId, studentId, {
              courseId: selectedCourse,
              courseName: course.courseName,
              grade: gradeValue,
              maxGrade: formData.maxGrade,
              teacherId: currentUser.uid
            }).catch(err => console.error('Error sending notification:', err))
          );
        }
      }
      await Promise.all(notificationPromises);

      setSuccess(`✅ ${promises.length} note(s) enregistrée(s) avec succès`);

      // Réinitialiser le formulaire
      setFormData({
        title: '',
        gradeType: 'exam',
        coefficient: 1,
        maxGrade: 20,
        date: new Date().toISOString().split('T')[0]
      });
      setSelectedCourse('');
      setStudents([]);
      setGrades({});
      setObservations({});

      setTimeoutSafe(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving grades:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              📝 Saisie de Notes
            </h1>
            <p className="text-gray-600">
              Enregistrer les résultats d'une évaluation
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/teacher')}
            className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow"
          >
            ← Retour
          </button>
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

        {courses.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aucun cours disponible
            </h3>
            <p className="text-gray-600 mb-4">
              Vous n'êtes assigné à aucun cours pour le moment
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left text-sm text-blue-800">
              <p className="font-semibold mb-2">💡 Que faire ?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Contactez l'administrateur pour vous assigner des cours</li>
                <li>Vérifiez que vous êtes connecté avec le bon compte</li>
                <li>Ouvrez la console (F12) pour voir les logs de debug</li>
              </ul>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass rounded-3xl p-8">
            <div className="space-y-6">
              {/* Informations de l'évaluation */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Informations de l'Évaluation
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cours avec recherche */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cours * {courses.length > 0 && <span className="text-gray-500 font-normal">({courses.length} cours)</span>}
                    </label>

                    {/* Barre de recherche */}
                    {courses.length > 3 && (
                      <input
                        type="text"
                        placeholder="🔍 Rechercher un cours..."
                        value={searchCourse}
                        onChange={(e) => setSearchCourse(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                    )}

                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Sélectionner un cours</option>
                      {courses
                        .filter(course => {
                          if (!searchCourse) return true;
                          const search = searchCourse.toLowerCase();
                          return (
                            course.courseName?.toLowerCase().includes(search) ||
                            course.courseCode?.toLowerCase().includes(search)
                          );
                        })
                        .map(course => (
                          <option key={course.id} value={course.id}>
                            {course.courseName} - {course.courseCode}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Titre */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Titre de l'évaluation *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Examen final, TP n°3..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      value={formData.gradeType}
                      onChange={(e) => setFormData(prev => ({ ...prev, gradeType: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="exam">Examen</option>
                      <option value="homework">Devoir</option>
                      <option value="continuous_assessment">Contrôle continu</option>
                      <option value="project">Projet</option>
                      <option value="oral">Oral</option>
                      <option value="practical">TP</option>
                    </select>
                  </div>

                  {/* Coefficient */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Coefficient *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="10"
                      value={formData.coefficient}
                      onChange={(e) => setFormData(prev => ({ ...prev, coefficient: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Note maximale */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Note maximale *
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={formData.maxGrade}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxGrade: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Date */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date de l'évaluation *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ⚠️ La date ne peut pas être dans le futur
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes des étudiants */}
              {selectedCourse && students.length > 0 && (
                <div className="pt-6 border-t border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Notes des Étudiants ({students.length})
                  </h2>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {students.map(student => (
                      <div key={student.id} className="bg-white p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {student.matricule || student.studentNumber}
                            </p>
                          </div>
                          <div className="w-32">
                            <label className="block text-xs text-gray-600 mb-1 text-center">Note *</label>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max={formData.maxGrade}
                              value={grades[student.id] || ''}
                              onChange={(e) => handleGradeChange(student.id, e.target.value)}
                              placeholder={`/ ${formData.maxGrade}`}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-semibold"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Observation (facultatif - visible par les parents)
                          </label>
                          <textarea
                            value={observations[student.id] || ''}
                            onChange={(e) => handleObservationChange(student.id, e.target.value)}
                            placeholder="Ex: Bon travail, Manque de rigueur, Très bien..."
                            rows="2"
                            maxLength="200"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            {(observations[student.id] || '').length}/200 caractères
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCourse && students.length === 0 && (
                <div className="pt-6 border-t border-gray-200 text-center text-gray-500">
                  Aucun étudiant inscrit à ce cours
                </div>
              )}

              {/* Actions */}
              {students.length > 0 && (
                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourse('');
                      setStudents([]);
                      setGrades({});
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                    disabled={saving}
                  >
                    {saving ? '⏳ Enregistrement...' : '💾 Enregistrer les Notes'}
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
