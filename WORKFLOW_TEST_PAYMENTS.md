# 💰 Workflow Test - Module Paiements

## 📋 Vue d'ensemble

Ce document décrit les procédures de test complètes pour le Module Système de Paiements.

**Status actuel**: Fichiers créés, intégration en cours

**Fichiers implémentés**:
- ✅ `src/utils/receiptPDFGenerator.js` - Génération PDF reçus + échéanciers
- ✅ `src/pages/admin/PaymentsManagementPage.jsx` - Interface admin gestion paiements
- ✅ `src/pages/student/MyPaymentsPage.jsx` - Interface étudiant consultation paiements

**Intégration requise**:
- ⏳ Routes dans App.jsx
- ⏳ Boutons navigation depuis dashboards
- ⏳ Firebase Rules pour collection payments
- ⏳ Navigation parent dashboard

---

## 🔧 Prérequis Techniques

### Structure Firebase attendue
```
universities/
  └── {universityId}/
      └── payments/
          └── {studentId}/
              ├── totalAmount: number
              ├── academicYear: string (ex: "2025/2026")
              ├── createdAt: timestamp
              ├── createdBy: string (uid admin)
              └── installments: array[
                  {
                    amount: number,
                    dueDate: timestamp,
                    status: "pending" | "paid" | "overdue",
                    paidDate: timestamp (si paid),
                    paymentMethod: string (si paid),
                    paidBy: string (uid admin qui a validé),
                    installmentNumber: number,
                    totalInstallments: number
                  }
              ]
```

### Firebase Rules à ajouter
```json
"payments": {
  "$studentId": {
    ".read": "auth != null && ((root.child('users').child(auth.uid).child('role').val() === 'admin_universite' && root.child('users').child(auth.uid).child('universityId').val() === $universityId) || (root.child('users').child(auth.uid).child('role').val() === 'student' && root.child('users').child(auth.uid).child('universityId').val() === $universityId && root.child('users').child(auth.uid).child('profileId').val() === $studentId) || (root.child('users').child(auth.uid).child('role').val() === 'parent' && root.child('users').child(auth.uid).child('childrenAccess').child($universityId).child($studentId).exists()))",
    ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin_universite' && root.child('users').child(auth.uid).child('universityId').val() === $universityId"
  }
}
```

### Routes à ajouter (App.jsx)
```jsx
// Admin
<Route
  path="/admin/payments"
  element={
    <ProtectedRoute allowedRoles={['admin_universite']}>
      <PaymentsManagementPage />
    </ProtectedRoute>
  }
/>

// Student
<Route
  path="/student/payments"
  element={
    <ProtectedRoute allowedRoles={['student']}>
      <MyPaymentsPage />
    </ProtectedRoute>
  }
/>
```

---

## 🧪 Test Workflow 1: Admin - Création Plan de Paiement

### Étape 1: Navigation
1. Se connecter en tant qu'admin université
2. Aller sur AdminUniversityDashboard
3. Cliquer sur le bouton "💰 Paiements" (à ajouter dans navigation)
4. **Résultat attendu**: Arrivée sur `/admin/payments` (PaymentsManagementPage)

### Étape 2: Création nouveau plan
1. Cliquer sur "Créer un plan de paiement"
2. Modal s'ouvre avec formulaire
3. Remplir:
   - Sélectionner un étudiant (dropdown)
   - Montant total: 5000€
   - Nombre d'échéances: 5
   - Date de début: 01/09/2025
4. Cliquer "Créer le plan"
5. **Résultat attendu**:
   - Modal se ferme
   - Message succès: "Plan de paiement créé avec succès"
   - Le plan apparaît dans la liste avec 5 échéances
   - Toutes les échéances ont status "pending"
   - Dates espacées d'1 mois (01/09, 01/10, 01/11, 01/12, 01/01)

### Étape 3: Vérification Firebase
1. Ouvrir Firebase Console
2. Naviguer: `universities/{univId}/payments/{studentId}`
3. **Vérifier**:
   - `totalAmount: 5000`
   - `academicYear: "2025/2026"`
   - `createdAt: timestamp présent`
   - `createdBy: uid admin`
   - `installments: array[5]`
   - Chaque installment contient: amount (1000), dueDate, status ("pending"), installmentNumber (1-5), totalInstallments (5)

---

## 🧪 Test Workflow 2: Admin - Validation Paiement

### Étape 1: Marquer comme payé
1. Sur PaymentsManagementPage, trouver le plan créé
2. Cliquer sur "Marquer comme payé" pour la 1ère échéance
3. Sélectionner méthode: "Espèces"
4. Confirmer
5. **Résultat attendu**:
   - Status passe de "pending" à "paid"
   - Badge vert "✓ Payé le [date]"
   - Bouton "Marquer comme payé" disparaît
   - Stats globales se mettent à jour:
     - Total payé: 1000€
     - Échéances payées: 1
     - En attente: 4

### Étape 2: Vérification Firebase
1. Recharger Firebase Console
2. Naviguer: `universities/{univId}/payments/{studentId}/installments/0`
3. **Vérifier**:
   - `status: "paid"`
   - `paidDate: timestamp présent`
   - `paymentMethod: "Espèces"`
   - `paidBy: uid admin`

---

## 🧪 Test Workflow 3: Étudiant - Consultation Paiements

### Étape 1: Navigation
1. Se connecter en tant qu'étudiant (qui a un plan de paiement)
2. Aller sur StudentDashboard
3. Cliquer sur "💰 Mes Paiements" (à ajouter dans navigation)
4. **Résultat attendu**: Arrivée sur `/student/payments` (MyPaymentsPage)

### Étape 2: Consultation échéancier
1. Vérifier affichage des stats:
   - Montant total: 5000€
   - Déjà payé: 1000€
   - Restant: 4000€
   - En retard: 0 (ou nombre si échéances dépassées)
2. Vérifier liste des 5 échéances:
   - Échéance 1: Badge vert "✓ Payé le [date]" + Bouton "Reçu PDF"
   - Échéances 2-5: Badge orange "⏳ À venir" ou rouge "✗ En retard" si date passée
3. Si échéances en retard:
   - Alert rouge en haut: "⚠️ X paiement(s) en retard"

### Étape 3: Téléchargement reçu
1. Cliquer sur "Reçu PDF" pour l'échéance payée
2. **Résultat attendu**:
   - PDF téléchargé: `recu_paiement_{matricule}-{year}-1.pdf`
   - Contenu PDF:
     - En-tête: Nom université + "REÇU DE PAIEMENT"
     - N° reçu: {matricule}-{year}-1
     - Infos étudiant: nom, prénom, matricule, niveau, email
     - Détails paiement: montant (1000€)
     - Total en vert: 1000€
     - Infos transaction: date paiement, méthode (Espèces), échéance initiale
     - Statut: "✓ PAIEMENT VALIDÉ"
     - Note légale
     - Pied de page: date génération + signature électronique

### Étape 4: Téléchargement échéancier complet
1. Cliquer sur "Échéancier PDF" (en-tête)
2. **Résultat attendu**:
   - PDF téléchargé: `echeancier_{matricule}_2025/2026.pdf`
   - Contenu PDF:
     - En-tête: Nom université + "ÉCHÉANCIER DE PAIEMENT"
     - Infos étudiant: nom, prénom, matricule
     - Tableau 5 lignes:
       - N° | Date échéance | Montant | Statut
       - Échéance 1 | 01/09/2025 | 1000€ | ✓ Payé
       - Échéances 2-5 | dates | 1000€ | ⏳ À venir (ou ✗ Retard)
     - Total: 5000€

---

## 🧪 Test Workflow 4: Parent - Consultation Paiements Enfant

### Prérequis
Parent doit avoir accès à un étudiant via `childrenAccess/{univId}/{studentId}`

### Étape 1: Navigation
1. Se connecter en tant qu'parent
2. Aller sur ParentDashboard
3. Sélectionner l'enfant ayant un plan de paiement
4. Section "Paiements" doit être visible (à implémenter si pas encore)
5. **Option A**: Ajouter section dédiée dans ParentDashboard
6. **Option B**: Créer route `/parent/payments/:childId` avec MyPaymentsPage adapté

### Étape 2: Consultation
1. Voir résumé paiements enfant:
   - Total frais
   - Montant payé
   - Restant
   - Échéances en retard
2. Télécharger échéancier PDF
3. Télécharger reçus des paiements effectués

---

## 🧪 Test Workflow 5: Filtres et Recherche (Admin)

### Test filtres
1. Créer plusieurs plans de paiement (différents étudiants, niveaux)
2. Sur PaymentsManagementPage:
   - **Recherche**: Taper nom étudiant → Seuls plans de cet étudiant visibles
   - **Filtre Niveau**: Sélectionner "Licence 1" → Seuls plans étudiants L1 visibles
   - **Filtre Statut**: Sélectionner "paid" → Seuls plans avec toutes échéances payées
   - **Filtre Statut**: Sélectionner "pending" → Plans avec échéances non payées
   - **Filtre Statut**: Sélectionner "overdue" → Plans avec échéances en retard

---

## 🧪 Test Workflow 6: Gestion Retards

### Simulation retard
1. Créer plan avec date début dans le passé (ex: 01/01/2025)
2. **Résultat attendu**:
   - Échéances avec dueDate < Date.now() et status "pending" passent "overdue" visuellement
   - Compteur "En retard" s'incrémente
   - Alert rouge sur MyPaymentsPage étudiant

### Correction retard
1. Admin marque échéance en retard comme payée
2. **Résultat attendu**:
   - Compteur "En retard" décrémente
   - Alert disparaît si plus de retard

---

## 🧪 Test Workflow 7: Cas d'Erreur

### Test 1: Étudiant sans plan
1. Connexion étudiant sans plan de paiement
2. Aller sur `/student/payments`
3. **Résultat attendu**:
   - Message: "Aucun plan de paiement"
   - "Votre plan de paiement n'a pas encore été configuré. Contactez l'administration."

### Test 2: Téléchargement reçu échéance non payée
1. Étudiant tente de télécharger reçu d'une échéance "pending"
2. **Résultat attendu**:
   - Alert: "Ce paiement n'a pas encore été effectué"
   - Aucun PDF généré

### Test 3: Création plan montant invalide
1. Admin crée plan avec montant 0 ou négatif
2. **Résultat attendu**:
   - Validation: "Le montant doit être supérieur à 0"
   - Plan non créé

### Test 4: Permissions
1. Étudiant tente d'accéder `/admin/payments`
2. **Résultat attendu**: Redirection + erreur permissions
3. Teacher tente d'accéder `/admin/payments`
4. **Résultat attendu**: Redirection + erreur permissions

---

## ✅ Checklist Intégration Complète

### Code
- [x] receiptPDFGenerator.js créé
- [x] PaymentsManagementPage.jsx créé
- [x] MyPaymentsPage.jsx créé
- [ ] Routes ajoutées dans App.jsx
- [ ] Imports ajoutés dans App.jsx
- [ ] Bouton navigation AdminDashboard → PaymentsManagementPage
- [ ] Bouton navigation StudentDashboard → MyPaymentsPage
- [ ] Section ou page paiements pour ParentDashboard

### Firebase
- [ ] Rules ajoutées pour collection `payments`
- [ ] Rules déployées (`firebase deploy --only database`)
- [ ] Structure testée manuellement

### Tests manuels
- [ ] Workflow 1: Création plan paiement ✅
- [ ] Workflow 2: Validation paiement ✅
- [ ] Workflow 3: Étudiant consultation + PDF ✅
- [ ] Workflow 4: Parent consultation ⏳
- [ ] Workflow 5: Filtres et recherche ✅
- [ ] Workflow 6: Gestion retards ✅
- [ ] Workflow 7: Cas d'erreur ✅

### Documentation
- [x] WORKFLOW_TEST_PAYMENTS.md créé
- [ ] README.md mis à jour (section Paiements)

---

## 🎯 Prochaines Étapes

1. **Intégration routes** (App.jsx)
2. **Intégration navigation** (Dashboards)
3. **Firebase Rules** (payments collection)
4. **Tests manuels** (suivre workflows ci-dessus)
5. **Corrections bugs** (si détectés pendant tests)
6. **Module à 100%** ✅

---

## 📊 État Avancement Module Paiements

**Progression actuelle**: 60%

| Composant | État | % |
|-----------|------|---|
| Génération PDF reçus | ✅ Créé | 100% |
| Interface admin (CRUD) | ✅ Créé | 100% |
| Interface étudiant | ✅ Créé | 100% |
| Routes App.jsx | ⏳ À faire | 0% |
| Navigation dashboards | ⏳ À faire | 0% |
| Firebase Rules | ⏳ À faire | 0% |
| Tests workflow | ⏳ À faire | 0% |
| Interface parent | ⏳ Optionnel | 0% |

**Temps estimé restant**: 30-45 minutes
