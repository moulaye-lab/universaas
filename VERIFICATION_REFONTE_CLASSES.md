# 📋 Script de Vérification - Refonte Système de Classes

**Date**: 2026-07-05  
**Version**: 1.0  
**Durée estimée**: 45-60 minutes

---

## ✅ Pré-requis

- [ ] Application lancée (`npm run dev`)
- [ ] Firebase Rules déployées
- [ ] Compte admin créé et fonctionnel
- [ ] Base de données Firebase accessible

---

## 🎯 Phase 1: Création de Classes (10 min)

### Test 1.1: Créer une classe valide
**Navigation**: Dashboard Admin → Gestion Classes → Nouvelle Classe

**Actions**:
1. Remplir le formulaire:
   - Niveau: L1
   - Domaine: Informatique
   - Numéro: 1
   - Capacité: 50
   - Date début: 2025-09-01
   - Date fin: 2026-06-30
   - Année: 2025-2026

**Résultat attendu**:
- ✅ Aperçu affiche "L1 Informatique - Classe 1"
- ✅ Message de succès
- ✅ Proposition "Créer une autre classe ?"

**Test**: Cliquer "OUI" → Formulaire réinitialisé avec numéro = 2

---

### Test 1.2: Validation des erreurs
**Actions**: Tester chaque validation

1. Classe sans domaine → ❌ "Le domaine/département est requis"
2. Date fin < Date début → ❌ "La date de fin doit être après la date de début"
3. Capacité < 1 → ❌ Validation HTML
4. Créer classe avec nom identique → ❌ "Une classe [...] existe déjà"

**Résultat attendu**: Toutes les erreurs bloquent la création

---

### Test 1.3: Créer 3 classes différentes
**Créer**:
- L1 Informatique - Classe 1 (50 places)
- L1 Informatique - Classe 2 (45 places)
- L2 Mathématiques - Classe 1 (40 places)

**Vérifier**: Les 3 classes apparaissent dans la liste

---

## 🎓 Phase 2: Gestion des Étudiants (15 min)

### Test 2.1: Créer un étudiant et l'assigner à une classe
**Navigation**: Dashboard Admin → Gestion Étudiants → Créer

**Actions**:
1. Remplir informations personnelles (prénom, nom, email)
2. Niveau: L1, Filière: Informatique
3. **Classe**: Sélectionner "L1 Informatique - Classe 1 (0/50 places)"
4. Soumettre

**Résultat attendu**:
- ✅ Étudiant créé
- ✅ Retour à la liste des classes
- ✅ "L1 Informatique - Classe 1" affiche maintenant **(1/50 places)**

---

### Test 2.2: Vérifier limite de capacité
**Actions**:
1. Créer manuellement 50 étudiants pour "L1 Informatique - Classe 1"
   *(Ou utiliser un script de seed)*
2. Tenter de créer le 51ème étudiant
3. Sélectionner "L1 Informatique - Classe 1" dans le dropdown

**Résultat attendu**:
- ✅ "L1 Informatique - Classe 1 (50/50 places)" est grisée/non sélectionnable
- ✅ OU erreur lors de la soumission "Cette classe est complète"

---

### Test 2.3: Changement de classe
**Actions**:
1. Aller sur Liste des Étudiants
2. Créer route `/admin/students/:studentId/edit` si pas de bouton visible
3. Accéder à la page de modification d'un étudiant
4. Changer la classe de "L1 Informatique - Classe 1" vers "L1 Informatique - Classe 2"
5. Soumettre

**Résultat attendu**:
- ✅ Message "Classe changée avec succès"
- ✅ Classe 1: **49/50 places** (-1)
- ✅ Classe 2: **1/45 places** (+1)
- ✅ Profil étudiant mis à jour avec nouveau `classId`

---

### Test 2.4: Étudiant sans classe (validation)
**Actions**:
1. Créer un nouvel étudiant
2. Ne PAS sélectionner de classe
3. Soumettre

**Résultat attendu**:
- ❌ "Veuillez sélectionner une classe"

---

## 📚 Phase 3: Emploi du Temps des Classes (15 min)

### Test 3.1: Ajouter un cours au planning
**Navigation**: Gestion Classes → Voir détails "L1 Informatique - Classe 1" → Ajouter un Cours

**Actions**:
1. Sélectionner cours: "Mathématiques Appliquées"
2. Enseignant: "Dr. Martin"
3. Jour: Lundi
4. Heure: 08:00 - 10:00
5. Salle: A3
6. Soumettre

**Résultat attendu**:
- ✅ Vérification disponibilité salle: "✅ Salle disponible"
- ✅ Vérification disponibilité prof: "✅ Enseignant disponible"
- ✅ Cours ajouté au planning
- ✅ Apparaît dans l'emploi du temps sous "Lundi"

---

### Test 3.2: Détection conflit de salle
**Actions**:
1. Ajouter un 2ème cours:
   - Cours: "Physique"
   - Enseignant: "Dr. Dubois"
   - Jour: **Lundi**
   - Heure: **08:30 - 10:30** (chevauche le 1er cours)
   - Salle: **A3** (même salle)
2. Observer l'indicateur en temps réel

**Résultat attendu**:
- ⚠️ "⚠️ Conflit : Salle occupée par Mathématiques Appliquées"
- ❌ Soumission bloquée OU warning affiché

---

### Test 3.3: Détection conflit d'enseignant
**Actions**:
1. Ajouter un 2ème cours:
   - Cours: "Algèbre"
   - Enseignant: **"Dr. Martin"** (même prof)
   - Jour: **Lundi**
   - Heure: **09:00 - 11:00** (chevauche)
   - Salle: B1 (salle différente)

**Résultat attendu**:
- ⚠️ "⚠️ Enseignant occupé : Mathématiques Appliquées"

---

### Test 3.4: Ajouter plusieurs cours sans conflits
**Créer un emploi du temps complet**:
- Lundi 08:00-10:00: Maths (Dr. Martin, Salle A3)
- Lundi 10:15-12:15: Physique (Dr. Dubois, Salle B1)
- Mardi 14:00-16:00: Algo (Dr. Chen, Salle C2)
- Mercredi 08:00-10:00: Base de données (Dr. Martin, Salle A3)

**Résultat attendu**:
- ✅ Tous les cours ajoutés sans conflit
- ✅ Emploi du temps affiché par jour

---

### Test 3.5: Retirer un cours du planning
**Actions**:
1. Cliquer sur "Retirer" pour un cours
2. Confirmer

**Résultat attendu**:
- ✅ Cours retiré de l'emploi du temps
- ✅ Message "Cours retiré du planning"

---

## 👨‍🎓 Phase 4: Interface Étudiant (10 min)

### Test 4.1: Voir l'emploi du temps de sa classe
**Actions**:
1. Se déconnecter du compte admin
2. Se connecter avec un compte étudiant de "L1 Informatique - Classe 1"
3. Aller sur le Dashboard Étudiant

**Résultat attendu**:
- ✅ Section "Mon Emploi du Temps - L1 Informatique - Classe 1" visible
- ✅ Tous les cours de la classe affichés par jour
- ✅ Informations complètes: horaires, enseignant, salle

---

### Test 4.2: Étudiant sans classe
**Actions**:
1. Se connecter avec un étudiant créé AVANT la refonte (sans classId)

**Résultat attendu**:
- ✅ Pas d'erreur JavaScript
- ✅ Section emploi du temps non affichée (ou message "Aucune classe assignée")

---

## 🔒 Phase 5: Sécurité Firebase (10 min)

### Test 5.1: Lecture des classes
**Test dans la Console Firebase**:

**Scénario 1**: Admin peut lire les classes
```javascript
// Avec un token admin
firebase.database().ref('universities/univ-123/classes').once('value')
```
**Attendu**: ✅ Données retournées

**Scénario 2**: Étudiant peut lire les classes de son université
```javascript
// Avec un token étudiant de univ-123
firebase.database().ref('universities/univ-123/classes').once('value')
```
**Attendu**: ✅ Données retournées

**Scénario 3**: Étudiant NE PEUT PAS lire classes d'une autre université
```javascript
// Avec un token étudiant de univ-123
firebase.database().ref('universities/univ-456/classes').once('value')
```
**Attendu**: ❌ Permission denied

---

### Test 5.2: Écriture des classes
**Test dans la Console Firebase**:

**Scénario 1**: Admin peut créer/modifier
```javascript
// Avec un token admin
firebase.database().ref('universities/univ-123/classes/class-new').set({...})
```
**Attendu**: ✅ Succès

**Scénario 2**: Étudiant NE PEUT PAS modifier
```javascript
// Avec un token étudiant
firebase.database().ref('universities/univ-123/classes/class-1').update({capacity: 100})
```
**Attendu**: ❌ Permission denied

**Scénario 3**: Enseignant NE PEUT PAS modifier
```javascript
// Avec un token enseignant
firebase.database().ref('universities/univ-123/classes/class-1').update({...})
```
**Attendu**: ❌ Permission denied

---

## 🚨 Tests de Régression (5 min)

### Test R.1: Anciens cours fonctionnent toujours
**Actions**:
1. Créer un cours via "Gestion Cours" (ancien système)
2. Vérifier qu'il apparaît dans la liste des cours

**Attendu**: ✅ Pas de régression

---

### Test R.2: Notes fonctionnent toujours
**Actions**:
1. Prof saisit des notes (ancien système)
2. Étudiant consulte ses notes

**Attendu**: ✅ Pas de régression

---

## 📊 Checklist de Validation Finale

### Fonctionnalités Critiques
- [ ] Création de classe fonctionne
- [ ] Liste des classes affiche le bon taux d'occupation
- [ ] Étudiant assigné à une classe lors de la création
- [ ] Places décrémentées automatiquement
- [ ] Changement de classe met à jour les deux classes
- [ ] Emploi du temps affiché correctement (admin)
- [ ] Emploi du temps affiché correctement (étudiant)
- [ ] Détection conflits de salles
- [ ] Détection conflits d'enseignants
- [ ] Firebase Rules protègent les classes

### Performance
- [ ] Liste des classes charge en < 2 secondes
- [ ] Emploi du temps charge en < 2 secondes
- [ ] Pas de ralentissement avec 10 classes

### UX
- [ ] Messages d'erreur clairs
- [ ] Messages de succès visibles
- [ ] Transitions fluides
- [ ] Pas d'erreurs console JavaScript

---

## 🐛 Bugs Connus à Vérifier

### Bug potentiel 1: Race condition sur occupiedSeats
**Scénario**: 2 admins créent simultanément 2 étudiants pour la même classe (49/50)
**Risque**: Les deux passent, classe à 51/50
**Test**: Ouvrir 2 onglets, créer 2 étudiants en même temps
**Mitigation attendue**: Firebase transactions (à implémenter si bug confirmé)

---

### Bug potentiel 2: Étudiant sans classe dans ancien système
**Scénario**: Étudiant créé avant refonte (pas de classId)
**Test**: Se connecter avec ancien étudiant
**Attendu**: Pas d'erreur, emploi du temps masqué

---

### Bug potentiel 3: Cours ajouté à classe puis classe supprimée
**Scénario**: Supprimer une classe avec des cours dans son planning
**Test**: Supprimer une classe (si fonctionnalité existe)
**Attendu**: Orphelins détectés ou suppression en cascade

---

## ✅ Validation Production

**Toutes les cases cochées ?** → **READY FOR PRODUCTION** 🚀

**Bugs critiques détectés ?** → **BLOCKER - Ne pas déployer**

---

## 📝 Notes de Test

**Testeur**: _______________  
**Date**: _______________  
**Résultat Global**: ☐ PASS  ☐ FAIL  
**Commentaires**:

