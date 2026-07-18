#!/bin/bash
# 🔐 Ajout des Variables Manquantes pour Vercel Serverless
# Date: 2026-07-18

echo "════════════════════════════════════════════════════════════"
echo "🔧 Configuration Variables Serverless Vercel"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Variables actuelles détectées:"
echo "   ✅ VITE_FIREBASE_DATABASE_URL"
echo "   ✅ VITE_FIREBASE_PROJECT_ID"
echo "   ✅ VITE_FIREBASE_API_KEY"
echo ""
echo "⚠️  Variables MANQUANTES pour serverless functions:"
echo "   ❌ FIREBASE_PROJECT_ID"
echo "   ❌ FIREBASE_CLIENT_EMAIL"
echo "   ❌ FIREBASE_DATABASE_URL"
echo "   ❌ FIREBASE_PRIVATE_KEY"
echo "   ❌ ALLOWED_ORIGINS"
echo "   ❌ ANTHROPIC_API_KEY"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

read -p "Appuyer sur ENTRÉE pour commencer..."

# 1. FIREBASE_PROJECT_ID
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  FIREBASE_PROJECT_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Valeur: university-saas-7b31e"
echo ""
echo "university-saas-7b31e" | npx vercel env add FIREBASE_PROJECT_ID production

# 2. FIREBASE_CLIENT_EMAIL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  FIREBASE_CLIENT_EMAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Valeur: firebase-adminsdk-fbsvc@university-saas-7b31e.iam.gserviceaccount.com"
echo ""
echo "firebase-adminsdk-fbsvc@university-saas-7b31e.iam.gserviceaccount.com" | npx vercel env add FIREBASE_CLIENT_EMAIL production

# 3. FIREBASE_DATABASE_URL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  FIREBASE_DATABASE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Valeur: https://university-saas-7b31e-default-rtdb.firebaseio.com"
echo ""
echo "https://university-saas-7b31e-default-rtdb.firebaseio.com" | npx vercel env add FIREBASE_DATABASE_URL production

# 4. ALLOWED_ORIGINS
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  ALLOWED_ORIGINS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Valeur: https://university-saas.vercel.app"
echo ""
echo "https://university-saas.vercel.app" | npx vercel env add ALLOWED_ORIGINS production

# 5. ANTHROPIC_API_KEY
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  ANTHROPIC_API_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Valeur: sk-ant-api03-o0IQsI..."
echo ""
echo "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" | npx vercel env add ANTHROPIC_API_KEY production

# 6. FIREBASE_PRIVATE_KEY (CRITIQUE)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  FIREBASE_PRIVATE_KEY ⚠️  ATTENTION ⚠️"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  FORMAT CRITIQUE: Clé avec \\n littéraux"
echo ""
echo "La clé va être ajoutée automatiquement au bon format..."
echo ""

# Lire la clé depuis le fichier JSON et la passer directement
FIREBASE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDpBDpt6I151RzL\nsf5cunWygjNHsH3Z+lsQcW2M1fGmc9iqATaRyV420nWuOfQCK+f5gJLmheRCrwv8\nRYps2mzKQqmJ7USK9mSvdr6n6SLAcD4uEfyLnuWBJrdUxtAmeDmdLMAcF8xGTOnD\nUp4qicahYMUUETu5tOiuVIfFK54IGTAxYImsI3KTekKPE7Y9rVOKslXt/Ifiyrgs\nh0Ab74oN/LqP3KoANk63a/Phxa24ryqd5CkaIo4jrDAFjiriYd+EbzlPmvNyM/8T\n7QtcaJeGdoOtku8tnOvUOWWOx+nfXT/oIJt5dJZSNeUNkgm1xDPO+lZq8dcKaDZ2\ngrnVeNujAgMBAAECggEAFHhdSa/W/eT4P/dwXmUNrJOTkwYGMv1eEqEO/AME1O1I\naLxCjFF3CAnlHLEqpnuE8tOWFCT0WzIAM4vzD9erHE75kIxaK9BezVX5LyG5U9Pd\nzTOh+Vde12xh8/34kJNEkcePTj3ToY662oCKNI0go1IE/jD6tjhrrc+Z6HsJybGB\n3glRAEzJ2gD+9Gch6UyOyDyFUnDSRT8eTbA5JDqbJf7z9kFOqQEWbOGVIJmJjTAd\n7YYY23Vz8C0wctjxSjI+8hbvUikVtZgwLSINaKTPUibX3CfbhM+JjCGNzijSneWu\nDqNQUt1oEXgz0hmFbl6+a3EKRjTh06uVOV1zaEo9wQKBgQD0bHqdyNkhGJX4Nkbb\nHNKOkxFbj5wGgKPOHHdpAX2+Jz+2nNOXwuLe93Iw6HV19ZjdEItu1MX9QJWoJAi/\nBVICSDhtYhfVOJrQU6Z33fG8YkJmKJZWVIqF2UcEc8Hg6TDmW2AMuEQab9464niH\nacS+TRCayXzKnC4zaQVwYv33JwKBgQD0DXErXw+HXbbz52kXlOMvO6li/yBihYsw\nKb0/IaEijT2UnU9JCUiNmiZ+OQvxRH6/A2KkJai3h2Fw/qDdb5R/QDihjGHsXUON\nnD+0VmgJMa8a5WZCrLVFzWUw2+KMCsq05YCxVyrH0jRU7icMFYFwjH11WaOle/pM\nWSONQMilJQKBgQCdDS7kP2+0olWKfWWd2LE6Ryk6CdaZHwMhpozbfcfL7PA1aCNV\nOjYISjqnTlZbCwnD0aOl/TWSenMu7KhqBQMi0EDhl8v0h0CCZ51pG8T95K0Bc0bW\nBdBUHL5TEAYde/idq0zWH3gy/Hpwn6AOclmmZWIr8xcqIJxXED4cbp78tQKBgCs6\nFklwVPfNCZK58ktS+8pp7t6yAbJxpO2q9vIvqrLMAZRJKLnvAwLRwu+oew0I7Mo4\nd0hLw05+lCvHbgbKtKq1XVJ/4vhSrJxwiHgQteyq+DDzYOF+Zb0vXDUDPWVApBbW\nb6z5m4I5ITvJ0vC4/mxI9g/LCMlO5E6Rm1JxnxhhAoGBAN93EyT4Q3AojLoTXFzv\nv2Q++AUeaBqbu5vWtS+Uqv3LqzaS4msvVEx24tzkdjU1QiMTsWngB7CxWbVcO15X\nUF6XKmmW/mIBkoTqs3ycYcHnrT/rZswltwSZR/tRkS5g4VKEYPyPg0/4pBxmDuh6\nBneESjdWAGPPQZwZJYHmwn2m\n-----END PRIVATE KEY-----\n'

echo "$FIREBASE_PRIVATE_KEY" | npx vercel env add FIREBASE_PRIVATE_KEY production

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Configuration terminée!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Vérifier les variables:"
echo "   npx vercel env ls production"
echo ""
echo "🚀 Redéployer avec les nouvelles variables:"
echo "   npx vercel --prod"
echo ""
echo "📊 Surveiller le déploiement:"
echo "   https://vercel.com/moulayel-ab-s-projects/university-saas"
echo ""
echo "════════════════════════════════════════════════════════════"
