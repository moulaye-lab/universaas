# Scripts de Maintenance

Scripts utilitaires pour la gestion de la base de données et le déploiement.

## Scripts disponibles

### Initialisation
- `createTestAccounts.mjs` - Créer des comptes de test pour chaque rôle
- `create10Universities.mjs` - Créer 10 universités de test

### Seed Data
- `seedDatabase.mjs` - Initialiser la base de données avec données de base
- `seedAcademicData.cjs` - Créer départements et cours globaux
- `seedStudents.cjs` - Ajouter des étudiants de test
- `seedGrades.mjs` - Ajouter des notes de test
- `quickSeedGrades.mjs` - Seed rapide de notes

### Migration & Fix
- `fixStudentData.mjs` - Corriger les données étudiants
- `addAcademicYearToStudents.mjs` - Ajouter année académique aux étudiants
- `addAcademicYearToStudentsAdmin.mjs` - Ajouter année académique (version admin)

### Workflow Complet
- `createCompleteTestWorkflow.mjs` - Créer environnement de test complet
- `createTestParentMultiChildren.mjs` - Créer parent avec plusieurs enfants

## Utilisation

```bash
node scripts/nom-du-script.mjs
```

**⚠️ Attention:** Ces scripts modifient la base de données. Utiliser uniquement en environnement de développement ou test.
