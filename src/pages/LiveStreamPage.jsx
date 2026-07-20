/**
 * LiveStreamPage.jsx - Interface de streaming vidéo en direct
 *
 * Fonctionnalités:
 * - Vidéo bidirectionnelle (prof + étudiants)
 * - Audio avec mute/unmute
 * - Chat en direct
 * - Liste participants temps réel
 * - Contrôles host (seulement enseignant)
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  initAgoraClient,
  joinChannel,
  publishLocalTracks,
  playLocalVideo,
  playRemoteVideo,
  toggleMicrophone,
  toggleCamera,
  leaveChannel,
  addParticipant,
  removeParticipant,
  listenToParticipants,
  sendChatMessage,
  listenToChatMessages
} from '../services/agoraService';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  MessageSquare,
  Send,
  X
} from 'lucide-react';

export default function LiveStreamPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);

  // Contrôles média
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  // Participants et chat
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);

  // Refs pour les conteneurs vidéo
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});

  // Client Agora
  const agoraClientRef = useRef(null);

  useEffect(() => {
    loadSession();

    return () => {
      // Cleanup lors du démontage
      handleLeave();
    };
  }, [sessionId, userProfile]);

  useEffect(() => {
    if (session && userProfile) {
      initializeStream();
    }
  }, [session, userProfile]);

  const loadSession = async () => {
    console.log('🔍 Loading session...', {
      sessionId,
      universityId: userProfile?.universityId,
      profileId: userProfile?.profileId
    });

    if (!userProfile?.universityId || !sessionId) {
      console.error('❌ Missing data:', { userProfile, sessionId });
      alert('Données manquantes');
      navigate(-1);
      return;
    }

    try {
      const sessionRef = ref(database, `universities/${userProfile.universityId}/liveSessions/${sessionId}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        console.error('❌ Session not found');
        alert('Session introuvable');
        navigate(-1);
        return;
      }

      const sessionData = snapshot.val();
      console.log('✅ Session loaded:', sessionData);
      setSession(sessionData);
      setIsHost(sessionData.teacherId === userProfile.profileId);

      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading session:', error);
      alert('Erreur de chargement: ' + error.message);
      setLoading(false);
    }
  };

  const initializeStream = async () => {
    console.log('🎥 Initializing stream...', {
      session,
      isHost,
      currentUser: currentUser?.uid
    });

    try {
      // Initialiser le client Agora
      const client = initAgoraClient();
      agoraClientRef.current = client;
      console.log('✅ Agora client initialized');

      // Écouter les utilisateurs distants qui rejoignent
      client.on('user-published', async (user, mediaType) => {
        console.log('Remote user published:', user.uid, mediaType);

        // S'abonner au stream distant
        await client.subscribe(user, mediaType);

        if (mediaType === 'video') {
          // Créer un conteneur pour la vidéo distante
          const remoteVideoContainer = document.createElement('div');
          remoteVideoContainer.id = `remote-video-${user.uid}`;
          remoteVideoContainer.className = 'w-full h-full bg-gray-900 rounded-lg overflow-hidden';

          const remoteVideosContainer = document.getElementById('remote-videos-container');
          if (remoteVideosContainer) {
            remoteVideosContainer.appendChild(remoteVideoContainer);
          }

          // Jouer la vidéo distante
          user.videoTrack.play(`remote-video-${user.uid}`);
        }

        if (mediaType === 'audio') {
          user.audioTrack.play();
        }
      });

      // Écouter les utilisateurs qui quittent
      client.on('user-unpublished', (user) => {
        console.log('Remote user unpublished:', user.uid);
        const remoteVideo = document.getElementById(`remote-video-${user.uid}`);
        if (remoteVideo) {
          remoteVideo.remove();
        }
      });

      // Rejoindre le canal
      const role = isHost ? 'host' : 'audience';
      console.log('🔗 Joining channel:', {
        channelName: session.channelName,
        userId: currentUser.uid,
        role
      });

      const joinResult = await joinChannel({
        channelName: session.channelName,
        userId: currentUser.uid,
        userName: userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`,
        role
      });

      console.log('Join result:', joinResult);

      if (!joinResult.success) {
        console.error('❌ Failed to join:', joinResult.error);
        alert('❌ Erreur: ' + joinResult.error);
        return;
      }

      console.log('✅ Successfully joined channel');

      // Publier les tracks locaux
      const publishResult = await publishLocalTracks();

      if (publishResult.success) {
        // Afficher la vidéo locale
        publishResult.videoTrack.play('local-video-container');
        setJoined(true);

        // Ajouter aux participants
        await addParticipant(
          userProfile.universityId,
          sessionId,
          currentUser.uid,
          userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`
        );

        // Écouter les participants
        listenToParticipants(userProfile.universityId, sessionId, (parts) => {
          setParticipants(parts);
        });

        // Écouter les messages du chat
        listenToChatMessages(userProfile.universityId, sessionId, (messages) => {
          setChatMessages(messages);
        });
      }
    } catch (error) {
      console.error('Error initializing stream:', error);
      alert('Erreur d\'initialisation: ' + error.message);
    }
  };

  const handleToggleMic = async () => {
    const newMuted = !micMuted;
    await toggleMicrophone(newMuted);
    setMicMuted(newMuted);
  };

  const handleToggleCamera = async () => {
    const newOff = !cameraOff;
    await toggleCamera(!newOff);
    setCameraOff(newOff);
  };

  const handleLeave = async () => {
    try {
      if (joined) {
        await leaveChannel();
        await removeParticipant(userProfile.universityId, sessionId, currentUser.uid);
      }
      navigate(-1);
    } catch (error) {
      console.error('Error leaving:', error);
      navigate(-1);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    await sendChatMessage(
      userProfile.universityId,
      sessionId,
      currentUser.uid,
      userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`,
      chatInput
    );

    setChatInput('');
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{session?.sessionName}</h1>
            <p className="text-sm text-gray-400">{session?.courseName}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users className="h-4 w-4" />
            {participants.length} participant(s)
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Zone vidéo */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Vidéo locale */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <div id="local-video-container" className="w-full h-full"></div>
              <div className="absolute bottom-4 left-4 px-3 py-1 bg-black bg-opacity-60 rounded-lg text-sm">
                Vous {isHost && '(Hôte)'}
              </div>
              {cameraOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <VideoOff className="h-16 w-16 text-gray-600" />
                </div>
              )}
            </div>

            {/* Vidéos distantes */}
            <div id="remote-videos-container" className="grid grid-cols-2 gap-2 bg-gray-800 rounded-lg p-2">
              {/* Les vidéos distantes s'ajoutent ici dynamiquement */}
            </div>
          </div>

          {/* Contrôles */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={handleToggleMic}
              className={`p-4 rounded-full transition ${
                micMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={micMuted ? 'Activer le micro' : 'Désactiver le micro'}
            >
              {micMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>

            <button
              onClick={handleToggleCamera}
              className={`p-4 rounded-full transition ${
                cameraOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={cameraOff ? 'Activer la caméra' : 'Désactiver la caméra'}
            >
              {cameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>

            <button
              onClick={handleLeave}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition"
              title="Quitter"
            >
              <PhoneOff className="h-6 w-6" />
            </button>

            <button
              onClick={() => setShowChat(!showChat)}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition"
              title="Chat"
            >
              <MessageSquare className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Panneau latéral (Chat + Participants) */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            {/* Onglets */}
            <div className="flex border-b border-gray-700">
              <button className="flex-1 py-3 px-4 font-semibold bg-gray-900">
                Chat
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="bg-gray-700 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-400">{msg.userName}</p>
                  <p className="text-sm text-gray-300 mt-1">{msg.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>

            {/* Input chat */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Envoyer un message..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
