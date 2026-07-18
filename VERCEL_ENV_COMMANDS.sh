#!/bin/bash
# 🔐 Script de Configuration Variables d'Environnement Vercel
# Date: 2026-07-18
# Projet: university-saas

echo "=========================================="
echo "🚀 Configuration Vercel Environment"
echo "=========================================="
echo ""

# Vérifier que vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI non installé"
    echo "📦 Installer avec: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI détecté"
echo ""

# Login Vercel
echo "🔑 Connexion à Vercel..."
vercel login

echo ""
echo "📋 Configuration des variables d'environnement"
echo "⚠️  Entrer les valeurs EXACTES pour chaque variable"
echo ""

# FIREBASE_PROJECT_ID
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  FIREBASE_PROJECT_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Valeur attendue: university-saas-7b31e"
vercel env add FIREBASE_PROJECT_ID production

# FIREBASE_CLIENT_EMAIL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  FIREBASE_CLIENT_EMAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Valeur attendue: firebase-adminsdk-fbsvc@university-saas-7b31e.iam.gserviceaccount.com"
vercel env add FIREBASE_CLIENT_EMAIL production

# FIREBASE_DATABASE_URL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  FIREBASE_DATABASE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Valeur attendue: https://university-saas-7b31e-default-rtdb.firebaseio.com"
vercel env add FIREBASE_DATABASE_URL production

# VITE_FIREBASE_DATABASE_URL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  VITE_FIREBASE_DATABASE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Valeur attendue: https://university-saas-7b31e-default-rtdb.firebaseio.com"
vercel env add VITE_FIREBASE_DATABASE_URL production

# ALLOWED_ORIGINS
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  ALLOWED_ORIGINS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Valeur attendue: https://university-saas.vercel.app"
vercel env add ALLOWED_ORIGINS production

# ANTHROPIC_API_KEY
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  ANTHROPIC_API_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Copier depuis backend/.env (ligne ANTHROPIC_API_KEY)"
echo "Valeur attendue: sk-ant-api03-..."
vercel env add ANTHROPIC_API_KEY production

# FIREBASE_PRIVATE_KEY (CRITIQUE)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  FIREBASE_PRIVATE_KEY ⚠️  ATTENTION ⚠️"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  FORMAT CRITIQUE:"
echo "   - Ouvrir: backend/firebase-admin-key.json"
echo "   - Copier la valeur du champ 'private_key'"
echo "   - Coller EXACTEMENT avec \\n littéraux"
echo ""
echo "   Exemple correct:"
echo '   "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n-----END PRIVATE KEY-----\n"'
echo ""
echo "   ❌ PAS DE VRAIS RETOURS À LA LIGNE"
echo "   ✅ UTILISER \\n LITTÉRALEMENT"
echo ""
read -p "Appuyer sur ENTRÉE quand prêt..."
vercel env add FIREBASE_PRIVATE_KEY production

echo ""
echo "=========================================="
echo "✅ Configuration terminée!"
echo "=========================================="
echo ""
echo "📋 Prochaines étapes:"
echo ""
echo "1. Vérifier les variables:"
echo "   vercel env ls production"
echo ""
echo "2. Déployer l'application:"
echo "   git push origin preproduction"
echo ""
echo "3. Surveiller le déploiement:"
echo "   https://vercel.com/moulayel-ab-s-projects/university-saas"
echo ""
echo "4. Tester l'API:"
echo "   curl https://university-saas.vercel.app/api/health"
echo ""
echo "=========================================="
