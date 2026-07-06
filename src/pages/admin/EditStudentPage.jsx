/**
 * EditStudentPage.jsx - Modifier un étudiant
 *
 * Fonctionnalités:
 * - Changer la classe d'un étudiant
 * - Mise à jour automatique des places (ancienne classe +1, nouvelle classe -1)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, get, update, runTransaction } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';

export default function EditStudentPage() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const { userProfile } = useAuth();

  const [student, setStudent] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    matricule: '',
    level: '',
    fieldOfStudy: '',
    classId: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.universityId || !studentId) return;

      try {
        // Charger l'étudiant
        const studentRef = ref(database, `universities/${userProfile.universityId}/students/${studentId}`);
        const studentSnap = await get(studentRef);

        if (!studentSnap.exists()) {
          setError('Étudiant introuvable');
          return;
        }

        const studentData = { id: studentId, ...studentSnap.val() };
        setStudent(studentData);

        // Initialiser le formulaire avec les données actuelles
        setFormData({
          firstName: studentData.firstName || '',
          lastName: studentData.lastName || '',
          email: studentData.email || '',
          matricule: studentData.matricule || '',
          level: studentData.level || '',
          fieldOfStudy: studentData.fieldOfStudy || '',
          classId: studentData.classId || '',
          status: studentData.status || 'active'
        });

        // Charger toutes les classes
        const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
        const classesSnap = await get(classesRef);

        if (classesSnap.exists()) {
          const classesData = Object.entries(classesSnap.val())
            .map(([id, data]) => ({ id, ...data }))
            .filter(cls => cls.status === 'active');
          setAvailableClasses(classesData);
        }

      } catch (err) {
        console.error('Error loading data:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId, userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Validation
      if (!formData.firstName || !formData.lastName) {
        throw new Error('Le prénom et le nom sont requis');
      }
      if (!formData.email) {
        throw new Error('L\'email est requis');
      }
      if (!formData.matricule) {
        throw new Error('Le matricule est requis');
      }

      const oldClassId = student.classId;
      const newClassId = formData.classId;
      const classChanged = oldClassId !== newClassId;

      // Si changement de classe, gérer les transactions atomiques
      if (classChanged) {
        // Retirer de l'ancienne classe
        if (oldClassId) {
          const oldClassRef = ref(database, `universities/${userProfile.universityId}/classes/${oldClassId}`);
          await runTransaction(oldClassRef, (currentClass) => {
            if (!currentClass) return currentClass;
            currentClass.students = (currentClass.students || []).filter(id => id !== studentId);
            currentClass.occupiedSeats = Math.max(0, (currentClass.occupiedSeats || 0) - 1);
            currentClass.updatedAt = Date.now();
            return currentClass;
          });
        }

        // Ajouter à la nouvelle classe
        if (newClassId) {
          const newClassRef = ref(database, `universities/${userProfile.universityId}/classes/${newClassId}`);
          await runTransaction(newClassRef, (currentClass) => {
            if (!currentClass) throw new Error('Nouvelle classe introuvable');
            const currentOccupied = currentClass.occupiedSeats || 0;
            if (currentOccupied >= currentClass.capacity) {
              throw new Error('La nouvelle classe est complète');
            }
            currentClass.students = [...(currentClass.students || []), studentId];
            currentClass.occupiedSeats = currentOccupied + 1;
            currentClass.updatedAt = Date.now();
            return currentClass;
          });
        }
      }

      // Mettre à jour les informations de l'étudiant
      // IMPORTANT: Utiliser set() avec toutes les données car Firebase Rules validate ALL children
      const studentRef = ref(database, `universities/${userProfile.universityId}/students/${studentId}`);
      await update(studentRef, {
        ...student, // Conserver toutes les données existantes
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        matricule: formData.matricule,
        level: formData.level,
        fieldOfStudy: formData.fieldOfStudy,
        classId: formData.classId || null,
        status: formData.status,
        updatedAt: Date.now()
      });

      setSuccess('✅ Étudiant mis à jour avec succès');
      setTimeout(() => {
        navigate('/admin/students');
      }, 1500);

    } catch (err) {
      console.error('Error updating student:', err);
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Chargement...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !student) {
    return (
      <AdminLayout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="glass rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => navigate('/admin/students')}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
              >
                ← Retour à la liste
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const currentClass = availableClasses.find(cls => cls.id === student?.classId);

  return (
    <AdminLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              ✏️ Modifier l'Étudiant
            </h1>
            <p className="text-gray-600">
              {student?.firstName} {student?.lastName}
            </p>
          </div>

          {/* Formulaire d'édition complet */}
          <div className="glass rounded-3xl p-8">
            <h2 className="text-2xl font-black text-gray-900 mb-6">
              Modifier les Informations
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations personnelles */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">👤 Informations Personnelles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Matricule *
                    </label>
                    <input
                      type="text"
                      name="matricule"
                      value={formData.matricule}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Informations académiques */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">📚 Informations Académiques</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Niveau *
                    </label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Sélectionner un niveau</option>
                      <option value="L1">L1</option>
                      <option value="L2">L2</option>
                      <option value="L3">L3</option>
                      <option value="M1">M1</option>
                      <option value="M2">M2</option>
                      <option value="D1">D1</option>
                      <option value="D2">D2</option>
                      <option value="D3">D3</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Filière *
                    </label>
                    <input
                      type="text"
                      name="fieldOfStudy"
                      value={formData.fieldOfStudy}
                      onChange={handleChange}
                      placeholder="Ex: Informatique, Mathématiques..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Classe
                    </label>
                    <select
                      name="classId"
                      value={formData.classId}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Aucune classe</option>
                      {availableClasses.map((cls) => {
                        const isCurrentClass = cls.id === student?.classId;
                        const isFull = cls.occupiedSeats >= cls.capacity;
                        return (
                          <option
                            key={cls.id}
                            value={cls.id}
                            disabled={isFull && !isCurrentClass}
                          >
                            {cls.name} ({cls.occupiedSeats || 0}/{cls.capacity})
                            {isCurrentClass && ' - Actuelle'}
                            {isFull && !isCurrentClass && ' - Complète'}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {student?.classId && formData.classId !== student.classId && (
                        <span className="text-orange-600">⚠️ Changement de classe</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Statut
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                      <option value="suspended">Suspendu</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                  <p className="text-red-700 font-semibold">❌ {error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl">
                  <p className="text-green-700 font-semibold">{success}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/students')}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Enregistrement...' : '💾 Enregistrer les Modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
