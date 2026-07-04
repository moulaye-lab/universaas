# 🤖 WORKFLOW OBLIGATOIRE CLAUDE - PROCESSUS STRICT

> **CE FICHIER EST MON GUIDE INTERNE.**  
> **JE DOIS LE SUIVRE APRÈS CHAQUE ACTION, SANS EXCEPTION.**

---

## ✅ CHECKLIST OBLIGATOIRE APRÈS CHAQUE ACTION

### 📝 ÉTAPE 1 : Mettre à jour README.md (OBLIGATOIRE)

**Quand ?** Après chaque fonctionnalité complétée, bug corrigé, ou changement important.

**Où ?** `/Users/itopie/Desktop/university-saas/README.md`

**Quoi mettre à jour ?**
- [ ] Section "État d'Avancement Actuel" avec checkboxes
- [ ] Ajouter [x] pour ce qui est fait
- [ ] Ajouter [ ] pour ce qui reste à faire
- [ ] Mettre à jour "Dernière mise à jour" avec date/heure
- [ ] Mettre à jour "Status" avec phase actuelle
- [ ] Mettre à jour "Progression globale" en pourcentage

**Exemple :**
```markdown
**Dernière mise à jour**: 2026-07-04 00:30
**Status**: Phase 3 - Correction dashboard Étudiant terminée
**Progression globale**: 70% complété
```

---

### 🎯 ÉTAPE 2 : Mettre à jour ACTIONS_REQUISES.md (OBLIGATOIRE)

**Quand ?** 
- Quand j'ai besoin que l'utilisateur fasse quelque chose (test, config manuelle, validation)
- Quand une tâche utilisateur est complétée (cocher et déplacer dans "Tâches complétées")

**Où ?** `/Users/itopie/Desktop/university-saas/ACTIONS_REQUISES.md`

**Quoi faire ?**
- [ ] Si nouvelle tâche utilisateur → Ajouter dans "TÂCHES EN ATTENTE"
- [ ] Spécifier : Statut, Temps estimé, Priorité, Étapes détaillées, Checklist
- [ ] Si tâche complétée → Déplacer dans "TÂCHES COMPLÉTÉES" avec date
- [ ] Si aucune tâche → Écrire "Aucune tâche en attente pour le moment"
- [ ] Mettre à jour "Dernière mise à jour" en footer

---

### 📚 ÉTAPE 3 : Mettre à jour METHODOLOGY.md (OBLIGATOIRE)

**Quand ?** Après chaque changement de phase ou étape majeure.

**Où ?** `/Users/itopie/Desktop/university-saas/METHODOLOGY.md`

**Quoi mettre à jour ?**
- [ ] Section "Progression Actuelle" en footer
- [ ] Phases complétées (✅)
- [ ] Phases en cours (🔄)
- [ ] Phases à venir (⏳)
- [ ] "Dernière mise à jour" avec date/heure
- [ ] "Phase actuelle" avec description
- [ ] "Prochaine étape" avec ce qui va être fait

---

### 📦 ÉTAPE 4 : Documenter dans PROMPTS.md (SI APPLICABLE)

**Quand ?** Quand j'utilise un prompt complexe (>100 mots) ou génère une fonctionnalité importante.

**Où ?** `/Users/itopie/Desktop/university-saas/PROMPTS.md`

**Quoi documenter ?**
- [ ] Contexte du prompt
- [ ] Prompt complet utilisé
- [ ] Résultat obtenu
- [ ] Leçons apprises
- [ ] Numéro de prompt (#4, #5, etc.)

---

### 💾 ÉTAPE 5 : Sauvegarder en mémoire (SI APPLICABLE)

**Quand ?** 
- Validation importante de l'utilisateur ("j'adore ce style", "c'est parfait")
- Décision technique majeure
- Feedback sur méthodologie de travail

**Où ?** `/Users/itopie/.claude/projects/-Users-itopie-Desktop-university-saas/memory/`

**Fichiers à mettre à jour :**
- [ ] `project_overview.md` - Décisions projet, validations utilisateur
- [ ] `work_methodology.md` - Feedback sur ma façon de travailler
- [ ] `progress_tracking.md` - État d'avancement (pointer vers README.md)
- [ ] `user_profile.md` - Nouvelles préférences utilisateur

---

## 🚨 RÈGLES STRICTES

### ❌ NE JAMAIS :
1. Passer à une nouvelle tâche sans mettre à jour README.md
2. Demander à l'utilisateur de faire quelque chose sans mettre à jour ACTIONS_REQUISES.md
3. Terminer une phase sans mettre à jour METHODOLOGY.md
4. Oublier de cocher les checkboxes dans README.md
5. Laisser des informations obsolètes dans les fichiers de suivi

### ✅ TOUJOURS :
1. Lire README.md AVANT de commencer une nouvelle action
2. Mettre à jour les 3 fichiers (README, ACTIONS_REQUISES, METHODOLOGY) après chaque action significative
3. Être précis sur les dates et heures ("2026-07-04 00:30", pas "aujourd'hui")
4. Cocher [x] ce qui est fait, laisser [ ] ce qui reste
5. Donner des pourcentages de progression réalistes

---

## 📋 TEMPLATE DE MISE À JOUR RAPIDE

Après chaque action, je dois me poser ces questions :

**1. Qu'est-ce qui a changé ?**
→ Mettre à jour README.md avec [x] ou nouveau [ ]

**2. L'utilisateur doit-il faire quelque chose ?**
→ Mettre à jour ACTIONS_REQUISES.md avec tâche détaillée

**3. Ai-je changé de phase ou complété une étape majeure ?**
→ Mettre à jour METHODOLOGY.md

**4. Ai-je utilisé un prompt complexe ?**
→ Documenter dans PROMPTS.md

**5. L'utilisateur a-t-il validé quelque chose d'important ?**
→ Sauvegarder en mémoire

---

## 🎯 EXEMPLE DE WORKFLOW COMPLET

**Situation :** Je viens de corriger le dashboard Étudiant.

**Étape 1 - README.md :**
```markdown
- [x] **Dashboard Étudiant** ✅ FONCTIONNEL (corrigé le 2026-07-04 00:30)

**Dernière mise à jour**: 2026-07-04 00:30
**Progression globale**: 70% complété
```

**Étape 2 - ACTIONS_REQUISES.md :**
```markdown
### ✋ TÂCHE #4 : Tester Dashboard Étudiant

- [ ] Te connecter avec `etudiant@sorbonne.fr` / `Voir .env.local → TEST_STUDENT_PASSWORD`
- [ ] Vérifier la section "Mes Notes"
- [ ] Vérifier les cours vidéo
- [ ] Tester l'export RGPD

**Dernière mise à jour** : 2026-07-04 00:30
```

**Étape 3 - METHODOLOGY.md :**
```markdown
🔄 **Phase 3 en cours** : 4 dashboards OK, 1 en correction (Parent)

**Dernière mise à jour :** 2026-07-04 00:30
```

**Étape 4 - Informer l'utilisateur :**
```
✅ Dashboard Étudiant corrigé ! 

README.md, ACTIONS_REQUISES.md et METHODOLOGY.md mis à jour.

Teste maintenant avec `etudiant@sorbonne.fr` / `Voir .env.local → TEST_STUDENT_PASSWORD`
```

---

## 🔄 FRÉQUENCE DE MISE À JOUR

| Fichier | Fréquence |
|---------|-----------|
| README.md | Après CHAQUE action significative |
| ACTIONS_REQUISES.md | Quand je demande à l'utilisateur de faire qqch |
| METHODOLOGY.md | Après changement de phase ou étape majeure |
| PROMPTS.md | Après utilisation d'un prompt complexe |
| Mémoire | Après validation importante utilisateur |

---

## ✅ VALIDATION DE MON WORKFLOW

Avant de répondre à l'utilisateur après une action, je dois vérifier :

- [ ] README.md mis à jour ?
- [ ] ACTIONS_REQUISES.md mis à jour (si applicable) ?
- [ ] METHODOLOGY.md mis à jour (si changement de phase) ?
- [ ] Dates et heures précises partout ?
- [ ] Pourcentage de progression réaliste ?
- [ ] Checkboxes [x] cochées pour ce qui est fait ?

**SI UN SEUL "NON" → JE METS À JOUR AVANT DE RÉPONDRE.**

---

**CE WORKFLOW EST MON CONTRAT AVEC L'UTILISATEUR.**  
**JE M'ENGAGE À LE SUIVRE SYSTÉMATIQUEMENT.**

---

**Dernière mise à jour du workflow** : 2026-07-04 00:20  
**Créé suite au feedback utilisateur** : "N'oublie plus car c'est important pour ma compréhension"
