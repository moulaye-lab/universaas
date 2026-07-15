# 📊 Système de Calcul des Moyennes Pondérées

## ✅ Conforme au Cahier des Charges

Le système prend maintenant en compte:
- ✅ **Coefficients des matières** (Math coef 3, Anglais coef 2, etc.)
- ✅ **Plusieurs types de contrôles** (Devoirs, Examens, Projets, Participation)
- ✅ **Calcul automatique des moyennes pondérées** par matière
- ✅ **Moyenne Générale Annuelle (MGA)** = (S1 + S2) / 2

---

## 🔢 Formules de Calcul

### 1. Moyenne par Matière
```
Moyenne Matière = Somme(toutes les notes) / Nombre de notes

Exemple:
Mathématiques: 12 (examen) + 14 (devoir) + 10 (participation)
→ Moyenne Maths = (12 + 14 + 10) / 3 = 12.00/20
```

### 2. Moyenne Pondérée du Semestre
```
Moyenne Semestre = Somme(Moyenne_Matière × Coefficient) / Somme(Coefficients)

Exemple Semestre 1:
- Maths: 12.00 × 3 = 36.00
- Physique: 15.50 × 2 = 31.00
- Info: 12.67 × 3 = 38.00
→ Total: 105.00 / 8 = 13.13/20
```

### 3. Moyenne Générale Annuelle (MGA)
```
MGA = (Moyenne S1 + Moyenne S2) / 2

Exemple:
- S1: 13.13/20
- S2: 14.20/20
→ MGA = (13.13 + 14.20) / 2 = 13.67/20
```

---

## 📝 Exemple Complet

### Étudiant: Ahmed Mohamed

#### Semestre 1

| Matière | Notes (type) | Moyenne Matière | Coefficient | Score Pondéré |
|---------|--------------|-----------------|-------------|---------------|
| **Mathématiques** | 12 (E), 14 (D), 10 (P) | 12.00 | 3 | 36.00 |
| **Physique** | 15 (E), 16 (D) | 15.50 | 2 | 31.00 |
| **Informatique** | 11 (E), 13 (Proj), 14 (D) | 12.67 | 3 | 38.00 |
| **Anglais** | 16 (E), 15 (P) | 15.50 | 2 | 31.00 |

**Calcul:**
```
Total Score Pondéré = 36.00 + 31.00 + 38.00 + 31.00 = 136.00
Total Coefficient = 3 + 2 + 3 + 2 = 10
Moyenne S1 = 136.00 / 10 = 13.60/20
```

#### Semestre 2

| Matière | Notes (type) | Moyenne Matière | Coefficient | Score Pondéré |
|---------|--------------|-----------------|-------------|---------------|
| **Mathématiques** | 13 (E), 15 (D) | 14.00 | 3 | 42.00 |
| **Physique** | 14 (E), 16 (D), 15 (P) | 15.00 | 2 | 30.00 |
| **Informatique** | 12 (Proj), 14 (E) | 13.00 | 3 | 39.00 |
| **Anglais** | 17 (E), 16 (P) | 16.50 | 2 | 33.00 |

**Calcul:**
```
Total Score Pondéré = 42.00 + 30.00 + 39.00 + 33.00 = 144.00
Total Coefficient = 3 + 2 + 3 + 2 = 10
Moyenne S2 = 144.00 / 10 = 14.40/20
```

#### Moyenne Générale Annuelle (MGA)
```
MGA = (13.60 + 14.40) / 2 = 14.00/20
```

**→ Décision: ✅ ADMIS (moyenne ≥ 10)**

---

## 🎯 Critères de Décision

| MGA | Niveau | Soutenance | Décision |
|-----|--------|------------|----------|
| ≥ 10 | L1/L2/M1 | - | ✅ **Admis - Promu** au niveau supérieur |
| < 10 | Tous | - | 🔄 **Redoublant** |
| ≥ 10 | L3/M2 | ✅ Validée | 🎓 **Diplômé** |
| ≥ 10 | L3/M2 | ❌ Non validée | 🔄 **Redoublant** (doit repasser soutenance) |

---

## 📋 Types de Contrôles Pris en Compte

Le système reconnaît automatiquement tous les types de notes saisies par les enseignants:

- **exam** (E) - Examens
- **homework** (D) - Devoirs
- **project** (Proj) - Projets
- **participation** (P) - Participation
- **quiz** (Q) - Interrogations

**Toutes les notes comptent de manière égale** dans le calcul de la moyenne de la matière.

---

## 🔧 Code Source

**Fichier:** `src/utils/promotionHelpers.js`

**Fonction principale:** `calculateYearAverage(student, allGrades)`

**Fonction détails:** `calculateDetailedAverages(student, allGrades)` (pour bulletins)

---

## ✅ Conformité Cahier des Charges

| Exigence | Statut | Détails |
|----------|--------|---------|
| Types de contrôles multiples | ✅ | Devoirs, Examens, Projets, Participation |
| Moyennes pondérées | ✅ | Coefficients respectés |
| Moyenne Générale Annuelle | ✅ | (S1 + S2) / 2 |
| Génération bulletins | 🔄 | À implémenter (fonction détaillée prête) |
| Classements | 🔄 | À implémenter |

---

## 🚀 Prochaines Étapes

1. ✅ **TERMINÉ** - Calcul moyennes pondérées
2. 🔄 **À FAIRE** - Génération PDF bulletins avec détails par matière
3. 🔄 **À FAIRE** - Classement des étudiants par MGA
4. 🔄 **À FAIRE** - Affichage détails dans le tableau de promotion

---

**Dernière mise à jour:** 2026-07-15
