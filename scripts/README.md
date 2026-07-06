# 📚 Script de Seed - Données Académiques

Ce script peuple automatiquement une université avec des départements et des modèles de cours.

## 📊 Données incluses

### Départements (30)
- **Sciences** : Mathématiques, Informatique, Physique, Chimie, Biologie, Environnement
- **Santé** : Médecine, Pharmacie
- **Droit & Économie** : Droit, Économie, Gestion, Sciences Politiques
- **Lettres & Sciences Humaines** : Lettres, Histoire, Géographie, Philosophie, Psychologie, Sociologie
- **Langues** : Langues Étrangères (Anglais, Espagnol, Allemand, Arabe, Chinois)
- **Arts** : Arts, Musique, Cinéma, Architecture
- **Ingénierie** : Mécanique, Électrique, Civile
- **Communication** : Communication, Journalisme
- **Éducation & Sport** : Éducation, STAPS

### Modèles de Cours (80+)
Cours prédéfinis pour chaque département avec :
- Nom du cours
- Code unique (ex: MATH101, INFO202)
- Nombre de crédits ECTS
- Description complète

## 🚀 Utilisation

### Prérequis
```bash
npm install firebase dotenv
```

### Exécution
```bash
node scripts/seedAcademicData.js
```

**Note** : Les données sont GLOBALES (partagées par toutes les universités), donc pas besoin de spécifier d'ID d'université.

## 📝 Exemple de résultat

```
🎓 Seed des données académiques GLOBALES (partagées par toutes les universités)

📚 Création des départements...
  ✅ Mathématiques (MATH)
  ✅ Informatique (INFO)
  ✅ Physique (PHYS)
  ...

✅ 30 départements créés

📖 Création des modèles de cours...

  Mathématiques:
    ✅ Algèbre Linéaire (MATH101)
    ✅ Analyse I (MATH102)
    ✅ Probabilités (MATH301)
    ...

  Informatique:
    ✅ Algorithmique (INFO101)
    ✅ Programmation I (INFO102)
    ✅ Intelligence Artificielle (INFO401)
    ...

✅ 85 modèles de cours créés

🎉 Seed terminé avec succès!

📊 Résumé:
  - 30 départements GLOBAUX
  - 85 modèles de cours GLOBAUX
  - Accessibles par TOUTES les universités
```

## 🎯 Utilisation dans l'interface

Après le seed, les admins peuvent :

1. **Voir les départements et cours** : `/admin/academic-data`
2. **Créer un cours réel** à partir d'un modèle dans `/admin/courses/create`
3. **Ajouter/modifier/supprimer** des départements et modèles

## ⚠️ Notes

- Le script utilise les credentials `.env.local`
- Les données existantes ne sont PAS écrasées (ajout uniquement)
- Pour réinitialiser : supprimer manuellement dans Firebase Console
- Le script utilise l'ID `system-seed` comme créateur

## 🔒 Sécurité

Le script nécessite :
- Accès admin à Firebase
- Variables d'environnement correctement configurées
- Exécution côté serveur uniquement (jamais depuis le frontend)

## 📦 Structure créée dans Firebase

```
departments/  (GLOBAL - partagé par toutes les universités)
  <deptId1>/
    id: "..."
    name: "Mathématiques"
    code: "MATH"
    description: "..."
    createdAt: timestamp
    createdBy: "system-seed"
  <deptId2>/
    ...

courseTemplates/  (GLOBAL - partagé par toutes les universités)
  <templateId1>/
    id: "..."
    name: "Algèbre Linéaire"
    code: "MATH101"
    department: "Mathématiques"
    credits: 6
    description: "..."
    createdAt: timestamp
    createdBy: "system-seed"
  <templateId2>/
    ...
```
