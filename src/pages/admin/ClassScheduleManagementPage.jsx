/**
 * ClassScheduleManagementPage.jsx - Gestion des emplois du temps des classes
 *
 * Fonctionnalités:
 * - Sélectionner une classe
 * - Ajouter des séances hebdomadaires
 * - Modifier/Supprimer des séances
 * - Attribuer cours, jour, horaires, salle
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, MapPin, BookOpen, Plus, Trash2, Save, ChevronLeft, Users, AlertCircle } from 'lucide-react';

export default function ClassScheduleManagementPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conflicts, setConflicts] = useState({});
  const [newSessionIndex, setNewSessionIndex] = useState(null);

  const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  useEffect(() => {
    loadData();
  }, [userProfile]);

  useEffect(() => {
    if (selectedClass) {
      loadClassSchedule();
    }
  }, [selectedClass]);

  const loadData = async () => {
    if (!userProfile?.universityId) {
      // console.log('❌ No universityId found');
      return;
    }

    try {
      setLoading(true);
      // console.log('🔄 Loading data for university:', userProfile.universityId);

      // Charger classes
      const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
      const classesSnap = await get(classesRef);

      if (classesSnap.exists()) {
        const classesData = Object.entries(classesSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        // console.log('✅ Classes loaded:', classesData.length, classesData);
        setClasses(classesData);
      } else {
        // console.log('⚠️ No classes found');
        setClasses([]);
      }

      // Charger cours
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);

      if (coursesSnap.exists()) {
        const coursesData = Object.entries(coursesSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        // console.log('✅ Courses loaded:', coursesData.length, coursesData);
        setCourses(coursesData);
      } else {
        // console.log('⚠️ No courses found');
        setCourses([]);
      }

      // Charger enseignants
      const teachersRef = ref(database, `universities/${userProfile.universityId}/teachers`);
      const teachersSnap = await get(teachersRef);

      if (teachersSnap.exists()) {
        const teachersData = Object.entries(teachersSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        // console.log('✅ Teachers loaded:', teachersData.length, teachersData);
        setTeachers(teachersData);
      } else {
        // console.log('⚠️ No teachers found');
        setTeachers([]);
      }

      // Charger salles
      const roomsRef = ref(database, `universities/${userProfile.universityId}/rooms`);
      const roomsSnap = await get(roomsRef);

      if (roomsSnap.exists()) {
        const roomsData = Object.entries(roomsSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        // console.log('✅ Rooms loaded:', roomsData.length, roomsData);
        setRooms(roomsData);
      } else {
        // console.log('⚠️ No rooms found');
        setRooms([]);
      }
    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError('Erreur lors du chargement des données: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadClassSchedule = async () => {
    if (!selectedClass || !userProfile?.universityId) return;

    try {
      const classRef = ref(database, `universities/${userProfile.universityId}/classes/${selectedClass}`);
      const classSnap = await get(classRef);

      if (classSnap.exists()) {
        const classData = classSnap.val();
        setSchedule(classData.schedule || []);
      }
    } catch (err) {
      console.error('Error loading class schedule:', err);
      setError('Erreur lors du chargement de l\'emploi du temps');
    }
  };

  const addSession = () => {
    const newSession = {
      day: 'Lundi',
      startTime: '09:00',
      endTime: '10:30',
      courseId: '',
      room: ''
    };
    const newSchedule = [...schedule, newSession];
    setSchedule(newSchedule);

    // Marquer l'index de la nouvelle séance
    const newIndex = newSchedule.length - 1;
    setNewSessionIndex(newIndex);

    // Scroller vers la nouvelle séance
    setTimeout(() => {
      const element = document.getElementById(`session-${newIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const updateSession = async (index, field, value) => {
    const newSchedule = [...schedule];
    newSchedule[index][field] = value;
    setSchedule(newSchedule);

    // Retirer le marqueur "nouvelle séance" dès que l'utilisateur modifie
    if (newSessionIndex === index) {
      setNewSessionIndex(null);
    }

    // Vérifier les conflits si on change jour, heure ou cours
    if (['day', 'startTime', 'endTime', 'courseId', 'room'].includes(field)) {
      await checkConflicts(index, newSchedule);
    }
  };

  const checkConflicts = async (sessionIndex, currentSchedule) => {
    const session = currentSchedule[sessionIndex];
    if (!session.courseId) return;

    // VALIDATION 1: Vérifier que startTime < endTime
    if (session.startTime && session.endTime && session.startTime >= session.endTime) {
      setError(`⚠️ ERREUR : L'heure de début (${session.startTime}) doit être inférieure à l'heure de fin (${session.endTime})`);
      setConflicts(prev => ({
        ...prev,
        [sessionIndex]: { teacher: [], room: [], class: [], timeError: true }
      }));
      return;
    }

    const course = courses.find(c => c.id === session.courseId);
    if (!course) return;

    try {
      // Charger TOUTES les classes pour vérifier les conflits
      const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
      const classesSnap = await get(classesRef);

      if (!classesSnap.exists()) return;

      const allClasses = classesSnap.val();
      const conflicts = {
        teacher: [],
        room: [],
        class: []  // Nouveau : conflits dans la même classe
      };

      // 1. VÉRIFIER LES CONFLITS DANS LA MÊME CLASSE
      currentSchedule.forEach((otherSession, otherIndex) => {
        // Ne pas comparer une séance avec elle-même
        if (otherIndex === sessionIndex) return;
        if (!otherSession.courseId) return;

        // Vérifier si même jour
        if (otherSession.day !== session.day) return;

        // Vérifier si les horaires se chevauchent
        const overlap = checkTimeOverlap(
          session.startTime,
          session.endTime,
          otherSession.startTime,
          otherSession.endTime
        );

        if (overlap) {
          const otherCourse = courses.find(c => c.id === otherSession.courseId);
          conflicts.class.push({
            courseName: otherCourse ? otherCourse.courseName : 'Cours inconnu',
            time: `${otherSession.startTime}-${otherSession.endTime}`
          });
        }
      });

      // 2. VÉRIFIER LES CONFLITS AVEC LES AUTRES CLASSES
      // Parcourir toutes les classes SAUF la classe en cours d'édition
      Object.entries(allClasses).forEach(([classId, classData]) => {
        if (classId === selectedClass) return; // Ignorer la classe actuelle

        if (classData.schedule && Array.isArray(classData.schedule)) {
          classData.schedule.forEach(otherSession => {
            // Vérifier si même jour
            if (otherSession.day !== session.day) return;

            // Vérifier si les horaires se chevauchent
            const overlap = checkTimeOverlap(
              session.startTime,
              session.endTime,
              otherSession.startTime,
              otherSession.endTime
            );

            if (overlap) {
              // Conflit de professeur
              const otherCourse = courses.find(c => c.id === otherSession.courseId);
              if (otherCourse && otherCourse.teacherId === course.teacherId) {
                const teacher = teachers.find(t => t.id === course.teacherId);
                conflicts.teacher.push({
                  className: classData.name,
                  courseName: otherCourse.courseName,
                  time: `${otherSession.startTime}-${otherSession.endTime}`,
                  teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Prof inconnu'
                });
              }

              // Conflit de salle
              if (session.room && otherSession.room === session.room) {
                conflicts.room.push({
                  className: classData.name,
                  courseName: otherCourse ? otherCourse.courseName : 'Cours inconnu',
                  time: `${otherSession.startTime}-${otherSession.endTime}`,
                  room: session.room
                });
              }
            }
          });
        }
      });

      // Stocker les conflits pour cet index
      setConflicts(prev => ({
        ...prev,
        [sessionIndex]: conflicts
      }));

      // Afficher les messages d'erreur (prioriser conflit classe > prof > salle)
      if (conflicts.class.length > 0) {
        console.warn('🚨 CONFLIT CLASSE:', conflicts.class);

        const message = `🚨 CONFLIT : La classe a déjà un cours au même moment :\n` +
          conflicts.class.map(c => `  • ${c.time} - ${c.courseName}`).join('\n') +
          '\n\n⚠️ Les étudiants ne peuvent pas être à 2 cours en même temps !\nModifiez les horaires.';

        setError(message);
      } else if (conflicts.teacher.length > 0) {
        const teacherName = getTeacherName(session.courseId);
        console.warn('⚠️ CONFLIT PROFESSEUR:', {
          teacher: teacherName,
          conflicts: conflicts.teacher
        });

        const message = `⚠️ CONFLIT PROFESSEUR : ${teacherName} est déjà occupé(e) le ${session.day} :\n` +
          conflicts.teacher.map(c => `  • ${c.time} - ${c.courseName} (${c.className})`).join('\n') +
          '\n\nVous pouvez tout de même enregistrer, mais cela créera un conflit.';

        setError(message);
      } else if (conflicts.room.length > 0) {
        console.warn('⚠️ CONFLIT SALLE:', conflicts.room);

        const message = `⚠️ CONFLIT SALLE : ${session.room} déjà occupée le ${session.day} :\n` +
          conflicts.room.map(c => `  • ${c.time} - ${c.courseName} (${c.className})`).join('\n') +
          '\n\nVous pouvez tout de même enregistrer, mais cela créera un conflit.';

        setError(message);
      } else {
        setError(''); // Pas de conflit
      }
    } catch (err) {
      console.error('Error checking conflicts:', err);
    }
  };

  const checkTimeOverlap = (start1, end1, start2, end2) => {
    // Convertir les heures en minutes pour comparaison
    const toMinutes = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);

    // Chevauchement si : (début1 < fin2) ET (fin1 > début2)
    return (s1 < e2) && (e1 > s2);
  };

  const removeSession = (index) => {
    const newSchedule = schedule.filter((_, i) => i !== index);
    setSchedule(newSchedule);
  };

  const handleSave = async () => {
    if (!selectedClass) {
      setError('Veuillez sélectionner une classe');
      return;
    }

    // Validation
    for (let i = 0; i < schedule.length; i++) {
      const session = schedule[i];
      if (!session.courseId) {
        setError(`Séance ${i + 1} : veuillez sélectionner un cours`);
        return;
      }
      if (session.startTime >= session.endTime) {
        setError(`Séance ${i + 1} : l'heure de fin doit être après l'heure de début`);
        return;
      }
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const classRef = ref(database, `universities/${userProfile.universityId}/classes/${selectedClass}`);
      await update(classRef, {
        schedule: schedule,
        updatedAt: Date.now()
      });

      setSuccess('✅ Emploi du temps enregistré avec succès !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError('Erreur lors de l\'enregistrement : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? `${course.courseName} (${course.courseCode})` : 'Cours inconnu';
  };

  const getTeacherName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course || !course.teacherId) return null;

    const teacher = teachers.find(t => t.id === course.teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : null;
  };

  // Grouper par jour
  const scheduleByDay = daysOfWeek.map(day => ({
    day,
    sessions: schedule
      .map((session, index) => ({ ...session, index }))
      .filter(session => session.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }));

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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ChevronLeft className="h-5 w-5" />
              Retour au dashboard
            </button>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              📅 Gestion des Emplois du Temps
            </h1>
            <p className="text-gray-600">
              Configurer les emplois du temps hebdomadaires des classes
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
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600">
            {success}
          </div>
        )}

        {/* Sélection de classe */}
        <div className="glass rounded-3xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sélectionner une Classe</h2>

          {classes.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Aucune classe disponible</p>
              <p className="text-sm text-gray-500">Créez d'abord des classes depuis la gestion des classes</p>
              <button
                onClick={() => navigate('/admin/classes')}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
              >
                Aller à la gestion des classes
              </button>
            </div>
          ) : (
            <>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choisir une classe --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.level} ({cls.students?.length || 0} étudiants)
                  </option>
                ))}
              </select>

              {courses.length === 0 && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
                  ⚠️ <strong>Aucun cours disponible.</strong> Créez des cours d'abord depuis la gestion des cours.
                </div>
              )}
            </>
          )}
        </div>

        {/* Emploi du temps */}
        {selectedClass && (
          <div className="glass rounded-3xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Emploi du Temps ({schedule.length} séances)
              </h2>
              <button
                onClick={addSession}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Ajouter une séance
              </button>
            </div>

            {schedule.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Aucune séance programmée</p>
                <button
                  onClick={addSession}
                  className="text-blue-600 font-semibold hover:text-blue-700"
                >
                  Ajouter la première séance
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Vue par jour */}
                {scheduleByDay.map(({ day, sessions }) => (
                  sessions.length > 0 && (
                    <div key={day} className="border-l-4 border-blue-500 pl-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">{day}</h3>

                      <div className="space-y-4">
                        {sessions.map(({ index, day, startTime, endTime, courseId, room }) => {
                          const hasConflict = conflicts[index] && (
                            conflicts[index].class?.length > 0 ||
                            conflicts[index].teacher?.length > 0 ||
                            conflicts[index].room?.length > 0 ||
                            conflicts[index].timeError
                          );

                          const isNewSession = index === newSessionIndex;

                          return (
                            <div
                              key={index}
                              id={`session-${index}`}
                              className={`bg-white p-4 rounded-xl border-2 ${
                                hasConflict ? 'border-red-300 bg-red-50' :
                                isNewSession ? 'border-green-400 bg-green-50' :
                                'border-gray-200'
                              } transition-all duration-300`}
                            >
                              {/* Marqueur nouvelle séance */}
                              {isNewSession && (
                                <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded-lg text-xs text-green-800 flex items-center gap-2">
                                  <span className="animate-pulse">✨</span>
                                  <span className="font-semibold">NOUVELLE SÉANCE - Complétez les informations ci-dessous</span>
                                </div>
                              )}
                              {/* Indicateur de conflit */}
                              {hasConflict && (
                                <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded-lg text-xs text-red-800">
                                  <div className="flex items-center gap-2 font-semibold mb-1">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>CONFLIT DÉTECTÉ</span>
                                  </div>
                                  {conflicts[index]?.timeError && (
                                    <div className="ml-6 text-red-900 font-bold mb-2">
                                      ⏰ ERREUR : L'heure de début doit être inférieure à l'heure de fin
                                    </div>
                                  )}
                                  {conflicts[index]?.class?.length > 0 && (
                                    <div className="ml-6 text-red-900 font-bold">
                                      🚨 CLASSE : La classe a déjà un cours : {conflicts[index].class.map(c =>
                                        `${c.time} (${c.courseName})`
                                      ).join(', ')}
                                    </div>
                                  )}
                                  {conflicts[index]?.teacher?.length > 0 && (
                                    <div className="ml-6">
                                      👨‍🏫 Professeur occupé : {conflicts[index].teacher.map(c =>
                                        `${c.time} (${c.className})`
                                      ).join(', ')}
                                    </div>
                                  )}
                                  {conflicts[index]?.room?.length > 0 && (
                                    <div className="ml-6">
                                      🏢 Salle occupée : {conflicts[index].room.map(c =>
                                        `${c.time} (${c.className})`
                                      ).join(', ')}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                              {/* Jour */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Jour
                                </label>
                                <select
                                  value={day}
                                  onChange={(e) => updateSession(index, 'day', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                  {daysOfWeek.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Heure début */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Début
                                </label>
                                <select
                                  value={startTime}
                                  onChange={(e) => updateSession(index, 'startTime', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                  {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Heure fin */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Fin
                                </label>
                                <select
                                  value={endTime}
                                  onChange={(e) => updateSession(index, 'endTime', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                  {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Cours */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Cours *
                                </label>
                                <select
                                  value={courseId}
                                  onChange={(e) => updateSession(index, 'courseId', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                  required
                                >
                                  <option value="">-- Sélectionner --</option>
                                  {courses.map(course => (
                                    <option key={course.id} value={course.id}>
                                      {course.courseName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Salle */}
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Salle
                                  </label>
                                  <select
                                    value={room}
                                    onChange={(e) => updateSession(index, 'room', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 text-sm"
                                  >
                                    <option value="">Aucune</option>
                                    {rooms.map(r => (
                                      <option key={r.id} value={r.name}>
                                        {r.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Supprimer */}
                                <button
                                  onClick={() => removeSession(index)}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            </div>

                            {/* Info cours */}
                            {courseId && (
                              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  <span>{getCourseName(courseId)}</span>
                                </div>
                                {getTeacherName(courseId) && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span className="font-semibold text-blue-600">{getTeacherName(courseId)}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{startTime} - {endTime}</span>
                                </div>
                                {room && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{room}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Actions */}
            {schedule.length > 0 && (
              <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedClass('');
                    setSchedule([]);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Enregistrer l'Emploi du Temps
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="glass rounded-3xl p-6">
          <h3 className="font-bold text-gray-900 mb-2">💡 Comment ça marche ?</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Sélectionnez une classe pour voir/modifier son emploi du temps</li>
            <li>Ajoutez des séances en cliquant sur "Ajouter une séance"</li>
            <li>Chaque séance doit avoir un cours, un jour, et des horaires</li>
            <li>Les salles sont optionnelles</li>
            <li>N'oubliez pas d'enregistrer vos modifications</li>
          </ul>
        </div>

        {/* Bouton flottant "Ajouter une séance" */}
        {selectedClass && (
          <button
            onClick={addSession}
            className="fixed bottom-8 right-8 px-5 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 hover:shadow-lg transition-all duration-200 font-medium flex items-center gap-2 z-50"
            title="Ajouter une séance"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Ajouter une séance</span>
          </button>
        )}
      </div>
    </div>
  );
}
