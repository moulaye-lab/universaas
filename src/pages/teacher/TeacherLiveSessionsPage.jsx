/**
 * TeacherLiveSessionsPage.jsx - Gestion des sessions live par l'enseignant
 *
 * Fonctionnalités:
 * - Créer une session live
 * - Démarrer/Terminer une session
 * - Voir l'historique des sessions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  createLiveSession,
  updateSessionStatus,
  getAllLiveSessions
} from '../../services/liveSessionService';
import {
  Video,
  Plus,
  Play,
  StopCircle,
  Calendar,
  Clock,
  Users,
  ArrowLeft
} from 'lucide-react';

export default function TeacherLiveSessionsPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Formulaire création
  const [formData, setFormData] = useState({
    courseId: '',
    sessionName: '',
    scheduledStartTime: '',
    duration: 60
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!userProfile?.universityId) return;

    setLoading(true);
    try {
      // Charger les cours de l'enseignant
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnapshot = await get(coursesRef);

      const teacherCourses = [];
      if (coursesSnapshot.exists()) {
        coursesSnapshot.forEach((childSnapshot) => {
          const course = childSnapshot.val();
          if (course.teacherId === userProfile.profileId) {
            teacherCourses.push({
              id: childSnapshot.key,
              ...course
            });
          }
        });
      }

      setCourses(teacherCourses);

      // Charger les sessions
      const result = await getAllLiveSessions(userProfile.universityId);
      if (result.success) {
        // Filtrer seulement les sessions de cet enseignant
        const teacherSessions = result.sessions.filter(
          s => s.teacherId === userProfile.profileId
        );
        setSessions(teacherSessions);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();

    const selectedCourse = courses.find(c => c.id === formData.courseId);
    if (!selectedCourse) {
      alert('Veuillez sélectionner un cours');
      return;
    }

    const result = await createLiveSession({
      universityId: userProfile.universityId,
      courseId: formData.courseId,
      courseName: selectedCourse.name,
      teacherId: userProfile.profileId,
      teacherName: `${userProfile.firstName} ${userProfile.lastName}`,
      sessionName: formData.sessionName,
      scheduledStartTime: formData.scheduledStartTime
        ? new Date(formData.scheduledStartTime).getTime()
        : Date.now(),
      duration: parseInt(formData.duration)
    });

    if (result.success) {
      alert('✅ Session créée avec succès !');
      setShowCreateModal(false);
      setFormData({
        courseId: '',
        sessionName: '',
        scheduledStartTime: '',
        duration: 60
      });
      loadData();
    } else {
      alert('❌ Erreur: ' + result.error);
    }
  };

  const handleStartSession = async (sessionId) => {
    await updateSessionStatus(userProfile.universityId, sessionId, 'live');
    navigate(`/live-stream/${sessionId}`);
  };

  const handleEndSession = async (sessionId) => {
    if (confirm('Voulez-vous vraiment terminer cette session ?')) {
      await updateSessionStatus(userProfile.universityId, sessionId, 'ended');
      loadData();
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'live':
        return (
          <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1 animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            EN DIRECT
          </span>
        );
      case 'ended':
        return (
          <span className="px-3 py-1 bg-gray-500 text-white text-xs font-semibold rounded-full">
            TERMINÉE
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
            PROGRAMMÉE
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/dashboard')}
              className="p-2 hover:bg-white/50 rounded-lg transition"
            >
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Video className="h-8 w-8 text-red-600" />
                Sessions Live
              </h1>
              <p className="text-gray-600 mt-1">Créer et gérer vos cours en direct</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition"
          >
            <Plus className="h-5 w-5" />
            Créer une session
          </button>
        </div>

        {/* Sessions Grid */}
        <div className="grid gap-6">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
              <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Aucune session live créée</p>
              <p className="text-gray-500 text-sm mt-2">
                Cliquez sur "Créer une session" pour démarrer
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {session.sessionName}
                      </h3>
                      {getStatusBadge(session.status)}
                    </div>

                    <p className="text-gray-600 mb-4">{session.courseName}</p>

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(session.scheduledStartTime).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {session.duration} min
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {Object.keys(session.participants || {}).length} participant(s)
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {session.status === 'scheduled' && (
                      <button
                        onClick={() => handleStartSession(session.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        <Play className="h-4 w-4" />
                        Démarrer
                      </button>
                    )}

                    {session.status === 'live' && (
                      <>
                        <button
                          onClick={() => navigate(`/live-stream/${session.id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          <Video className="h-4 w-4" />
                          Rejoindre
                        </button>
                        <button
                          onClick={() => handleEndSession(session.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          <StopCircle className="h-4 w-4" />
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

      {/* Modal Création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Créer une session live
            </h2>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cours
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un cours</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom de la session
                </label>
                <input
                  type="text"
                  value={formData.sessionName}
                  onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Cours de mathématiques - Chapitre 5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date et heure (optionnel)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledStartTime}
                  onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Durée (minutes)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="15"
                  max="180"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
