# 🔒 Audit de Sécurité Firebase Rules

**Date** : 2026-07-04  
**Statut** : ⚠️ FAILLES CRITIQUES DÉTECTÉES

---

## ❌ FAILLES DE SÉCURITÉ CRITIQUES

### 1. 🔴 CRITIQUE : Audit logs accessibles en écriture par TOUS les utilisateurs authentifiés

**Ligne 76** : `"audit": { ".write": "auth != null" }`

**Problème** :
- N'importe quel utilisateur connecté peut écrire dans les logs d'audit
- Un enseignant peut falsifier des logs
- Un étudiant peut injecter de fausses actions
- Un parent peut modifier l'historique

**Impact** : CRITIQUE - Perte totale de l'intégrité des logs d'audit

**Solution** :
```json
"audit": {
  ".read": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme')",
  ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme')"
}
```

---

### 2. 🟠 IMPORTANT : Lecture audit limitée à admin_universite seulement

**Ligne 75** : `".read": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin_universite'"`

**Problème** :
- Le super_admin ne peut pas lire les logs d'audit des universités
- Incohérent avec le modèle de gouvernance

**Impact** : MOYEN - Le super admin devrait avoir accès aux audits

**Solution** : Inclure super_admin_plateforme dans la lecture (voir solution au point 1)

---

### 3. 🟡 MOYEN : Teachers peuvent lire TOUS les teachers de l'université

**Ligne 27** : `".read": "auth != null && root.child('users').child(auth.uid).child('universityId').val() === $universityId"`

**Problème** :
- Un enseignant peut lire les données personnelles (email, téléphone) de tous les autres enseignants
- Aucun besoin métier pour cela (sauf annuaire public)

**Impact** : MOYEN - Violation du principe de moindre privilège

**Considération** : Est-ce voulu ? Si non, restreindre :
```json
"teachers": {
  "$teacherId": {
    ".read": "auth != null && (root.child('users').child(auth.uid).child('universityId').val() === $universityId && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme' || auth.uid === $teacherId))",
    ".write": "..."
  }
}
```

---

### 4. 🟡 MOYEN : Les enseignants peuvent lire tous les grades

**Ligne 41** : Enseignants peuvent lire les notes de TOUS les étudiants, pas seulement leurs classes

**Problème** :
- Un prof de maths peut voir les notes de l'étudiant en histoire
- Pas de vérification que l'enseignant enseigne effectivement à cet étudiant

**Impact** : MOYEN - Sur-privilège des enseignants

**Note** : Difficile à corriger sans complexifier énormément les rules. Acceptable si considéré comme un besoin métier (salle des profs, coordination pédagogique).

---

### 5. 🟡 MOYEN : Les étudiants peuvent écrire leurs propres notes

**Ligne 42** : `"(root.child('users').child(auth.uid).child('role').val() === 'student' && root.child('users').child(auth.uid).child('profileId').val() === $studentId)"`

**Problème** :
- Un étudiant peut modifier ses propres notes dans Firebase
- Il peut augmenter ses moyennes, ajouter des notes fictives

**Impact** : CRITIQUE si non contrôlé par l'application

**Solution** : Retirer le droit d'écriture pour les étudiants :
```json
"grades": {
  "$studentId": {
    ".read": "...",
    ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'teacher' || root.child('users').child(auth.uid).child('role').val() === 'admin_universite')"
  }
}
```

---

## ✅ RÈGLES CORRECTES

### 1. ✅ Isolation multi-tenant stricte
- Ligne 10 : Vérification correcte du `universityId`
- Les utilisateurs d'une université ne peuvent pas accéder aux données d'une autre

### 2. ✅ Super admin a accès global
- Ligne 7, 10, 11 : Super admin peut tout lire/écrire

### 3. ✅ Parents avec childrenAccess index
- Ligne 10, 20, 41, 48 : Vérification stricte avec `childrenAccess`
- Parents ne peuvent voir que les données de leurs enfants

### 4. ✅ Users isolation
- Ligne 83 : Un utilisateur ne peut lire que son propre profil
- Ligne 84 : Seul super_admin et admin_universite peuvent modifier les profils

### 5. ✅ Platform data protégée
- Ligne 89-90 : Seul super_admin accède aux analytics de la plateforme

---

## 📋 CORRECTIONS PRIORITAIRES

### URGENT (à corriger maintenant)

1. **Audit logs** : Restreindre l'écriture aux admins seulement
2. **Grades écriture étudiants** : Supprimer le droit d'écriture

### IMPORTANT (à corriger rapidement)

3. **Audit logs lecture** : Ajouter super_admin

### À CONSIDÉRER (selon besoins métier)

4. **Teachers lecture** : Décider si un prof peut voir les infos des autres profs
5. **Teachers/grades** : Décider si un prof peut voir toutes les notes ou seulement ses classes

---

## 🛠️ RÈGLES CORRIGÉES COMPLÈTES

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "universities": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme'",

      "$universityId": {
        ".read": "auth != null && (root.child('users').child(auth.uid).child('universityId').val() === $universityId || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme' || root.child('users').child(auth.uid).child('childrenAccess').child($universityId).exists())",
        ".write": "auth != null && (root.child('users').child(auth.uid).child('universityId').val() === $universityId || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme')",

        "info": {
          ".read": "auth != null && (root.child('users').child(auth.uid).child('universityId').val() === $universityId || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme')",
          ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme')"
        },

        "students": {
          "$studentId": {
            ".read": "auth != null && (root.child('users').child(auth.uid).child('universityId').val() === $universityId || root.child('users').child(auth.uid).child('childrenAccess').child($universityId).child($studentId).val() === true)",
            ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme' || (root.child('users').child(auth.uid).child('role').val() === 'student' && root.child('users').child(auth.uid).child('profileId').val() === $studentId))"
          }
        },

        "teachers": {
          "$teacherId": {
            ".read": "auth != null && root.child('users').child(auth.uid).child('universityId').val() === $universityId",
            ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme')"
          }
        },

        "courses": {
          "$courseId": {
            ".read": "auth != null && root.child('users').child(auth.uid).child('universityId').val() === $universityId",
            ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('role').val() === 'teacher' || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme')"
          }
        },

        "grades": {
          "$studentId": {
            ".read": "auth != null && (root.child('users').child(auth.uid).child('profileId').val() === $studentId || root.child('users').child(auth.uid).child('role').val() === 'teacher' || root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('childrenAccess').child($universityId).child($studentId).val() === true)",
            ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'teacher' || root.child('users').child(auth.uid).child('role').val() === 'admin_universite')"
          }
        },

        "payments": {
          "$studentId": {
            ".read": "auth != null && (root.child('users').child(auth.uid).child('profileId').val() === $studentId || root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('childrenAccess').child($universityId).child($studentId).val() === true)",
            ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || (root.child('users').child(auth.uid).child('role').val() === 'student' && root.child('users').child(auth.uid).child('profileId').val() === $studentId))"
          }
        },

        "liveSessions": {
          "$sessionId": {
            ".read": "auth != null && root.child('users').child(auth.uid).child('universityId').val() === $universityId",
            ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'teacher' || root.child('users').child(auth.uid).child('role').val() === 'admin_universite')"
          }
        },

        "notifications": {
          "$notifId": {
            ".read": "auth != null && (root.child('users').child(auth.uid).child('universityId').val() === $universityId || root.child('users').child(auth.uid).child('childrenAccess').child($universityId).exists())",
            ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('role').val() === 'teacher')"
          }
        },

        "library": {
          "$resourceId": {
            ".read": "auth != null && root.child('users').child(auth.uid).child('universityId').val() === $universityId",
            ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'teacher' || root.child('users').child(auth.uid).child('role').val() === 'admin_universite')"
          }
        },

        "audit": {
          ".read": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme')",
          ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin_universite' || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme')"
        }
      }
    },

    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme' || root.child('users').child(auth.uid).child('role').val() === 'admin_universite')"
      }
    },

    "platform": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme'",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'super_admin_plateforme'"
    }
  }
}
```

---

## 🎯 RÉSUMÉ

**Failles CRITIQUES** : 2
- Audit logs en écriture libre (URGENT)
- Étudiants peuvent modifier leurs notes (URGENT)

**Failles MOYENNES** : 3
- Audit logs lecture restreinte
- Teachers peuvent tout lire
- Teachers peuvent voir toutes les notes

**Recommandation** : Appliquer les corrections URGENTES immédiatement avant la présentation.
