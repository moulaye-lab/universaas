# Module Bibliothèque - Spécifications

## 🎯 Objectif
Gestion complète d'une bibliothèque universitaire : catalogue livres, prêts/retours, réservations, amendes.

## 📊 Structure Firebase

```
universities/{universityId}/
  library/
    books/
      {bookId}/
        isbn: string (unique)
        title: string
        author: string
        publisher: string
        publishedYear: number
        category: string (sciences, informatique, littérature, etc.)
        totalCopies: number
        availableCopies: number
        location: string (rayon/étagère)
        coverUrl: string (optional)
        description: string
        language: string
        tags: array
        createdAt: timestamp
        createdBy: uid
        
    loans/
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
        
    reservations/
      {reservationId}/
        bookId: string
        studentId: string
        studentName: string
        reservationDate: timestamp
        expiryDate: timestamp
        status: string (pending, fulfilled, expired, cancelled)
        notificationSent: boolean
        
    settings/
      loanDuration: number (jours, défaut: 14)
      maxRenewals: number (défaut: 2)
      maxLoansPerStudent: number (défaut: 3)
      finePerDay: number (en devise locale)
      reservationDuration: number (jours, défaut: 3)
```

## 🎨 Pages à créer

### 1. `/admin/library` - Tableau de bord bibliothèque (Admin)
- Stats: Total livres, copies disponibles, prêts actifs, en retard
- Graphiques: Prêts par mois, catégories populaires
- Liste prêts en retard avec alertes

### 2. `/admin/library/books` - Catalogue complet (Admin)
- Liste tous les livres avec filtres (catégorie, auteur, disponibilité)
- Boutons: Ajouter, Modifier, Supprimer
- Recherche ISBN/titre/auteur

### 3. `/admin/library/books/new` - Ajouter un livre (Admin)
- Formulaire complet avec validation
- Scan ISBN optionnel (future)

### 4. `/admin/library/loans` - Gestion prêts (Admin)
- Liste tous les prêts (actifs, retournés, en retard)
- Actions: Créer prêt, Enregistrer retour, Calculer amendes

### 5. `/student/library` - Bibliothèque étudiante
- Catalogue livres (read-only)
- Mes emprunts en cours
- Historique emprunts
- Mes réservations

## 🔐 Permissions Firebase Rules

```json
"library": {
  "books": {
    ".read": "auth != null && root.child('users').child(auth.uid).child('universityId').val() === $universityId",
    ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin_universite'",
    "$bookId": {
      // Validations...
    }
  },
  "loans": {
    ".read": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || (root.child('users').child(auth.uid).child('role').val() === 'student' && data.child('studentId').val() === auth.uid))",
    ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin_universite'"
  },
  "reservations": {
    ".read": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || data.child('studentId').val() === auth.uid)",
    ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || newData.child('studentId').val() === auth.uid)"
  }
}
```

## ✨ Fonctionnalités clés

1. **Prêt automatique**: Vérifie disponibilité, limite par étudiant
2. **Retours**: Met à jour availableCopies, calcule amendes auto
3. **Réservations**: File d'attente quand livre indisponible
4. **Notifications**: Rappel 2 jours avant échéance, alerte retard
5. **Statistiques**: Top livres empruntés, étudiants actifs

## 📦 Services à créer

- `libraryService.js`: Fonctions CRUD + logique métier
- Hooks: `useLibrary.js`, `useLoans.js`

## 🎯 Ordre d'implémentation

1. Firebase Rules (database.rules.json)
2. Service + hooks
3. Page catalogue admin (CRUD livres)
4. Page gestion prêts
5. Dashboard bibliothèque
6. Vue étudiant
7. Système notifications
