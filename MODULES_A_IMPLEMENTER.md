# 📚 Modules à Implémenter

Liste des modules planifiés pour futures implémentations.

---

## 📝 Module : Gestion des Devoirs à Rendre

**Priorité** : Moyenne  
**Statut** : Non implémenté  
**Estimation** : 2-3 jours

### 🎯 Objectif
Permettre aux enseignants de créer des devoirs avec deadline, et aux étudiants de soumettre leurs travaux pour correction et notation.

### 🔧 Fonctionnalités

#### Côté Enseignant
- ✅ Créer un devoir avec :
  - Titre et description
  - Date limite (deadline)
  - Pièces jointes (consignes, documents)
  - Cours associé
  - Coefficient
  - Note maximale
- ✅ Voir la liste des devoirs créés
- ✅ Voir qui a rendu / qui n'a pas rendu
- ✅ Télécharger les soumissions
- ✅ Corriger et noter
- ✅ Ajouter un feedback pour l'étudiant
- ✅ Notification automatique aux étudiants

#### Côté Étudiant
- ✅ Voir les devoirs assignés dans le dashboard
- ✅ Badge "À rendre" avec compte à rebours
- ✅ Upload de fichier (PDF, Word, ZIP)
- ✅ Voir le statut : "À rendre", "Rendu", "Corrigé"
- ✅ Notification deadline proche (24h avant)
- ✅ Voir la note et feedback après correction

#### Côté Parent
- ✅ Voir les devoirs de leurs enfants
- ✅ Voir si rendu à temps ou en retard
- ✅ Voir les notes et feedbacks

### 🗄️ Structure Firebase

```
universities/{universityId}/
  assignments/{assignmentId}
    - id: string
    - title: string
    - description: string
    - courseId: string
    - courseName: string
    - teacherId: string
    - teacherName: string
    - classIds: string[] (classes concernées)
    - deadline: timestamp
    - maxGrade: number (défaut: 20)
    - coefficient: number (défaut: 1)
    - attachments: array (fichiers de consignes)
    - status: 'active' | 'closed' | 'archived'
    - createdAt: timestamp
    - updatedAt: timestamp

  submissions/{submissionId}
    - id: string
    - assignmentId: string
    - studentId: string
    - studentName: string
    - classId: string
    - submittedAt: timestamp
    - files: array (fichiers rendus par l'étudiant)
    - status: 'pending' | 'graded' | 'late'
    - grade: number (null si pas encore corrigé)
    - feedback: string (commentaire du prof)
    - gradedAt: timestamp
    - gradedBy: string (teacherId)
```

### 📁 Fichiers à Créer

#### Routes
- `/admin/assignments` - Liste des devoirs (admin)
- `/teacher/assignments` - Gestion des devoirs (prof)
- `/teacher/assignments/create` - Créer un devoir
- `/teacher/assignments/{id}` - Détails + corrections
- `/student/assignments` - Mes devoirs (étudiant)
- `/student/assignments/{id}` - Soumettre un devoir
- `/parent/assignments` - Devoirs de mes enfants

#### Composants
- `AssignmentCard.jsx` - Card pour afficher un devoir
- `AssignmentForm.jsx` - Formulaire création devoir
- `SubmissionUploader.jsx` - Upload de fichiers étudiant
- `SubmissionsList.jsx` - Liste des soumissions (prof)
- `GradeSubmissionModal.jsx` - Modal de correction

#### Services
- `assignmentService.js` - CRUD devoirs
- `submissionService.js` - Gestion soumissions
- `fileUploadService.js` - Upload fichiers Firebase Storage

#### Utils
- `assignmentHelpers.js` - Calculs (retard, stats, etc.)
- `fileValidation.js` - Validation fichiers (taille, format)

### 🔐 Firebase Rules

```json
"assignments": {
  ".read": "auth != null && root.child('users').child(auth.uid).child('universityId').val() === $universityId",
  ".write": "auth != null && ((root.child('users').child(auth.uid).child('role').val() === 'teacher' && root.child('users').child(auth.uid).child('universityId').val() === $universityId) || root.child('users').child(auth.uid).child('role').val() === 'admin_universite')",
  
  "$assignmentId": {
    "teacherId": {
      ".validate": "newData.isString() && newData.val().length > 0"
    },
    "deadline": {
      ".validate": "newData.isNumber() && newData.val() > now"
    },
    "status": {
      ".validate": "newData.isString() && newData.val().matches(/^(active|closed|archived)$/)"
    }
  }
},

"submissions": {
  ".read": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'teacher' || root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || (root.child('users').child(auth.uid).child('role').val() === 'student' && root.child('users').child(auth.uid).child('universityId').val() === $universityId))",
  
  "$submissionId": {
    ".read": "auth != null && (data.child('studentId').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'teacher' || root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('childrenAccess').child($universityId).child(data.child('studentId').val()).val() === true)",
    ".write": "auth != null && ((newData.child('studentId').val() === auth.uid && root.child('users').child(auth.uid).child('role').val() === 'student') || (root.child('users').child(auth.uid).child('role').val() === 'teacher' && root.child('users').child(auth.uid).child('universityId').val() === $universityId))",
    
    "studentId": {
      ".validate": "newData.isString() && newData.val() === auth.uid"
    },
    "submittedAt": {
      ".validate": "newData.isNumber() && newData.val() <= now"
    },
    "status": {
      ".validate": "newData.isString() && newData.val().matches(/^(pending|graded|late)$/)"
    }
  }
}
```

### 📊 Dashboard Stats

#### Dashboard Enseignant
- **Devoirs en attente** : Nombre de soumissions à corriger
- **Devoirs rendus cette semaine** : Stats hebdomadaires
- **Taux de rendu** : Pourcentage d'étudiants ayant rendu

#### Dashboard Étudiant
- **Devoirs à rendre** : Liste avec deadline proche en rouge
- **Devoirs rendus** : Historique avec statut
- **Moyenne des devoirs** : Calcul automatique

### 🎨 UX Features

1. **Notifications**
   - 24h avant deadline → notification étudiant
   - Nouveau devoir créé → notification étudiants
   - Devoir corrigé → notification étudiant + parent

2. **Badges & Indicateurs**
   - 🔴 "Urgent" si deadline < 24h
   - 🟡 "Bientôt" si deadline < 3 jours
   - 🟢 "OK" si deadline > 3 jours
   - ⏰ "En retard" si rendu après deadline
   - ✅ "Rendu" si soumis
   - 📝 "À corriger" pour le prof

3. **Filtres**
   - Par cours
   - Par statut (à rendre, rendus, corrigés)
   - Par date limite
   - Recherche par titre

### 🚀 Plan d'Implémentation

**Phase 1 : Backend (1 jour)**
- Structure Firebase
- Firebase Rules
- Services CRUD

**Phase 2 : Côté Enseignant (1 jour)**
- Page création devoir
- Liste des devoirs
- Correction et notation

**Phase 3 : Côté Étudiant (0.5 jour)**
- Dashboard avec devoirs
- Upload de soumission
- Voir notes et feedback

**Phase 4 : Features avancées (0.5 jour)**
- Notifications
- Stats dashboard
- Système de rappels

### 📝 Notes Importantes

- **Stockage fichiers** : Utiliser Firebase Storage pour les fichiers
- **Limite taille** : 10 MB par fichier
- **Formats autorisés** : PDF, DOC, DOCX, ZIP, JPG, PNG
- **Antivirus** : Vérifier les fichiers uploadés (optionnel)
- **Historique** : Conserver toutes les soumissions même après correction
- **Statistiques** : Générer des rapports par classe/cours

### 🔗 Intégrations

- **Avec Notes** : Les devoirs corrigés génèrent automatiquement une note
- **Avec Absences** : Un devoir non rendu peut générer une "absence de travail"
- **Avec Calendrier** : Les deadlines apparaissent dans le calendrier
- **Avec Notifications** : Système de rappels automatiques

---

## 🎯 Autres Modules Planifiés

### 🎓 Module : Promotion Académique (Passage en Classe Supérieure)

**Priorité** : Haute  
**Statut** : Non implémenté  
**Estimation** : 1-2 jours

#### 🎯 Objectif
Gérer le passage des étudiants en classe supérieure à la fin de l'année académique, avec validation des soutenances, gestion des redoublants et des diplômés.

#### 🔧 Fonctionnalités

##### Côté Admin
- ✅ Vue tableau complète avec tous les étudiants
- ✅ Calcul automatique moyenne annuelle (S1 + S2)
- ✅ Suggestions de décision selon critères :
  - Moyenne ≥ 10 : Admis → Passage classe supérieure
  - Moyenne < 10 : Redoublant
  - L3/M2 + Soutenance validée : Diplômé
- ✅ Décisions possibles par étudiant :
  - **Admis** → Promotion (L1→L2, L2→L3, M1→M2)
  - **Redoublant** → Reste dans classe actuelle
  - **Diplômé** → Fin de cycle (status: 'graduated')
  - **Changement de filière** → Choisir nouvelle classe
  - **Inactif** → Quitte l'école (status: 'inactive')
- ✅ Validation soutenance (checkbox pour L3/M2)
- ✅ Modal de justification pour passages exceptionnels
  - Admin peut forcer passage d'un redoublant
  - Raison obligatoire (conseil de classe, bonne conduite, etc.)
- ✅ Actions en masse :
  - Promouvoir tous les L1 admis → L2
  - Promouvoir tous les L2 admis → L3
  - Diplômer tous les L3/M2 avec soutenance validée
- ✅ Filtres : niveau, statut, classe, recherche
- ✅ Export rapport PDF de promotion
- ✅ Notifications automatiques envoyées à tous

##### Côté Étudiant
- ✅ Notification de décision de promotion
- ✅ Voir historique académique dans profil
- ✅ Statut du compte mis à jour (active/inactive/graduated)

##### Côté Parent
- ✅ Notification de décision pour leurs enfants
- ✅ Voir historique académique de l'enfant

#### 🗄️ Structure Firebase

```javascript
universities/{universityId}/
  students/{studentId}
    - status: 'active' | 'inactive' | 'graduated'
    - defenseValidated: boolean // Pour L3/M2
    - defenseDate: timestamp
    - defenseGrade: number
    - academicHistory: [
        {
          year: '2025-2026',
          semester1Avg: 12.5,
          semester2Avg: 11.2,
          yearAvg: 11.85,
          level: 'L3',
          className: 'L3 Informatique',
          decision: 'promoted' | 'redoublant' | 'diplome' | 'change_filiere' | 'inactive',
          promotedTo: 'M1 Informatique', // ou null
          justification: 'Passage autorisé par conseil de classe',
          decidedBy: 'adminId',
          decidedAt: timestamp
        }
      ]

  academic_promotions/{promotionId}
    - id: string
    - academicYear: '2025-2026'
    - createdAt: timestamp
    - createdBy: adminId
    - status: 'draft' | 'validated' | 'completed'
    - totalStudents: number
    - stats: {
        promoted: 45,
        redoublant: 8,
        diplomes: 12,
        inactive: 2,
        changeFiliere: 1
      }
    - decisions: {
        [studentId]: {
          studentName: string,
          oldLevel: 'L1',
          newLevel: 'L2',
          oldClass: 'L1 Info A',
          newClass: 'L2 Info A',
          decision: 'promoted',
          semester1Avg: 12.5,
          semester2Avg: 13.1,
          yearAvg: 12.8,
          defenseValidated: boolean,
          justification: string | null,
          decidedAt: timestamp
        }
      }
```

#### 📁 Fichiers à Créer

##### Routes
- `/admin/academic-promotion` - Page de gestion promotion

##### Composants
- `AcademicPromotionPage.jsx` - Page principale
- `PromotionTable.jsx` - Tableau étudiants avec décisions
- `PromotionDecisionModal.jsx` - Modal choix décision
- `JustificationModal.jsx` - Modal justification passages exceptionnels
- `DefenseValidationModal.jsx` - Modal validation soutenance
- `ChangeClassModal.jsx` - Modal changement filière/classe
- `PromotionStatsCard.jsx` - Stats récapitulatives
- `PromotionReportPDF.jsx` - Export rapport promotion

##### Services
- `promotionService.js` - Logique promotion
- `academicHistoryService.js` - Gestion historique

##### Utils
- `promotionHelpers.js` - Calculs moyennes, suggestions

#### 🔐 Firebase Rules

```json
"students": {
  "$studentId": {
    "status": {
      ".validate": "newData.isString() && newData.val().matches(/^(active|inactive|graduated)$/)"
    },
    "defenseValidated": {
      ".validate": "newData.isBoolean()"
    },
    "academicHistory": {
      ".validate": "newData.isString()"
    }
  }
},

"academic_promotions": {
  ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin_universite'",
  ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin_universite'",
  
  "$promotionId": {
    "status": {
      ".validate": "newData.isString() && newData.val().matches(/^(draft|validated|completed)$/)"
    },
    "academicYear": {
      ".validate": "newData.isString() && newData.val().length > 0"
    }
  }
}
```

#### 🚀 Workflow

**Phase 1 : Préparation (Admin)**
1. Admin accède à `/admin/academic-promotion`
2. Vérification : S2 doit être clôturé
3. Système charge tous les étudiants actifs
4. Calcul automatique moyennes annuelles (S1 + S2) / 2
5. Suggestions décisions selon critères

**Phase 2 : Validation Soutenances (L3/M2)**
1. Admin coche "Soutenance validée" pour chaque L3/M2
2. Saisie note de soutenance (optionnel)
3. Date de soutenance enregistrée

**Phase 3 : Décisions Individuelles**
1. Admin revoit chaque étudiant
2. Valide ou modifie la décision suggérée
3. Pour passages exceptionnels : modal justification obligatoire
4. Pour changement filière : sélection nouvelle classe
5. Pour inactifs : confirmation désactivation

**Phase 4 : Validation Globale**
1. Admin valide la promotion
2. Dialog confirmation avec récap stats
3. Mise à jour en masse :
   - `students/{id}/level` → nouveau niveau
   - `students/{id}/classId` → nouvelle classe
   - `students/{id}/status` → updated si nécessaire
   - Ajout à `academicHistory`
4. Génération notifications pour tous
5. Export rapport PDF automatique
6. Sauvegarde dans `academic_promotions`

**Phase 5 : Post-Promotion**
1. Étudiants inactifs ne peuvent plus se connecter
2. Diplômés ont accès lecture seule
3. Redoublants restent dans leur classe
4. Promus voient nouvelle classe dans dashboard

#### 📊 Dashboard Stats

##### Dashboard Admin (après promotion)
- **Promotion 2025-2026** : 68 étudiants traités
- **Admis** : 45 (66%)
- **Redoublants** : 8 (12%)
- **Diplômés** : 12 (18%)
- **Inactifs** : 3 (4%)

#### 🎨 UX Features

1. **Badges Visuels**
   - 🟢 Admis → Badge vert
   - 🟡 Redoublant → Badge jaune
   - 🎓 Diplômé → Badge bleu
   - 🔴 Inactif → Badge rouge
   - 🔄 Changement filière → Badge violet

2. **Alertes Contextuelles**
   - ⚠️ "Moyenne < 10 : Redoublement suggéré"
   - ⚠️ "Soutenance non validée : Ne peut pas être diplômé"
   - ✅ "Passage autorisé malgré moyenne < 10 (justification requise)"

3. **Filtres Avancés**
   - Par niveau (L1, L2, L3, M1, M2)
   - Par statut suggéré (Admis, Redoublants, À diplômer)
   - Par classe actuelle
   - Recherche nom/matricule
   - Soutenance validée/non validée

4. **Actions Rapides**
   - Clic droit sur ligne → Menu contextuel
   - Sélection multiple → Actions groupées
   - Drag & drop pour changer classe

#### 🔗 Intégrations

- **Avec Périodes Académiques** : Promotion disponible après clôture S2
- **Avec Notes** : Calcul moyennes S1/S2 automatique
- **Avec Classes** : Mise à jour automatique des effectifs
- **Avec Notifications** : Envoi massif notifications
- **Avec Bulletins** : Historique académique visible dans bulletins

#### 📝 Notes Importantes

- **Timing** : Promotion après clôture S2 + soutenances
- **Réversibilité** : Admin peut annuler une promotion (dans 7 jours)
- **Historique** : Toutes décisions tracées dans `academicHistory`
- **Flexibilité** : Admin garde contrôle total sur chaque décision
- **Soutenances** : Obligatoires pour diplômer L3/M2
- **Inactifs** : Peuvent réactiver compte via réinscription
- **Diplômés** : Gardent accès lecture seule (historique, bulletins)
- **Redoublants** : Peuvent changer de classe si besoin

#### 🎓 Gestion Soutenances

##### Pour L3 et M2
- Admin valide soutenance individuellement
- Note de soutenance (optionnel, coef 2 par défaut)
- Date de soutenance enregistrée
- **Règle diplôme** : Moyenne annuelle ≥ 10 + Soutenance validée

##### Interface Validation
```
┌─────────────────────────────────────┐
│ Validation Soutenance               │
│                                     │
│ Étudiant: Marie Dupont (L3 Info)   │
│ Moyenne annuelle: 12.8/20           │
│                                     │
│ ☑ Soutenance validée                │
│                                     │
│ Note soutenance: [__15__] /20       │
│ Date: [__2026-06-15__]              │
│                                     │
│ Commentaire (optionnel):            │
│ ┌─────────────────────────────────┐ │
│ │ Excellente présentation         │ │
│ └─────────────────────────────────┘ │
│                                     │
│    [Annuler]        [Valider]       │
└─────────────────────────────────────┘
```

---

### 📅 Module : Calendrier Intégré
- Vue mensuelle/hebdomadaire
- Événements : cours, examens, deadlines
- Export iCal/Google Calendar

### 💬 Module : Messagerie Interne
- Messages entre profs/étudiants/parents
- Conversations groupées par cours
- Pièces jointes

### 📊 Module : Rapports Avancés
- Export PDF bulletins
- Graphiques de progression
- Comparaisons inter-classes

### 🎓 Module : Projets de Groupe
- Création de groupes d'étudiants
- Suivi de projets
- Évaluation par compétences

---

**Dernière mise à jour** : 2026-07-13
