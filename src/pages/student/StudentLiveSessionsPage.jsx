/**
 * StudentLiveSessionsPage.jsx - Rejoindre sessions live (Étudiant)
 *
 * Fonctionnalités:
 * - Voir les sessions live disponibles
 * - Rejoindre une session en direct
 * - Voir les sessions planifiées pour ses cours
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronLeft,
  Video,
  Calendar,
  Clock,
  Users,
  Play,
  RadioIcon
} from 'lucide-react';

export default function StudentLiveSessionsPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [studentCourses, setStudentCourses] = useState([]);

  useEffect(() => {
    loadStudentCourses();
  }, [userProfile]);

  useEffect(() => {
    if (studentCourses.length > 0) {
      loadSessions();
    }
  }, [studentCourses]);

  const loadStudentCourses = async () => {
    if (!userProfile?.universityId || !userProfile?.profileId) return;

    try {
      // Charger l'étudiant
      const studentRef = ref(database, `universities/${userProfile.universityId}/students/${userProfile.profileId}`);
      const studentSnap = await get(studentRef);

      if (studentSnap.exists()) {
        const studentData = studentSnap.val();
        const enrolledCourses = studentData.enrolledCourses || {};
        setStudentCourses(Object.keys(enrolledCourses));
      }
    } catch (error) {
      console.error('Error loading student courses:', error);
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
          .filter(session => {
            // Filtrer seulement les cours auxquels l'étudiant est inscrit
            return studentCourses.includes(session.courseId) && session.status !== 'ended';
          })
          .sort((a, b) => {
            // Priorité: live > scheduled
            if (a.status === 'live' && b.status !== 'live') return -1;
            if (b.status === 'live' && a.status !== 'live') return 1;
            return a.scheduledStartTime - b.scheduledStartTime;
          });

        setSessions(sessionsArray);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setLoading(false);
    }
  };

  const handleJoinSession = (session) => {
    if (session.status === 'live') {
      navigate(`/live-stream/${session.id}`);
    } else {
      alert('Cette session n\'a pas encore commencé');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { label: 'Planifié', color: 'bg-blue-100 text-blue-700', icon: Calendar },
      live: { label: 'EN DIRECT', color: 'bg-red-100 text-red-700 animate-pulse', icon: RadioIcon },
      ended: { label: 'Terminé', color: 'bg-gray-100 text-gray-700', icon: Clock }
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
              onClick={() => navigate('/dashboard/student')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Video className="h-8 w-8 text-red-600" />
                Cours en Direct
              </h1>
              <p className="text-gray-600 mt-1">Rejoignez les sessions live de vos cours</p>
            </div>
          </div>
        </div>

        {/* Sessions EN DIRECT */}
        {sessions.filter(s => s.status === 'live').length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RadioIcon className="h-6 w-6 text-red-600 animate-pulse" />
              En Direct Maintenant
            </h2>
            <div className="space-y-4">
              {sessions
                .filter(s => s.status === 'live')
                .map(session => (
                  <div key={session.id} className="glass rounded-2xl p-6 border-2 border-red-500 shadow-lg hover:shadow-xl transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{session.sessionName}</h3>
                          {getStatusBadge(session.status)}
                        </div>
                        <p className="text-gray-600 mb-3">{session.courseName}</p>
                        <p className="text-sm text-gray-500 mb-3">Par {session.teacherName}</p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4 text-purple-500" />
                            Démarré à {new Date(session.actualStartTime || session.scheduledStartTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Users className="h-4 w-4 text-green-500" />
                            {Object.keys(session.participants || {}).length} participant(s)
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinSession(session)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition font-semibold animate-pulse"
                      >
                        <Play className="h-5 w-5" />
                        Rejoindre
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Sessions planifiées */}
        {sessions.filter(s => s.status === 'scheduled').length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Sessions Planifiées
            </h2>
            <div className="space-y-4">
              {sessions
                .filter(s => s.status === 'scheduled')
                .map(session => (
                  <div key={session.id} className="glass rounded-2xl p-6 hover:shadow-lg transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{session.sessionName}</h3>
                          {getStatusBadge(session.status)}
                        </div>
                        <p className="text-gray-600 mb-3">{session.courseName}</p>
                        <p className="text-sm text-gray-500 mb-3">Par {session.teacherName}</p>

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
                        </div>
                      </div>

                      <div className="text-sm text-gray-500">
                        Commence dans{' '}
                        {Math.round((session.scheduledStartTime - Date.now()) / (1000 * 60))} min
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* État vide */}
        {sessions.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-700 mb-2">Aucune session disponible</p>
            <p className="text-gray-500">
              Aucun cours en direct pour le moment. Revenez plus tard !
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
