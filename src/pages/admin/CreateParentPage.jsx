/**
 * CreateParentPage.jsx - Création/Affiliation d'un compte parent
 *
 * Logique:
 * 1. Téléphone OBLIGATOIRE
 * 2. Vérifier si parent avec ce téléphone existe déjà
 * 3. Si oui → affilier étudiant à ce parent existant
 * 4. Si non → créer nouveau parent avec suggestions auto (email, mot de passe)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, set, get, push, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateParentPage() {
  const navigate = useNavigate();
  const { studentId, parentId } = useParams(); // studentId OU parentId dans l'URL
  const { currentUser, userProfile } = useAuth();

  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    email: '',
    password: '123456', // Mot de passe par défaut
    selectedStudents: []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [existingParent, setExistingParent] = useState(null); // Parent trouvé avec ce téléphone
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger tous les étudiants + parent si parentId fourni
  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.universityId) return;

      try {
        // Charger les étudiants
        const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
        const studentsSnap = await get(studentsRef);

        if (studentsSnap.exists()) {
          const studentsDataRaw = studentsSnap.val();
          const studentsData = Object.entries(studentsDataRaw).map(([id, data]) => ({
            id,
            ...data
          }));
          setAllStudents(studentsData);

          // Si on vient depuis un étudiant spécifique, l'ajouter automatiquement
          if (studentId) {
            const student = studentsData.find(s => s.id === studentId);
            if (student) {
              setFormData(prev => ({
                ...prev,
                selectedStudents: [student]
              }));
            }
          }

          // Si parentId fourni, charger le parent existant depuis les étudiants (données dénormalisées)
          if (parentId) {
            let foundParent = null;

            // Chercher le parent dans les données des étudiants
            for (const studentData of Object.values(studentsDataRaw)) {
              if (studentData.parents && Array.isArray(studentData.parents)) {
                const parent = studentData.parents.find(p => p.id === parentId);
                if (parent) {
                  foundParent = parent;
                  break;
                }
              }
            }

            if (foundParent) {
              setExistingParent({ uid: foundParent.id, displayName: foundParent.displayName, phone: foundParent.phone });
              setFormData(prev => ({
                ...prev,
                phone: foundParent.phone || '',
                displayName: foundParent.displayName || '',
                email: '' // L'email n'est pas dans les données dénormalisées
              }));
            }
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Erreur lors du chargement des données');
      }
    };

    loadData();
  }, [userProfile, studentId, parentId]);

  // Suggestions auto pour email basé sur le nom
  useEffect(() => {
    if (formData.displayName && !existingParent) {
      const nameParts = formData.displayName.trim().toLowerCase().split(' ');
      if (nameParts.length >= 2) {
        const suggestedEmail = `${nameParts[0]}.${nameParts[nameParts.length - 1]}@parent.com`;
        setFormData(prev => ({ ...prev, email: suggestedEmail }));
      }
    }
  }, [formData.displayName, existingParent]);

  // Vérifier si un parent avec ce téléphone OU email existe déjà
  const handlePhoneCheck = async (phone) => {
    if (!phone || phone.length < 10) {
      setExistingParent(null);
      return;
    }

    try {
      // Chercher dans les étudiants existants (on a le droit de les lire)
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      if (studentsSnap.exists()) {
        const studentsData = studentsSnap.val();
        let foundParent = null;

        // Parcourir tous les étudiants pour trouver un parent avec ce téléphone
        for (const studentData of Object.values(studentsData)) {
          if (studentData.parents && Array.isArray(studentData.parents)) {
            const parent = studentData.parents.find(p => p.phone === phone);
            if (parent) {
              foundParent = parent;
              break;
            }
          }
        }

        if (foundParent) {
          setExistingParent({ uid: foundParent.id, displayName: foundParent.displayName, phone: foundParent.phone });
          setError('');
          setSuccess(`✅ Parent trouvé : ${foundParent.displayName}. Vous pouvez lui affilier de nouveaux enfants.`);
        } else {
          setExistingParent(null);
          setSuccess('');
        }
      } else {
        setExistingParent(null);
        setSuccess('');
      }
    } catch (err) {
      console.error('Error checking phone:', err);
      setError('Erreur lors de la vérification du téléphone');
    }
  };

  // Vérifier l'unicité de l'email avant création
  const checkEmailUniqueness = async (email) => {
    try {
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      if (studentsSnap.exists()) {
        const studentsData = studentsSnap.val();

        // Parcourir tous les étudiants pour vérifier les emails des parents
        for (const studentData of Object.values(studentsData)) {
          if (studentData.parents && Array.isArray(studentData.parents)) {
            // Charger les données complètes de chaque parent pour avoir l'email
            for (const parent of studentData.parents) {
              const parentRef = ref(database, `users/${parent.id}`);
              const parentSnap = await get(parentRef);

              if (parentSnap.exists()) {
                const parentData = parentSnap.val();
                if (parentData.email === email) {
                  return {
                    exists: true,
                    parentName: parentData.displayName,
                    phone: parentData.phone
                  };
                }
              }
            }
          }
        }
      }

      return { exists: false };
    } catch (err) {
      console.error('Error checking email uniqueness:', err);
      return { exists: false };
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Vérifier téléphone
    if (name === 'phone') {
      handlePhoneCheck(value);
    }
  };

  // Recherche d'étudiants
  const handleSearch = (value) => {
    setSearchTerm(value);

    if (!value.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const results = allStudents.filter(student => {
      const searchLower = value.toLowerCase();
      return (
        student.firstName?.toLowerCase().includes(searchLower) ||
        student.lastName?.toLowerCase().includes(searchLower) ||
        student.matricule?.toLowerCase().includes(searchLower) ||
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchLower)
      );
    }).slice(0, 10);

    setSearchResults(results);
  };

  const handleAddStudent = (student) => {
    if (formData.selectedStudents.some(s => s.id === student.id)) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      selectedStudents: [...prev.selectedStudents, student]
    }));

    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleRemoveStudent = (studentId) => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.filter(s => s.id !== studentId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validation téléphone stricte avec regex
      if (!formData.phone) {
        throw new Error('Le numéro de téléphone est obligatoire');
      }

      // Regex pour format français: +33612345678 ou 0612345678
      const phoneRegex = /^(\+33|0)[1-9](\d{8})$/;
      const cleanPhone = formData.phone.replace(/\s/g, ''); // Retirer les espaces

      if (!phoneRegex.test(cleanPhone)) {
        throw new Error('Format de téléphone invalide. Utilisez le format: 0612345678 ou +33612345678');
      }

      if (formData.selectedStudents.length === 0) {
        throw new Error('Veuillez sélectionner au moins un étudiant');
      }

      // Vérifier que les étudiants n'ont pas déjà 2 parents
      for (const student of formData.selectedStudents) {
        const studentRef = ref(database, `universities/${userProfile.universityId}/students/${student.id}`);
        const studentSnap = await get(studentRef);

        if (studentSnap.exists()) {
          const studentData = studentSnap.val();
          const currentParentsCount = studentData.parents?.length || 0;

          if (currentParentsCount >= 2) {
            throw new Error(`${student.firstName} ${student.lastName} a déjà 2 parents affiliés (limite atteinte)`);
          }
        }
      }

      if (existingParent) {
        // CAS 1: Parent existe déjà → Affilier les nouveaux enfants
        const updatedChildrenAccess = {
          ...existingParent.childrenAccess,
          [userProfile.universityId]: {
            ...(existingParent.childrenAccess?.[userProfile.universityId] || {}),
          }
        };

        // Ajouter les nouveaux enfants
        formData.selectedStudents.forEach(student => {
          updatedChildrenAccess[userProfile.universityId][student.id] = true;
        });

        // Mettre à jour le parent existant
        await update(ref(database, `users/${existingParent.uid}`), {
          childrenAccess: updatedChildrenAccess
        });

        // Mettre à jour chaque étudiant pour ajouter les infos de ce parent
        for (const student of formData.selectedStudents) {
          const studentRef = ref(database, `universities/${userProfile.universityId}/students/${student.id}`);
          const studentSnap = await get(studentRef);

          if (studentSnap.exists()) {
            const studentData = studentSnap.val();
            const currentParents = studentData.parents || [];

            // Ajouter le parent si pas déjà présent
            const parentAlreadyAdded = currentParents.some(p => p.id === existingParent.uid);
            if (!parentAlreadyAdded && currentParents.length < 2) {
              await update(studentRef, {
                parents: [
                  ...currentParents,
                  {
                    id: existingParent.uid,
                    displayName: existingParent.displayName,
                    phone: existingParent.phone,
                    email: existingParent.email || 'Non disponible'
                  }
                ]
              });
            }
          }
        }

        setSuccess(`✅ ${formData.selectedStudents.length} enfant(s) affilié(s) à ${existingParent.displayName}`);

        setTimeout(() => {
          const createAnother = window.confirm(
            `✅ ${formData.selectedStudents.length} enfant(s) affilié(s) à ${existingParent.displayName} avec succès !\n\n` +
            `Voulez-vous affilier d'autres enfants à un parent ?\n\n` +
            `• OUI → Rester sur cette page\n` +
            `• NON → Retour à la liste des étudiants`
          );

          if (createAnother) {
            setFormData({
              displayName: '',
              phone: '',
              email: '',
              password: '123456',
              selectedStudents: []
            });
            setExistingParent(null);
            setSuccess('');
            setError('');
          } else {
            navigate('/admin/students');
          }
        }, 500);


      } else {
        // CAS 2: Créer un nouveau parent
        if (!formData.displayName) {
          throw new Error('Le nom du parent est obligatoire');
        }

        if (!formData.email) {
          throw new Error('L\'email du parent est obligatoire');
        }

        // ✅ VALIDATION STRICTE: Vérifier l'unicité du téléphone
        const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
        const studentsSnap = await get(studentsRef);

        if (studentsSnap.exists()) {
          const studentsData = studentsSnap.val();

          // Vérifier téléphone unique
          for (const studentData of Object.values(studentsData)) {
            if (studentData.parents && Array.isArray(studentData.parents)) {
              const phoneExists = studentData.parents.some(p => p.phone === formData.phone);
              if (phoneExists) {
                throw new Error(`❌ Ce numéro de téléphone (${formData.phone}) est déjà utilisé par un autre parent. Utilisez un numéro unique.`);
              }
            }
          }
        }

        // ✅ VALIDATION STRICTE: Vérifier l'unicité de l'email
        const emailCheck = await checkEmailUniqueness(formData.email);
        if (emailCheck.exists) {
          throw new Error(`❌ Cet email (${formData.email}) est déjà utilisé par le parent "${emailCheck.parentName}" (${emailCheck.phone}). Utilisez un email unique.`);
        }

        // Créer le compte via API REST Firebase Auth
        const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
        const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;

        const authResponse = await fetch(signUpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            returnSecureToken: true
          })
        });

        const authData = await authResponse.json();

        if (!authResponse.ok) {
          let errorMessage = 'Erreur lors de la création du compte';
          if (authData.error?.message === 'EMAIL_EXISTS') {
            errorMessage = 'Cet email est déjà utilisé';
          } else if (authData.error?.message) {
            errorMessage = authData.error.message;
          }
          throw new Error(errorMessage);
        }

        const uid = authData.localId;

        // Construire childrenAccess
        const childrenAccess = {
          [userProfile.universityId]: {}
        };

        formData.selectedStudents.forEach(student => {
          childrenAccess[userProfile.universityId][student.id] = true;
        });

        // Créer le profil utilisateur parent
        const userRef = ref(database, `users/${uid}`);
        const userData = {
          uid,
          email: formData.email,
          displayName: formData.displayName,
          phone: formData.phone,
          role: 'parent',
          universityId: userProfile.universityId,
          childrenAccess,
          createdAt: Date.now(),
          createdBy: currentUser.uid
        };

        await set(userRef, userData);

        // Mettre à jour chaque étudiant pour ajouter les infos de ce parent
        // console.log('🔍 Mise à jour des étudiants, count:', formData.selectedStudents.length);
        for (const student of formData.selectedStudents) {
          // console.log('📝 Traitement étudiant:', student.id, student.firstName, student.lastName);
          const studentRef = ref(database, `universities/${userProfile.universityId}/students/${student.id}`);
          const studentSnap = await get(studentRef);

          if (studentSnap.exists()) {
            const studentData = studentSnap.val();
            const currentParents = studentData.parents || [];
            // console.log('  → Parents actuels:', currentParents.length);

            // Ajouter le parent (max 2)
            if (currentParents.length < 2) {
              const newParent = {
                id: uid,
                displayName: formData.displayName,
                phone: formData.phone,
                email: formData.email
              };
              // console.log('  → Ajout du parent:', newParent);

              await update(studentRef, {
                parents: [...currentParents, newParent]
              });
              // console.log('  ✅ Parent ajouté');
            } else {
              // console.log('  ⚠️ Limite 2 parents atteinte');
            }
          } else {
            // console.log('  ❌ Étudiant non trouvé dans Firebase');
          }
        }

        // Log d'audit
        const auditRef = push(ref(database, `universities/${userProfile.universityId}/audit`));
        await set(auditRef, {
          action: 'CREATE_PARENT',
          performedBy: currentUser.uid,
          targetUid: uid,
          targetEmail: formData.email,
          childrenCount: formData.selectedStudents.length,
          timestamp: Date.now()
        });

        setSuccess(`✅ Compte parent créé pour ${formData.displayName} (${formData.selectedStudents.length} enfant(s))`);

        setTimeout(() => {
          const createAnother = window.confirm(
            `✅ Le parent ${formData.displayName} a été créé avec succès !\n\n` +
            `Voulez-vous créer un autre parent ?\n\n` +
            `• OUI → Rester sur cette page\n` +
            `• NON → Retour à la liste des étudiants`
          );

          if (createAnother) {
            setFormData({
              displayName: '',
              phone: '',
              email: '',
              password: '123456',
              selectedStudents: []
            });
            setSuccess('');
            setError('');
          } else {
            navigate('/admin/students');
          }
        }, 500);
      }

    } catch (err) {
      console.error('Error creating/updating parent:', err);
      setError(err.message || 'Erreur lors de l\'opération');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            {existingParent ? '👨‍👩‍👧 Affilier à un Parent Existant' : '👨‍👩‍👧 Créer un Compte Parent'}
          </h1>
          <p className="text-gray-600">
            {existingParent
              ? `Affilier de nouveaux enfants à ${existingParent.displayName}`
              : 'Créez un compte parent et affiliez-le à un ou plusieurs étudiants'
            }
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600">
            ✅ {success}
          </div>
        )}

        {/* Form */}
        <div className="glass rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Téléphone (OBLIGATOIRE) */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📱</span> Téléphone du Parent (Obligatoire)
              </h2>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+33 6 12 34 56 78"
                className="w-full px-4 py-3 rounded-xl border-2 border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Le système vérifiera automatiquement si ce parent existe déjà
              </p>
            </div>

            {/* Infos parent (si nouveau) */}
            {!existingParent && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>👤</span> Informations du Parent
                </h2>

                <div className="space-y-4">
                  {/* Nom complet */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleChange}
                      placeholder="Ex: Jean Dupont"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={!existingParent}
                    />
                  </div>

                  {/* Email (auto-suggéré) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email * <span className="text-xs text-gray-500">(suggéré automatiquement)</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="prenom.nom@parent.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={!existingParent}
                    />
                  </div>

                  {/* Mot de passe */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mot de passe temporaire
                    </label>
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={!existingParent}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Par défaut : 123456 (le parent pourra le changer)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sélection des enfants */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🎓</span> Enfants à Affilier
              </h2>

              {/* Barre de recherche */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="🔍 Rechercher par nom, prénom ou matricule..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                {/* Résultats de recherche */}
                {isSearching && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                    {searchResults.map(student => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleAddStudent(student)}
                        className="w-full text-left p-3 hover:bg-blue-50 transition border-b border-gray-100 last:border-b-0"
                      >
                        <p className="font-semibold text-gray-900">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {student.matricule} • {student.department} • {student.level}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {isSearching && searchResults.length === 0 && searchTerm && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-center text-gray-500">
                    Aucun étudiant trouvé pour "{searchTerm}"
                  </div>
                )}
              </div>

              {/* Étudiants sélectionnés */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Étudiants sélectionnés ({formData.selectedStudents.length})
                </p>

                {formData.selectedStudents.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                    <p className="text-gray-400 text-sm">
                      Aucun étudiant ajouté. Utilisez la recherche ci-dessus.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.selectedStudents.map(student => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {student.matricule} • {student.department} • {student.level}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStudent(student.id)}
                          className="ml-3 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-semibold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin/students')}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? '⏳ Traitement...' : (existingParent ? '✅ Affilier les Enfants' : '✅ Créer le Parent')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
