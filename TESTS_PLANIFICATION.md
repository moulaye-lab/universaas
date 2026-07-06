# 🧪 Script de Tests - Système de Planification

**Date**: 2026-07-05  
**Version**: 2.1  
**Durée estimée**: 15-20 minutes

---

## 🎯 Objectif

Vérifier que les 3 améliorations du système de planification fonctionnent correctement :
1. ✅ Temps de battement (15 min)
2. ✅ Validation capacité salle
3. ✅ Horaires standardisés

---

## 📋 Prérequis

- ✅ Serveur de développement lancé (`npm run dev`)
- ✅ Connecté en tant qu'**admin_universite**
- ✅ Au moins 1 classe créée avec des étudiants
- ✅ Au moins 2 salles créées (une petite, une grande)
- ✅ Au moins 2 professeurs créés
- ✅ Au moins 3 cours créés

---

## 🧪 Test #1: Temps de Battement (15 min)

### But
Vérifier qu'on ne peut pas programmer 2 cours dans la même salle sans 15 min d'écart.

### Étapes

1. **Naviguer vers une classe**
   - Aller dans "Gestion Classes"
   - Cliquer sur une classe existante

2. **Ajouter le premier cours**
   - Cliquer sur "➕ Ajouter un Cours"
   - Sélectionner :
     - Cours: n'importe lequel
     - Enseignant: n'importe lequel
     - Jour: Lundi
     - Salle: Salle A1 (ou n'importe quelle salle)
     - Heure début: **09:00**
     - Heure fin: **11:00**
   - Cliquer "Ajouter au Planning"
   - ✅ **Résultat attendu**: Cours ajouté avec succès

3. **Tenter d'ajouter un cours collé**
   - Cliquer à nouveau sur "➕ Ajouter un Cours"
   - Sélectionner :
     - Cours: un autre cours
     - Enseignant: un autre enseignant
     - Jour: Lundi
     - Salle: **Salle A1** (la même)
     - Heure début: **11:00** (immédiatement après)
     - Heure fin: **13:00**
   - Cliquer "Ajouter au Planning"
   - ✅ **Résultat attendu**: ❌ Erreur affichée
   - ✅ **Message attendu**: "⚠️ Conflit : Salle occupée par [NomCours]"

4. **Vérifier qu'avec 15+ min d'écart ça marche**
   - Changer l'heure de début à **11:15** (ou 12:00)
   - Cliquer "Ajouter au Planning"
   - ✅ **Résultat attendu**: Cours ajouté avec succès ✅

### Résultat
- [ ] ✅ Cours collé refusé
- [ ] ✅ Cours avec 15+ min d'écart accepté

---

## 🧪 Test #2: Validation Capacité Salle

### But
Vérifier qu'on ne peut pas assigner une salle trop petite pour la classe.

### Prérequis
- Avoir une salle avec **capacité faible** (ex: 20 places)
- Avoir une classe avec **plus d'étudiants** que la capacité de cette salle

### Étapes

1. **Créer ou identifier la configuration**
   - Salle: Salle B3 (capacité: 20 places)
   - Classe: L1 Marketing - Classe 1 (30 étudiants inscrits)

2. **Tenter d'ajouter un cours avec salle trop petite**
   - Aller dans la classe L1 Marketing - Classe 1
   - Cliquer "➕ Ajouter un Cours"
   - Sélectionner :
     - Cours: n'importe lequel
     - Enseignant: n'importe lequel
     - Jour: Mardi
     - Salle: **Salle B3 (20 places)**
     - Horaire: 09:00 - 11:00
   - Cliquer "Ajouter au Planning"
   - ✅ **Résultat attendu**: ❌ Erreur affichée
   - ✅ **Message attendu**: "❌ Salle trop petite : La salle Salle B3 a une capacité de 20 places, mais la classe compte 30 étudiants inscrits."

3. **Vérifier qu'avec une grande salle ça marche**
   - Changer la salle pour une **grande salle** (ex: Amphi A - 100 places)
   - Cliquer "Ajouter au Planning"
   - ✅ **Résultat attendu**: Cours ajouté avec succès ✅

### Résultat
- [ ] ✅ Salle trop petite refusée
- [ ] ✅ Grande salle acceptée
- [ ] ✅ Message d'erreur explicite

---

## 🧪 Test #3: Horaires Standardisés

### But
Vérifier que seuls les horaires standards sont proposés (pas de saisie libre).

### Étapes

1. **Ouvrir le formulaire d'ajout de cours**
   - Aller dans une classe
   - Cliquer "➕ Ajouter un Cours"

2. **Vérifier les champs horaires**
   - Observer le champ "Heure de début *"
   - ✅ **Résultat attendu**: C'est un **dropdown (select)**, pas un input libre
   - ✅ **Options attendues**: 
     - 08:00
     - 09:00
     - 10:00
     - 11:00
     - 12:00
     - 13:00
     - 14:00
     - 15:00
     - 16:00
     - 17:00
     - 18:00

3. **Vérifier l'heure de fin**
   - Observer le champ "Heure de fin *"
   - ✅ **Résultat attendu**: Même chose (dropdown avec horaires standards)

4. **Vérifier l'indication visuelle**
   - Sous le champ "Heure de début"
   - ✅ **Texte attendu**: "⏰ Horaires standardisés (battement de 15 min automatique)"

### Résultat
- [ ] ✅ Dropdowns au lieu d'inputs libres
- [ ] ✅ Horaires standards uniquement (08:00 à 18:00)
- [ ] ✅ Message informatif sur battement affiché

---

## 🧪 Test #4: Professeur avec Battement

### But
Vérifier qu'un professeur ne peut pas avoir 2 cours sans 15 min d'écart.

### Étapes

1. **Assigner un cours au Prof X**
   - Aller dans une classe (ex: L1 Info - Classe 1)
   - Ajouter un cours :
     - Cours: Mathématiques
     - Enseignant: **Prof. Jean Dupont**
     - Jour: Mercredi
     - Salle: Salle A1
     - Horaire: **10:00 - 12:00**
   - ✅ Cours ajouté

2. **Tenter d'assigner un autre cours au même prof immédiatement après**
   - Aller dans une **autre classe** (ex: L2 Info - Classe 1)
   - Ajouter un cours :
     - Cours: Physique
     - Enseignant: **Prof. Jean Dupont** (le même)
     - Jour: Mercredi
     - Salle: Salle B2 (différente)
     - Horaire: **12:00 - 14:00** (immédiatement après)
   - Cliquer "Ajouter au Planning"
   - ✅ **Résultat attendu**: ❌ Erreur affichée
   - ✅ **Message attendu**: "⚠️ Enseignant occupé : [NomCours]"

3. **Vérifier l'indicateur temps réel**
   - Avant de cliquer "Ajouter au Planning"
   - Observer sous le champ "Enseignant"
   - ✅ **Résultat attendu**: Encadré orange/jaune avec message "⚠️ Enseignant occupé"

### Résultat
- [ ] ✅ Professeur avec cours collé refusé
- [ ] ✅ Indicateur visuel en temps réel fonctionnel
- [ ] ✅ Message d'erreur explicite

---

## 🧪 Test #5: Scénarios Valides

### But
Vérifier que les configurations valides sont acceptées.

### Scénario A: Cours consécutifs avec battement
- Cours 1: Lundi 09:00-11:00, Salle A1, Prof X
- Cours 2: Lundi 11:15-13:00, Salle A1, Prof Y
- ✅ **Attendu**: Les 2 cours acceptés (15 min d'écart)

### Scénario B: Même prof, jours différents
- Cours 1: Lundi 09:00-11:00, Salle A1, Prof X
- Cours 2: Mardi 09:00-11:00, Salle A2, Prof X
- ✅ **Attendu**: Les 2 cours acceptés (jours différents)

### Scénario C: Même salle, horaires décalés
- Cours 1: Lundi 08:00-10:00, Salle A1, Prof X
- Cours 2: Lundi 14:00-16:00, Salle A1, Prof Y
- ✅ **Attendu**: Les 2 cours acceptés (horaires non-conflictuels)

### Résultat
- [ ] ✅ Scénario A: OK
- [ ] ✅ Scénario B: OK
- [ ] ✅ Scénario C: OK

---

## 📊 Résumé des Tests

### Checklist Complète

- [ ] Test #1: Temps de battement salle (15 min)
- [ ] Test #2: Validation capacité salle vs classe
- [ ] Test #3: Horaires standardisés (dropdowns)
- [ ] Test #4: Temps de battement professeur (15 min)
- [ ] Test #5: Scénarios valides acceptés

### Critères de Succès

**✅ Tous les tests passent** = Système **PRODUCTION READY** (9.2/10)

**⚠️ Un test échoue** = Besoin de correction

---

## 🐛 En Cas d'Erreur

### Erreur Test #1 ou #4 (Battement)
**Symptôme**: Cours collés acceptés  
**Cause Possible**: BUFFER_TIME non appliqué  
**Fichier**: `ClassDetailsPage.jsx` lignes 177, 194, 239, 256  
**Vérifier**: Présence de `+ BUFFER_TIME` dans les conditions

### Erreur Test #2 (Capacité)
**Symptôme**: Salle trop petite acceptée  
**Cause Possible**: Validation capacité manquante  
**Fichier**: `ClassDetailsPage.jsx` ligne 298-306  
**Vérifier**: Bloc `if (selectedRoom && classCapacity > selectedRoom.capacity)`

### Erreur Test #3 (Horaires)
**Symptôme**: Input libre au lieu de dropdown  
**Cause Possible**: Selects non remplacés  
**Fichier**: `ClassDetailsPage.jsx` lignes 695-712  
**Vérifier**: `<select>` avec `STANDARD_TIME_SLOTS.map()`

---

## ✅ Validation Finale

**Après avoir complété tous les tests**:

1. [ ] Tous les tests passent ✅
2. [ ] Aucune erreur console
3. [ ] Interface responsive et claire
4. [ ] Messages d'erreur explicites

**Résultat Final**: 

- ✅ **PRODUCTION READY** si tous les tests passent
- ⚠️ **Corrections nécessaires** si des tests échouent

---

**Document de Référence**: `AMELIORATIONS_PLANIFICATION.md`  
**Analyse Technique**: `ANALYSE_DISPONIBILITES.md`
