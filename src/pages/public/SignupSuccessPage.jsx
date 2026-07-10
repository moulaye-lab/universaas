import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, Mail } from 'lucide-react';

export default function SignupSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { universityId, adminEmail } = location.state || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 text-center shadow-2xl">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6 animate-bounce">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-4">
            🎉 Félicitations!
          </h1>
          <p className="text-xl text-indigo-200 mb-8">
            Votre université a été créée avec succès
          </p>

          {/* Info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
            <div className="flex items-start gap-3 mb-4">
              <Mail className="w-5 h-5 text-indigo-300 mt-1" />
              <div>
                <p className="text-white font-semibold mb-1">
                  Email de confirmation envoyé
                </p>
                <p className="text-sm text-indigo-200">
                  Un email de bienvenue a été envoyé à <strong className="text-white">{adminEmail}</strong> avec vos identifiants de connexion.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-indigo-200">
              <p>✅ Votre compte administrateur est activé</p>
              <p>✅ Votre plateforme est prête à être configurée</p>
              <p>✅ Vous pouvez maintenant importer vos étudiants et enseignants</p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-indigo-500/50 rounded-2xl p-6 mb-8 text-left">
            <p className="text-white font-semibold mb-3">
              📋 Prochaines étapes:
            </p>
            <ol className="space-y-2 text-sm text-indigo-200">
              <li>1. Connectez-vous avec votre email et mot de passe</li>
              <li>2. Importez vos étudiants et enseignants (CSV)</li>
              <li>3. Configurez vos classes et cours</li>
              <li>4. Commencez à utiliser la plateforme!</li>
            </ol>
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-2xl text-white rounded-xl font-semibold text-lg transition transform hover:scale-105"
          >
            Se connecter maintenant
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Support */}
          <p className="text-sm text-indigo-300 mt-6">
            Besoin d'aide? Consultez notre <a href="#" className="text-white hover:underline">guide de démarrage</a>
          </p>
        </div>
      </div>
    </div>
  );
}
