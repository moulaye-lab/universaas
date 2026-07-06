# 🚀 PROMPT POUR LA PROCHAINE SESSION

**Date dernière session** : 2026-07-06  
**Commit actuel** : `a9e836c`  
**Score sécurité** : 9.8/10 ✅

---

## 🔥 ACTIONS URGENTES (À FAIRE EN PREMIER)

### 1. Déployer Firebase Rules
**⚠️ CRITIQUE** : Les règles de sécurité ont été modifiées mais pas déployées.

**Instructions** :
1. Ouvrir [Firebase Console](https://console.firebase.google.com)
2. Sélectionner le projet
3. **Realtime Database** → **Règles**
4. Copier le contenu de `database.rules.json`
5. Cliquer **Publier**

**Vérification** :
- Console affiche "Règles publiées avec succès"
- Date de publication mise à jour

---

### 2. Tester le Système de Notes

**Procédure complète** : Voir `AUDIT_SECURITE_2026_07_06.md`

#### Test 1 : Saisie Enseignant
```
1. Se connecter avec compte enseignant
2. Aller sur /teacher/grades/input
3. Sélectionner un cours
4. Saisir notes pour plusieurs étudiants
5. Enregistrer
6. Vérifier dans Firebase : universities/{univId}/grades
```

**Attendu** : Notes enregistrées avec tous les champs (studentId, courseId, classId, etc.)

#### Test 2 : Consultation Étudiant
```
1. Se connecter avec compte étudiant
2. Dashboard doit afficher :
   - Moyenne générale (ex: 14.5/20)
   - Mention (Très Bien, Bien, etc.)
   - Moyennes par cours
   - Bouton "Exporter CSV"
3. Cliquer "Exporter CSV"
4. Vérifier fichier téléchargé
```

**Attendu** : Dashboard affiche moyennes + CSV téléchargeable

#### Test 3 : Sécurité (CRITIQUE)
```
1. Se connecter avec Étudiant A
2. Ouvrir console navigateur (F12)
3. Exécuter :
   import { ref, get } from 'firebase/database';
   import { database } from './src/config/firebase';
   
   // Tenter de lire notes Étudiant B
   const gradesRef = ref(database, 'universities/{univId}/grades');
   const allGrades = await get(gradesRef);
   console.log(allGrades.val());
```

**Attendu** : Erreur `PERMISSION_DENIED` (Étudiant A ne voit QUE ses notes)

---

### 3. Tester Création Étudiant

**Bug potentiel** : "Classe introuvable"

**Procédure** :
```
1. Se connecter admin
2. Aller sur /admin/students/create
3. Remplir formulaire
4. Sélectionner une classe
5. Cliquer "Créer"
```

**Attendu** : 
- ✅ Étudiant créé avec succès
- ✅ Dialog "Créer un autre ?" s'affiche
- ✅ Pas d'erreur "Classe introuvable"

**Si erreur** : Vérifier que la classe existe dans Firebase avant transaction

---

## 📋 TÂCHES PRINCIPALES (Après tests)

### ⏳ Finir Système de Notes (60% restant)

**Estimation totale** : 9-10h

#### 1. Page Admin Gestion Notes (~3h)
**Route** : `/admin/grades`

**Fonctionnalités** :
- Tableau toutes les notes de l'université
- Filtres : étudiant, cours, classe, période
- Actions : modifier, supprimer note
- Export CSV global
- Validation édition (note ≤ maxGrade)

**Fichier à créer** : `src/pages/admin/GradesManagementPage.jsx`

#### 2. Dashboard Parent Notes Enfants (~2h)
**Route** : `/dashboard/parent` (section existante à étendre)

**Fonctionnalités** :
- Sélection enfant (dropdown si plusieurs)
- Moyennes générales par enfant
- Moyennes par cours
- Export CSV par enfant
- Graphique évolution (optionnel)

**Fichier à modifier** : `src/pages/dashboards/ParentDashboard.jsx`

#### 3. Export PDF Bulletins (~2h)
**Package** : `jspdf` + `jspdf-autotable`

**Fonctionnalités** :
- Bouton "Télécharger bulletin" (dashboard étudiant + parent)
- En-tête université
- Infos étudiant (nom, matricule, classe)
- Tableau notes par cours
- Moyennes + mentions
- Graphique radar (optionnel)

**Fichier à créer** : `src/utils/pdfGenerator.js`

#### 4. Graphiques Performance (~2h)
**Package** : `recharts` ou `chart.js`

**Graphiques** :
- Évolution moyenne générale (courbe)
- Répartition notes par cours (barres)
- Radar compétences (optionnel)
- Histogramme classe (comparaison)

**Fichier à créer** : `src/components/GradesCharts.jsx`

---

## 🔄 ORDRE RECOMMANDÉ

```
1. Déployer Firebase Rules (5 min)
2. Tester système notes (30 min)
3. Tester création étudiant (10 min)
4. Page Admin Gestion Notes (3h)
5. Dashboard Parent (2h)
6. Export PDF (2h)
7. Graphiques (2h)
8. Tests finaux (1h)
```

**Total estimé** : ~10h30

---

## 📚 MODULES RESTANTS (Après Notes)

### Priorité 1 : Bibliothèque Numérique (70% fait)
- ✅ Structure base
- ⏳ Upload fichiers (à finaliser)
- ⏳ Catégories (à implémenter)

**Estimation** : 1-2 jours

### Priorité 2 : Système Paiements (0%)
**Fonctionnalités** :
- Génération factures
- Suivi paiements étudiant
- Dashboard admin paiements
- Export comptable

**Estimation** : 3-4 jours

### Priorité 3 : Notifications (0%)
**Fonctionnalités** :
- Bell icon + badge compteur
- Notifications temps réel (Firebase)
- Types : nouvelles notes, paiements, annonces
- Préférences notifications

**Estimation** : 2-3 jours

---

## 🔒 RAPPELS SÉCURITÉ

- ✅ Score actuel : **9.8/10**
- ✅ Prochain audit : **Dans 5 implémentations**
- ✅ Méthodologie stricte : **LIRE → PLANIFIER → IMPLÉMENTER**

**Compteur implémentations** :
1. ✅ Pattern "créer un autre"
2. ✅ Matricule permanent
3. ✅ EditStudent complet
4. ✅ Audit sécurité
5. ✅ Tests contrôles accès
→ **Prochain audit : Après 5 nouvelles implémentations**

---

## 📁 FICHIERS UTILES

**Documentation** :
- `SESSION_COMPLETE_2026_07_06.md` : Récapitulatif session
- `AUDIT_SECURITE_2026_07_06.md` : Rapport audit complet
- `TEST_CONTROLES_ACCES.md` : Matrice sécurité
- `GUIDE_TEST_MANUEL.md` : 10 tests pas-à-pas

**Code** :
- `src/utils/gradesCalculator.js` : 10 fonctions calcul notes
- `src/pages/teacher/GradesInputPage.jsx` : Saisie notes
- `src/pages/dashboards/StudentDashboard.jsx` : Dashboard avec moyennes
- `database.rules.json` : Règles Firebase (à déployer)

**Mémoire** :
- `.claude/projects/-Users-itopie-Desktop-university-saas/memory/`
- `coding_methodology.md` : Process strict obligatoire
- `security_audit_2026_07_06.md` : Rapport audit sauvegardé

---

## 💡 PROMPT SUGGÉRÉ POUR DÉMARRER

```
Bonjour, je continue le projet University SaaS.

Session précédente : 2026-07-06
Commit actuel : a9e836c

Actions à faire :
1. Déployer Firebase Rules (je vais le faire manuellement)
2. Tester système de notes (tu me guides)
3. Finir système de notes (60% restant)

Commence par me guider pour tester le système de notes.
Suis la méthodologie stricte (LIRE → PLANIFIER → IMPLÉMENTER).
```

---

## ✅ CHECKLIST DÉMARRAGE

Avant de commencer, vérifier :
- [ ] Firebase Rules déployées
- [ ] Application démarre (`npm run dev`)
- [ ] Comptes test disponibles (admin, teacher, student, parent)
- [ ] Firebase Console accessible
- [ ] Dernière session lue (`SESSION_COMPLETE_2026_07_06.md`)

---

**Bonne session !** 🚀
