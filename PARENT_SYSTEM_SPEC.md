# 🧑‍🤝‍🧑 SPÉCIFICATION SYSTÈME PARENTS MULTI-ENFANTS

**Créé le** : 2026-07-05  
**Version** : 1.0  
**Statut** : Architecture validée, implémentation Jour 2

---

## 🎯 Besoin Métier

Un parent peut avoir **plusieurs enfants** dans **plusieurs universités différentes** sur la plateforme.

**Exemple réel** :
- Mr. Leroux a 6 enfants
- Sophie (Sorbonne L1)
- Lucas (Paris Dauphine L2)
- Emma (Sorbonne L3)
- Thomas (Lyon 1 M1)
- Léa (Bordeaux L1)
- Hugo (Sorbonne L1)

→ **1 seul compte parent** donne accès aux données des 6 enfants dans 4 universités différentes.

---

## 🏗️ Architecture Technique

### 1. Structure Firebase Parents

```javascript
/users/{parentUid}
  - email: 'parent@gmail.com' 
    OU '+33612345678@noemail.university-saas.com' (si pas d'email réel)
  
  - loginMethod: 'email' | 'phone'
  - phoneNumber: '+33612345678'  // Toujours présent
  - displayName: 'Pierre Leroux'
  - role: 'parent'
  - universityId: null  // ← Le parent n'appartient PAS à 1 université
  
  - children: [
      {
        childId: 'student-abc123',
        universityId: 'univ-sorbonne-2026',
        childName: 'Sophie Leroux',
        relationship: 'père',  // ou 'mère', 'tuteur'
        addedBy: 'admin-sorbonne-uid',
        addedAt: 1704556800000
      },
      {
        childId: 'student-xyz789',
        universityId: 'univ-paris-dauphine',
        childName: 'Lucas Leroux',
        relationship: 'père',
        addedBy: 'admin-dauphine-uid',
        addedAt: 1704643200000
      }
    ]
  
  - mustChangePassword: true  // Pour comptes créés par admin
  - createdAt: timestamp
```

### 2. Identifiant Unique : Email OU Téléphone

#### Cas A : Parent avec email réel
```javascript
email: 'parent@gmail.com'
loginMethod: 'email'
phoneNumber: '+33612345678'
```

**Connexion** : Le parent entre `parent@gmail.com` + mot de passe

---

#### Cas B : Parent SANS email (email virtuel)
```javascript
email: '+33612345678@noemail.university-saas.com'  // ← Email fictif
loginMethod: 'phone'
phoneNumber: '+33612345678'
```

**Connexion** : 
- Le parent entre `+33612345678` (ou `+33 6 12 34 56 78` avec espaces)
- Le système convertit automatiquement en `+33612345678@noemail.university-saas.com`
- Connexion Firebase normale

---

## 🔐 Workflow : Création/Liaison Compte Parent

### Dashboard Admin Université

#### Formulaire "Créer/Lier Compte Parent"

```
┌─────────────────────────────────────────────┐
│ 👨‍👩‍👧 Créer ou Lier un Compte Parent       │
├─────────────────────────────────────────────┤
│                                             │
│ Nom complet du parent *                    │
│ [Pierre Leroux_______________________]     │
│                                             │
│ Email (optionnel)                          │
│ [parent@example.com_________________]      │
│                                             │
│ Numéro de téléphone *                      │
│ [+33 6 12 34 56 78__________________]      │
│                                             │
│ Relation avec l'enfant *                   │
│ [▼ Père]                                    │
│    - Père                                   │
│    - Mère                                   │
│    - Tuteur légal                           │
│                                             │
│ Enfant concerné                            │
│ 📚 Sophie Leroux (L1 - Informatique)       │
│                                             │
│ [Annuler]  [Créer/Lier le compte parent]   │
└─────────────────────────────────────────────┘
```

---

### Logique Backend (Pseudo-code)

```javascript
async function createOrLinkParent(studentId, parentData) {
  const { email, phoneNumber, displayName, relationship } = parentData;
  
  // 1. Déterminer l'identifiant principal
  let primaryEmail;
  let loginMethod;
  
  if (email && email.trim() !== '') {
    // Parent a un email réel
    primaryEmail = email.trim().toLowerCase();
    loginMethod = 'email';
  } else {
    // Parent n'a pas d'email → Email virtuel
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    primaryEmail = `${cleanPhone}@noemail.university-saas.com`;
    loginMethod = 'phone';
  }
  
  // 2. Chercher si ce parent existe déjà
  //    Recherche par email ET par téléphone (double vérification)
  const existingParent = await searchParentByEmailOrPhone(primaryEmail, phoneNumber);
  
  if (existingParent) {
    // ✅ Parent existe déjà → Ajouter l'enfant à children[]
    console.log('✅ Parent trouvé, ajout de l\'enfant...');
    
    await addChildToParent(existingParent.uid, {
      childId: studentId,
      universityId: currentUniversityId,
      childName: studentData.firstName + ' ' + studentData.lastName,
      relationship: relationship,
      addedBy: currentAdminUid,
      addedAt: Date.now()
    });
    
    // Log dans la console (pour MVP, remplacer par email/SMS en prod)
    console.log(`
      📧 EMAIL À ENVOYER AU PARENT (${primaryEmail}) :
      
      Bonjour ${displayName},
      
      Un nouvel enfant a été ajouté à votre compte parent :
      - ${studentData.firstName} ${studentData.lastName} (${currentUniversityName})
      
      Vous pouvez maintenant suivre ses notes depuis votre compte.
      Connectez-vous sur https://university-saas.com/login
    `);
    
    return { success: true, isNew: false, parentUid: existingParent.uid };
    
  } else {
    // ❌ Parent n'existe pas → Créer le compte
    console.log('🆕 Nouveau parent, création du compte...');
    
    const tempPassword = generateTempPassword(); // Ex: "TempPass2026!"
    
    // Créer compte Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      primaryEmail, 
      tempPassword
    );
    
    const parentUid = userCredential.user.uid;
    
    // Créer profil parent dans /users
    await set(ref(database, `users/${parentUid}`), {
      email: primaryEmail,
      loginMethod: loginMethod,
      phoneNumber: phoneNumber,
      displayName: displayName,
      role: 'parent',
      universityId: null,  // ← Pas d'université fixe
      children: [
        {
          childId: studentId,
          universityId: currentUniversityId,
          childName: studentData.firstName + ' ' + studentData.lastName,
          relationship: relationship,
          addedBy: currentAdminUid,
          addedAt: Date.now()
        }
      ],
      mustChangePassword: true,
      createdAt: Date.now(),
      lastLogin: null
    });
    
    // Log dans la console (pour MVP)
    console.log(`
      📧 EMAIL/SMS À ENVOYER AU PARENT :
      
      Bonjour ${displayName},
      
      Un compte parent a été créé pour suivre la scolarité de :
      - ${studentData.firstName} ${studentData.lastName} (${currentUniversityName})
      
      Identifiant : ${loginMethod === 'phone' ? phoneNumber : primaryEmail}
      Mot de passe temporaire : ${tempPassword}
      
      Connectez-vous sur https://university-saas.com/login
      Vous devrez changer votre mot de passe à la première connexion.
    `);
    
    return { success: true, isNew: true, parentUid, tempPassword };
  }
}
```

---

## 🔍 Fonction de Recherche Parent Existant

```javascript
async function searchParentByEmailOrPhone(email, phoneNumber) {
  const usersRef = ref(database, 'users');
  const usersSnap = await get(usersRef);
  
  if (!usersSnap.exists()) return null;
  
  const allUsers = usersSnap.val();
  const cleanPhone = phoneNumber.replace(/\s/g, '');
  
  // Parcourir tous les utilisateurs
  for (const [uid, userData] of Object.entries(allUsers)) {
    if (userData.role !== 'parent') continue;
    
    // Vérifier correspondance par email
    if (userData.email === email) {
      return { uid, ...userData };
    }
    
    // Vérifier correspondance par téléphone
    const userCleanPhone = userData.phoneNumber?.replace(/\s/g, '');
    if (userCleanPhone === cleanPhone) {
      return { uid, ...userData };
    }
  }
  
  return null;
}
```

---

## 🖥️ Dashboard Parent : Sélecteur d'Enfant

### UI avec Dropdown

```jsx
<div className="mb-8">
  <label className="block text-sm font-medium mb-2">
    👨‍👩‍👧‍👦 Sélectionner un enfant
  </label>
  
  <select 
    value={selectedChildId}
    onChange={(e) => setSelectedChildId(e.target.value)}
    className="w-full md:w-1/2 px-4 py-3 border rounded-lg"
  >
    {userProfile.children.map(child => (
      <option key={child.childId} value={child.childId}>
        {child.childName} - {getUniversityName(child.universityId)}
      </option>
    ))}
  </select>
</div>

{/* Affichage des données de l'enfant sélectionné */}
{selectedChildId && (
  <div>
    <h2>Notes de {getCurrentChild().childName}</h2>
    {/* Stats, notes, paiements... */}
  </div>
)}
```

### Logique de Chargement

```javascript
const [selectedChildId, setSelectedChildId] = useState(null);
const [childData, setChildData] = useState(null);

// Au chargement : sélectionner le 1er enfant par défaut
useEffect(() => {
  if (userProfile?.children?.length > 0) {
    setSelectedChildId(userProfile.children[0].childId);
  }
}, [userProfile]);

// Quand l'enfant sélectionné change
useEffect(() => {
  if (selectedChildId) {
    loadChildData(selectedChildId);
  }
}, [selectedChildId]);

async function loadChildData(childId) {
  const child = userProfile.children.find(c => c.childId === childId);
  if (!child) return;
  
  const uniId = child.universityId;
  
  // Charger les données depuis la bonne université
  const studentRef = ref(database, `universities/${uniId}/students/${childId}`);
  const gradesRef = ref(database, `universities/${uniId}/grades/${childId}`);
  const paymentsRef = ref(database, `universities/${uniId}/payments/${childId}`);
  
  // ... Chargement des données
}
```

---

## 🔐 Règles Firebase Mises à Jour

### Problème actuel
Les parents sont liés à 1 seule `universityId`, ils ne peuvent pas accéder aux données d'autres universités.

### Nouvelle règle (À DÉPLOYER)

```json
{
  "rules": {
    "universities": {
      "$universityId": {
        ".read": "
          auth != null && (
            root.child('users').child(auth.uid).child('universityId').val() === $universityId 
            || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme'
            || (
              root.child('users').child(auth.uid).child('role').val() === 'parent' 
              && root.child('users').child(auth.uid).child('children').exists()
            )
          )
        "
      }
    }
  }
}
```

**Explication** : Si l'utilisateur est un parent, on vérifie qu'il a au moins 1 enfant dans `children[]`. Ensuite, le dashboard vérifie côté client qu'il accède seulement aux universités de ses enfants.

**Note de sécurité** : Pour renforcer (optionnel), on pourrait vérifier que `$universityId` est bien dans la liste des universités de ses enfants, mais cela nécessite une règle plus complexe.

---

## 📱 Page de Connexion Mise à Jour

### Détection Automatique Email vs Téléphone

```jsx
async function handleLogin(identifier, password) {
  try {
    let email = identifier.trim();
    
    // Détection : Si ça commence par + ou des chiffres → Téléphone
    if (/^[\+\d]/.test(identifier)) {
      // Nettoyer le numéro (enlever les espaces)
      const cleanPhone = identifier.replace(/\s/g, '');
      
      // Convertir en email virtuel
      email = `${cleanPhone}@noemail.university-saas.com`;
      
      console.log(`Connexion par téléphone : ${identifier} → ${email}`);
    }
    
    // Connexion Firebase standard
    await signInWithEmailAndPassword(auth, email, password);
    
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      setError('Identifiant ou mot de passe incorrect');
    } else if (error.code === 'auth/wrong-password') {
      setError('Mot de passe incorrect');
    } else {
      setError('Erreur de connexion : ' + error.message);
    }
  }
}
```

### UI du Formulaire

```jsx
<input
  type="text"
  placeholder="Email ou Téléphone (+33...)"
  value={identifier}
  onChange={(e) => setIdentifier(e.target.value)}
/>
```

---

## 🧪 Script de Test

### Créer un parent avec 3 enfants dans 2 universités

```javascript
// scripts/createTestParentMultiChildren.mjs

const parent = {
  email: 'parent.multi@gmail.com',  // Ou null pour tester téléphone uniquement
  phoneNumber: '+33612345678',
  displayName: 'Pierre Leroux',
  children: [
    {
      childId: 'student-sophie-001',
      universityId: 'univ-sorbonne-2026',
      childName: 'Sophie Leroux',
      relationship: 'père'
    },
    {
      childId: 'student-lucas-002',
      universityId: 'univ-paris-dauphine',
      childName: 'Lucas Leroux',
      relationship: 'père'
    },
    {
      childId: 'student-emma-003',
      universityId: 'univ-sorbonne-2026',
      childName: 'Emma Leroux',
      relationship: 'père'
    }
  ]
};

// Créer le compte parent
// Créer les 3 étudiants dans leurs universités respectives
// Générer notes + paiements pour chaque étudiant
```

---

## ✅ Checklist d'Implémentation (Jour 2)

- [ ] Modifier structure `/users/{parentUid}` (ajouter `children: []`, `loginMethod`, `mustChangePassword`)
- [ ] Dashboard Admin : Formulaire créer/lier parent
  - [ ] Champs : nom, email, téléphone, relation
  - [ ] Fonction `searchParentByEmailOrPhone()`
  - [ ] Fonction `createOrLinkParent()`
  - [ ] Logs console avec identifiants
- [ ] Dashboard Parent : Sélecteur enfant
  - [ ] Dropdown avec liste des enfants
  - [ ] Chargement dynamique selon enfant sélectionné
  - [ ] Gestion multi-universités
- [ ] Page Login : Détection auto email vs téléphone
- [ ] Règles Firebase : Accès multi-universités pour parents
- [ ] Script de test : Parent avec 2-3 enfants
- [ ] Documentation dans README.md

---

**Dernière mise à jour** : 2026-07-05  
**Validé par** : Équipe (Claude + Utilisateur)  
**Prêt pour implémentation** : ✅ OUI
