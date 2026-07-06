# 🧪 GUIDE DE TEST MANUEL - CONTRÔLES D'ACCÈS

**Objectif** : Vérifier manuellement que les contrôles d'accès fonctionnent correctement.

---

## 📋 PRÉREQUIS

Avant de commencer les tests, tu dois avoir :
- ✅ Application démarrée (`npm run dev`)
- ✅ Au moins 1 compte de chaque rôle :
  - Super Admin
  - Admin Université
  - Enseignant
  - Étudiant
  - Parent

---

## 🔥 TEST 1 : ÉTUDIANT TENTE D'ACCÉDER AUX ROUTES ADMIN

### Objectif
Vérifier qu'un étudiant ne peut PAS accéder aux pages d'administration.

### Procédure
1. **Se connecter** avec un compte **étudiant**
2. **Vérifier** que tu arrives sur `/dashboard/student` ✅
3. **Dans la barre d'URL**, taper manuellement :
   ```
   http://localhost:5173/admin/students
   ```
4. **Appuyer sur Entrée**

### Résultat Attendu
- ✅ Tu es **immédiatement redirigé** vers `/dashboard/student`
- ✅ Tu ne vois JAMAIS la page admin (même pas 1 seconde)
- ✅ Dans la console navigateur (F12), tu vois :
  ```
  Accès refusé. Rôle requis: admin_universite, rôle actuel: student
  ```

### Si ça ne marche pas
- ❌ Si tu vois la page admin → **FAILLE CRITIQUE**
- ❌ Si tu restes sur la page admin vide → **PROBLÈME MINEUR** (Firebase Rules bloquent mais route accessible)

---

## 🔥 TEST 2 : ENSEIGNANT TENTE DE CRÉER UN ÉTUDIANT

### Objectif
Vérifier qu'un enseignant ne peut PAS créer d'étudiants (réservé aux admins).

### Procédure
1. **Se connecter** avec un compte **enseignant**
2. **Vérifier** que tu arrives sur `/dashboard/teacher` ✅
3. **Dans la barre d'URL**, taper :
   ```
   http://localhost:5173/admin/students/create
   ```
4. **Appuyer sur Entrée**

### Résultat Attendu
- ✅ Tu es **immédiatement redirigé** vers `/dashboard/teacher`
- ✅ Console affiche : `Accès refusé. Rôle requis: admin_universite, rôle actuel: teacher`

---

## 🔥 TEST 3 : PARENT TENTE D'ACCÉDER AUX NOTES D'UN AUTRE ENFANT

### Objectif
Vérifier qu'un parent ne peut voir QUE les notes de ses propres enfants.

### Prérequis
- Parent A a accès à l'étudiant "Student-123"
- Parent A n'a PAS accès à l'étudiant "Student-456"

### Procédure
1. **Se connecter** avec compte **Parent A**
2. **Ouvrir la console navigateur** (F12 → Onglet Console)
3. **Dans la console, exécuter** :
   ```javascript
   import { ref, get } from 'firebase/database';
   import { database } from './src/config/firebase';
   
   // Tenter de lire notes de Student-456 (pas son enfant)
   const gradesRef = ref(database, 'universities/univ-sorbonne/grades');
   const gradesSnap = await get(gradesRef);
   console.log(gradesSnap.val());
   ```

### Résultat Attendu
- ✅ Erreur Firebase : `PERMISSION_DENIED`
- ✅ Aucune note de Student-456 visible

### Si ça ne marche pas
- ❌ Si tu vois les notes → **FAILLE CRITIQUE** (Firebase Rules cassées)

---

## 🔥 TEST 4 : ADMIN UNIVERSITÉ A TENTE D'ACCÉDER AUX DONNÉES UNIVERSITÉ B

### Objectif
Vérifier l'isolation multi-tenant (Admin A ne voit pas données de l'Université B).

### Prérequis
- Admin Université A : `universityId = "univ-sorbonne"`
- Admin Université B : `universityId = "univ-dauphine"`

### Procédure
1. **Se connecter** avec **Admin Université A**
2. **Ouvrir console navigateur** (F12)
3. **Dans la console, exécuter** :
   ```javascript
   import { ref, get } from 'firebase/database';
   import { database } from './src/config/firebase';
   
   // Tenter de lire étudiants Université B
   const studentsRef = ref(database, 'universities/univ-dauphine/students');
   const studentsSnap = await get(studentsRef);
   console.log(studentsSnap.val());
   ```

### Résultat Attendu
- ✅ Erreur Firebase : `PERMISSION_DENIED`
- ✅ Aucune donnée de l'Université B visible

### Si ça ne marche pas
- ❌ Si tu vois les données → **FAILLE CRITIQUE** (isolation multi-tenant cassée)

---

## 🔥 TEST 5 : ÉTUDIANT TENTE DE MODIFIER SES PROPRES NOTES

### Objectif
Vérifier qu'un étudiant ne peut PAS modifier ses notes (lecture seule).

### Procédure
1. **Se connecter** avec compte **étudiant**
2. **Ouvrir console navigateur** (F12)
3. **Dans la console, exécuter** :
   ```javascript
   import { ref, set } from 'firebase/database';
   import { database } from './src/config/firebase';
   
   // Tenter de modifier une note
   const gradeRef = ref(database, 'universities/univ-sorbonne/grades/grade-123');
   await set(gradeRef, { grade: 20, maxGrade: 20 }); // Modifier note à 20/20
   ```

### Résultat Attendu
- ✅ Erreur Firebase : `PERMISSION_DENIED`
- ✅ Note non modifiée

### Si ça ne marche pas
- ❌ Si la note est modifiée → **FAILLE CRITIQUE**

---

## 🔥 TEST 6 : UTILISATEUR NON CONNECTÉ TENTE D'ACCÉDER AU DASHBOARD

### Objectif
Vérifier qu'aucune page protégée n'est accessible sans connexion.

### Procédure
1. **Se déconnecter** (ou ouvrir en navigation privée)
2. **Dans la barre d'URL**, taper :
   ```
   http://localhost:5173/dashboard/student
   ```
3. **Appuyer sur Entrée**

### Résultat Attendu
- ✅ Tu es **immédiatement redirigé** vers `/login`
- ✅ Tu ne vois JAMAIS le dashboard

---

## 🔥 TEST 7 : UTILISATEUR CONNECTÉ TENTE D'ACCÉDER À LA PAGE LOGIN

### Objectif
Vérifier qu'un utilisateur connecté ne peut PAS retourner à la page login.

### Procédure
1. **Se connecter** avec n'importe quel compte
2. **Dans la barre d'URL**, taper :
   ```
   http://localhost:5173/login
   ```
3. **Appuyer sur Entrée**

### Résultat Attendu
- ✅ Tu es **immédiatement redirigé** vers ton dashboard
- ✅ Exemple : Admin → `/dashboard/admin`, Student → `/dashboard/student`

---

## 🔥 TEST 8 : ENSEIGNANT VOIT UNIQUEMENT SES COURS DANS DROPDOWN

### Objectif
Vérifier que l'enseignant ne peut saisir des notes QUE pour ses propres cours.

### Prérequis
- Enseignant A enseigne : Mathématiques (course-123)
- Enseignant B enseigne : Physique (course-456)

### Procédure
1. **Se connecter** avec **Enseignant A**
2. **Aller sur** `/teacher/grades/input`
3. **Cliquer sur le dropdown "Sélectionner un cours"**

### Résultat Attendu
- ✅ Dropdown affiche UNIQUEMENT "Mathématiques"
- ✅ "Physique" n'apparaît PAS dans la liste

### Si ça ne marche pas
- ❌ Si tu vois tous les cours → **FAILLE CRITIQUE**

---

## 🔥 TEST 9 : PARENT VOIT UNIQUEMENT SES ENFANTS DANS LE DASHBOARD

### Objectif
Vérifier que le parent ne voit QUE ses propres enfants.

### Prérequis
- Parent A a 2 enfants : Student-123, Student-456
- Parent B a 1 enfant : Student-789

### Procédure
1. **Se connecter** avec **Parent A**
2. **Aller sur** `/dashboard/parent`
3. **Vérifier la liste des enfants affichée**

### Résultat Attendu
- ✅ Affichage de UNIQUEMENT Student-123 et Student-456
- ✅ Student-789 n'apparaît PAS

---

## 🔥 TEST 10 : VALIDATION FIREBASE - NOTE > NOTE MAX

### Objectif
Vérifier que Firebase Rules refusent une note supérieure à la note maximale.

### Procédure
1. **Se connecter** avec **enseignant**
2. **Ouvrir console navigateur** (F12)
3. **Dans la console, exécuter** :
   ```javascript
   import { ref, set } from 'firebase/database';
   import { database } from './src/config/firebase';
   
   // Tenter de créer note invalide (25/20)
   const gradeRef = ref(database, 'universities/univ-sorbonne/grades/test-grade');
   await set(gradeRef, {
     studentId: 'student-123',
     courseId: 'course-123',
     courseName: 'Mathématiques',
     classId: 'class-123',
     className: 'L1 Info',
     title: 'Test',
     gradeType: 'exam',
     grade: 25, // INVALIDE : 25 > 20
     maxGrade: 20,
     coefficient: 1,
     date: Date.now()
   });
   ```

### Résultat Attendu
- ✅ Erreur Firebase : `PERMISSION_DENIED` ou validation échouée
- ✅ Note non créée

### Si ça ne marche pas
- ❌ Si la note est créée → **FAILLE VALIDATION**

---

## 📊 CHECKLIST FINALE

Coche chaque test réussi :

- [ ] Test 1 : Étudiant bloqué sur routes admin
- [ ] Test 2 : Enseignant bloqué sur création étudiant
- [ ] Test 3 : Parent bloqué sur notes autres enfants
- [ ] Test 4 : Admin A bloqué sur données Université B
- [ ] Test 5 : Étudiant ne peut pas modifier notes
- [ ] Test 6 : Non-connecté redirigé vers login
- [ ] Test 7 : Connecté redirigé depuis login
- [ ] Test 8 : Enseignant voit uniquement ses cours
- [ ] Test 9 : Parent voit uniquement ses enfants
- [ ] Test 10 : Validation Firebase refuse notes invalides

---

## ✅ RÉSULTAT

**Si tous les tests passent** : ✅ **Contrôles d'accès VALIDÉS**

**Si 1 test échoue** : ⚠️ **Corriger avant production**

**Si plusieurs tests échouent** : 🚨 **NE PAS DÉPLOYER EN PRODUCTION**

---

## 🐛 EN CAS DE PROBLÈME

### Problème : Page admin accessible mais vide
**Cause** : ProtectedRoute laisse passer mais Firebase Rules bloquent données  
**Gravité** : 🟡 Mineur (données protégées mais UX mauvaise)  
**Solution** : Ajouter vérification `universityId` côté frontend

### Problème : Données visibles alors qu'elles ne devraient pas
**Cause** : Firebase Rules cassées  
**Gravité** : 🔴 Critique  
**Solution** : Vérifier `database.rules.json` et redéployer

### Problème : Redirection ne fonctionne pas
**Cause** : ProtectedRoute.jsx mal configuré  
**Gravité** : 🔴 Critique  
**Solution** : Vérifier `allowedRoles` dans App.jsx

---

## 📝 RAPPORT DE TEST

Après avoir terminé tous les tests, note :
- Nombre de tests réussis : __ / 10
- Problèmes critiques trouvés : __
- Problèmes mineurs trouvés : __

**Date du test** : _____________  
**Testé par** : _____________  
**Statut** : ☐ VALIDÉ   ☐ À CORRIGER
