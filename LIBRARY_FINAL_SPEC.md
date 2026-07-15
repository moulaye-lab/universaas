# Module Bibliothèque & Ressources - Spécifications Complètes

## 🎯 Objectifs (Cahier des charges)

1. **Ressources pédagogiques numériques** - Dépôt PDF, vidéos, liens multimédias
2. **Gestion bibliothèque physique** - Emprunts/retours d'ouvrages
3. **Suivi progression étudiants** - Tracking consultation ressources

---

## 📊 Structure Firebase

```
universities/{universityId}/
  library/
    resources/                          # Ressources numériques
      {resourceId}/
        title: string
        description: string
        type: string (pdf, video, link, document)
        category: string (cours, td, tp, examen, projet)
        courseId: string (référence au cours)
        courseName: string
        teacherId: string
        teacherName: string
        level: string (L1, L2, etc.)
        fileUrl: string (pour PDF/docs)
        videoUrl: string (YouTube, Vimeo, etc.)
        externalLink: string
        thumbnailUrl: string (optional)
        size: number (bytes, pour fichiers)
        duration: number (minutes, pour vidéos)
        tags: array
        isPublic: boolean
        viewCount: number
        downloadCount: number
        createdAt: timestamp
        createdBy: uid
        updatedAt: timestamp
        
    books/                              # Livres physiques
      {bookId}/
        isbn: string (unique)
        title: string
        author: string
        publisher: string
        publishedYear: number
        category: string
        totalCopies: number
        availableCopies: number
        location: string (rayon)
        coverUrl: string (optional)
        description: string
        language: string
        tags: array
        createdAt: timestamp
        createdBy: uid
        
    loans/                              # Emprunts livres physiques
      {loanId}/
        bookId: string
        studentId: string
        studentName: string
        loanDate: timestamp
        dueDate: timestamp
        returnDate: timestamp | null
        status: string (active, returned, overdue)
        renewalCount: number
        fineAmount: number
        finePaid: boolean
        createdBy: uid
        
    progress/                           # Suivi progression
      {studentId}/
        {resourceId}/
          firstViewedAt: timestamp
          lastViewedAt: timestamp
          viewCount: number
          completionRate: number (0-100)
          timeSpent: number (minutes)
          downloaded: boolean
          downloadedAt: timestamp
          notes: string (notes personnelles)
          bookmarked: boolean
          
    settings/
      loanDuration: number (jours, défaut: 14)
      maxRenewals: number (défaut: 2)
      maxLoansPerStudent: number (défaut: 3)
      finePerDay: number
      allowStudentUpload: boolean (défaut: false)
      maxFileSize: number (MB, défaut: 50)
```

---

## 🎨 Pages à créer

### **Admin & Enseignants**

#### 1. `/admin/library/resources` - Gestion ressources numériques
- Liste toutes les ressources (tableaux avec filtres)
- Filtres: Type, Catégorie, Cours, Enseignant, Niveau
- Actions: Ajouter, Modifier, Supprimer
- Upload PDF direct + liens YouTube/externes
- Stats: Vues, téléchargements, engagement

#### 2. `/admin/library/resources/new` - Ajouter ressource
- Formulaire: Titre, description, type, catégorie
- Upload PDF ou saisie URL (YouTube, Google Drive, etc.)
- Association à un cours
- Tags et niveau
- Prévisualisation

#### 3. `/admin/library/books` - Gestion livres physiques
- Liste livres avec disponibilité
- Filtres: Catégorie, auteur, disponibilité
- Actions: Ajouter, Modifier, Supprimer

#### 4. `/admin/library/loans` - Gestion emprunts
- Liste prêts (actifs, retournés, en retard)
- Créer prêt, enregistrer retour
- Calcul amendes automatique
- Alertes retards

#### 5. `/admin/library/analytics` - Statistiques globales
- Ressources les plus consultées
- Étudiants les plus actifs
- Taux d'engagement par cours
- Stats emprunts livres physiques

### **Étudiants**

#### 6. `/student/library` - Bibliothèque étudiante
- **Onglet Ressources numériques**:
  - Catalogue complet (cartes avec miniatures)
  - Filtres: Cours, Type, Niveau
  - Barre de recherche
  - Badge "Nouveau", "Populaire"
  - Clic → Visualisation/téléchargement
  
- **Onglet Mes ressources**:
  - Favoris/signets
  - Historique consultations
  - Progression par cours
  
- **Onglet Livres physiques**:
  - Catalogue livres avec dispo
  - Mes emprunts en cours
  - Dates de retour
  
#### 7. `/student/library/resource/{id}` - Visualisation ressource
- PDF viewer intégré (iframe)
- Vidéo player (YouTube embed)
- Boutons: Télécharger, Favori, Notes
- Barre de progression auto (scroll tracking)
- Ressources similaires

### **Enseignants**

#### 8. `/teacher/library/my-resources` - Mes ressources
- Liste ressources créées par l'enseignant
- Stats engagement étudiants
- Actions: Modifier, Supprimer, Dupliquer

---

## ✨ Fonctionnalités clés

### **Ressources numériques**

1. **Upload multiple formats**:
   - PDF direct (Firebase Storage)
   - Liens YouTube/Vimeo (embed auto)
   - Google Drive, Dropbox (liens externes)
   - Documents Office (aperçu)

2. **Tracking automatique**:
   - Compteur de vues (incrémenté à chaque consultation)
   - Temps passé (tracking scroll PDF, durée vidéo)
   - Taux de complétion (% scroll pour PDF, % visionnage vidéo)

3. **Système de favoris**:
   - Bouton ⭐ sur chaque ressource
   - Section "Mes favoris" dans vue étudiante

4. **Recherche intelligente**:
   - Titre, description, tags, nom enseignant
   - Filtres combinés (cours + type + niveau)

### **Livres physiques**

5. **Prêts automatisés**:
   - Vérification disponibilité
   - Limite 3 livres/étudiant
   - Durée 14 jours (configurable)

6. **Retours et amendes**:
   - Calcul amende auto (retard × tarif/jour)
   - Statut "overdue" auto après date limite
   - Notifications rappel 2 jours avant

7. **Renouvellements**:
   - Max 2 renouvellements (configurable)
   - Prolongation +14 jours à chaque fois

### **Suivi progression**

8. **Dashboard progression**:
   - Graphiques évolution par cours
   - Taux de consultation par type de ressource
   - Comparaison avec moyenne de la classe

9. **Notifications intelligentes**:
   - "Nouvelle ressource disponible pour ton cours X"
   - "Rappel: livre à rendre dans 2 jours"
   - "Tu n'as pas encore consulté la ressource Y"

---

## 🔐 Permissions

```json
Ressources numériques:
  - Lecture: Tous (université)
  - Écriture: Admin + Enseignants
  - Enseignants voient seulement leurs ressources

Livres physiques:
  - Lecture: Tous
  - Écriture: Admin uniquement

Emprunts:
  - Lecture: Admin + étudiant concerné
  - Écriture: Admin uniquement

Progression:
  - Lecture: Étudiant + Admin + Enseignants
  - Écriture: Étudiant uniquement (auto-tracking)
```

---

## 📦 Services à créer

**`src/services/libraryService.js`**:
- `createResource()`, `updateResource()`, `deleteResource()`
- `getAllResources()`, `getResourcesByCourse()`
- `createBook()`, `updateBook()`, `deleteBook()`
- `createLoan()`, `returnLoan()`, `renewLoan()`
- `getActiveLoansForStudent()`, `getOverdueLoans()`
- `trackResourceView()`, `updateProgress()`, `toggleBookmark()`
- `getStudentProgress()`, `getResourceStats()`

**`src/hooks/useLibrary.js`**:
- Hook pour charger ressources avec filtres temps réel
- Hook pour progression étudiant

---

## 🎯 Ordre d'implémentation MVP

1. ✅ Firebase Rules (fait)
2. ✅ Service libraryService.js (fait, à adapter)
3. Page admin ressources (liste + CRUD)
4. Page vue étudiant (catalogue + visualisation)
5. Tracking automatique progression
6. Page gestion livres physiques
7. Page gestion emprunts
8. Dashboard analytics
9. Système notifications

---

## 🚀 Quick wins

Pour finir rapidement, je priorise:
- **Ressources numériques** (70% du cahier des charges)
- **Tracking basique** (vues + favoris)
- **Livres physiques simplifié** (CRUD + prêts sans amendes d'abord)
- Amendes + analytics + notifications = Phase 2
