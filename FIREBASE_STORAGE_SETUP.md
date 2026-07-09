# 🔥 Configuration Firebase Storage Rules

## ⚠️ IMPORTANT - Déployer les règles Storage

Les justificatifs d'absence sont uploadés vers **Firebase Storage**. Il faut déployer les règles de sécurité.

---

## 📋 Étape 1 : Copier les règles

Ouvrir le fichier `storage.rules` à la racine du projet.

---

## 📋 Étape 2 : Aller dans Firebase Console

1. Ouvrir [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner votre projet
3. Aller dans **Storage** (menu de gauche)
4. Cliquer sur l'onglet **Rules** (en haut)

---

## 📋 Étape 3 : Coller les règles

1. **Supprimer** tout le contenu existant
2. **Coller** le contenu du fichier `storage.rules`
3. Cliquer sur **Publier** (Publish)

---

## ✅ Vérification

Les règles permettent :
- ✅ **Étudiants** : Upload justificatifs pour LEURS absences (max 5MB, PDF/images uniquement)
- ✅ **Admin** : Lecture de tous les justificatifs
- ✅ **Étudiant** : Lecture de SES propres justificatifs
- ❌ **Autres** : Bloqué

---

## 🔒 Sécurité

- Taille max : **5MB**
- Types autorisés : **PDF, JPG, PNG**
- Isolation par `universityId`
- Seul l'étudiant concerné peut uploader

---

## 🐛 Troubleshooting

**Erreur "Unauthorized" lors de l'upload ?**
→ Vérifier que les Storage Rules sont bien déployées

**Fichier trop volumineux ?**
→ Limite 5MB côté client ET Storage Rules

**Type de fichier rejeté ?**
→ Seuls PDF, JPG, PNG acceptés

---

## 📁 Structure Storage

```
/justificatifs/
  /{universityId}/
    /{absenceId}/
      /justificatif_1234567890.pdf
      /justificatif_1234567891.jpg
```

---

**🚀 Une fois les règles déployées, le système de justificatifs est opérationnel !**
