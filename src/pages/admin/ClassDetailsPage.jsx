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
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [editingScheduleIndex, setEditingScheduleIndex] = useState(null);
  const [courseFormData, setCourseFormData] = useState({
    courseId: ''
  });
  const [editFormData, setEditFormData] = useState({
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
          console.log('✅ Cours chargés:', coursesData.length, coursesData);
          setAllCourses(coursesData);
        } else {
          console.log('⚠️ Aucun cours trouvé dans Firebase');
          setAllCourses([]);
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

  // Pas besoin de vérifier disponibilité en temps réel
  // Les horaires/salles sont déjà définis lors de la création du cours

  const handleCourseFormChange = (e) => {
    const { name, value } = e.target;
    setCourseFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSchedule = (scheduleIndex) => {
    const scheduleEntry = classData.schedule[scheduleIndex];
    setEditingScheduleIndex(scheduleIndex);
    setEditFormData({
      teacherId: scheduleEntry.teacherId,
      day: scheduleEntry.day,
      startTime: scheduleEntry.startTime,
      endTime: scheduleEntry.endTime,
      room: scheduleEntry.room
    });
    setShowEditCourseModal(true);
  };

  const handleAddCourseToSchedule = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const course = allCourses.find(c => c.id === courseFormData.courseId);

      if (!course) {
        throw new Error('Cours introuvable');
      }

      // Vérifier que le cours a bien un schedule défini
      if (!course.schedule || !course.schedule.day || !course.schedule.room) {
        throw new Error('Ce cours n\'a pas d\'horaire ou de salle défini');
      }

      // Vérifier que le cours n'est pas déjà dans le planning
      const alreadyAdded = (classData.schedule || []).some(sch => sch.courseId === course.id);
      if (alreadyAdded) {
        throw new Error('Ce cours est déjà dans le planning de cette classe');
      }

      // Vérifier capacité de la salle vs taille de la classe
      const selectedRoom = allRooms.find(r => r.roomName === course.schedule.room);
      const classCapacity = classData.occupiedSeats || 0;

      if (selectedRoom && classCapacity > selectedRoom.capacity) {
        throw new Error(
          `❌ Salle trop petite : La salle ${selectedRoom.roomName} a une capacité de ${selectedRoom.capacity} places, ` +
          `mais la classe compte ${classCapacity} étudiants inscrits.`
        );
      }

      // Vérifier conflit d'horaire avec le planning existant de la classe
      const parseTime = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const newStart = parseTime(course.schedule.startTime);
      const newEnd = parseTime(course.schedule.endTime);

      const conflict = (classData.schedule || []).find(sch => {
        if (sch.day === course.schedule.day) {
          const existingStart = parseTime(sch.startTime);
          const existingEnd = parseTime(sch.endTime);
          return (newStart < existingEnd && newEnd > existingStart);
        }
        return false;
      });

      if (conflict) {
        throw new Error(
          `⚠️ Conflit d'horaire : Le ${course.schedule.day} de ${course.schedule.startTime} à ${course.schedule.endTime} est déjà occupé par "${conflict.courseName}"`
        );
      }

      // Récupérer l'enseignant depuis le cours
      const teacher = allTeachers.find(t => t.id === course.teacherId);

      const newScheduleEntry = {
        courseId: course.id,
        courseName: course.courseName,
        courseCode: course.courseCode,
        teacherId: course.teacherId,
        teacherName: course.teacherName,
        day: course.schedule.day,
        startTime: course.schedule.startTime,
        endTime: course.schedule.endTime,
        room: course.schedule.room,
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
          id: course.id,
          name: course.courseName,
          teacher: course.teacherName,
          schedule: `${course.schedule.day} ${course.schedule.startTime}-${course.schedule.endTime}`,
          room: course.schedule.room
        }, userProfile.universityId, currentUser.uid, userProfile.displayName || userProfile.email || 'Admin');
      }

      // Recharger les données
      const updatedClassSnap = await get(classRef);
      setClassData(updatedClassSnap.val());

      setShowAddCourseModal(false);
      setCourseFormData({ courseId: '' });
      setSuccess('✅ Cours ajouté au planning avec succès');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error adding course:', err);
      setError(err.message || 'Erreur lors de l\'ajout du cours');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Validation horaires
      const parseTime = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const newStart = parseTime(editFormData.startTime);
      const newEnd = parseTime(editFormData.endTime);

      if (newEnd <= newStart) {
        throw new Error('L\'heure de fin doit être après l\'heure de début');
      }

      const duration = newEnd - newStart;
      if (duration < 30) {
        throw new Error('La durée du cours doit être d\'au moins 30 minutes');
      }

      // Vérifier capacité de la salle vs taille de la classe
      const selectedRoom = allRooms.find(r => r.roomName === editFormData.room);
      const classCapacity = classData.occupiedSeats || 0;

      if (selectedRoom && classCapacity > selectedRoom.capacity) {
        throw new Error(
          `❌ Salle trop petite : La salle ${selectedRoom.roomName} a une capacité de ${selectedRoom.capacity} places, ` +
          `mais la classe compte ${classCapacity} étudiants inscrits.`
        );
      }

      // Vérifier conflit avec autres cours de la classe (sauf celui qu'on modifie)
      const conflict = (classData.schedule || []).find((sch, idx) => {
        if (idx === editingScheduleIndex) return false; // Ignorer le cours qu'on modifie

        if (sch.day === editFormData.day) {
          const existingStart = parseTime(sch.startTime);
          const existingEnd = parseTime(sch.endTime);
          return (newStart < existingEnd && newEnd > existingStart);
        }
        return false;
      });

      if (conflict) {
        throw new Error(
          `⚠️ Conflit d'horaire : Le ${editFormData.day} de ${editFormData.startTime} à ${editFormData.endTime} est déjà occupé par "${conflict.courseName}"`
        );
      }

      const teacher = allTeachers.find(t => t.id === editFormData.teacherId);

      const updatedSchedule = [...(classData.schedule || [])];
      updatedSchedule[editingScheduleIndex] = {
        ...updatedSchedule[editingScheduleIndex],
        teacherId: editFormData.teacherId,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : updatedSchedule[editingScheduleIndex].teacherName,
        day: editFormData.day,
        startTime: editFormData.startTime,
        endTime: editFormData.endTime,
        room: editFormData.room,
        modifiedAt: Date.now()
      };

      const classRef = ref(database, `universities/${userProfile.universityId}/classes/${classId}`);
      await update(classRef, {
        schedule: updatedSchedule,
        updatedAt: Date.now()
      });

      // Recharger les données
      const updatedClassSnap = await get(classRef);
      setClassData(updatedClassSnap.val());

      setShowEditCourseModal(false);
      setEditingScheduleIndex(null);
      setSuccess('✅ Horaire modifié avec succès');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error updating schedule:', err);
      setError(err.message || 'Erreur lors de la modification');
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
                            {courses.map((course, idx) => {
                              const scheduleIndex = schedule.findIndex(s =>
                                s.courseId === course.courseId &&
                                s.day === course.day &&
                                s.startTime === course.startTime
                              );
                              return (
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
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleEditSchedule(scheduleIndex)}
                                        className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition text-sm font-semibold"
                                        disabled={saving}
                                      >
                                        ✏️ Modifier
                                      </button>
                                      <button
                                        onClick={() => handleRemoveCourseFromSchedule(course.courseId)}
                                        className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-semibold"
                                        disabled={saving}
                                      >
                                        🗑️ Retirer
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Modifier Cours */}
          {showEditCourseModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="glass rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-gray-900">
                    ✏️ Modifier l'Horaire du Cours
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditCourseModal(false);
                      setEditingScheduleIndex(null);
                      setError('');
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Warning */}
                <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-400 rounded-xl">
                  <p className="text-sm text-amber-800 font-semibold mb-1 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    Modification locale
                  </p>
                  <p className="text-sm text-amber-700">
                    Ces changements s'appliquent uniquement à l'emploi du temps de cette classe.
                    L'emploi du temps de l'enseignant et des autres classes ne sera pas affecté.
                  </p>
                </div>

                <form onSubmit={handleUpdateSchedule} className="space-y-6">
                  {/* Enseignant */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Enseignant *
                    </label>
                    <select
                      name="teacherId"
                      value={editFormData.teacherId}
                      onChange={handleEditFormChange}
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Jour */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Jour *
                      </label>
                      <select
                        name="day"
                        value={editFormData.day}
                        onChange={handleEditFormChange}
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
                        value={editFormData.room}
                        onChange={handleEditFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Sélectionner une salle</option>
                        {allRooms.map(room => (
                          <option key={room.id} value={room.roomName}>
                            {room.roomName} ({room.roomNumber}) - {room.capacity} places
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Heure début */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Heure de début *
                      </label>
                      <input
                        type="time"
                        name="startTime"
                        value={editFormData.startTime}
                        onChange={handleEditFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Heure fin */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Heure de fin *
                      </label>
                      <input
                        type="time"
                        name="endTime"
                        value={editFormData.endTime}
                        onChange={handleEditFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

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
                        setShowEditCourseModal(false);
                        setEditingScheduleIndex(null);
                        setError('');
                      }}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition font-semibold disabled:opacity-50"
                    >
                      {saving ? 'Modification...' : 'Enregistrer les modifications'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
                      setCourseFormData({ courseId: '' });
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
                      Sélectionner un cours *
                    </label>
                    <select
                      name="courseId"
                      value={courseFormData.courseId}
                      onChange={handleCourseFormChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={allCourses.length === 0}
                    >
                      <option value="">
                        {allCourses.length === 0 ? 'Aucun cours disponible' : 'Choisir un cours...'}
                      </option>
                      {allCourses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.courseName} ({course.courseCode}) - {course.teacherName} - {course.schedule?.day} {course.schedule?.startTime}-{course.schedule?.endTime} - {course.schedule?.room}
                        </option>
                      ))}
                    </select>
                    {allCourses.length === 0 && (
                      <div className="mt-3 p-4 bg-amber-50 border-2 border-amber-400 rounded-xl">
                        <p className="text-sm text-amber-800 font-semibold mb-2 flex items-center gap-2">
                          <span className="text-xl">⚠️</span>
                          Aucun cours disponible
                        </p>
                        <p className="text-sm text-amber-700 mb-3">
                          Vous devez d'abord créer au moins un cours avant de pouvoir l'ajouter à l'emploi du temps de cette classe.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate('/admin/courses/create')}
                          className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Créer un cours
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Le cours inclut déjà l'enseignant, l'horaire et la salle définis lors de sa création
                    </p>
                  </div>

                  {/* Aperçu du cours sélectionné */}
                  {courseFormData.courseId && (() => {
                    const selectedCourse = allCourses.find(c => c.id === courseFormData.courseId);
                    return selectedCourse ? (
                      <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
                        <h3 className="font-bold text-blue-900 mb-2">📋 Détails du cours</h3>
                        <div className="space-y-1 text-sm text-blue-800">
                          <p><strong>Cours :</strong> {selectedCourse.courseName} ({selectedCourse.courseCode})</p>
                          <p><strong>Enseignant :</strong> {selectedCourse.teacherName}</p>
                          <p><strong>Horaire :</strong> {selectedCourse.schedule?.day} {selectedCourse.schedule?.startTime} - {selectedCourse.schedule?.endTime}</p>
                          <p><strong>Salle :</strong> {selectedCourse.schedule?.room}</p>
                        </div>
                      </div>
                    ) : null;
                  })()}

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
                        setCourseFormData({ courseId: '' });
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
