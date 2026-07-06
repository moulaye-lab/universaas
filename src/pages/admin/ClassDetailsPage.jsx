/**
 * ClassDetailsPage.jsx - Détails et gestion d'une classe
 *
 * Fonctionnalités:
 * - Afficher détails de la classe
 * - Voir la liste des étudiants inscrits
 * - Voir l'emploi du temps de la classe
 * - Ajouter des cours au planning avec horaires/salles
 * - Retirer des cours du planning
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, get, update, push, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { logCreate, AUDIT_ACTIONS } from '../../utils/auditLogger';

export default function ClassDetailsPage() {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { userProfile, currentUser } = useAuth();

  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [existingSchedules, setExistingSchedules] = useState([]);

  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [courseFormData, setCourseFormData] = useState({
    courseId: '',
    teacherId: '',
    day: 'Lundi',
    startTime: '08:00',
    endTime: '10:00',
    room: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roomAvailability, setRoomAvailability] = useState('');
  const [teacherAvailability, setTeacherAvailability] = useState('');

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  // Horaires standardisés
  const STANDARD_TIME_SLOTS = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  // Temps de battement entre cours (en minutes)
  const BUFFER_TIME = 15;

  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.universityId || !classId) return;

      try {
        setLoading(true);

        // Charger la classe
        const classRef = ref(database, `universities/${userProfile.universityId}/classes/${classId}`);
        const classSnap = await get(classRef);

        if (!classSnap.exists()) {
          setError('Classe introuvable');
          return;
        }

        const classInfo = classSnap.val();
        setClassData(classInfo);

        // Charger les étudiants de la classe
        if (classInfo.students && classInfo.students.length > 0) {
          const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
          const studentsSnap = await get(studentsRef);

          if (studentsSnap.exists()) {
            const studentsData = Object.entries(studentsSnap.val())
              .map(([id, data]) => ({ id, ...data }))
              .filter(s => classInfo.students.includes(s.id));
            setStudents(studentsData);
          }
        }

        // Charger tous les cours disponibles
        const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
        const coursesSnap = await get(coursesRef);
        if (coursesSnap.exists()) {
          const coursesData = Object.entries(coursesSnap.val()).map(([id, data]) => ({
            id,
            ...data
          }));
          setAllCourses(coursesData);
        }

        // Charger tous les enseignants
        const teachersRef = ref(database, `universities/${userProfile.universityId}/teachers`);
        const teachersSnap = await get(teachersRef);
        if (teachersSnap.exists()) {
          const teachersData = Object.entries(teachersSnap.val()).map(([id, data]) => ({
            id,
            ...data
          }));
          setAllTeachers(teachersData);
        }

        // Charger toutes les salles
        const roomsRef = ref(database, `universities/${userProfile.universityId}/rooms`);
        const roomsSnap = await get(roomsRef);
        if (roomsSnap.exists()) {
          const roomsData = Object.entries(roomsSnap.val())
            .map(([id, data]) => ({ id, ...data }))
            .filter(room => room.status === 'active');
          setAllRooms(roomsData);
        }

        // Charger tous les horaires existants (de toutes les classes)
        const allClassesRef = ref(database, `universities/${userProfile.universityId}/classes`);
        const allClassesSnap = await get(allClassesRef);
        if (allClassesSnap.exists()) {
          const schedules = [];
          Object.values(allClassesSnap.val()).forEach(cls => {
            if (cls.schedule && cls.id !== classId) {
              cls.schedule.forEach(sch => schedules.push(sch));
            }
          });
          setExistingSchedules(schedules);
        }

      } catch (err) {
        console.error('Error loading data:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [classId, userProfile]);

  // Vérifier disponibilité salle en temps réel
  useEffect(() => {
    const checkAvailability = () => {
      const { room, day, startTime, endTime } = courseFormData;

      if (room && day && startTime && endTime) {
        const parseTime = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const newStart = parseTime(startTime);
        const newEnd = parseTime(endTime);

        if (newEnd <= newStart) {
          setRoomAvailability('❌ L\'heure de fin doit être après l\'heure de début');
          return;
        }

        const duration = newEnd - newStart;
        if (duration < 30) {
          setRoomAvailability('⚠️ Durée minimale : 30 minutes');
          return;
        }

        // Vérifier conflits avec emploi du temps actuel de la classe (avec battement)
        const classConflict = (classData?.schedule || []).find(sch => {
          if (sch.room === room && sch.day === day) {
            const existingStart = parseTime(sch.startTime);
            const existingEnd = parseTime(sch.endTime);
            // Ajouter temps de battement pour éviter les cours collés
            return (newStart < existingEnd + BUFFER_TIME && newEnd + BUFFER_TIME > existingStart);
          }
          return false;
        });

        if (classConflict) {
          setRoomAvailability(`⚠️ Conflit dans cette classe : ${classConflict.courseName} (${classConflict.startTime}-${classConflict.endTime})`);
          return;
        }

        // Vérifier conflits avec autres classes (avec battement)
        const externalConflict = existingSchedules.find(sch => {
          if (sch.room === room && sch.day === day) {
            const existingStart = parseTime(sch.startTime);
            const existingEnd = parseTime(sch.endTime);
            // Ajouter temps de battement pour éviter les cours collés
            return (newStart < existingEnd + BUFFER_TIME && newEnd + BUFFER_TIME > existingStart);
          }
          return false;
        });

        if (externalConflict) {
          setRoomAvailability(`⚠️ Conflit : Salle occupée par ${externalConflict.courseName}`);
        } else {
          setRoomAvailability('✅ Salle disponible');
        }
      } else {
        setRoomAvailability('');
      }
    };

    checkAvailability();
  }, [courseFormData, classData, existingSchedules]);

  // Vérifier disponibilité enseignant en temps réel
  useEffect(() => {
    const checkTeacherAvailability = () => {
      const { teacherId, day, startTime, endTime } = courseFormData;

      if (teacherId && day && startTime && endTime) {
        const parseTime = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const newStart = parseTime(startTime);
        const newEnd = parseTime(endTime);

        if (newEnd <= newStart) {
          setTeacherAvailability('');
          return;
        }

        // Vérifier conflits avec emploi du temps actuel de la classe (avec battement)
        const classConflict = (classData?.schedule || []).find(sch => {
          if (sch.teacherId === teacherId && sch.day === day) {
            const existingStart = parseTime(sch.startTime);
            const existingEnd = parseTime(sch.endTime);
            // Ajouter temps de battement pour éviter les cours collés
            return (newStart < existingEnd + BUFFER_TIME && newEnd + BUFFER_TIME > existingStart);
          }
          return false;
        });

        if (classConflict) {
          setTeacherAvailability(`⚠️ Enseignant occupé : ${classConflict.courseName}`);
          return;
        }

        // Vérifier conflits avec autres classes (avec battement)
        const externalConflict = existingSchedules.find(sch => {
          if (sch.teacherId === teacherId && sch.day === day) {
            const existingStart = parseTime(sch.startTime);
            const existingEnd = parseTime(sch.endTime);
            // Ajouter temps de battement pour éviter les cours collés
            return (newStart < existingEnd + BUFFER_TIME && newEnd + BUFFER_TIME > existingStart);
          }
          return false;
        });

        if (externalConflict) {
          setTeacherAvailability(`⚠️ Enseignant occupé : ${externalConflict.courseName}`);
        } else {
          setTeacherAvailability('✅ Enseignant disponible');
        }
      } else {
        setTeacherAvailability('');
      }
    };

    checkTeacherAvailability();
  }, [courseFormData, classData, existingSchedules]);

  const handleCourseFormChange = (e) => {
    const { name, value } = e.target;
    setCourseFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCourseToSchedule = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const course = allCourses.find(c => c.id === courseFormData.courseId);
      const teacher = allTeachers.find(t => t.id === courseFormData.teacherId);

      if (!course || !teacher) {
        throw new Error('Cours ou enseignant introuvable');
      }

      // Vérifier capacité de la salle vs taille de la classe
      const selectedRoom = allRooms.find(r => r.roomName === courseFormData.room);
      const classCapacity = classData.occupiedSeats || 0;

      if (selectedRoom && classCapacity > selectedRoom.capacity) {
        throw new Error(
          `❌ Salle trop petite : La salle ${selectedRoom.roomName} a une capacité de ${selectedRoom.capacity} places, ` +
          `mais la classe compte ${classCapacity} étudiants inscrits.`
        );
      }

      const newScheduleEntry = {
        courseId: course.id,
        courseName: course.courseName || course.name,
        courseCode: course.courseCode || course.code,
        teacherId: teacher.id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        day: courseFormData.day,
        startTime: courseFormData.startTime,
        endTime: courseFormData.endTime,
        room: courseFormData.room,
        addedAt: Date.now()
      };

      const updatedSchedule = [...(classData.schedule || []), newScheduleEntry];

      const classRef = ref(database, `universities/${userProfile.universityId}/classes/${classId}`);
      await update(classRef, {
        schedule: updatedSchedule,
        updatedAt: Date.now()
      });

      // Créer log d'audit sécurisé
      if (currentUser?.uid && userProfile?.universityId) {
        await logCreate('COURSE_SCHEDULE', {
          id: courseFormData.courseId,
          name: course.courseName,
          teacher: `${teacher.firstName} ${teacher.lastName}`,
          schedule: `${courseFormData.day} ${courseFormData.startTime}-${courseFormData.endTime}`,
          room: courseFormData.room
        }, userProfile.universityId, currentUser.uid, userProfile.displayName || userProfile.email || 'Admin');
      }

      // Recharger les données
      const updatedClassSnap = await get(classRef);
      setClassData(updatedClassSnap.val());

      setShowAddCourseModal(false);
      setCourseFormData({
        courseId: '',
        teacherId: '',
        day: 'Lundi',
        startTime: '08:00',
        endTime: '10:00',
        room: ''
      });
      setSuccess('✅ Cours ajouté au planning avec succès');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error adding course:', err);
      setError(err.message || 'Erreur lors de l\'ajout du cours');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCourseFromSchedule = async (courseId) => {
    if (!confirm('Voulez-vous vraiment retirer ce cours du planning ?')) {
      return;
    }

    try {
      setSaving(true);
      const updatedSchedule = (classData.schedule || []).filter(
        sch => sch.courseId !== courseId
      );

      const classRef = ref(database, `universities/${userProfile.universityId}/classes/${classId}`);
      await update(classRef, {
        schedule: updatedSchedule,
        updatedAt: Date.now()
      });

      const updatedClassSnap = await get(classRef);
      setClassData(updatedClassSnap.val());

      setSuccess('✅ Cours retiré du planning');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error removing course:', err);
      setError('Erreur lors du retrait du cours');
    } finally {
      setSaving(false);
    }
  };

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

  if (error && !classData) {
    return (
      <AdminLayout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="glass rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => navigate('/admin/classes')}
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

  const schedule = classData?.schedule || [];
  const scheduleByDay = days.map(day => ({
    day,
    courses: schedule.filter(sch => sch.day === day).sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    })
  }));

  return (
    <AdminLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-black text-gray-900 mb-2">
                🎓 {classData.name}
              </h1>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold">
                  {classData.level}
                </span>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm font-semibold">
                  {classData.domain}
                </span>
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-semibold">
                  {classData.occupiedSeats || 0}/{classData.capacity} étudiants
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/classes')}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne gauche: Étudiants */}
            <div className="lg:col-span-1">
              <div className="glass rounded-3xl p-6">
                <h2 className="text-xl font-black text-gray-900 mb-4">
                  👥 Étudiants ({students.length})
                </h2>
                {students.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucun étudiant inscrit</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {students.map(student => (
                      <div
                        key={student.id}
                        className="p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => navigate(`/admin/students/${student.id}/edit`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-gray-600">{student.matricule}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/students/${student.id}/edit`);
                            }}
                            className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition opacity-0 group-hover:opacity-100"
                          >
                            Voir détails →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Colonne droite: Emploi du temps */}
            <div className="lg:col-span-2">
              <div className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-gray-900">
                    📅 Emploi du Temps
                  </h2>
                  <button
                    onClick={() => setShowAddCourseModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold text-sm"
                  >
                    + Ajouter un Cours
                  </button>
                </div>

                {schedule.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <div className="text-6xl mb-4">📚</div>
                    <p className="text-gray-600 font-semibold mb-2">Aucun cours au planning</p>
                    <p className="text-gray-500 text-sm">Commencez par ajouter des cours</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scheduleByDay.map(({ day, courses }) => (
                      courses.length > 0 && (
                        <div key={day} className="border-l-4 border-blue-500 pl-4">
                          <h3 className="font-bold text-gray-900 mb-2">{day}</h3>
                          <div className="space-y-2">
                            {courses.map((course, idx) => (
                              <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">{course.courseName}</h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                      👨‍🏫 {course.teacherName}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      🕐 {course.startTime} - {course.endTime}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      🏢 {course.room}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveCourseFromSchedule(course.courseId)}
                                    className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-semibold"
                                    disabled={saving}
                                  >
                                    Retirer
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Ajouter Cours */}
          {showAddCourseModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="glass rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-gray-900">
                    ➕ Ajouter un Cours au Planning
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddCourseModal(false);
                      setCourseFormData({
                        courseId: '',
                        teacherId: '',
                        day: 'Lundi',
                        startTime: '08:00',
                        endTime: '10:00',
                        room: ''
                      });
                      setError('');
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddCourseToSchedule} className="space-y-6">
                  {/* Sélection cours */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cours *
                    </label>
                    <select
                      name="courseId"
                      value={courseFormData.courseId}
                      onChange={handleCourseFormChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Sélectionner un cours</option>
                      {allCourses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.courseName || course.name} ({course.courseCode || course.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sélection enseignant */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Enseignant *
                    </label>
                    <select
                      name="teacherId"
                      value={courseFormData.teacherId}
                      onChange={handleCourseFormChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Sélectionner un enseignant</option>
                      {allTeachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.firstName} {teacher.lastName} - {teacher.department}
                        </option>
                      ))}
                    </select>
                    {teacherAvailability && (
                      <div className={`mt-2 p-3 rounded-xl ${
                        teacherAvailability.includes('✅')
                          ? 'bg-green-50 border-2 border-green-500'
                          : 'bg-amber-50 border-2 border-amber-500'
                      }`}>
                        <p className={`text-sm font-semibold ${
                          teacherAvailability.includes('✅')
                            ? 'text-green-700'
                            : 'text-amber-700'
                        }`}>
                          {teacherAvailability}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Jour */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Jour *
                      </label>
                      <select
                        name="day"
                        value={courseFormData.day}
                        onChange={handleCourseFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        {days.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>

                    {/* Salle */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Salle *
                      </label>
                      <select
                        name="room"
                        value={courseFormData.room}
                        onChange={handleCourseFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Sélectionner une salle</option>
                        {allRooms.map(room => (
                          <option key={room.id} value={room.roomName}>
                            {room.roomName} - {room.capacity} places
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Heure début */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Heure de début *
                      </label>
                      <select
                        name="startTime"
                        value={courseFormData.startTime}
                        onChange={handleCourseFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        {STANDARD_TIME_SLOTS.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        ⏰ Horaires standardisés (battement de 15 min automatique)
                      </p>
                    </div>

                    {/* Heure fin */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Heure de fin *
                      </label>
                      <select
                        name="endTime"
                        value={courseFormData.endTime}
                        onChange={handleCourseFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        {STANDARD_TIME_SLOTS.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Indicateur disponibilité salle */}
                  {roomAvailability && (
                    <div className={`p-4 rounded-xl ${
                      roomAvailability.includes('✅')
                        ? 'bg-green-50 border-2 border-green-500'
                        : roomAvailability.includes('❌')
                        ? 'bg-red-50 border-2 border-red-500'
                        : 'bg-amber-50 border-2 border-amber-500'
                    }`}>
                      <p className={`font-semibold ${
                        roomAvailability.includes('✅')
                          ? 'text-green-700'
                          : roomAvailability.includes('❌')
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}>
                        {roomAvailability}
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                      <p className="text-red-700 font-semibold">❌ {error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCourseModal(false);
                        setCourseFormData({
                          courseId: '',
                          teacherId: '',
                          day: 'Lundi',
                          startTime: '08:00',
                          endTime: '10:00',
                          room: ''
                        });
                        setError('');
                      }}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold disabled:opacity-50"
                    >
                      {saving ? 'Ajout...' : 'Ajouter au Planning'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
