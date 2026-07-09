/**
 * AttendancePage.jsx - Prise des présences par l'enseignant
 *
 * Fonctionnalités:
 * - Sélectionner un cours
 * - Voir la liste des étudiants inscrits
 * - Marquer présent/absent/retard
 * - Enregistrer les absences avec date et justification
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, push, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { UserCheck, UserX, Clock, ChevronLeft, Search, CheckCircle } from 'lucide-react';

export default function AttendancePage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  // Nouveau : gestion des horaires multiples
  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');

  useEffect(() => {
    loadCourses();
  }, [userProfile, currentUser]);

  useEffect(() => {
    if (selectedCourse && sessionDate) {
      loadAvailableSessions();
    }
  }, [selectedCourse, sessionDate]);

  useEffect(() => {
    if (selectedCourse && selectedSession) {
      loadStudents();
    }
  }, [selectedCourse, selectedSession]);

  const loadCourses = async () => {
    if (!userProfile?.universityId || !currentUser?.uid) return;

    try {
      setLoading(true);

      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);

      if (coursesSnap.exists()) {
        const teacherCourses = Object.entries(coursesSnap.val())
          .map(([id, data]) => ({ id, ...data }))
          .filter(course => course.teacherId === currentUser.uid);

        setCourses(teacherCourses);
      }
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Erreur lors du chargement des cours');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSessions = async () => {
    if (!selectedCourse || !sessionDate || !userProfile?.universityId) return;

    try {
      // // // // console.log('🔄 Loading available sessions for course...');

      // Convertir la date en jour de la semaine
      const date = new Date(sessionDate);
      const dayName = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][date.getDay()];

      // // // // console.log('📅 Day:', dayName);

      // Charger toutes les classes pour trouver les horaires de ce cours
      const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
      const classesSnap = await get(classesRef);

      const sessions = [];

      if (classesSnap.exists()) {
        const allClasses = classesSnap.val();

        Object.entries(allClasses).forEach(([classId, classData]) => {
          if (classData.schedule && Array.isArray(classData.schedule)) {
            classData.schedule.forEach(slot => {
              // Vérifier si c'est le bon cours ET le bon jour
              if (slot.courseId === selectedCourse && slot.day === dayName) {
                sessions.push({
                  classId,
                  className: classData.name,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  room: slot.room || 'Non spécifiée',
                  id: `${classId}-${slot.startTime}-${slot.endTime}`
                });
              }
            });
          }
        });
      }

      // // // // console.log('✅ Found sessions:', sessions.length);
      setAvailableSessions(sessions);

      // Si une seule séance, la sélectionner automatiquement
      if (sessions.length === 1) {
        setSelectedSession(sessions[0].id);
      } else {
        setSelectedSession('');
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Erreur lors du chargement des horaires');
    }
  };

  const loadStudents = async () => {
    if (!selectedCourse || !selectedSession || !userProfile?.universityId) return;

    try {
      // // // // console.log('🔄 Loading students for attendance...');

      // Charger le cours pour avoir les étudiants inscrits
      const courseRef = ref(database, `universities/${userProfile.universityId}/courses/${selectedCourse}`);
      const courseSnap = await get(courseRef);

      if (!courseSnap.exists()) {
        setStudents([]);
        return;
      }

      const courseData = courseSnap.val();
      const enrolledIds = courseData.enrolledStudents || [];

      if (enrolledIds.length === 0) {
        setStudents([]);
        return;
      }

      // Charger les détails des étudiants
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      const studentsData = [];
      if (studentsSnap.exists()) {
        const allStudents = studentsSnap.val();

        enrolledIds.forEach(studentId => {
          if (allStudents[studentId]) {
            studentsData.push({
              id: studentId,
              ...allStudents[studentId]
            });
          }
        });
      }

      // Trier par nom
      studentsData.sort((a, b) => {
        const lastNameA = a.lastName || '';
        const lastNameB = b.lastName || '';
        return lastNameA.localeCompare(lastNameB);
      });

      setStudents(studentsData);

      // Initialiser toutes les présences à "present"
      const initialAttendance = {};
      studentsData.forEach(student => {
        initialAttendance[student.id] = 'present';
      });
      setAttendance(initialAttendance);

      // // // // console.log('✅ Students loaded:', studentsData.length);
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Erreur lors du chargement des étudiants');
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!selectedCourse) {
        throw new Error('Veuillez sélectionner un cours');
      }

      if (!sessionDate) {
        throw new Error('Veuillez sélectionner une date');
      }

      // Vérifier que la date n'est pas future
      const selectedDateObj = new Date(sessionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);

      if (selectedDateObj > today) {
        throw new Error('⚠️ Vous ne pouvez pas prendre les présences pour une date future !');
      }

      if (!selectedSession) {
        throw new Error('Veuillez sélectionner une séance/horaire');
      }

      const course = courses.find(c => c.id === selectedCourse);
      const session = availableSessions.find(s => s.id === selectedSession);
      const absencesRef = ref(database, `universities/${userProfile.universityId}/absences`);

      // Enregistrer uniquement les absences et retards
      const promises = [];
      let absentCount = 0;
      let lateCount = 0;

      Object.entries(attendance).forEach(([studentId, status]) => {
        if (status !== 'present') {
          const student = students.find(s => s.id === studentId);

          const newAbsenceRef = push(absencesRef);
          promises.push(
            set(newAbsenceRef, {
              id: newAbsenceRef.key,
              studentId,
              studentName: student ? `${student.firstName} ${student.lastName}` : 'Étudiant',
              studentNumber: student?.studentNumber || '',
              courseId: selectedCourse,
              courseName: course?.courseName || 'Cours',
              teacherId: currentUser.uid,
              teacherName: userProfile.displayName,
              date: new Date(sessionDate).getTime(),
              sessionStartTime: session?.startTime || '',
              sessionEndTime: session?.endTime || '',
              sessionRoom: session?.room || '',
              className: session?.className || '',
              status: status, // 'absent' ou 'late'
              justified: false,
              reason: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              academicYear: course?.academicYear || '2025-2026',
              semester: course?.semester || 1
            })
          );

          if (status === 'absent') absentCount++;
          if (status === 'late') lateCount++;
        }
      });

      await Promise.all(promises);

      const presentCount = students.length - absentCount - lateCount;

      setSuccess(`✅ Présences enregistrées avec succès !\n${presentCount} présent(s) • ${absentCount} absent(s) • ${lateCount} retard(s)`);

      // Réinitialiser après 3 secondes
      setTimeout(() => {
        setSuccess('');
        setSelectedCourse('');
        setSelectedSession('');
        setAvailableSessions([]);
        setStudents([]);
        setAttendance({});
      }, 3000);
    } catch (err) {
      console.error('Error saving attendance:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      student.firstName?.toLowerCase().includes(search) ||
      student.lastName?.toLowerCase().includes(search) ||
      student.studentNumber?.toLowerCase().includes(search)
    );
  });

  const stats = {
    present: Object.values(attendance).filter(s => s === 'present').length,
    absent: Object.values(attendance).filter(s => s === 'absent').length,
    late: Object.values(attendance).filter(s => s === 'late').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => navigate('/dashboard/teacher')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ChevronLeft className="h-5 w-5" />
              Retour au dashboard
            </button>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              ✅ Prendre les Présences
            </h1>
            <p className="text-gray-600">
              Enregistrer la présence des étudiants à une séance
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 whitespace-pre-line">
            {success}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Aucun cours disponible
            </h3>
            <p className="text-gray-600">
              Vous n'êtes assigné à aucun cours pour le moment
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="glass rounded-3xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Informations de la Séance
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cours */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cours *
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => {
                      setSelectedCourse(e.target.value);
                      setSelectedSession('');
                      setAvailableSessions([]);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner un cours</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.courseName} - {course.courseCode}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date de la séance *
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setSessionDate(e.target.value);
                      setSelectedSession('');
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ⚠️ Vous ne pouvez prendre les présences que pour aujourd'hui ou des dates passées
                  </p>
                </div>
              </div>

              {/* Sélecteur de séance/horaire */}
              {selectedCourse && sessionDate && availableSessions.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Horaire de la séance * {availableSessions.length > 1 && `(${availableSessions.length} séances ce jour)`}
                  </label>
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    {availableSessions.length > 1 && (
                      <option value="">Sélectionner une séance</option>
                    )}
                    {availableSessions.map(session => (
                      <option key={session.id} value={session.id}>
                        🕐 {session.startTime} - {session.endTime} | 🏫 {session.className} | 🚪 {session.room}
                      </option>
                    ))}
                  </select>
                  {availableSessions.length > 1 && (
                    <p className="mt-2 text-sm text-orange-600">
                      ⚠️ Plusieurs séances ce jour - Sélectionnez la bonne horaire
                    </p>
                  )}
                </div>
              )}

              {selectedCourse && sessionDate && availableSessions.length === 0 && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
                  ⚠️ Aucune séance programmée pour ce cours à cette date dans l'emploi du temps.
                </div>
              )}
            </div>

            {/* Liste des étudiants */}
            {selectedCourse && selectedSession && students.length > 0 && (
              <div className="glass rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Feuille de Présence ({students.length} étudiants)
                  </h2>

                  {/* Statistiques */}
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-semibold">{stats.present} Présents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="font-semibold">{stats.absent} Absents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="font-semibold">{stats.late} Retards</span>
                    </div>
                  </div>
                </div>

                {/* Barre de recherche */}
                {students.length > 5 && (
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un étudiant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Liste */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {filteredStudents.map((student, index) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        attendance[student.id] === 'present'
                          ? 'bg-green-50 border-green-200'
                          : attendance[student.id] === 'absent'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-500 text-sm w-8">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {student.studentNumber}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAttendanceChange(student.id, 'present')}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            attendance[student.id] === 'present'
                              ? 'bg-green-500 text-white shadow-lg'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <UserCheck className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAttendanceChange(student.id, 'late')}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            attendance[student.id] === 'late'
                              ? 'bg-orange-500 text-white shadow-lg'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Clock className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAttendanceChange(student.id, 'absent')}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            attendance[student.id] === 'absent'
                              ? 'bg-red-500 text-white shadow-lg'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <UserX className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourse('');
                      setSelectedSession('');
                      setAvailableSessions([]);
                      setStudents([]);
                      setAttendance({});
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
                    disabled={saving}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Enregistrer les Présences
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {selectedCourse && selectedSession && students.length === 0 && (
              <div className="glass rounded-3xl p-12 text-center">
                <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Aucun étudiant inscrit
                </h3>
                <p className="text-gray-600">
                  Ce cours n'a pas encore d'étudiants inscrits
                </p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
