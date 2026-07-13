/**
 * Landing Page Premium - Design niveau Silicon Valley
 *
 * Features:
 * - Glassmorphism & gradients animés
 * - Micro-interactions fluides
 * - Animations au scroll
 * - Design system cohérent
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  GraduationCap,
  Users,
  BookOpen,
  CreditCard,
  Video,
  Bell,
  Award,
  Shield,
  Zap,
  Check,
  ArrowRight,
  Star,
  Sparkles,
  TrendingUp,
  Globe,
  Lock,
  BarChart3,
  LogOut,
  LayoutDashboard
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, userProfile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const handleDashboardClick = () => {
    const roleRedirects = {
      'super_admin_plateforme': '/dashboard/super-admin',
      'admin_universite': '/dashboard/admin',
      'teacher': '/dashboard/teacher',
      'student': '/dashboard/student',
      'parent': '/dashboard/parent',
    };
    navigate(roleRedirects[userProfile?.role] || '/');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const plans = [
    {
      id: 'standard',
      name: 'Standard',
      price: 149,
      maxStudents: 500,
      features: [
        'Gestion complète étudiants & enseignants',
        'Système de notes & évaluations',
        'Gestion financière & paiements',
        'Bibliothèque numérique',
        'Notifications en temps réel',
        '5000 min/mois de cours vidéo live',
        'Support email 48h',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 299,
      maxStudents: 2000,
      popular: true,
      features: [
        'Toutes les fonctionnalités Standard',
        'Cours vidéo live illimités',
        'Enregistrements automatiques',
        'Analytics avancées',
        'API personnalisée',
        'Import/Export CSV illimité',
        'Support prioritaire 24h',
        'Formation équipe incluse',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Sur devis',
      maxStudents: '∞',
      features: [
        'Toutes les fonctionnalités Premium',
        'Étudiants & enseignants illimités',
        'Serveur dédié',
        'Personnalisation complète (branding)',
        'SSO / LDAP',
        'SLA 99.9% garanti',
        'Gestionnaire de compte dédié',
        'Support 24/7 avec hotline',
      ],
    },
  ];

  const testimonials = [
    {
      name: 'Dr. Sarah Martin',
      role: 'Doyenne, Université de Lyon',
      avatar: '👩‍🎓',
      quote: 'Depuis que nous utilisons cette plateforme, notre temps administratif a été réduit de 60%. Les étudiants adorent le système de cours en direct.',
    },
    {
      name: 'Prof. Jean Dubois',
      role: 'Directeur IT, École Polytechnique',
      avatar: '👨‍💼',
      quote: 'L\'intégration a été fluide et le support technique est remarquable. La fonctionnalité multi-tenant nous permet de gérer 5 campus indépendants.',
    },
    {
      name: 'Marie Lambert',
      role: 'Responsable Admin, ESSEC',
      avatar: '👩‍💼',
      quote: 'Le module de gestion financière avec les échéanciers automatiques nous a fait gagner un temps précieux. Je recommande vivement.',
    },
  ];

  const stats = [
    { value: '50+', label: 'Universités clientes' },
    { value: '100K+', label: 'Étudiants actifs' },
    { value: '99.9%', label: 'Uptime garanti' },
    { value: '24/7', label: 'Support disponible' },
  ];

  const handleStartTrial = (planId) => {
    navigate(`/signup?plan=${planId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-x-hidden">
      {/* Navbar Premium */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? 'glass shadow-lg border-b border-white/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-200 group-hover:shadow-xl transition-all">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                UniverSaaS
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-8">
              <a
                href="#features"
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors relative group"
              >
                Fonctionnalités
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 group-hover:w-full transition-all duration-300" />
              </a>
              <a
                href="#pricing"
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors relative group"
              >
                Tarifs
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 group-hover:w-full transition-all duration-300" />
              </a>
              <a
                href="#testimonials"
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors relative group"
              >
                Témoignages
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 group-hover:w-full transition-all duration-300" />
              </a>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                // Utilisateur connecté - afficher Dashboard + Déconnexion
                <>
                  <div className="hidden md:flex items-center gap-3 glass px-4 py-2 rounded-xl">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-gray-900">
                      {userProfile?.displayName || userProfile?.email}
                    </span>
                  </div>
                  <button
                    onClick={handleDashboardClick}
                    className="hidden sm:flex items-center gap-2 text-gray-700 hover:text-indigo-600 font-semibold transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-xl border-2 border-red-200 font-semibold transition-all hover:scale-105"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Déconnexion</span>
                  </button>
                </>
              ) : (
                // Utilisateur NON connecté - afficher Connexion + Essai gratuit
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="hidden sm:block text-gray-700 hover:text-indigo-600 font-semibold transition-colors"
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => handleStartTrial('premium')}
                    className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden group"
                  >
                    <span className="relative z-10">Essai gratuit</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section Premium */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Gradient Background Animé */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" />
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-700 px-5 py-2.5 rounded-full mb-8 font-medium shadow-lg hover:shadow-xl transition-shadow">
              <Sparkles className="h-4 w-4" />
              <span>Plateforme utilisée par 50+ universités</span>
            </div>

            {/* Titre Principal */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-8 leading-tight">
              <span className="block text-gray-900">Gérez votre</span>
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                université
              </span>
              <span className="block text-gray-900">en toute simplicité</span>
            </h1>

            {/* Sous-titre */}
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
              La plateforme SaaS tout-en-un pour gérer étudiants, enseignants, notes,
              paiements et cours en direct. Multi-tenant, sécurisé et conforme RGPD.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-12">
              <button
                onClick={() => handleStartTrial('premium')}
                className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-300 hover:shadow-indigo-400 hover:scale-105 transition-all duration-300 flex items-center gap-3"
              >
                <span>Démarrer gratuitement</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/demo')}
                className="group bg-white text-gray-900 px-10 py-5 rounded-2xl font-bold text-lg border-2 border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex items-center gap-3"
              >
                <Video className="h-6 w-6 text-indigo-600" />
                <span>Voir la démo</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-medium">Essai gratuit 14 jours</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-medium">Pas de carte bancaire requise</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-medium">Support inclus</span>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-24 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="glass p-8 rounded-3xl text-center hover-lift"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-4xl font-black bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-block bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full font-semibold mb-4">
              Fonctionnalités
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6">
              Une plateforme pour
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                tous les profils
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Chaque utilisateur dispose d'un espace dédié adapté à ses besoins spécifiques
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Admin */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-3xl border border-blue-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 group-hover:text-white transition-colors duration-500">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-2xl transition-shadow">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Administrateur</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Gestion des filières & programmes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Validation inscriptions & paiements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Édition bulletins & relevés</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Analytics & tableaux de bord</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Enseignant */}
            <div className="group relative bg-gradient-to-br from-green-50 to-emerald-100 p-8 rounded-3xl border border-green-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 group-hover:text-white transition-colors duration-500">
                <div className="bg-gradient-to-br from-green-600 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-2xl transition-shadow">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Enseignant</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Saisie notes & évaluations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Cours vidéo live avec chat</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Dépôt ressources pédagogiques</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Gestion des absences</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Étudiant */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-violet-100 p-8 rounded-3xl border border-purple-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 group-hover:text-white transition-colors duration-500">
                <div className="bg-gradient-to-br from-purple-600 to-violet-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-2xl transition-shadow">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Étudiant</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Consultation notes & bulletins</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Accès cours vidéo enregistrés</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Bibliothèque numérique</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Export données RGPD</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Parent */}
            <div className="group relative bg-gradient-to-br from-orange-50 to-amber-100 p-8 rounded-3xl border border-orange-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 group-hover:text-white transition-colors duration-500">
                <div className="bg-gradient-to-br from-orange-600 to-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-2xl transition-shadow">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Parent</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Suivi notes en temps réel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Alertes absences automatiques</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Historique paiements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>Messagerie administration</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Features Highlights */}
          <div className="mt-24 grid md:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-3xl text-center hover-lift">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">100% Sécurisé</h3>
              <p className="text-gray-600">
                Isolation multi-tenant stricte. Vos données sont protégées avec un chiffrement de niveau bancaire.
              </p>
            </div>

            <div className="glass p-8 rounded-3xl text-center hover-lift">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Conforme RGPD</h3>
              <p className="text-gray-600">
                Export de données, logs d'audit, droit à l'oubli. 100% conforme à la réglementation européenne.
              </p>
            </div>

            <div className="glass p-8 rounded-3xl text-center hover-lift">
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Analytics Avancées</h3>
              <p className="text-gray-600">
                Tableaux de bord en temps réel, rapports automatisés et insights pour piloter votre établissement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-block bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full font-semibold mb-4">
              Tarifs
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6">
              Tarifs transparents et
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                évolutifs
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choisissez le plan adapté à la taille de votre établissement. Changez quand vous voulez.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-3xl p-10 hover:shadow-2xl transition-all duration-500 ${
                  plan.popular
                    ? 'border-4 border-indigo-500 shadow-2xl scale-105'
                    : 'border border-gray-200'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Le plus populaire
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-3xl font-black text-gray-900 mb-4">{plan.name}</h3>
                  <div className="mb-6">
                    {typeof plan.price === 'number' ? (
                      <div>
                        <span className="text-6xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          {plan.price}€
                        </span>
                        <span className="text-xl text-gray-600 font-medium">/mois</span>
                      </div>
                    ) : (
                      <span className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {plan.price}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 font-medium">
                    Jusqu'à <span className="text-indigo-600 font-bold">{plan.maxStudents}</span> étudiants
                  </p>
                </div>

                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="bg-green-100 rounded-full p-1 mt-0.5">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-gray-700 font-medium text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleStartTrial(plan.id)}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-300 hover:shadow-xl hover:scale-105'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.price === 'Sur devis' ? 'Nous contacter' : 'Commencer l\'essai gratuit'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-block bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full font-semibold mb-4">
              Témoignages
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6">
              Ils nous font
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                confiance
              </span>
            </h2>
            <p className="text-xl text-gray-600">
              Découvrez ce que nos clients disent de nous
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="glass p-8 rounded-3xl hover-lift"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-8 italic text-lg leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{testimonial.avatar}</div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAzLTVzMi0yIDItNGMwLTEtMS0yLTMtMnMtMyAxLTQgM2MtMSAyLTIgMy00IDNzLTMtMS00LTNjLTEtMi0yLTMtNC0zcy0zIDEtMyAyYzAgMiAxIDMgMiA0czMgMyAzIDV2MWgyMHYtMXptLTIgNGgtMTZ2NWgxNnYtNXoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10" />

        <div className="relative max-w-4xl mx-auto text-center text-white">
          <h2 className="text-5xl md:text-6xl font-black mb-8">
            Prêt à transformer votre
            <span className="block">gestion universitaire ?</span>
          </h2>
          <p className="text-xl md:text-2xl mb-12 text-white/90 leading-relaxed">
            Rejoignez les 50+ universités qui nous font confiance pour gérer
            plus de 100 000 étudiants au quotidien.
          </p>
          <button
            onClick={() => handleStartTrial('premium')}
            className="bg-white text-indigo-600 px-12 py-6 rounded-2xl font-black text-xl shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
          >
            Démarrer gratuitement
            <ArrowRight className="h-6 w-6" />
          </button>
          <p className="mt-6 text-white/80">
            Essai gratuit 14 jours • Pas de carte bancaire requise
          </p>
        </div>
      </section>

      {/* Footer Premium */}
      <footer className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl">
                  <GraduationCap className="h-7 w-7 text-white" />
                </div>
                <span className="text-2xl font-bold">UniverSaaS</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                La plateforme de gestion universitaire tout-en-un qui révolutionne l'éducation.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-4">Produit</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="/demo" className="hover:text-white transition-colors">Démo</a></li>
                <li><a href="/roadmap" className="hover:text-white transition-colors">Roadmap</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-4">Ressources</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="/docs" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="/support" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="/api" className="hover:text-white transition-colors">API</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-4">Légal</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="/privacy" className="hover:text-white transition-colors">Confidentialité</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">CGU</a></li>
                <li><a href="/rgpd" className="hover:text-white transition-colors">RGPD</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Sécurité</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400">&copy; 2026 UniverSaaS. Tous droits réservés.</p>
            <div className="flex items-center gap-4 text-gray-400">
              <span>Made with ❤️ in France</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
