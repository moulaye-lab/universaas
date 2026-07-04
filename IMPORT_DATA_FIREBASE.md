# 📥 Importer les Données de Démonstration dans Firebase

## Pourquoi le dashboard charge indéfiniment ?

Le dashboard attend des données depuis Firebase, mais la base est vide. Je vais te montrer comment importer les données de démo.

---

## 🚀 Méthode Rapide : Import JSON

### Étape 1 : Ouvrir Firebase Console

1. Va sur https://console.firebase.google.com/
2. Sélectionne ton projet `university-saas`
3. Clique sur **Realtime Database** dans le menu de gauche
4. Clique sur l'onglet **Données**

### Étape 2 : Importer le JSON de démo

1. **Ouvre le fichier `SEED_DATA.json`** à la racine du projet
2. **Copie TOUT le contenu** (Ctrl+A puis Ctrl+C)
3. **Dans Firebase Console** :
   - Clique sur les **3 points verticaux `⋮`** en haut à droite
   - Sélectionne **"Importer JSON"**
4. **Colle le JSON** dans le champ qui apparaît
5. **Clique sur "Importer"**

⚠️ **Attention** : Cela va **fusionner** les données avec ce qui existe déjà (notamment ton user super_admin).

### Étape 3 : Vérifier l'import

Tu devrais maintenant voir dans Firebase Database :
```
/platform
  /analytics (stats globales)
/universities
  /univ-sorbonne-2026
  /univ-polytechnique-2026
  /univ-sciences-po-2026
  ... (6 universités au total)
/users
  /ton_uid (ton compte super admin)
```

### Étape 4 : Rafraîchir le dashboard

1. Retourne sur http://localhost:5173
2. **Rafraîchis la page (F5)**
3. Reconnecte-toi si nécessaire

**Le dashboard devrait maintenant afficher toutes les stats et universités !** 🎉

---

## 🎨 Ce que tu vas voir

### Stats cards (en haut)
- **42 universités** (+12%)
- **105K+ étudiants** (+23%)
- **12 558€ de revenus mensuels** (+18%)
- **15.2% de croissance**

### Tableau des universités
6 universités de démo :
1. **Sorbonne** - Premium, Actif, 1842 étudiants
2. **Polytechnique** - Enterprise, Actif, 3250 étudiants
3. **Sciences Po** - Premium, Actif, 1654 étudiants
4. **ESSEC** - Premium, Actif, 1420 étudiants
5. **Lyon** - Standard, Essai (trial), 180 étudiants
6. **Marseille** - Standard, Suspendu, 420 étudiants

Avec badges de couleur pour les statuts et plans !

---

## ❌ Problème : "Permission denied"

Si tu vois une erreur de permissions, c'est que les règles Firebase bloquent l'accès.

**Solution** :
1. Va dans **Realtime Database** → **Règles**
2. Vérifie que tu as bien les règles du fichier `database.rules.json`
3. Assure-toi que ton utilisateur a bien `role: "super_admin_plateforme"` dans `/users/ton_uid`

---

## 🔄 Alternative : Import Automatique (script Node.js)

Si tu préfères, je peux créer un script qui importe automatiquement les données. Dis-moi juste "crée le script" et je le fais.

---

**Après l'import, ton dashboard sera magnifique avec toutes les données ! 🚀**
