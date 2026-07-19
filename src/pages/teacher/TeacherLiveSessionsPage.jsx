/**
 * TeacherLiveSessionsPage.jsx - Gestion des sessions live (Enseignant)
 *
 * Fonctionnalités:
 * - Créer une session live pour un cours
 * - Voir les sessions planifiées/en cours/terminées
 * - Démarrer/terminer une session
 * - Accéder à l'interface live streaming
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  createLiveSession,
  updateSessionStatus,
  getCourseliveSessions
} from '../../services/agoraService';
import {
  ChevronLeft,
  Video,
  Plus,
  Calendar,
  Clock,
  Users,
  Play,
  StopCircle,
  RadioIcon
} from 'lucide-react';

export default function TeacherLiveSessionsPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    courseId: '',
    sessionName: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 60
  });

  useEffect(() => {
    loadCourses();
    loadSessions();
  }, [userProfile]);

  const loadCourses = async () => {
    if (!userProfile?.universityId) return;

    try {
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const snapshot = await get(coursesRef);

      if (snapshot.exists()) {
        const coursesData = snapshot.val();
        const coursesArray = Object.keys(coursesData)
          .map(key => ({
            id: key,
            ...coursesData[key]
          }))
          .filter(course => course.teacherId === userProfile.profileId);

        setCourses(coursesArray);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadSessions = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);

      const sessionsRef = ref(database, `universities/${userProfile.universityId}/liveSessions`);
      const snapshot = await get(sessionsRef);

      if (snapshot.exists()) {
        const sessionsData = snapshot.val();
        const sessionsArray = Object.keys(sessionsData)
          .map(key => ({
            id: key,
            ...sessionsData[key]
          }))
          .filter(session => session.teacherId === userProfile.profileId)
          .sort((a, b) => b.scheduledStartTime - a.scheduledStartTime);

        setSessions(sessionsArray);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.courseId || !formData.sessionName || !formData.scheduledDate || !formData.scheduledTime) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const course = courses.find(c => c.id === formData.courseId);

      if (!course) {
        alert('Cours introuvable');
        return;
      }

      // Combiner date et heure
      const scheduledStartTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).getTime();

      const result = await createLiveSession({
        universityId: userProfile.universityId,
        courseId: formData.courseId,
        courseName: course.courseName,
        teacherId: userProfile.profileId,
        teacherName: userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`,
        sessionName: formData.sessionName,
        scheduledStartTime,
        duration: parseInt(formData.duration)
      });

      if (result.success) {
        alert('✅ Session créée avec succès!');
        setShowModal(false);
        setFormData({
          courseId: '',
          sessionName: '',
          scheduledDate: '',
          scheduledTime: '',
          duration: 60
        });
        loadSessions();
      } else {
        alert('❌ Erreur: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Erreur lors de la création');
    }
  };

  const handleStartSession = async (session) => {
    try {
      await updateSessionStatus(userProfile.universityId, session.id, 'live');
      navigate(`/live-stream/${session.id}`);
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Erreur lors du démarrage');
    }
  };

  const handleEndSession = async (session) => {
    if (!confirm('Êtes-vous sûr de vouloir terminer cette session ?')) return;

    try {
      await updateSessionStatus(userProfile.universityId, session.id, 'ended');
      loadSessions();
      alert('Session terminée');
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Erreur');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { label: 'Planifié', color: 'bg-blue-100 text-blue-700', icon: Calendar },
      live: { label: 'En Direct', color: 'bg-red-100 text-red-700 animate-pulse', icon: RadioIcon },
      ended: { label: 'Terminé', color: 'bg-gray-100 text-gray-700', icon: StopCircle }
    };

    const badge = badges[status] || badges.scheduled;
    const Icon = badge.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/dashboard/teacher')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Video className="h-8 w-8 text-red-600" />
                Cours en Direct
              </h1>
              <p className="text-gray-600 mt-1">Créez et gérez vos sessions live</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
            >
              <Plus className="h-5 w-5" />
              Nouvelle Session
            </button>
          </div>
        </div>

        {/* Liste des sessions */}
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-700 mb-2">Aucune session live</p>
              <p className="text-gray-500 mb-6">Créez votre première session de cours en direct</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
              >
                Créer une session
              </button>
            </div>
          ) : (
            sessions.map(session => (
              <div key={session.id} className="glass rounded-2xl p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{session.sessionName}</h3>
                      {getStatusBadge(session.status)}
                    </div>
                    <p className="text-gray-600 mb-3">{session.courseName}</p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        {new Date(session.scheduledStartTime).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4 text-purple-500" />
                        {new Date(session.scheduledStartTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' '} ({session.duration} min)
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="h-4 w-4 text-green-500" />
                        {Object.keys(session.participants || {}).length} participant(s)
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {session.status === 'scheduled' && (
                      <button
                        onClick={() => handleStartSession(session)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                      >
                        <Play className="h-5 w-5" />
                        Démarrer
                      </button>
                    )}

                    {session.status === 'live' && (
                      <>
                        <button
                          onClick={() => navigate(`/live-stream/${session.id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                        >
                          <RadioIcon className="h-5 w-5 animate-pulse" />
                          Rejoindre
                        </button>
                        <button
                          onClick={() => handleEndSession(session)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
                        >
                          <StopCircle className="h-5 w-5" />
                          Terminer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Création Session */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Nouvelle Session Live</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cours *
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="">Sélectionner un cours</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.courseName} - {course.className}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Titre de la session *
                  </label>
                  <input
                    type="text"
                    value={formData.sessionName}
                    onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                    placeholder="Ex: Chapitre 3 - Introduction aux variables"
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Heure *
                    </label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Durée (minutes) *
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-red-500"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 heure</option>
                    <option value="90">1h30</option>
                    <option value="120">2 heures</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
                  >
                    Créer la session
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
