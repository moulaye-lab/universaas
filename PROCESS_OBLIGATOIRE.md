# ⚠️ PROCESSUS OBLIGATOIRE - À RELIRE AVANT TOUTE MODIFICATION

## 🚨 RÈGLE ABSOLUE
**JE DOIS LIRE CE FICHIER AVANT D'ÉCRIRE UNE SEULE LIGNE DE CODE.**

---

## MÉTHODOLOGIE STRICTE EN 3 ÉTAPES

### ÉTAPE 1: LIRE 📖 (OBLIGATOIRE)

**Avant toute modification, je dois LIRE:**

1. **Le fichier concerné** (avec `Read` tool)
   - Lire TOUT le fichier, pas juste une partie
   - Comprendre la structure actuelle
   - Identifier les dépendances

2. **Les fichiers connexes** si nécessaire
   - Imports/exports
   - Fichiers appelants
   - Fichiers appelés

3. **Le contexte du problème**
   - Message d'erreur COMPLET
   - Console du navigateur
   - Logs Firebase/serveur

**❌ INTERDIT:**
- Deviner la structure d'un fichier
- Supposer qu'un fichier existe
- Faire des modifications "à l'aveugle"
- Copier du code sans vérifier le contexte

**✅ JE DOIS:**
- Utiliser `Read` systématiquement
- Utiliser `Grep` pour chercher des patterns
- Utiliser `Bash` pour vérifier l'existence de fichiers

---

### ÉTAPE 2: PLANIFIER 🎯 (OBLIGATOIRE)

**Avant toute modification, je dois ÉCRIRE UN PLAN:**

1. **Diagnostic du problème**
   - Quelle est la cause racine?
   - Quels fichiers sont impactés?
   - Y a-t-il des effets de bord?

2. **Hypothèses et validation**
   - Lister toutes les hypothèses possibles
   - Éliminer les fausses pistes
   - Identifier la vraie cause

3. **Solution proposée**
   - Quelle modification exacte?
   - Pourquoi cette solution?
   - Y a-t-il des alternatives?

4. **Impact et risques**
   - Quels autres fichiers seront affectés?
   - Risque de casser quelque chose?
   - Tests nécessaires?

**❌ INTERDIT:**
- Passer directement à l'implémentation
- Faire des changements "pour voir"
- Modifier plusieurs choses à la fois
- Ne pas anticiper les effets de bord

**✅ JE DOIS:**
- Écrire le plan en commentaire avant de coder
- Demander confirmation si la solution est complexe
- Prévoir les tests

---

### ÉTAPE 3: IMPLÉMENTER ⚙️ (AVEC PRUDENCE)

**Une fois le plan validé:**

1. **Modifications minimales**
   - Changer UNIQUEMENT ce qui est nécessaire
   - Une modification à la fois
   - Commit atomique par changement

2. **Vérification immédiate**
   - Tester après CHAQUE modification
   - Vérifier dans le navigateur si UI
   - Lire les logs d'erreur

3. **Documentation**
   - Message de commit clair et détaillé
   - Commenter le code si logique complexe
   - Mettre à jour la documentation si nécessaire

**❌ INTERDIT:**
- Faire 10 modifications d'un coup
- Commit groupé de plusieurs fonctionnalités
- Ignorer les warnings/erreurs
- Passer à la suite sans vérifier

**✅ JE DOIS:**
- Commit après chaque modification logique
- Tester immédiatement
- Lire les messages d'erreur COMPLETS

---

## CAS SPÉCIAUX

### 🔥 Erreur Firebase Rules

**SI erreur "Index not defined":**

1. **VÉRIFIER d'abord** que les rules locales ont bien `.indexOn`
   ```bash
   grep -A 2 '"students":' database.rules.json
   ```

2. **VÉRIFIER** que l'utilisateur a bien DÉPLOYÉ les rules
   - Demander confirmation explicite
   - Lui demander de vérifier dans Firebase Console
   - Ne PAS supposer que c'est fait

3. **SI les rules locales sont correctes MAIS l'erreur persiste:**
   - ❌ NE PAS modifier le code applicatif
   - ✅ Demander à l'utilisateur de RE-déployer
   - ✅ Vérifier dans Firebase Console directement

4. **SEULEMENT après confirmation du déploiement:**
   - Alors modifier le code si nécessaire

### 🔥 Liste vide après modification

**SI une liste devient vide après modification:**

1. **LIRE** le hook de pagination complet
2. **LIRE** les Firebase Rules pour cette collection
3. **VÉRIFIER** dans la console navigateur:
   - Y a-t-il une erreur?
   - Les données sont-elles chargées?
   - Y a-t-il un problème de permission?

4. **NE PAS** supposer que le problème est dans le code
5. **VÉRIFIER** d'abord les règles Firebase

### 🔥 Import/Export manquants

**SI erreur "module not found":**

1. **VÉRIFIER** que le fichier existe avec `Bash ls`
2. **LIRE** le fichier pour voir ce qu'il export
3. **SEULEMENT APRÈS** modifier l'import

---

## CHECKLIST AVANT TOUTE MODIFICATION

- [ ] J'ai LU le fichier concerné avec `Read`
- [ ] J'ai LU les fichiers connexes si nécessaire  
- [ ] J'ai COMPRIS le problème (cause racine identifiée)
- [ ] J'ai ÉCRIT un plan (diagnostic + solution)
- [ ] J'ai ANTICIPÉ les effets de bord
- [ ] Ma modification est MINIMALE
- [ ] Je vais TESTER immédiatement après

---

## RAPPEL FINAL

> **"Mesurer deux fois, couper une fois."**

- Pas de modification sans lecture complète
- Pas de code sans plan
- Pas de commit sans vérification

**L'UTILISATEUR COMPTE SUR MOI POUR ÊTRE RIGOUREUX ET MÉTHODIQUE.**

Je dois PROUVER que je suis un développeur professionnel, pas un amateur qui fait des modifications au hasard.
