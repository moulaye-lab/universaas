/**
 * Page de Connexion Premium
 * Design cohérent avec la Landing Page
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '../config/firebase';
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState(''); // Email OU Téléphone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Détection automatique : Email vs Téléphone
      let email = identifier.trim();

      // Si ça commence par + ou des chiffres uniquement → Téléphone
      if (/^[\+\d\s]+$/.test(identifier.trim())) {
        // Nettoyer le numéro (enlever les espaces)
        const cleanPhone = identifier.replace(/\s/g, '');

        // Convertir en email virtuel
        email = `${cleanPhone}@noemail.university-saas.com`;

        // console.log(`🔐 Connexion par téléphone : ${identifier} → ${email}`);
      }

      // Connexion Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Récupération du profil utilisateur
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        throw new Error('Profil utilisateur introuvable');
      }

      const userData = snapshot.val();
      const { role, universityId } = userData;

      // Redirection selon le rôle
      switch (role) {
        case 'super_admin_plateforme':
          navigate('/dashboard/super-admin', { replace: true });
          break;
        case 'admin_universite':
          navigate('/dashboard/admin', { replace: true });
          break;
        case 'comptable':
          navigate('/dashboard/comptable', { replace: true });
          break;
        case 'teacher':
          navigate('/dashboard/teacher', { replace: true });
          break;
        case 'student':
          navigate('/dashboard/student', { replace: true });
          break;
        case 'parent':
          navigate('/dashboard/parent', { replace: true });
          break;
        default:
          throw new Error('Rôle utilisateur inconnu');
      }
    } catch (err) {
      console.error('Login error:', err);

      // Messages d'erreur en français
      const errorMessages = {
        'auth/invalid-email': 'Adresse email invalide',
        'auth/user-disabled': 'Ce compte a été désactivé',
        'auth/user-not-found': 'Aucun compte trouvé avec cet email',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/invalid-credential': 'Email ou mot de passe incorrect',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
      };

      setError(errorMessages[err.code] || err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background animated blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo et Titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
            <span className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              UniverSaaS
            </span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            Bon retour !
          </h1>
          <p className="text-gray-600 text-lg">
            Connectez-vous à votre espace
          </p>
        </div>

        {/* Card avec Glassmorphism */}
        <div className="glass rounded-3xl p-8 shadow-2xl border border-white/50">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email ou Téléphone */}
            <div>
              <label htmlFor="identifier" className="block text-sm font-semibold text-gray-700 mb-2">
                Email ou Téléphone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-gray-900 placeholder-gray-400 font-medium"
                  placeholder="email@exemple.com ou +33 6 12 34 56 78"
                  required
                  disabled={loading}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Les parents sans email peuvent se connecter avec leur numéro de téléphone
              </p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-gray-900 placeholder-gray-400 font-medium"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-slide-up">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 border-2 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-indigo-600"
                />
                <span className="text-gray-600 group-hover:text-gray-900 font-medium transition-colors">
                  Se souvenir de moi
                </span>
              </label>
              <button
                type="button"
                className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/50 text-gray-500 font-medium">
                Nouveau sur UniverSaaS ?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <button
            onClick={() => navigate('/signup')}
            className="w-full bg-white border-2 border-indigo-200 text-indigo-600 py-4 rounded-xl font-bold text-lg hover:bg-indigo-50 hover:border-indigo-300 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            <span>Créer un compte université</span>
          </button>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors inline-flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
