/**
 * TeacherSchedulePage.jsx - Emploi du temps de l'enseignant
 *
 * Fonctionnalités:
 * - Afficher tous les cours de l'enseignant avec horaires
 * - Vue calendrier hebdomadaire
 * - Filtrer par jour de la semaine
 * - Voir les détails de chaque séance
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, MapPin, Users, ChevronLeft, BookOpen, AlertCircle, TrendingUp, CheckCircle, UserCheck, Mail, Phone, X } from 'lucide-react';

export default function TeacherSchedulePage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState([]);
  const [selectedDay, setSelectedDay] = useState('all');
  const [error, setError] = useState('');

  // Stats et modal
  const [absences, setAbsences] = useState([]);
  const [stats, setStats] = useState({
    totalAbsences: 0,
    averageAttendanceRate: 0,
    studentsAtRisk: 0
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseStudents, setCourseStudents] = useState([]);
  const [atRiskModalOpen, setAtRiskModalOpen] = useState(false);
  const [atRiskStudents, setAtRiskStudents] = useState([]);

  const daysOfWeek = [
    { value: 'all', label: 'Tous les jours' },
    { value: 'Lundi', label: 'Lundi' },
    { value: 'Mardi', label: 'Mardi' },
    { value: 'Mercredi', label: 'Mercredi' },
    { value: 'Jeudi', label: 'Jeudi' },
    { value: 'Vendredi', label: 'Vendredi' },
    { value: 'Samedi', label: 'Samedi' }
  ];

  const dayColors = {
    Lundi: 'bg-blue-100 border-blue-300 text-blue-800',
    Mardi: 'bg-green-100 border-green-300 text-green-800',
    Mercredi: 'bg-purple-100 border-purple-300 text-purple-800',
    Jeudi: 'bg-orange-100 border-orange-300 text-orange-800',
    Vendredi: 'bg-pink-100 border-pink-300 text-pink-800',
    Samedi: 'bg-indigo-100 border-indigo-300 text-indigo-800'
  };

  useEffect(() => {
    loadSchedule();
  }, [userProfile, currentUser]);

  const loadSchedule = async () => {
    if (!userProfile?.universityId || !currentUser?.uid) return;

    try {
      setLoading(true);
      // // console.log('🔄 Loading teacher schedule...');

      // 1. Charger tous les cours de l'enseignant
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);

      if (!coursesSnap.exists()) {
        setSchedule([]);
        setLoading(false);
        return;
      }

      const teacherCourses = Object.entries(coursesSnap.val())
        .map(([id, data]) => ({ id, ...data }))
        .filter(course => course.teacherId === currentUser.uid);

      // // console.log('📚 Teacher courses:', teacherCourses.length);

      // 2. Charger toutes les classes pour trouver les horaires
      const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
      const classesSnap = await get(classesRef);

      const scheduleData = [];

      if (classesSnap.exists()) {
        const allClasses = classesSnap.val();
        // // console.log('📋 All classes:', Object.keys(allClasses).length);

        // Pour chaque classe, vérifier si elle a des cours de cet enseignant
        Object.entries(allClasses).forEach(([classId, classData]) => {
          // // console.log(`  Class ${classData.name}:`, {
          //   hasSchedule: !!classData.schedule,
          //   isArray: Array.isArray(classData.schedule),
          //   scheduleLength: classData.schedule?.length || 0
          // });

          if (classData.schedule && Array.isArray(classData.schedule)) {
            classData.schedule.forEach(scheduleItem => {
              // // console.log(`    Schedule item:`, scheduleItem);
              // Vérifier si ce cours appartient à l'enseignant
              const course = teacherCourses.find(c => c.id === scheduleItem.courseId);

              if (course) {
                // // console.log(`    ✅ Match found for course:`, course.courseName);
                scheduleData.push({
                  ...scheduleItem,
                  courseName: course.courseName,
                  courseCode: course.courseCode,
                  className: classData.name,
                  classId: classId,
                  level: classData.level,
                  enrolledCount: classData.students?.length || 0
                });
              }
            });
          }
        });
      }

      // 3. Trier par jour et heure
      const dayOrder = { Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6, Dimanche: 7 };
      scheduleData.sort((a, b) => {
        const dayDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
        if (dayDiff !== 0) return dayDiff;
        return a.startTime.localeCompare(b.startTime);
      });

      // // console.log('✅ Schedule loaded:', scheduleData.length, scheduleData);
      setSchedule(scheduleData);

      // Charger les absences pour les stats
      await loadAbsences();
    } catch (err) {
      console.error('❌ Error loading schedule:', err);
      setError('Erreur lors du chargement de l\'emploi du temps: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAbsences = async () => {
    if (!userProfile?.universityId || !currentUser?.uid) return;

    try {
      const absencesRef = ref(database, `universities/${userProfile.universityId}/absences`);
      const absencesSnap = await get(absencesRef);

      if (absencesSnap.exists()) {
        // Filtrer les absences des cours du prof
        const allAbsences = Object.values(absencesSnap.val());
        const teacherAbsences = allAbsences.filter(abs => abs.teacherId === currentUser.uid);

        setAbsences(teacherAbsences);

        // Calculer stats
        const now = Date.now();
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
        const weekAbsences = teacherAbsences.filter(abs => abs.date >= oneWeekAgo);

        // Compter étudiants à risque (>3 absences)
        const studentAbsenceCounts = {};
        teacherAbsences.forEach(abs => {
          studentAbsenceCounts[abs.studentId] = (studentAbsenceCounts[abs.studentId] || 0) + 1;
        });
        const atRisk = Object.values(studentAbsenceCounts).filter(count => count > 3).length;

        // Calculer taux de présence approximatif
        const totalSessions = teacherAbsences.length > 0 ? teacherAbsences.length * 10 : 100;
        const attendanceRate = totalSessions > 0
          ? Math.max(0, ((totalSessions - teacherAbsences.length) / totalSessions * 100).toFixed(1))
          : 100;

        setStats({
          totalAbsences: weekAbsences.length,
          averageAttendanceRate: attendanceRate,
          studentsAtRisk: atRisk
        });
      }
    } catch (err) {
      console.error('Error loading absences:', err);
    }
  };

  const handleOpenAtRiskModal = async () => {
    try {
      setAtRiskModalOpen(true);

      // Compter absences par étudiant
      const studentAbsenceCounts = {};
      absences.forEach(abs => {
        if (!studentAbsenceCounts[abs.studentId]) {
          studentAbsenceCounts[abs.studentId] = {
            count: 0,
            latesCount: 0,
            absences: []
          };
        }
        studentAbsenceCounts[abs.studentId].count++;
        if (abs.status === 'late') {
          studentAbsenceCounts[abs.studentId].latesCount++;
        }
        studentAbsenceCounts[abs.studentId].absences.push(abs);
      });

      // Filtrer étudiants à risque (>3 absences)
      const atRiskIds = Object.keys(studentAbsenceCounts).filter(
        id => studentAbsenceCounts[id].count > 3
      );

      if (atRiskIds.length === 0) {
        setAtRiskStudents([]);
        return;
      }

      // Charger détails étudiants
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      const studentsData = [];
      if (studentsSnap.exists()) {
        const allStudents = studentsSnap.val();

        for (const studentId of atRiskIds) {
          if (allStudents[studentId]) {
            const student = allStudents[studentId];
            studentsData.push({
              id: studentId,
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email,
              phone: student.phone || 'Non renseigné',
              level: student.level,
              absencesCount: studentAbsenceCounts[studentId].count,
              latesCount: studentAbsenceCounts[studentId].latesCount,
              recentAbsences: studentAbsenceCounts[studentId].absences.slice(0, 5)
            });
          }
        }
      }

      // Trier par nombre d'absences décroissant
      studentsData.sort((a, b) => b.absencesCount - a.absencesCount);
      setAtRiskStudents(studentsData);
    } catch (err) {
      console.error('Error loading at-risk students:', err);
    }
  };

  const handleOpenCourseDetails = async (session) => {
    try {
      setSelectedCourse(session);
      setModalOpen(true);

      // CORRECTION : Charger les étudiants depuis la CLASSE, pas le cours
      const classRef = ref(database, `universities/${userProfile.universityId}/classes/${session.classId}`);
      const classSnap = await get(classRef);

      if (!classSnap.exists()) {
        setCourseStudents([]);
        return;
      }

      const classData = classSnap.val();
      const enrolledIds = classData.students || [];

      if (enrolledIds.length === 0) {
        setCourseStudents([]);
        return;
      }

      // Charger détails étudiants
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      const studentsData = [];
      if (studentsSnap.exists()) {
        const allStudents = studentsSnap.val();

        for (const studentId of enrolledIds) {
          if (allStudents[studentId]) {
            const student = allStudents[studentId];

            // Calculer ses absences pour ce cours
            const studentAbsences = absences.filter(
              abs => abs.studentId === studentId && abs.courseId === session.courseId
            );

            // Note: Info parent non disponible pour le prof (Firebase Rules)
            // Les profs doivent passer par l'administration pour contacter les parents

            studentsData.push({
              id: studentId,
              ...student,
              absencesCount: studentAbsences.length,
              latesCount: studentAbsences.filter(a => a.status === 'late').length,
              recentAbsences: studentAbsences.slice(0, 3),
              parent: null // Non accessible par le prof
            });
          }
        }
      }

      // Trier par nombre d'absences décroissant
      studentsData.sort((a, b) => b.absencesCount - a.absencesCount);
      setCourseStudents(studentsData);
    } catch (err) {
      console.error('Error loading course details:', err);
    }
  };

  const filteredSchedule = selectedDay === 'all'
    ? schedule
    : schedule.filter(item => item.day === selectedDay);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement de l'emploi du temps...</p>
        </div>
      </div>
    );
  }

  const getAbsencesForCourse = (courseId) => {
    return absences.filter(abs => abs.courseId === courseId).length;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
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
              📅 Mon Emploi du Temps
            </h1>
            <p className="text-gray-600">
              Vue d'ensemble de vos séances de cours
            </p>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Absences (7 jours)</p>
                <p className="text-3xl font-bold text-red-600">{stats.totalAbsences}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Taux de présence</p>
                <p className="text-3xl font-bold text-green-600">{stats.averageAttendanceRate}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500 opacity-20" />
            </div>
          </div>

          <button
            onClick={handleOpenAtRiskModal}
            className="glass rounded-2xl p-6 hover-lift text-left w-full group transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Étudiants à risque</p>
                <p className="text-3xl font-bold text-orange-600 group-hover:text-orange-700 transition-colors">{stats.studentsAtRisk}</p>
                <p className="text-xs text-gray-500 mt-1">&gt;3 absences</p>
              </div>
              <Users className="h-10 w-10 text-orange-500 opacity-20 group-hover:opacity-40 transition-opacity" />
            </div>
          </button>
        </div>

        {/* Filtres */}
        <div className="glass rounded-3xl p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map(day => (
              <button
                key={day.value}
                onClick={() => setSelectedDay(day.value)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  selectedDay === day.value
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-semibold">{filteredSchedule.length}</span> séance(s)
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="font-semibold">{new Set(schedule.map(s => s.courseId)).size}</span> cours différents
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            ❌ {error}
          </div>
        )}

        {/* Emploi du temps */}
        {filteredSchedule.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {selectedDay === 'all' ? 'Aucune séance programmée' : `Aucune séance le ${selectedDay}`}
            </h3>
            <p className="text-gray-600 mb-4">
              Votre emploi du temps est vide pour cette période
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left text-sm text-blue-800 max-w-md mx-auto">
              <p className="font-semibold mb-2">💡 Information</p>
              <p>Les horaires sont définis dans les emplois du temps des classes. Contactez l'administrateur pour ajouter des séances.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Grouper par jour */}
            {daysOfWeek.slice(1).map(day => {
              const daySessions = filteredSchedule.filter(s => s.day === day.value);
              if (daySessions.length === 0 && selectedDay !== 'all') return null;

              return (
                <div key={day.value} className={daySessions.length > 0 ? '' : 'hidden'}>
                  <h2 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-xl border-2 ${dayColors[day.value]}`}>
                      {day.label}
                    </span>
                    <span className="text-gray-500 text-lg">({daySessions.length})</span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {daySessions.map((session, idx) => {
                      const absencesCount = getAbsencesForCourse(session.courseId);

                      return (
                      <div
                        key={`${session.classId}-${session.courseId}-${idx}`}
                        className="glass p-6 rounded-2xl hover-lift border border-white/50"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-black text-gray-900 mb-1">
                              {session.courseName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {session.courseCode} • {session.className}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                              {session.level || 'L1'}
                            </span>
                            {absencesCount > 0 && (
                              <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                                {absencesCount} 🚨
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold">
                              {session.startTime} - {session.endTime}
                            </span>
                          </div>

                          {session.room && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <MapPin className="h-4 w-4 text-green-500" />
                              <span>{session.room}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-gray-700">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span>{session.enrolledCount} étudiant{session.enrolledCount > 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                          <button
                            onClick={() => navigate('/teacher/attendance')}
                            className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-semibold flex items-center justify-center gap-1"
                          >
                            <UserCheck className="h-4 w-4" />
                            Présences
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCourseDetails(session);
                            }}
                            className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold flex items-center justify-center gap-1"
                          >
                            <Users className="h-4 w-4" />
                            Détails
                          </button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal détails cours */}
        {modalOpen && selectedCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedCourse.courseName}</h3>
                  <p className="text-sm text-gray-600">{selectedCourse.className} • {selectedCourse.startTime} - {selectedCourse.endTime}</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">
                  Liste des étudiants ({courseStudents.length})
                </h4>

                {courseStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    Aucun étudiant inscrit
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courseStudents.map((student) => (
                      <div
                        key={student.id}
                        className={`p-4 rounded-xl border-2 ${
                          student.absencesCount > 3
                            ? 'bg-red-50 border-red-200'
                            : student.absencesCount > 0
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{student.studentNumber}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {student.absencesCount > 3 && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                ⚠️ À risque
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              student.absencesCount === 0
                                ? 'bg-green-100 text-green-700'
                                : student.absencesCount <= 3
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {student.absencesCount} abs • {student.latesCount} ret
                            </span>
                          </div>
                        </div>

                        {/* Absences récentes */}
                        {student.recentAbsences.length > 0 && (
                          <div className="mb-3 text-xs text-gray-600 space-y-1">
                            <p className="font-semibold">Absences récentes :</p>
                            {student.recentAbsences.map((abs, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span>{formatDate(abs.date)}</span>
                                <span className={abs.status === 'absent' ? 'text-red-600' : 'text-orange-600'}>
                                  {abs.status === 'absent' ? '🔴 Absent' : '🟡 Retard'}
                                </span>
                                {abs.justified && <span className="text-green-600">✅ Justifié</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Contact parent */}
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Contact Parent :</p>
                          <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                            <p className="font-medium text-blue-800 mb-1">
                              📞 Pour contacter les parents
                            </p>
                            <p>
                              Contactez l'administration qui vous transmettra les coordonnées ou utilisera la messagerie interne (bientôt disponible).
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal étudiants à risque */}
        {atRiskModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="h-7 w-7 text-orange-600" />
                    Étudiants à Risque
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Plus de 3 absences enregistrées</p>
                </div>
                <button
                  onClick={() => setAtRiskModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6">
                {atRiskStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-gray-900 mb-2">Aucun étudiant à risque ! 🎉</p>
                    <p className="text-gray-600">Tous vos étudiants ont moins de 3 absences.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <p className="text-sm text-orange-800">
                        <span className="font-semibold">{atRiskStudents.length} étudiant{atRiskStudents.length > 1 ? 's' : ''}</span> nécessite{atRiskStudents.length > 1 ? 'nt' : ''} votre attention.
                        Considérez un suivi personnalisé ou contactez l'administration.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {atRiskStudents.map((student) => (
                        <div
                          key={student.id}
                          className="bg-red-50 border-2 border-red-200 rounded-xl p-5 hover:shadow-lg transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-bold text-gray-900">
                                  {student.firstName} {student.lastName}
                                </h4>
                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                  {student.level}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <Mail className="h-4 w-4 text-blue-500" />
                                  <a href={`mailto:${student.email}`} className="hover:text-blue-600 underline">
                                    {student.email}
                                  </a>
                                </div>

                                <div className="flex items-center gap-2 text-gray-700">
                                  <Phone className="h-4 w-4 text-green-500" />
                                  <a href={`tel:${student.phone}`} className="hover:text-green-600">
                                    {student.phone}
                                  </a>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="bg-red-100 text-red-700 px-4 py-2 rounded-xl font-bold text-lg mb-1">
                                {student.absencesCount}
                              </div>
                              <p className="text-xs text-gray-600">absence{student.absencesCount > 1 ? 's' : ''}</p>
                              {student.latesCount > 0 && (
                                <p className="text-xs text-orange-600 font-semibold mt-1">
                                  {student.latesCount} retard{student.latesCount > 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Absences récentes */}
                          {student.recentAbsences.length > 0 && (
                            <div className="pt-4 border-t border-red-200">
                              <p className="text-xs font-bold text-gray-700 mb-2">📅 Absences récentes :</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {student.recentAbsences.map((abs, idx) => (
                                  <div key={idx} className="bg-white border border-red-200 rounded-lg p-2 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-gray-900">{formatDate(abs.date)}</span>
                                      <span className={abs.status === 'absent' ? 'text-red-600 font-semibold' : 'text-orange-600 font-semibold'}>
                                        {abs.status === 'absent' ? '🔴 Absent' : '🟡 Retard'}
                                      </span>
                                    </div>
                                    <p className="text-gray-600 mt-1">{abs.courseName || 'Cours'}</p>
                                    {abs.justified && (
                                      <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                        ✅ Justifié
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Info contact */}
                          <div className="mt-4 pt-4 border-t border-red-200">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                              <p className="font-semibold text-blue-800 mb-1">
                                💡 Pour contacter les parents
                              </p>
                              <p className="text-blue-700">
                                Contactez l'administration universitaire qui vous transmettra les coordonnées parentales ou utilisera la messagerie interne (bientôt disponible).
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
