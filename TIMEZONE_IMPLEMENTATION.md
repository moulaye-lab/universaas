# 🌍 Gestion du Fuseau Horaire Multi-Tenant

## Vue d'ensemble

Le système gère maintenant les fuseaux horaires de manière native pour supporter des universités dans différents pays/régions.

## Configuration

### Paramètres Université
Accessible via `/admin/settings`:
- **Fuseau horaire**: Sélection parmi 23 fuseaux horaires couvrant l'Afrique, l'Amérique, l'Asie, l'Europe et le Pacifique
- **Offset UTC**: Stocké automatiquement (ex: GMT+0, GMT+1, GMT-5)
- **Aperçu en temps réel**: L'heure actuelle dans le fuseau sélectionné s'affiche

### Fuseaux horaires disponibles

**Afrique:**
- Abidjan (GMT+0) - Côte d'Ivoire
- Accra (GMT+0) - Ghana
- Alger (GMT+1) - Algérie
- Le Caire (GMT+2) - Égypte
- Casablanca (GMT+1) - Maroc
- Dakar (GMT+0) - Sénégal
- Johannesburg (GMT+2) - Afrique du Sud
- Lagos (GMT+1) - Nigeria
- Nairobi (GMT+3) - Kenya
- Tunis (GMT+1) - Tunisie

**Amériques:**
- New York (GMT-5) - USA Est
- Chicago (GMT-6) - USA Centre
- Los Angeles (GMT-8) - USA Ouest
- Montréal (GMT-5) - Canada
- São Paulo (GMT-3) - Brésil

**Asie:**
- Dubaï (GMT+4) - Émirats arabes unis
- Tokyo (GMT+9) - Japon
- Shanghai (GMT+8) - Chine

**Europe:**
- Paris (GMT+1) - France
- Londres (GMT+0) - Royaume-Uni
- Bruxelles (GMT+1) - Belgique
- Zurich (GMT+1) - Suisse

**Pacifique:**
- Auckland (GMT+12) - Nouvelle-Zélande

## Utilisation dans le Code

### Hook `useTimezone()`

```javascript
import { useTimezone } from '../hooks/useTimezone';

function MyComponent() {
  const { timezone, formatDate, getCurrentTime } = useTimezone();

  // Afficher une date dans le fuseau de l'université
  const displayDate = formatDate(timestamp);
  // => "10 juillet 2026 à 15:30"

  // Obtenir l'heure actuelle dans le fuseau de l'université
  const now = getCurrentTime();

  // Vérifier si une date est aujourd'hui
  const todayCheck = isToday(someTimestamp);

  return <div>Fuseau: {timezone}</div>;
}
```

### Fonctions disponibles

#### `formatDate(dateInput, options)`
Formate une date/timestamp dans le fuseau de l'université
```javascript
formatDate(1720627200000)
// => "10 juillet 2026 à 15:30"

formatDate(timestamp, { dateStyle: 'full', timeStyle: 'long' })
// => "jeudi 10 juillet 2026 à 15:30:00 UTC+1"
```

#### `getCurrentTime()`
Retourne l'heure actuelle dans le fuseau de l'université
```javascript
const now = getCurrentTime();
// => Date object in university timezone
```

#### `utcToLocal(timestamp)`
Convertit un timestamp UTC en heure locale
```javascript
const localTime = utcToLocal(1720627200000);
```

#### `isToday(dateInput)`
Vérifie si une date est aujourd'hui
```javascript
const today = isToday(someTimestamp);
// => true/false
```

#### `getStartOfDay(date)` / `getEndOfDay(date)`
Début/fin de journée dans le fuseau local
```javascript
const dayStart = getStartOfDay();
// => 2026-07-10 00:00:00 in university timezone

const dayEnd = getEndOfDay();
// => 2026-07-10 23:59:59 in university timezone
```

## Cas d'usage

### 1. Horaires de cours
```javascript
const { formatDate } = useTimezone();

// Afficher l'heure d'un cours
<p>Cours: {formatDate(courseTimestamp, { timeStyle: 'short' })}</p>
// => "Cours: 09:00"
```

### 2. Dates limites de paiement
```javascript
const { getCurrentTime, formatDate } = useTimezone();

const deadline = payment.dueDate;
const now = getCurrentTime().getTime();

if (now > deadline) {
  return <span className="text-red-600">En retard depuis {formatDate(deadline)}</span>;
}
```

### 3. Notifications
```javascript
const { timezone, formatDate } = useTimezone();

// Planifier une notification à une heure précise
const notificationTime = new Date().toLocaleString('en-US', {
  timeZone: timezone,
  hour: '09',
  minute: '00'
});
```

### 4. Emplois du temps
```javascript
const { getStartOfDay, getEndOfDay, formatDate } = useTimezone();

// Filtrer les événements d'aujourd'hui
const todayStart = getStartOfDay().getTime();
const todayEnd = getEndOfDay().getTime();

const todayEvents = events.filter(e => 
  e.timestamp >= todayStart && e.timestamp <= todayEnd
);
```

## Bonnes pratiques

### ✅ À FAIRE
- **Toujours utiliser `useTimezone()`** pour afficher des dates/heures à l'utilisateur
- **Stocker les timestamps en UTC** dans Firebase (Date.now(), timestamp)
- **Convertir à l'affichage** avec `formatDate()`
- **Utiliser `getCurrentTime()`** pour obtenir "maintenant" dans le fuseau correct

### ❌ À ÉVITER
- ❌ `new Date().toLocaleString()` sans timeZone
- ❌ Stocker des dates formatées dans Firebase
- ❌ Faire des comparaisons de dates sans tenir compte du fuseau
- ❌ Utiliser les heures du serveur directement

## Exemples Concrets

### Planning de cours
```javascript
function CourseSchedule() {
  const { formatDate, getCurrentTime, isToday } = useTimezone();
  
  return courses.map(course => (
    <div key={course.id} className={isToday(course.startTime) ? 'bg-blue-50' : ''}>
      <h3>{course.name}</h3>
      <p>{formatDate(course.startTime, { timeStyle: 'short' })}</p>
      {getCurrentTime().getTime() > course.endTime && (
        <span className="text-gray-500">Terminé</span>
      )}
    </div>
  ));
}
```

### Système de paiement
```javascript
function PaymentDeadline({ payment }) {
  const { formatDate, getCurrentTime } = useTimezone();
  
  const now = getCurrentTime().getTime();
  const deadline = payment.dueDate;
  const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 jours
  
  const isOverdue = now > (deadline + gracePeriod);
  
  return (
    <div>
      <p>Échéance: {formatDate(deadline)}</p>
      {isOverdue && <span className="text-red-600">⚠️ En retard</span>}
    </div>
  );
}
```

## Stockage Firebase

### Structure
```json
{
  "universities": {
    "univ-xxx": {
      "timezone": "Africa/Abidjan",
      "timezoneOffset": "+0",
      "currency": "XOF",
      "currentAcademicYear": "2026-2027"
    }
  }
}
```

### Événements/Cours
```json
{
  "courses": {
    "course-xxx": {
      "startTime": 1720627200000,  // UTC timestamp
      "endTime": 1720630800000,    // UTC timestamp
      "timezone": "Africa/Abidjan" // Référence (optionnel)
    }
  }
}
```

## Migration des données existantes

Si vous avez des données existantes sans fuseau horaire:

1. Toutes les universités auront par défaut `Europe/Paris (GMT+1)`
2. L'admin peut modifier via `/admin/settings`
3. Les timestamps existants resteront en UTC (pas de conversion nécessaire)
4. L'affichage s'adaptera automatiquement au nouveau fuseau

## Performance

- ✅ Le fuseau horaire est chargé **une seule fois** au démarrage
- ✅ Écoute en temps réel des modifications (onValue)
- ✅ Mise en cache automatique par le hook
- ✅ Pas de requête supplémentaire à chaque affichage

## Support Multi-Tenant

Chaque université a son propre fuseau horaire:
- **Université A** (Côte d'Ivoire): GMT+0
- **Université B** (France): GMT+1
- **Université C** (USA Est): GMT-5

Les utilisateurs voient toujours les dates/heures dans le fuseau de **leur université**, pas de leur appareil local.
