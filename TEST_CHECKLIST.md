# 🧪 Checklist de Tests - Firebase Rules Sécurisées

## ✅ Tests à Effectuer AVANT Déploiement

### Connexion
- URL locale : http://localhost:5173
- Compte test Admin : `newadmin@sorbonne.fr` / `Admin123456`
- Compte test Étudiant : `etudiant@sorbonne.fr` / `Student123456`

---

## 📝 Test 1 : Paiement Libre (CRITIQUE)

**Objectif** : Vérifier que `paymentHistory` s'écrit correctement avec les règles strictes

**Actions** :
1. Se connecter en tant qu'Admin (`newadmin@sorbonne.fr`)
2. Aller sur `/admin/payments`
3. Cliquer "Paiement libre" ou chercher un étudiant
4. Enregistrer paiement libre de 50000 XOF en Cash
5. Vérifier console browser (F12) : pas d'erreur `permission_denied`
6. Vérifier Firebase Console : `universities/*/students/*/paymentHistory` créé

**Attendu** : ✅ Succès  
**Si erreur** : ❌ Vérifier format données (date = timestamp number, method = string)

---

## 📝 Test 2 : Application Tarifs Scolarité

**Objectif** : Vérifier que les installments se créent correctement

**Actions** :
1. Connecté en tant qu'Admin
2. Aller sur `/admin/tuition-fees`
3. Définir tarifs par filière/niveau
4. Cliquer "Appliquer aux étudiants"
5. Vérifier console : pas d'erreur
6. Vérifier Firebase : `universities/*/payments/{studentId}/installments` créés

**Attendu** : ✅ Succès  
**Note** : Ce module a déjà été corrigé session 2026-07-14

---

## 📝 Test 3 : Isolation Multi-Tenant (SÉCURITÉ)

**Objectif** : Vérifier qu'un étudiant ne peut PAS lire données autre université

**Actions** :
1. Se connecter avec compte Étudiant
2. Ouvrir console browser (F12)
3. Exécuter dans console :
```javascript
const { ref, get } = await import('firebase/database');
const { database } = await import('./src/config/firebase');

// Tenter de lire une autre université (fake ID)
const fakeRef = ref(database, 'universities/fake-univ-id/students');
const snap = await get(fakeRef);
console.log(snap.exists()); // Devrait échouer avec permission_denied
```

**Attendu** : ❌ `permission_denied` (c'est bon !)  
**Si succès** : 🚨 CRITIQUE - Isolation cassée

---

## 📝 Test 4 : Modification Rôle Interdit

**Objectif** : Vérifier qu'un utilisateur ne peut PAS modifier son propre rôle

**Actions** :
1. Connecté en tant qu'Étudiant
2. Console browser :
```javascript
const { ref, set } = await import('firebase/database');
const { database } = await import('./src/config/firebase');
const { currentUser } = await import('./src/contexts/AuthContext');

// Tenter de se promouvoir admin
const userRef = ref(database, `users/${currentUser.uid}/role`);
await set(userRef, 'admin_universite'); // Devrait échouer
```

**Attendu** : ❌ `permission_denied` (c'est bon !)  
**Si succès** : 🚨 CRITIQUE - Escalade privilèges possible

---

## 📝 Test 5 : Création Étudiant

**Objectif** : Vérifier qu'un admin peut créer un étudiant

**Actions** :
1. Connecté en tant qu'Admin
2. Aller sur `/admin/students/create`
3. Remplir formulaire complet
4. Soumettre
5. Vérifier console : pas d'erreur
6. Vérifier Firebase : étudiant créé dans `universities/*/students`

**Attendu** : ✅ Succès

---

## 📝 Test 6 : Dashboard Étudiant

**Objectif** : Vérifier que l'étudiant voit ses propres données

**Actions** :
1. Se connecter en tant qu'Étudiant
2. Aller sur `/student/dashboard`
3. Vérifier affichage :
   - Nom/prénom correct
   - Notes affichées (si présentes)
   - Paiements affichés
   - Pas d'erreur console

**Attendu** : ✅ Affichage correct

---

## 🎯 Critères de Succès Global

### ✅ Tests Passés (6/6)
- [ ] Test 1 : Paiement libre OK
- [ ] Test 2 : Application tarifs OK
- [ ] Test 3 : Isolation multi-tenant OK (permission_denied)
- [ ] Test 4 : Modification rôle bloquée (permission_denied)
- [ ] Test 5 : Création étudiant OK
- [ ] Test 6 : Dashboard étudiant OK

### ✅ Aucune Erreur Console
- [ ] Pas de `permission_denied` sur actions légitimes
- [ ] Pas d'erreur JavaScript non gérée
- [ ] Pas d'avertissement Firebase

### ✅ Firebase Console
- [ ] Données créées aux bons emplacements
- [ ] Structure conforme aux rules
- [ ] Timestamps corrects (numbers)

---

## 🚨 Que Faire en Cas d'Échec

### Si permission_denied sur action légitime
1. Identifier collection + opération exacte
2. Vérifier console Firebase : message d'erreur complet
3. Comparer avec `database.rules.json` : règle `.read/.write`
4. Corriger code ou ajuster rule

### Si isolation cassée (Tests 3 ou 4 passent)
1. 🚨 **NE PAS DÉPLOYER**
2. Vérifier `database.rules.json` lignes 74-76
3. Restaurer backup : `cp database.rules.json.backup database.rules.json`
4. Contacter développeur

---

## 📋 Après Tests Réussis

```bash
# 1. Déployer rules
firebase deploy --only database

# 2. Commit changements
git add database.rules.json src/pages/admin/PaymentsManagementPage.jsx
git add AUDIT_FIREBASE_RULES_2026-07-18.md PLAN_CORRECTION_RULES.md CORRECTIONS_APPLIED.md TEST_CHECKLIST.md
git commit -m "🔒 Security: Restore secure Firebase Rules (9.8/10) + Fix paymentHistory

- Restore database.rules.json from backup (multi-tenant isolation)
- Fix PaymentsManagementPage: paymentHistory compliant with strict rules
  - date: timestamp number (not string)
  - method: correct field name (not paymentMethod)
  - Remove unauthorized fields (type, timestamp, processedBy, revenueId)
- All tests passed (6/6)

Security Score: 2/10 → 9.8/10 ✅

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 3. Push
git push origin preproduction
```

---

**🎯 GO / NO-GO Déploiement**

- ✅ GO si tous les tests passent
- ❌ NO-GO si ne serait-ce qu'un test échoue (isoler et corriger d'abord)

**Temps estimé tests** : 15-20 minutes
