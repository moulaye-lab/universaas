# 📝 JOURNAL DES DÉCISIONS ARCHITECTURE

Ce fichier documente toutes les décisions d'architecture importantes prises pendant le développement.

---

## 2026-07-05 : Système Parents Multi-Enfants / Multi-Universités

### Contexte
Un parent peut avoir plusieurs enfants dans plusieurs universités différentes (exemple : 6 enfants dans 4 universités).

### Décision 1 : Parents sans `universityId`
**Choix** : Les parents n'ont PAS de `universityId` fixe (contrairement aux autres rôles)

**Raison** :
- Un parent peut avoir des enfants dans plusieurs universités
- Il doit pouvoir accéder aux données de toutes ces universités
- `universityId: null` pour les parents

**Alternatives rejetées** :
- ❌ `universityId` = première université de l'enfant → Bloque l'accès aux autres universités
- ❌ Array `universityIds: []` → Redondant avec `children[].universityId`

---

### Décision 2 : Structure `children: []` avec détails complets
**Choix** : Stocker `childId` + `universityId` + `childName` + `relationship` dans chaque enfant

**Raison** :
- Permet d'afficher un dropdown clair : "Sophie Leroux - Sorbonne"
- Évite des requêtes Firebase multiples juste pour afficher les noms
- La relation (père/mère/tuteur) est importante pour le contexte

**Structure finale** :
```javascript
children: [
  {
    childId: 'student-abc123',
    universityId: 'univ-sorbonne-2026',
    childName: 'Sophie Leroux',
    relationship: 'père',
    addedBy: 'admin-uid',
    addedAt: timestamp
  }
]
```

---

### Décision 3 : Email Virtuel pour parents sans email
**Choix** : `+33612345678@noemail.university-saas.com`

**Raison** :
- Firebase Auth nécessite un email unique
- Permet d'utiliser le téléphone comme identifiant
- Pas besoin d'intégration SMS complexe pour le MVP
- Le parent peut se connecter avec son téléphone (détection auto côté UI)

**Alternatives rejetées** :
- ❌ Firebase Phone Authentication + SMS OTP → Trop long à implémenter (4h) pour MVP 1 semaine
- ❌ Laisser le champ email obligatoire → Bloque les parents sans email (cas réel en Afrique, zones rurales)

---

### Décision 4 : Admin crée les comptes parents (pas d'auto-inscription)
**Choix** : Seul l'admin université peut créer/lier un parent à un étudiant

**Raison** :
- Sécurité : Évite qu'un inconnu prétende être le parent d'un étudiant
- Simple pour le MVP (pas de workflow de validation)
- Réaliste : En vrai, l'université demande les infos des parents à l'inscription

**Workflow** :
1. Admin crée l'étudiant
2. Admin clique "Créer compte parent"
3. Système génère mot de passe temporaire
4. Admin donne les identifiants au parent (papier, email, SMS selon contexte)

**Évolution future (hors MVP)** :
- Codes d'invitation pour que le parent puisse ajouter lui-même d'autres enfants
- Validation par email/SMS avant activation

---

### Décision 5 : Détection automatique parent existant
**Choix** : Recherche par email ET par téléphone avant de créer un nouveau compte

**Raison** :
- Évite les doublons (2 comptes pour le même parent)
- Permet d'ajouter automatiquement un nouvel enfant au compte existant
- Email = identifiant unique (contrainte Firebase)

**Logique** :
```javascript
existingParent = searchByEmail(email) || searchByPhone(phoneNumber)

if (existingParent) {
  addChildToExistingParent()
} else {
  createNewParent()
}
```

**Sécurité** : Impossible d'avoir 2 comptes avec le même email (contrainte Firebase Auth)

---

### Décision 6 : Logs console pour MVP (pas d'envoi email/SMS réel)
**Choix** : Pour le MVP, afficher les identifiants dans la console au lieu d'envoyer de vrais emails/SMS

**Raison** :
- Gain de temps : Pas besoin d'intégrer SendGrid/Twilio maintenant
- Démo : On peut copier-coller les identifiants depuis la console
- Évolution Jour 6 (polissage) : Intégrer un vrai service email si on a le temps

**Exemple de log** :
```
📧 EMAIL À ENVOYER AU PARENT (parent@gmail.com) :

Bonjour Pierre Leroux,

Un compte parent a été créé pour suivre la scolarité de :
- Sophie Leroux (Université Sorbonne)

Identifiant : parent@gmail.com
Mot de passe temporaire : TempPass2026!

Connectez-vous sur https://university-saas.com/login
```

---

## 2026-07-04 : Système d'Authentification Production

### Décision : AuthContext centralisé
**Choix** : Utiliser React Context API pour gérer l'état auth globalement

**Raison** :
- Évite de répéter la logique auth dans chaque dashboard
- Permet de gérer les redirections automatiquement
- Facilite la gestion de `loading` et `user` states

---

## 2026-07-03 : Multi-Tenancy strict

### Décision : Isolation par `universityId`
**Choix** : Chaque utilisateur (sauf super_admin et parents) a un `universityId` fixe

**Raison** :
- Sécurité : Un admin Sorbonne ne peut PAS voir les données de Paris Dauphine
- Règles Firebase simples à écrire
- Conforme aux bonnes pratiques SaaS multi-tenant

**Exception** : Parents (voir décision 2026-07-05)

---

## 2026-07-05 : Fix Race Condition SuperAdmin Dashboard

### Contexte
Bug rapporté : À la première connexion en tant que super_admin, message "Access Denied" apparaît. Après 2 clics sur OK, le dashboard se charge correctement.

### Problème
Le `useEffect` du SuperAdminDashboard appelait `loadDashboardData()` **immédiatement**, avant que AuthContext ait fini de charger `userProfile` depuis Firebase.

**Séquence problématique** :
1. Utilisateur se connecte → Redirection vers `/dashboard/super-admin`
2. SuperAdminDashboard monte → `useEffect(() => { loadDashboardData() }, [])`
3. `loadDashboardData()` essaie de lire `platform/analytics` alors que l'utilisateur n'est pas encore authentifié
4. Firebase retourne `PERMISSION_DENIED`
5. 500ms plus tard, AuthContext termine le chargement → `userProfile` disponible
6. Refresh manuel → Maintenant ça marche

### Solution
Ajouter une dépendance à `userProfile` dans le `useEffect` et vérifier le rôle avant de charger :

```javascript
// AVANT (BUGUÉ)
useEffect(() => {
  loadDashboardData();
}, []);

// APRÈS (CORRIGÉ)
useEffect(() => {
  if (userProfile) {
    loadDashboardData();
  }
}, [userProfile]);

const loadDashboardData = async () => {
  // Vérifier le rôle
  if (userProfile?.role !== 'super_admin_plateforme') {
    console.error('Accès refusé : rôle incorrect');
    setLoading(false);
    return;
  }
  // ... reste du code
}
```

**Raison** :
- `userProfile` est chargé de manière asynchrone par AuthContext
- Il faut attendre qu'il soit disponible avant d'accéder à Firebase
- Les autres dashboards faisaient déjà cette vérification (`if (!userProfile?.universityId) return`)

**Impact** :
- Fix appliqué uniquement à SuperAdminDashboard
- Les autres dashboards étaient déjà corrects

---

**Note** : Ce fichier est vivant. Ajouter chaque décision importante avec :
- Date
- Contexte
- Décision prise
- Raison
- Alternatives rejetées (si pertinent)
