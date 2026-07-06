/**
 * Page de création d'un étudiant
 * Accessible uniquement par admin_universite
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ref, set, get, update, runTransaction } from 'firebase/database';
import { database } from '../../config/firebase';
import { ArrowLeft, GraduationCap, Mail, Phone, BookOpen, Calendar, CheckCircle, AlertCircle, Loader, Wand2, RefreshCw } from 'lucide-react';
import { useRateLimit, RATE_LIMITS } from '../../utils/rateLimiter';
import { isValidEmail, isValidName, isValidMatricule } from '../../utils/sanitize';

export default function CreateStudentPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const { checkLimit } = useRateLimit();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    level: '',
    fieldOfStudy: '',
    matricule: '',
    password: '12345678',
    classId: '',
  });

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3'];

  const fieldsOfStudy = [
    { value: 'computer-science', label: 'Informatique' },
    { value: 'mathematics', label: 'Mathématiques' },
    { value: 'physics', label: 'Physique' },
    { value: 'chemistry', label: 'Chimie' },
    { value: 'biology', label: 'Biologie' },
    { value: 'literature', label: 'Littérature' },
    { value: 'history', label: 'Histoire' },
    { value: 'geography', label: 'Géographie' },
    { value: 'languages', label: 'Langues' },
    { value: 'economics', label: 'Économie' },
    { value: 'law', label: 'Droit' },
    { value: 'medicine', label: 'Médecine' },
    { value: 'engineering', label: 'Ingénierie' },
    { value: 'arts', label: 'Arts' },
    { value: 'sports', label: 'Sport' },
  ];

  const generateEmail = () => {
    if (!formData.firstName || !formData.lastName) {
      alert('Veuillez d\'abord renseigner le prénom et le nom');
      return;
    }
    const email = `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@${userProfile.universityId.replace('univ-', '').replace(/-\d{4}$/, '')}.edu`;
    setFormData({ ...formData, email });
  };

  const generateMatricule = () => {
    // Matricule permanent : PREFIX-ANNÉE-NUMÉRO
    // Ex: SOR-2026-001234
    // Ne contient PAS le niveau car l'étudiant peut changer de niveau
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const prefix = userProfile.universityId.replace('univ-', '').substring(0, 3).toUpperCase();
    const matricule = `${prefix}-${year}-${random}`;
    setFormData({ ...formData, matricule });
  };

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password });
  };

  // Charger les classes disponibles
  useEffect(() => {
    const loadClasses = async () => {
      if (!userProfile?.universityId) return;

      try {
        const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
        const classesSnap = await get(classesRef);

        if (classesSnap.exists()) {
          const classesData = Object.entries(classesSnap.val())
            .map(([id, data]) => ({ id, ...data }))
            .filter(cls => cls.status === 'active' && cls.occupiedSeats < cls.capacity);
          setAvailableClasses(classesData);
        }
      } catch (err) {
        console.error('Error loading classes:', err);
      }
    };

    loadClasses();
  }, [userProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Rate limiting
      checkLimit('CREATE_STUDENT', RATE_LIMITS.CREATE_STUDENT.maxRequests, RATE_LIMITS.CREATE_STUDENT.windowMs);

      // Validation
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.matricule || !formData.level || !formData.fieldOfStudy) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      // Validation côté client renforcée
      if (!isValidEmail(formData.email)) {
        throw new Error('Adresse email invalide');
      }

      if (!isValidName(formData.firstName) || !isValidName(formData.lastName)) {
        throw new Error('Nom ou prénom contient des caractères invalides');
      }

      if (!isValidMatricule(formData.matricule)) {
        throw new Error('Format de matricule invalide (attendu: XXX-YYYY-NNNNNN)');
      }

      if (!formData.classId) {
        throw new Error('Veuillez sélectionner une classe');
      }

      // Vérifier que la classe existe avant de continuer
      const classRef = ref(database, `universities/${userProfile.universityId}/classes/${formData.classId}`);
      const classSnap = await get(classRef);

      if (!classSnap.exists()) {
        throw new Error('La classe sélectionnée n\'existe pas. Veuillez actualiser la page.');
      }

      const selectedClass = classSnap.val();
      if (selectedClass.occupiedSeats >= selectedClass.capacity) {
        throw new Error(`Cette classe est complète (${selectedClass.occupiedSeats}/${selectedClass.capacity})`);
      }

      // Vérifier que le matricule n'existe pas déjà
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      if (studentsSnap.exists()) {
        const allStudents = studentsSnap.val();
        const matriculeExists = Object.values(allStudents).some(student => student.matricule === formData.matricule);
        if (matriculeExists) {
          throw new Error('Ce matricule existe déjà');
        }
      }

      // 1. Créer le compte via API REST Firebase
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const createUserResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            returnSecureToken: false
          })
        }
      );

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        const errorMsg = errorData.error?.message || '';

        if (errorMsg.includes('EMAIL_EXISTS')) {
          throw new Error('Cet email est déjà utilisé');
        } else if (errorMsg.includes('WEAK_PASSWORD')) {
          throw new Error('Le mot de passe est trop faible');
        } else if (errorMsg.includes('INVALID_EMAIL')) {
          throw new Error('L\'adresse email est invalide');
        }

        throw new Error('Erreur lors de la création du compte');
      }

      const userData = await createUserResponse.json();
      const studentUid = userData.localId;

      // 2. Créer le profil utilisateur
      await set(ref(database, `users/${studentUid}`), {
        email: formData.email,
        displayName: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber || null,
        role: 'student',
        universityId: userProfile.universityId,
        profileId: studentUid,
        loginMethod: 'email',
        mustChangePassword: true,
        temporaryPassword: formData.password,
        createdAt: Date.now(),
        createdBy: currentUser.uid,
      });

      // 3. Créer le profil étudiant dans l'université
      await set(ref(database, `universities/${userProfile.universityId}/students/${studentUid}`), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber || null,
        matricule: formData.matricule,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).getTime() : null,
        gender: formData.gender || null,
        level: formData.level,
        fieldOfStudy: formData.fieldOfStudy,
        classId: formData.classId,
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        status: 'active',
        enrollmentDate: Date.now(),
        absences: 0,
        createdAt: Date.now(),
        createdBy: currentUser.uid,
      });

      // 3b. Ajouter l'étudiant à la classe (TRANSACTION ATOMIQUE)
      await runTransaction(classRef, (currentClass) => {
        if (!currentClass) {
          throw new Error('Classe introuvable');
        }

        // Vérification atomique de la capacité
        const currentOccupied = currentClass.occupiedSeats || 0;
        if (currentOccupied >= currentClass.capacity) {
          // Transaction échoue atomiquement
          return; // Abort transaction
        }

        // Mise à jour atomique
        currentClass.students = [...(currentClass.students || []), studentUid];
        currentClass.occupiedSeats = currentOccupied + 1;
        currentClass.updatedAt = Date.now();

        return currentClass;
      });

      // 4. Initialiser structure paiements (vide)
      await set(ref(database, `universities/${userProfile.universityId}/payments/${studentUid}`), {
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        tuitionFee: 0,
        paidAmount: 0,
        remainingAmount: 0,
        currency: 'EUR',
        status: 'pending',
        installments: [],
        createdAt: Date.now(),
      });

      // 5. Log d'audit
      await set(ref(database, `universities/${userProfile.universityId}/audit/${Date.now()}`), {
        action: 'student_created',
        userId: currentUser.uid,
        targetUserId: studentUid,
        details: {
          studentName: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          matricule: formData.matricule,
          level: formData.level,
          fieldOfStudy: formData.fieldOfStudy,
        },
        timestamp: Date.now(),
      });

      setSuccess(`✅ Étudiant ${formData.firstName} ${formData.lastName} créé avec succès !`);

      // Demander si l'admin veut créer un autre étudiant
      const createAnother = window.confirm(
        `✅ L'étudiant ${formData.firstName} ${formData.lastName} a été créé avec succès !\n\n` +
        `Voulez-vous créer un autre étudiant ?\n\n` +
        `• OUI → Rester sur cette page\n` +
        `• NON → Retour au dashboard`
      );

      if (createAnother) {
        // Reset formulaire (garder niveau et filière pour faciliter la saisie)
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          dateOfBirth: '',
          gender: '',
          level: formData.level,
          fieldOfStudy: formData.fieldOfStudy,
          matricule: '',
          password: '12345678',
          classId: formData.classId,
        });
        setSuccess('');
        setError('');
      } else {
        navigate('/dashboard/admin');
      }

    } catch (error) {
      console.error('Error creating student:', error);
      setError(error.message || 'Erreur lors de la création de l\'étudiant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
      {/* Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/admin')}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-xl shadow-lg">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Créer un Étudiant</h1>
                  <p className="text-sm text-indigo-200">Inscrire un nouvel étudiant</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl p-8">
          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 font-medium">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section: Identité */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b-2 border-blue-200 pb-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                Informations personnelles
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Sophie"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Martin"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Email *
                  </label>
                  {formData.firstName && formData.lastName && (
                    <button
                      type="button"
                      onClick={generateEmail}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      <Wand2 className="h-3 w-3" />
                      Auto-générer
                    </button>
                  )}
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sophie.martin@universite.edu"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Téléphone (optionnel)
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date de naissance (optionnel)
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Genre (optionnel)
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                >
                  <option value="">Non spécifié</option>
                  <option value="male">Masculin</option>
                  <option value="female">Féminin</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>

            {/* Section: Académique */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b-2 border-blue-200 pb-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Informations académiques
              </h3>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Matricule *
                  </label>
                  <button
                    type="button"
                    onClick={generateMatricule}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Wand2 className="h-3 w-3" />
                    Générer
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.matricule}
                  onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                  placeholder="Ex: SOR-2026-001234"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Niveau *
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    required
                  >
                    <option value="">Sélectionner</option>
                    {levels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Filière *
                  </label>
                  <select
                    value={formData.fieldOfStudy}
                    onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                    required
                  >
                    <option value="">Sélectionner</option>
                    {fieldsOfStudy.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sélection de classe */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Classe *
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                  required
                >
                  <option value="">Sélectionner une classe</option>
                  {availableClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.occupiedSeats || 0}/{cls.capacity} places)
                    </option>
                  ))}
                </select>
                {availableClasses.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    ⚠️ Aucune classe disponible. <button type="button" onClick={() => navigate('/admin/classes/create')} className="underline font-semibold">Créez d'abord une classe</button>.
                  </p>
                )}
              </div>
            </div>

            {/* Section: Accès */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b-2 border-blue-200 pb-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Accès au compte
              </h3>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Mot de passe temporaire *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, password: '12345678' })}
                      className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                    >
                      Par défaut
                    </button>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Générer
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 8 caractères"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-mono"
                  minLength={8}
                  required
                />
                <p className="mt-2 text-xs text-amber-600">
                  💡 Par défaut : <span className="font-mono font-semibold">12345678</span>
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  L'étudiant devra changer ce mot de passe à la première connexion
                </p>
              </div>
            </div>

            {/* Résumé */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <h4 className="font-bold text-blue-900 mb-2">Récapitulatif</h4>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• Nom complet: <span className="font-semibold">{formData.firstName} {formData.lastName || '...'}</span></li>
                <li>• Email: <span className="font-semibold">{formData.email || 'Non défini'}</span></li>
                <li>• Matricule: <span className="font-mono font-semibold">{formData.matricule || 'Non défini'}</span></li>
                <li>• Niveau: <span className="font-semibold">{formData.level || 'Non défini'}</span></li>
                <li>• Filière: <span className="font-semibold">{fieldsOfStudy.find(f => f.value === formData.fieldOfStudy)?.label || 'Non défini'}</span></li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin')}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Créer l'étudiant
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
