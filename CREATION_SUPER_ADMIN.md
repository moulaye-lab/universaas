# 🔐 Création du Compte Super Admin

Le compte Super Admin a été créé avec les credentials suivants :

## 📋 Informations de Connexion

```
📧 Email    : superadmin@universaas.com
🔑 Password : SuperAdmin2026!
🆔 UID      : 2nSxa7V2icgImsGTha8RiI8h0d12
```

## 🌐 URLs

- **Login** : https://university-saas.vercel.app/login
- **Dashboard Super Admin** : https://university-saas.vercel.app/dashboard/super-admin

## ⚠️ IMPORTANT - Première Connexion

**Lors de la toute première connexion au dashboard Super Admin**, il faut impérativement :

1. ✅ Se connecter avec les credentials ci-dessus
2. ✅ **Cliquer sur le bouton "Synchroniser"** en haut à droite du dashboard
3. ✅ Confirmer l'opération
4. ✅ Attendre quelques secondes

Cela va **migrer toutes les universités existantes** du nœud `universities/` vers `system_admin/tenants_management/` et permettre l'affichage correct des :
- Stats globales (MRR, universités actives, étudiants)
- Liste des universités avec leur statut
- Fonctionnalités de suspension/activation
- Changement de plan

## 🔧 Création Manuelle du Profil (Si nécessaire)

Si le compte Super Admin existe dans Firebase Auth mais que le profil n'est pas créé dans Realtime Database, suivre ces étapes :

### Via Firebase Console :

1. Aller sur https://console.firebase.google.com/project/university-saas-7b31e/database/data
2. Naviguer vers `/users/2nSxa7V2icgImsGTha8RiI8h0d12`
3. Créer le nœud avec les données suivantes :

```json
{
  "email": "superadmin@universaas.com",
  "displayName": "Super Admin Plateforme",
  "firstName": "Super",
  "lastName": "Admin",
  "role": "super_admin_plateforme",
  "createdAt": 1737078000000,
  "profileId": "2nSxa7V2icgImsGTha8RiI8h0d12",
  "loginMethod": "email"
}
```

### Via Script (Alternative) :

```bash
node scripts/createSuperAdmin.mjs
```

**Note** : Le script peut échouer à cause des Firebase Rules si le profil n'existe pas déjà. Dans ce cas, utiliser Firebase Console.

## 🎯 Fonctionnalités Disponibles

Une fois connecté et synchronisé, le Super Admin peut :

- ✅ **Voir les stats globales** : MRR, ARR, nombre d'universités actives, étudiants totaux
- ✅ **Lister toutes les universités** clientes avec leur plan et statut
- ✅ **Suspendre une université** (avec raison obligatoire) → L'université perd l'accès instantanément
- ✅ **Réactiver une université** suspendue
- ✅ **Changer le plan d'abonnement** (basic, standard, premium, enterprise)
- ✅ **Synchroniser** les tenants manuellement
- ✅ **Monitorer la consommation IA** (tokens, coûts par université) - À venir dans l'UI

## 🔒 Sécurité

- ✅ Le nœud `system_admin/` est **protégé par Firebase Rules**
- ✅ Seul un utilisateur avec `role: 'super_admin_plateforme'` peut lire/écrire
- ✅ Tous les admins d'université et autres rôles sont **bloqués**
- ✅ Toutes les actions sont **auditées** avec timestamp et UID

## 📚 Pour en Savoir Plus

Voir la documentation complète : `SUPER_ADMIN_IMPLEMENTATION.md`
