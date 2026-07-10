/**
 * AIChatBot.jsx - Interface de chat avec l'assistant IA
 *
 * Fonctionnalités:
 * - Bouton flottant accessible depuis toutes les pages
 * - Interface de chat moderne
 * - Adaptation au rôle de l'utilisateur
 * - Historique des conversations
 * - Support multilingue
 */

import { useState, useEffect, useRef } from 'react';
import { ref, push, set, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAISettings } from '../hooks/useAISettings';
import { generateAIResponse as callAIAPI } from '../services/aiService';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Trash2,
  Minimize2,
  Maximize2,
  Sparkles
} from 'lucide-react';

export default function AIChatBot() {
  const { userProfile } = useAuth();
  const {
    enabled,
    assistantName,
    isEnabledForRole,
    getSystemPrompt,
    personality
  } = useAISettings();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Vérifier si l'IA est activée pour le rôle de l'utilisateur
  const canUseAI = enabled && isEnabledForRole(userProfile?.role);

  useEffect(() => {
    if (isOpen && canUseAI) {
      loadConversationHistory();
    }
  }, [isOpen, canUseAI, userProfile?.uid]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationHistory = async () => {
    if (!userProfile?.uid || !userProfile?.universityId) return;

    try {
      const conversationRef = ref(
        database,
        `universities/${userProfile.universityId}/aiConversations/${userProfile.uid}`
      );
      const conversationQuery = query(conversationRef, orderByChild('timestamp'), limitToLast(50));

      onValue(conversationQuery, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const conversationMessages = Object.entries(data).map(([id, msg]) => ({
            id,
            ...msg
          })).sort((a, b) => a.timestamp - b.timestamp);

          setMessages(conversationMessages);
        } else {
          // Message de bienvenue
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: getWelcomeMessage(),
            timestamp: Date.now()
          }]);
        }
      });
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const getWelcomeMessage = () => {
    const roleMessages = {
      student: `Bonjour! Je suis ${assistantName}, votre assistant virtuel. Je peux vous aider avec vos cours, notes, emploi du temps, paiements et bien plus encore. Comment puis-je vous aider aujourd'hui?`,
      teacher: `Bonjour! Je suis ${assistantName}, votre assistant pédagogique. Je peux vous aider à gérer vos cours, saisir des notes, consulter l'emploi du temps et suivre vos étudiants. Que puis-je faire pour vous?`,
      admin_universite: `Bonjour! Je suis ${assistantName}, votre assistant administratif. Je peux vous aider avec la gestion de l'université, les statistiques, les rapports et les analyses. Comment puis-je vous assister?`,
      parent: `Bonjour! Je suis ${assistantName}, votre assistant familial. Je peux vous aider à suivre la scolarité de votre enfant, consulter ses notes, ses absences et ses paiements. Comment puis-je vous aider?`,
      comptable: `Bonjour! Je suis ${assistantName}, votre assistant comptable. Je peux vous aider avec la comptabilité, les paiements, les revenus et les dépenses. Que puis-je faire pour vous?`
    };

    return roleMessages[userProfile?.role] || `Bonjour! Je suis ${assistantName}. Comment puis-je vous aider?`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now()
    };

    // Ajouter le message utilisateur immédiatement
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Sauvegarder le message utilisateur dans Firebase
      await saveMessage(userMessage);

      // Simuler une réponse de l'IA (à remplacer par une vraie API)
      const aiResponse = await generateAIResponse(inputMessage.trim());

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      };

      // Ajouter la réponse de l'IA
      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(assistantMessage);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMessage = async (message) => {
    if (!userProfile?.uid || !userProfile?.universityId) return;

    const conversationRef = ref(
      database,
      `universities/${userProfile.universityId}/aiConversations/${userProfile.uid}`
    );
    const newMessageRef = push(conversationRef);

    await set(newMessageRef, {
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      userId: userProfile.uid,
      userRole: userProfile.role
    });
  };

  const generateAIResponse = async (userMessage) => {
    try {
      // Appeler l'API IA via le backend sécurisé
      const response = await callAIAPI(userMessage, messages);
      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);

      // Fallback: Réponses prédéfinies si l'API échoue
      const lowerMessage = userMessage.toLowerCase();

      if (lowerMessage.includes('notes') || lowerMessage.includes('résultats')) {
        return `Je peux vous aider à consulter vos notes. Rendez-vous dans la section "Mes Notes" depuis votre tableau de bord. Vous y trouverez toutes vos notes classées par matière et par semestre. Souhaitez-vous que je vous guide?`;
      }

      if (lowerMessage.includes('paiement') || lowerMessage.includes('frais')) {
        return `Pour consulter vos paiements ou échéances, allez dans la section "Mes Paiements" de votre tableau de bord. Vous y verrez l'état de vos paiements et les prochaines échéances. Besoin de plus d'informations?`;
      }

      if (lowerMessage.includes('emploi du temps') || lowerMessage.includes('cours') || lowerMessage.includes('horaire')) {
        return `Votre emploi du temps est accessible depuis votre tableau de bord. Vous y trouverez tous vos cours avec les horaires, les salles et les enseignants. Puis-je vous aider avec autre chose?`;
      }

      if (lowerMessage.includes('absence') || lowerMessage.includes('absent')) {
        return `Vous pouvez consulter vos absences dans la section "Mes Absences" de votre tableau de bord. Si vous avez besoin de justifier une absence, contactez votre enseignant ou l'administration. Comment puis-je vous aider davantage?`;
      }

      // Message d'erreur si le backend n'est pas disponible
      if (error.message.includes('contacter le serveur')) {
        return `⚠️ Le service IA n'est pas disponible actuellement. Voici comment je peux vous aider:

• 📚 Cours et emploi du temps: Section "Emploi du Temps"
• 📊 Notes et résultats: Section "Mes Notes"
• 💰 Paiements: Section "Mes Paiements"
• 📅 Absences: Section "Mes Absences"

Le service sera bientôt rétabli!`;
      }

      // Réponse générique
      return `Je suis ${assistantName}, votre assistant virtuel. Je peux vous aider avec:

• 📚 Vos cours et emploi du temps
• 📊 Vos notes et résultats
• 💰 Vos paiements et frais
• 📅 Vos absences
• ℹ️ Informations générales sur l'université

Que souhaitez-vous savoir exactement?`;
    }
  };

  const clearConversation = async () => {
    if (!confirm('Êtes-vous sûr de vouloir effacer toute la conversation?')) return;

    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: getWelcomeMessage(),
      timestamp: Date.now()
    }]);

    // TODO: Supprimer de Firebase si nécessaire
  };

  // Ne pas afficher si l'IA n'est pas activée pour ce rôle
  if (!canUseAI) return null;

  return (
    <>
      {/* Bouton flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-110 flex items-center justify-center group"
          title={`Ouvrir ${assistantName}`}
        >
          <MessageCircle className="h-8 w-8 text-white" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Interface de chat */}
      {isOpen && (
        <div className={`fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300 ${
          isMinimized
            ? 'bottom-6 right-6 w-80 h-16'
            : 'bottom-6 right-6 w-96 h-[600px]'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  {assistantName}
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                </h3>
                <p className="text-xs text-purple-100">En ligne • Basé sur l'IA</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-white/20 rounded-lg transition"
                title={isMinimized ? 'Agrandir' : 'Réduire'}
              >
                {isMinimized ? (
                  <Maximize2 className="h-5 w-5 text-white" />
                ) : (
                  <Minimize2 className="h-5 w-5 text-white" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition"
                title="Fermer"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="h-[440px] overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-blue-600'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="h-5 w-5 text-white" />
                      ) : (
                        <Bot className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className={`flex-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block max-w-[80%] p-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-gray-900 rounded-bl-none shadow-sm border border-gray-200'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 px-2">
                        {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-200">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                <div className="flex gap-2 items-end">
                  <button
                    onClick={clearConversation}
                    className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500 hover:text-red-600"
                    title="Effacer la conversation"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <div className="flex-1">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Posez votre question..."
                      rows={1}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Envoyer"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Appuyez sur Entrée pour envoyer • Shift+Entrée pour nouvelle ligne
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
