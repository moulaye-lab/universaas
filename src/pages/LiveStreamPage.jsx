/**
 * LiveStreamPage.jsx - Interface de streaming vidéo avec Jitsi Meet
 *
 * Fonctionnalités:
 * - Vidéo bidirectionnelle via Jitsi Meet (gratuit, open source)
 * - Audio, chat, partage d'écran intégré
 * - Pas de backend requis
 * - Liste participants temps réel via Firebase
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { addParticipant, removeParticipant } from '../services/liveSessionService';
import { ArrowLeft, Users } from 'lucide-react';

export default function LiveStreamPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    loadSession();

    return () => {
      // Cleanup lors du démontage
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
      if (session && currentUser) {
        removeParticipant(userProfile.universityId, sessionId, currentUser.uid);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (session && userProfile && currentUser) {
      initializeJitsi();
      listenToParticipants();
    }
  }, [session, userProfile, currentUser]);

  const loadSession = async () => {
    if (!userProfile?.universityId || !sessionId) {
      alert('Données manquantes');
      navigate(-1);
      return;
    }

    try {
      const sessionRef = ref(database, `universities/${userProfile.universityId}/liveSessions/${sessionId}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        alert('Session introuvable');
        navigate(-1);
        return;
      }

      const sessionData = snapshot.val();
      setSession(sessionData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading session:', error);
      alert('Erreur de chargement: ' + error.message);
      setLoading(false);
    }
  };

  const initializeJitsi = async () => {
    // Charger l'API Jitsi Meet
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => createJitsiMeeting();
      document.body.appendChild(script);
    } else {
      createJitsiMeeting();
    }
  };

  const createJitsiMeeting = () => {
    if (!jitsiContainerRef.current || jitsiApiRef.current) return;

    const domain = 'meet.jit.si';
    const options = {
      roomName: session.roomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`,
        email: currentUser.email
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: '#1a1a1a',
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
      }
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    jitsiApiRef.current = api;

    // Ajouter le participant dans Firebase
    addParticipant(
      userProfile.universityId,
      sessionId,
      currentUser.uid,
      userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`
    );

    // Événements Jitsi
    api.addEventListener('videoConferenceLeft', () => {
      handleLeave();
    });
  };

  const listenToParticipants = () => {
    const participantsRef = ref(
      database,
      `universities/${userProfile.universityId}/liveSessions/${sessionId}/participants`
    );

    const unsubscribe = onValue(participantsRef, (snapshot) => {
      const parts = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          parts.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
      }
      setParticipants(parts);
    });

    return unsubscribe;
  };

  const handleLeave = async () => {
    try {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      await removeParticipant(userProfile.universityId, sessionId, currentUser.uid);
      navigate(-1);
    } catch (error) {
      console.error('Error leaving:', error);
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Chargement de la session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLeave}
              className="p-2 hover:bg-gray-700 rounded-lg transition"
              title="Quitter"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">{session?.sessionName}</h1>
              <p className="text-sm text-gray-400">{session?.courseName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users className="h-4 w-4" />
            {participants.length} participant(s)
          </div>
        </div>
      </div>

      {/* Jitsi Meet Container */}
      <div className="flex-1 relative">
        <div
          ref={jitsiContainerRef}
          className="absolute inset-0"
        ></div>
      </div>
    </div>
  );
}
