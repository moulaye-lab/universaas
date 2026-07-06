/**
 * CreateCoursePage.jsx - Page de création de cours par admin_universite
 *
 * Fonctionnalités:
 * - Création de cours avec informations académiques complètes
 * - Attribution d'un enseignant responsable
 * - Auto-génération du code cours (PREFIX-DEPT-NUM)
 * - Création dans /universities/{universityId}/courses/{courseId}
 * - Logs d'audit automatiques
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, get, push } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateCoursePage() {
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    courseName: '',
    courseCode: '',
    department: '',
    credits: '3',
    semester: 'S1',
    level: 'L1',
    description: '',
    teacherId: '',
    teacherName: '',
    maxStudents: '50',
    schedule: {
      day: 'Lundi',
      startTime: '08:00',
      endTime: '10:00',
      room: ''
    }
  });

  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courseTemplates, setCourseTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [roomAvailability, setRoomAvailability] = useState('');
  const [teacherAvailability, setTeacherAvailability] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [universityInfo, setUniversityInfo] = useState(null);

  // Charger les infos université et la liste des enseignants
  useEffect(() => {
    const loadData = async () => {
      // Attendre que userProfile soit chargé
      if (authLoading) {
        console.log('⏳ Waiting for auth to load...');
        return;
      }

      if (!userProfile) {
        console.log('❌ No userProfile available');
        return;
      }

      if (!userProfile.universityId) {
        console.log('❌ No universityId in userProfile:', userProfile);
        setError('Erreur: Aucune université associée à votre compte');
        return;
      }

      console.log('🔍 Loading data for university:', userProfile.universityId);

      try {
        // Charger info université
        const universityRef = ref(database, `universities/${userProfile.universityId}/info`);
        const universitySnap = await get(universityRef);
        if (universitySnap.exists()) {
          const info = universitySnap.val();
          console.log('✅ University info loaded:', info);
          setUniversityInfo(info);
        } else {
          console.log('⚠️ No university info found');
        }

        // Charger liste des enseignants
        const teachersRef = ref(database, `universities/${userProfile.universityId}/teachers`);
        console.log('🔍 Fetching teachers from:', `universities/${userProfile.universityId}/teachers`);
        const teachersSnap = await get(teachersRef);

        if (teachersSnap.exists()) {
          const teachersData = teachersSnap.val();
          console.log('📊 Raw teachers data:', teachersData);
          const teachersList = Object.entries(teachersData).map(([id, data]) => ({
            id,
            ...data
          }));
          console.log('✅ Teachers list:', teachersList);
          setTeachers(teachersList);
        } else {
          console.log('⚠️ No teachers found at:', `universities/${userProfile.universityId}/teachers`);
          setTeachers([]);
        }

        // Charger liste des salles
        const roomsRef = ref(database, `universities/${userProfile.universityId}/rooms`);
        console.log('🔍 Fetching rooms from:', `universities/${userProfile.universityId}/rooms`);
        const roomsSnap = await get(roomsRef);

        if (roomsSnap.exists()) {
          const roomsData = roomsSnap.val();
          const roomsList = Object.entries(roomsData)
            .map(([id, data]) => ({
              id,
              ...data
            }))
            .filter(room => room.status === 'active'); // Seulement les salles actives
          console.log('✅ Rooms list:', roomsList);
          setRooms(roomsList);
        } else {
          console.log('⚠️ No rooms found');
          setRooms([]);
        }

        // Charger liste des cours (pour vérifier disponibilité)
        const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
        const coursesSnap = await get(coursesRef);
        if (coursesSnap.exists()) {
          setCourses(Object.values(coursesSnap.val()));
        } else {
          setCourses([]);
        }

        // Charger départements (globaux)
        const deptsRef = ref(database, 'departments');
        const deptsSnap = await get(deptsRef);
        if (deptsSnap.exists()) {
          const deptsData = Object.values(deptsSnap.val());
          setDepartments(deptsData);
        } else {
          setDepartments([]);
        }

        // Charger modèles de cours (globaux)
        const templatesRef = ref(database, 'courseTemplates');
        const templatesSnap = await get(templatesRef);
        if (templatesSnap.exists()) {
          const templatesData = Object.values(templatesSnap.val());
          setCourseTemplates(templatesData);
        } else {
          setCourseTemplates([]);
        }
      } catch (err) {
        console.error('❌ Error loading data:', err);
        setError('Erreur lors du chargement des données: ' + err.message);
      }
    };

    loadData();
  }, [userProfile, authLoading]);

  const semesters = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
  const levels = ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3'];
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  // Auto-génération du code cours (PREFIX-DEPT-NUM)
  const generateCourseCode = () => {
    console.log('🔍 generateCourseCode called');
    console.log('universityInfo:', universityInfo);
    console.log('formData.department:', formData.department);

    if (!universityInfo) {
      setError('Erreur: Informations université non chargées');
      console.log('❌ No universityInfo');
      return;
    }

    if (!formData.department) {
      setError('Veuillez sélectionner un département d\'abord');
      console.log('❌ No department selected');
      return;
    }

    const prefix = universityInfo.shortName || 'UNI';
    const deptCode = formData.department.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 900) + 100;
    const code = `${prefix}-${deptCode}-${randomNum}`;

    console.log('✅ Generated code:', code);
    setFormData(prev => ({ ...prev, courseCode: code }));
    setError(''); // Clear error
  };

  // Sélection d'un enseignant
  const handleTeacherSelect = (e) => {
    const teacherId = e.target.value;
    const teacher = teachers.find(t => t.id === teacherId);

    setFormData(prev => ({
      ...prev,
      teacherId,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : ''
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Si changement de département, filtrer les modèles de cours
    if (name === 'department') {
      const filtered = courseTemplates.filter(t => t.department === value);
      setFilteredTemplates(filtered);
    }
  };

  // Sélection d'un modèle de cours (pré-remplit les champs)
  const handleTemplateSelect = (e) => {
    const templateId = e.target.value;
    if (!templateId) return;

    const template = courseTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Pré-remplir les champs avec le modèle
    setFormData(prev => ({
      ...prev,
      courseName: template.name,
      courseCode: template.code,
      credits: template.credits.toString(),
      description: template.description || ''
    }));
  };

  const handleScheduleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      schedule: { ...prev.schedule, [name]: value }
    }));
  };

  // Vérifier la disponibilité en temps réel
  useEffect(() => {
    const checkAvailability = () => {
      const { room, day, startTime, endTime } = formData.schedule;

      // Si tous les champs sont remplis
      if (room && day && startTime && endTime) {
        const parseTime = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const newStart = parseTime(startTime);
        const newEnd = parseTime(endTime);

        // Vérifier cohérence des horaires
        if (newEnd <= newStart) {
          setRoomAvailability('❌ L\'heure de fin doit être après l\'heure de début');
          return;
        }

        const duration = newEnd - newStart;
        if (duration < 30) {
          setRoomAvailability('⚠️ Durée minimale : 30 minutes');
          return;
        }

        if (duration > 240) {
          setRoomAvailability('⚠️ Durée maximale : 4 heures');
          return;
        }

        // Vérifier conflits avec d'autres cours
        const conflict = courses.find(c => {
          if (!c.schedule) return false;

          if (c.schedule.room === room && c.schedule.day === day) {
            const existingStart = parseTime(c.schedule.startTime);
            const existingEnd = parseTime(c.schedule.endTime);

            return (newStart < existingEnd && newEnd > existingStart);
          }
          return false;
        });

        if (conflict) {
          setRoomAvailability(`⚠️ Conflit : ${conflict.courseName} (${conflict.schedule.startTime}-${conflict.schedule.endTime})`);
        } else {
          setRoomAvailability('✅ Salle disponible');
        }
      } else {
        setRoomAvailability('');
      }
    };

    checkAvailability();
  }, [formData.schedule, courses]);

  // Vérifier la disponibilité de l'enseignant en temps réel
  useEffect(() => {
    const checkTeacherAvailability = () => {
      const { day, startTime, endTime } = formData.schedule;
      const { teacherId } = formData;

      // Si tous les champs nécessaires sont remplis
      if (teacherId && day && startTime && endTime) {
        const parseTime = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const newStart = parseTime(startTime);
        const newEnd = parseTime(endTime);

        // Vérifier si horaires valides
        if (newEnd <= newStart) {
          setTeacherAvailability('');
          return;
        }

        // Vérifier conflits avec d'autres cours du même enseignant
        const conflict = courses.find(c => {
          if (!c.schedule) return false;

          if (c.teacherId === teacherId && c.schedule.day === day) {
            const existingStart = parseTime(c.schedule.startTime);
            const existingEnd = parseTime(c.schedule.endTime);

            return (newStart < existingEnd && newEnd > existingStart);
          }
          return false;
        });

        if (conflict) {
          setTeacherAvailability(`⚠️ Enseignant occupé : ${conflict.courseName} (${conflict.schedule.startTime}-${conflict.schedule.endTime})`);
        } else {
          setTeacherAvailability('✅ Enseignant disponible');
        }
      } else {
        setTeacherAvailability('');
      }
    };

    checkTeacherAvailability();
  }, [formData.teacherId, formData.schedule, courses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validation
      if (!formData.courseName.trim()) {
        throw new Error('Le nom du cours est requis');
      }
      if (!formData.courseCode.trim()) {
        throw new Error('Le code du cours est requis');
      }
      if (!formData.department) {
        throw new Error('Le département est requis');
      }
      if (!formData.teacherId) {
        throw new Error('Veuillez sélectionner un enseignant');
      }
      if (!formData.schedule.room.trim()) {
        throw new Error('La salle est requise');
      }

      // Validation horaires : heure de fin après heure de début
      const parseTime = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const startMinutes = parseTime(formData.schedule.startTime);
      const endMinutes = parseTime(formData.schedule.endTime);

      if (endMinutes <= startMinutes) {
        throw new Error('L\'heure de fin doit être après l\'heure de début');
      }

      // Validation durée minimale (au moins 30 minutes)
      const duration = endMinutes - startMinutes;
      if (duration < 30) {
        throw new Error('La durée du cours doit être d\'au moins 30 minutes');
      }

      // Validation durée maximale (maximum 4 heures)
      if (duration > 240) {
        throw new Error('La durée du cours ne peut pas dépasser 4 heures');
      }

      // Vérifier si le code cours existe déjà
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);

      if (coursesSnap.exists()) {
        const courses = Object.values(coursesSnap.val());

        // Vérifier code cours unique
        const codeExists = courses.some(c => c.courseCode === formData.courseCode);
        if (codeExists) {
          throw new Error('Ce code de cours existe déjà');
        }

        // Vérifier conflit d'horaires pour la salle
        const roomConflict = courses.find(c => {
          // Ignorer les cours sans schedule
          if (!c.schedule) return false;

          // Même salle + même jour ?
          if (c.schedule.room === formData.schedule.room &&
              c.schedule.day === formData.schedule.day) {

            // Convertir les heures en minutes pour faciliter la comparaison
            const parseTime = (time) => {
              const [hours, minutes] = time.split(':').map(Number);
              return hours * 60 + minutes;
            };

            const newStart = parseTime(formData.schedule.startTime);
            const newEnd = parseTime(formData.schedule.endTime);
            const existingStart = parseTime(c.schedule.startTime);
            const existingEnd = parseTime(c.schedule.endTime);

            // Vérifier chevauchement d'horaires
            // Conflit si : (nouveau début < existant fin) ET (nouveau fin > existant début)
            const hasOverlap = (newStart < existingEnd && newEnd > existingStart);

            return hasOverlap;
          }
          return false;
        });

        if (roomConflict) {
          throw new Error(
            `Conflit d'horaire : La salle "${formData.schedule.room}" est déjà occupée le ${formData.schedule.day} de ${roomConflict.schedule.startTime} à ${roomConflict.schedule.endTime} par le cours "${roomConflict.courseName}"`
          );
        }

        // Vérifier conflit d'horaires pour l'enseignant
        const teacherConflict = courses.find(c => {
          // Ignorer les cours sans schedule
          if (!c.schedule) return false;

          // Même enseignant + même jour ?
          if (c.teacherId === formData.teacherId &&
              c.schedule.day === formData.schedule.day) {

            const parseTime = (time) => {
              const [hours, minutes] = time.split(':').map(Number);
              return hours * 60 + minutes;
            };

            const newStart = parseTime(formData.schedule.startTime);
            const newEnd = parseTime(formData.schedule.endTime);
            const existingStart = parseTime(c.schedule.startTime);
            const existingEnd = parseTime(c.schedule.endTime);

            // Vérifier chevauchement d'horaires
            const hasOverlap = (newStart < existingEnd && newEnd > existingStart);

            return hasOverlap;
          }
          return false;
        });

        if (teacherConflict) {
          throw new Error(
            `Conflit d'horaire : L'enseignant "${formData.teacherName}" a déjà le cours "${teacherConflict.courseName}" le ${formData.schedule.day} de ${teacherConflict.schedule.startTime} à ${teacherConflict.schedule.endTime}`
          );
        }
      }

      // Créer le cours
      const courseRef = push(ref(database, `universities/${userProfile.universityId}/courses`));
      const courseId = courseRef.key;

      const courseData = {
        courseId,
        courseName: formData.courseName.trim(),
        courseCode: formData.courseCode.trim().toUpperCase(),
        department: formData.department,
        credits: parseInt(formData.credits),
        semester: formData.semester,
        level: formData.level,
        description: formData.description.trim(),
        teacherId: formData.teacherId,
        teacherName: formData.teacherName,
        maxStudents: parseInt(formData.maxStudents),
        enrolledStudents: 0,
        schedule: {
          day: formData.schedule.day,
          startTime: formData.schedule.startTime,
          endTime: formData.schedule.endTime,
          room: formData.schedule.room.trim()
        },
        status: 'active',
        createdAt: Date.now(),
        createdBy: currentUser.uid
      };

      await set(courseRef, courseData);

      // Créer log d'audit
      const auditRef = push(ref(database, `universities/${userProfile.universityId}/audit`));
      await set(auditRef, {
        action: 'CREATE_COURSE',
        performedBy: currentUser.uid,
        performedByName: userProfile.displayName || userProfile.email,
        targetId: courseId,
        targetName: formData.courseName,
        timestamp: Date.now(),
        details: {
          courseCode: formData.courseCode.toUpperCase(),
          department: formData.department,
          teacherName: formData.teacherName,
          level: formData.level
        }
      });

      setSuccess(`Cours "${formData.courseName}" créé avec succès !`);

      // Demander si l'admin veut créer un autre cours
      const createAnother = window.confirm(
        `✅ Le cours "${formData.courseName}" a été créé avec succès !\n\n` +
        `Voulez-vous créer un autre cours ?\n\n` +
        `• OUI → Rester sur cette page pour créer un nouveau cours\n` +
        `• NON → Retour à la page de gestion des cours`
      );

      if (createAnother) {
        // Reset form pour nouveau cours
        setFormData({
          courseName: '',
          courseCode: '',
          department: '',
          credits: '3',
          semester: 'S1',
          level: 'L1',
          description: '',
          teacherId: '',
          teacherName: '',
          maxStudents: '50',
          schedule: {
            day: 'Lundi',
            startTime: '08:00',
            endTime: '10:00',
            room: ''
          }
        });
        setSuccess('');
        setError('');
      } else {
        // Rediriger vers la page de gestion des cours
        navigate('/admin/courses');
      }

    } catch (err) {
      console.error('Error creating course:', err);
      setError(err.message || 'Erreur lors de la création du cours');
    } finally {
      setLoading(false);
    }
  };

  // Afficher un loader pendant le chargement de l'auth
  if (authLoading) {
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            📚 Créer un Nouveau Cours
          </h1>
          <p className="text-gray-600">
            Ajoutez un cours au catalogue de votre université
          </p>
        </div>

        {/* Form */}
        <div className="glass rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Informations du cours */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📖</span> Informations du Cours
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Département */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Département *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner un département</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* Modèle de cours (optionnel) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Modèle de cours (optionnel)
                  </label>
                  <select
                    onChange={handleTemplateSelect}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!formData.department}
                  >
                    <option value="">Choisir un modèle...</option>
                    {filteredTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.code} - {template.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Sélectionnez d'abord un département
                  </p>
                </div>

                {/* Nom du cours */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nom du cours *
                  </label>
                  <input
                    type="text"
                    name="courseName"
                    value={formData.courseName}
                    onChange={handleChange}
                    placeholder="Ex: Algèbre Linéaire"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Code cours */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Code du cours *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="courseCode"
                      value={formData.courseCode}
                      onChange={handleChange}
                      placeholder="Ex: SOR-MAT-101"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateCourseCode}
                      className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold whitespace-nowrap"
                    >
                      Auto
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Sélectionnez d'abord un département pour générer automatiquement
                  </p>
                </div>

                {/* Crédits */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Crédits ECTS *
                  </label>
                  <input
                    type="number"
                    name="credits"
                    value={formData.credits}
                    onChange={handleChange}
                    min="1"
                    max="12"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Semestre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Semestre *
                  </label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {semesters.map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>

                {/* Niveau */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Niveau *
                  </label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {levels.map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                {/* Capacité max */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Capacité maximale
                  </label>
                  <input
                    type="number"
                    name="maxStudents"
                    value={formData.maxStudents}
                    onChange={handleChange}
                    min="1"
                    max="500"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Décrivez les objectifs et le contenu du cours..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Enseignant */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>👨‍🏫</span> Enseignant Responsable
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sélectionner un enseignant *
                </label>
                <select
                  value={formData.teacherId}
                  onChange={handleTeacherSelect}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choisir un enseignant</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName} - {teacher.department}
                    </option>
                  ))}
                </select>
                {teachers.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    ⚠️ Aucun enseignant disponible. Créez d'abord un enseignant.
                  </p>
                )}

                {/* Indicateur de disponibilité enseignant */}
                {teacherAvailability && (
                  <div className={`mt-3 p-3 rounded-xl ${
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
            </div>

            {/* Horaires */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🕐</span> Horaires et Salle
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Jour */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Jour *
                  </label>
                  <select
                    name="day"
                    value={formData.schedule.day}
                    onChange={handleScheduleChange}
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
                    value={formData.schedule.room}
                    onChange={handleScheduleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner une salle</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.roomName}>
                        {room.roomName} ({room.roomNumber}) - {room.capacity} places
                      </option>
                    ))}
                  </select>
                  {rooms.length === 0 && (
                    <p className="text-sm text-amber-600 mt-2">
                      ⚠️ Aucune salle disponible. <button type="button" onClick={() => navigate('/admin/rooms')} className="underline font-semibold">Créez d'abord une salle</button>.
                    </p>
                  )}
                </div>

                {/* Heure début */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Heure de début *
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.schedule.startTime}
                    onChange={handleScheduleChange}
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
                    value={formData.schedule.endTime}
                    onChange={handleScheduleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Indicateur de disponibilité */}
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
            </div>

            {/* Messages */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                <p className="text-red-700 font-semibold">❌ {error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl">
                <p className="text-green-700 font-semibold">✅ {success}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin')}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || teachers.length === 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Création...' : 'Créer le cours'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
