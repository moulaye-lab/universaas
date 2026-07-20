/**
 * StudentLiveSessionsPage.jsx - Vue étudiant des sessions live
 *
 * Fonctionnalités:
 * - Voir les sessions live de ses cours
 * - Rejoindre les sessions actives
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getAllLiveSessions } from '../../services/liveSessionService';
import {
  Video,
  Calendar,
  Clock,
  Users,
  ArrowLeft,
  LogIn
} from 'lucide-react';

export default function StudentLiveSessionsPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!userProfile?.universityId || !userProfile?.profileId) return;

    setLoading(true);
    try {
      // Charger les cours de l'étudiant
      const enrollmentRef = ref(
        database,
        `universities/${userProfile.universityId}/enrollments`
      );
      const enrollmentSnapshot = await get(enrollmentRef);

      const studentCourseIds = [];
      if (enrollmentSnapshot.exists()) {
        enrollmentSnapshot.forEach((childSnapshot) => {
          const enrollment = childSnapshot.val();
          if (enrollment.studentId === userProfile.profileId) {
            studentCourseIds.push(enrollment.courseId);
          }
        });
      }

      setEnrolledCourses(studentCourseIds);

      console.log('🎓 Student course IDs:', studentCourseIds);

      // Charger toutes les sessions
      const result = await getAllLiveSessions(userProfile.universityId);
      if (result.success) {
        console.log('📹 All sessions:', result.sessions);

        // Filtrer seulement les sessions des cours de l'étudiant
        const relevantSessions = result.sessions.filter(
          s => studentCourseIds.includes(s.courseId) && s.status !== 'ended'
        );

        console.log('✅ Filtered sessions for student:', relevantSessions);
        setSessions(relevantSessions);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = (sessionId) => {
    navigate(`/live-stream/${sessionId}`);
  };

  const getStatusBadge = (status) => {
    if (status === 'live') {
      return (
        <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1 animate-pulse">
          <span className="w-2 h-2 bg-white rounded-full"></span>
          EN DIRECT
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
        PROGRAMMÉE
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-8">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="p-2 hover:bg-white/50 rounded-lg transition"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Video className="h-8 w-8 text-red-600" />
              Cours en Direct
            </h1>
            <p className="text-gray-600 mt-1">Rejoignez vos cours en temps réel</p>
          </div>
        </div>

        {/* Sessions Grid */}
        <div className="grid gap-6">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
              <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Aucun cours en direct disponible</p>
              <p className="text-gray-500 text-sm mt-2">
                Les sessions live apparaîtront ici quand vos enseignants les créeront
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

                    <p className="text-gray-600 mb-2">{session.courseName}</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Par {session.teacherName}
                    </p>

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

                  <div>
                    {session.status === 'live' ? (
                      <button
                        onClick={() => handleJoinSession(session.id)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition animate-pulse"
                      >
                        <LogIn className="h-5 w-5" />
                        Rejoindre
                      </button>
                    ) : (
                      <div className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium">
                        Pas encore démarrée
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
