# 🤖 Guide d'intégration de l'IA

## Vue d'ensemble

Le chatbot IA est maintenant accessible à tous les utilisateurs via un bouton flottant en bas à droite de toutes les pages. Cette interface est prête à être connectée à une vraie API IA.

## Architecture actuelle

### Composants
- **AIChatBot.jsx** - Interface de chat complète
- **useAISettings.js** - Hook pour les paramètres IA
- **Layout.jsx** - Intègre le chatbot partout

### Fonctionnalités implémentées
✅ Bouton flottant accessible partout  
✅ Interface de chat moderne (agrandir/réduire/fermer)  
✅ Adaptation au rôle utilisateur (étudiant, enseignant, admin, parent, comptable)  
✅ Historique des conversations sauvegardé dans Firebase  
✅ Messages de bienvenue personnalisés par rôle  
✅ Réponses simulées contextuelles  
✅ Indicateur de chargement (3 points animés)  
✅ Effacer la conversation  
✅ Timestamp sur chaque message  
✅ Responsive et animations fluides  

## Intégration avec une API IA réelle

### Option 1: Claude (Anthropic)

```javascript
// src/services/aiService.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY
});

export async function generateAIResponse(userMessage, systemPrompt, conversationHistory) {
  try {
    const messages = conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    messages.push({
      role: 'user',
      content: userMessage
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Claude API Error:', error);
    throw error;
  }
}
```

### Option 2: OpenAI (GPT)

```javascript
// src/services/aiService.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Pour usage côté client
});

export async function generateAIResponse(userMessage, systemPrompt, conversationHistory) {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      max_tokens: 1024,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}
```

### Option 3: Backend personnalisé (Recommandé pour production)

```javascript
// src/services/aiService.js
export async function generateAIResponse(userMessage, systemPrompt, conversationHistory, userContext) {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        message: userMessage,
        systemPrompt: systemPrompt,
        history: conversationHistory,
        context: userContext // Rôle, université, données accessibles
      })
    });

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
}
```

## Modifier le chatbot pour utiliser l'API réelle

Dans `src/components/AIChatBot.jsx`, remplacer la fonction `generateAIResponse`:

```javascript
import { generateAIResponse as callAIAPI } from '../services/aiService';

const generateAIResponse = async (userMessage) => {
  const systemPrompt = getSystemPrompt(userProfile?.role);
  
  // Préparer le contexte utilisateur
  const userContext = {
    role: userProfile?.role,
    universityId: userProfile?.universityId,
    userId: userProfile?.uid,
    // Ajouter d'autres données contextuelles selon le niveau de conscience
    ...(contextAwareness === 'full' && {
      // Accès complet aux données
    })
  };

  // Appeler l'API IA
  const response = await callAIAPI(
    userMessage,
    systemPrompt,
    messages.slice(-10), // Historique des 10 derniers messages
    userContext
  );

  return response;
};
```

## Enrichissement du contexte selon le rôle

### Pour les étudiants
```javascript
if (userProfile.role === 'student' && contextAwareness === 'full') {
  // Charger les données de l'étudiant
  const studentData = await getStudentData(userProfile.uid);
  
  systemPrompt += `
Données de l'étudiant:
- Nom: ${studentData.firstName} ${studentData.lastName}
- Niveau: ${studentData.level}
- Classe: ${studentData.class}
- Moyenne générale: ${studentData.averageGrade}
- Prochaine échéance: ${studentData.nextPayment}
- Cours aujourd'hui: ${studentData.todaysCourses}
`;
}
```

### Pour les enseignants
```javascript
if (userProfile.role === 'teacher' && contextAwareness === 'full') {
  const teacherData = await getTeacherData(userProfile.uid);
  
  systemPrompt += `
Données de l'enseignant:
- Cours enseignés: ${teacherData.courses.join(', ')}
- Nombre d'étudiants: ${teacherData.totalStudents}
- Prochain cours: ${teacherData.nextClass}
`;
}
```

## Structure Firebase des conversations

```
universities/
  {universityId}/
    aiConversations/
      {userId}/
        {messageId}: {
          role: 'user' | 'assistant',
          content: 'Message text',
          timestamp: 1720627200000,
          userId: 'user-xxx',
          userRole: 'student'
        }
```

## Fonctionnalités avancées à implémenter

### 1. Suggestions rapides

Ajouter des boutons de suggestion sous l'input:

```javascript
const suggestions = {
  student: [
    '📊 Voir mes notes',
    '💰 Prochaine échéance',
    '📅 Emploi du temps',
    '📚 Mes cours'
  ],
  teacher: [
    '✏️ Saisir des notes',
    '📋 Mes classes',
    '📊 Statistiques',
    '📅 Mon emploi du temps'
  ]
};
```

### 2. Commandes slash

```javascript
if (userMessage.startsWith('/')) {
  const command = userMessage.slice(1).toLowerCase();
  
  switch(command) {
    case 'notes':
      // Rediriger vers la page des notes
      navigate('/student/grades');
      break;
    case 'paiements':
      navigate('/student/payments');
      break;
    // etc.
  }
}
```

### 3. Pièces jointes

```javascript
const [attachments, setAttachments] = useState([]);

const handleFileUpload = async (file) => {
  // Upload vers Firebase Storage
  const fileUrl = await uploadFile(file);
  setAttachments(prev => [...prev, { name: file.name, url: fileUrl }]);
};
```

### 4. Notifications IA

```javascript
// Envoyer des notifications proactives
const sendProactiveNotification = async (userId, message) => {
  const notificationRef = ref(
    database,
    `universities/${universityId}/aiConversations/${userId}`
  );
  
  await push(notificationRef, {
    role: 'assistant',
    content: message,
    timestamp: Date.now(),
    type: 'notification',
    read: false
  });
};

// Exemple: Rappel de paiement
if (isFeatureEnabled('paymentReminders')) {
  sendProactiveNotification(
    studentId,
    '💰 Rappel: Votre échéance de paiement arrive dans 3 jours (500€ le 15 juillet)'
  );
}
```

### 5. Analytics IA

Tracker les questions fréquentes pour améliorer l'IA:

```javascript
const trackQuestion = async (question, category) => {
  await set(ref(database, `universities/${universityId}/aiAnalytics/${Date.now()}`), {
    question,
    category,
    timestamp: Date.now(),
    userId: userProfile.uid,
    userRole: userProfile.role
  });
};
```

## Variables d'environnement

Créer un fichier `.env` à la racine:

```env
# Claude (Anthropic)
VITE_ANTHROPIC_API_KEY=sk-ant-xxx

# OpenAI
VITE_OPENAI_API_KEY=sk-xxx

# Backend personnalisé
VITE_AI_API_URL=https://api.votredomaine.com
VITE_AI_API_KEY=xxx
```

## Sécurité

### ⚠️ Important pour la production

1. **Ne JAMAIS exposer les clés API côté client**
   - Utiliser un backend intermédiaire
   - Les clés doivent rester sur le serveur

2. **Limiter les appels API**
   - Implémenter un rate limiting
   - Maximum 10 messages par minute par utilisateur

3. **Filtrer les données sensibles**
   - Ne pas envoyer de mots de passe
   - Masquer les données personnelles selon `contextAwareness`

4. **Valider les entrées utilisateur**
   - Limiter la longueur des messages (ex: 500 caractères)
   - Bloquer le spam et les injections

## Tests

```javascript
// Test basique
describe('AIChatBot', () => {
  it('should show chat button when AI is enabled', () => {
    // Test
  });

  it('should send message on Enter key', () => {
    // Test
  });

  it('should save conversation to Firebase', () => {
    // Test
  });
});
```

## Coûts estimés

| Service | Modèle | Prix (approximatif) |
|---------|--------|---------------------|
| Claude | Sonnet 3.5 | $3 / 1M tokens input, $15 / 1M tokens output |
| OpenAI | GPT-4 Turbo | $10 / 1M tokens input, $30 / 1M tokens output |
| OpenAI | GPT-3.5 Turbo | $0.50 / 1M tokens input, $1.50 / 1M tokens output |

**Estimation mensuelle pour 1000 utilisateurs actifs:**
- 10 messages/jour/utilisateur = 300k messages/mois
- ~150M tokens/mois
- Coût: $450-$4,500/mois selon le modèle

## Prochaines étapes

1. ✅ Choisir votre fournisseur IA (Claude recommandé pour la qualité)
2. ✅ Créer un backend API sécurisé
3. ✅ Implémenter `src/services/aiService.js`
4. ✅ Tester avec quelques utilisateurs
5. ✅ Monitorer les coûts et performances
6. ✅ Enrichir les prompts avec plus de contexte
7. ✅ Ajouter des fonctionnalités avancées (suggestions, commandes, etc.)

## Support

Pour toute question sur l'intégration, consultez:
- [Documentation Claude](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Documentation OpenAI](https://platform.openai.com/docs/introduction)
