/**
 * TeacherDetailsPage.jsx - Détails et modification d'un enseignant
 *
 * Fonctionnalités:
 * - Afficher toutes les infos de l'enseignant
 * - Mode édition pour modifier les informations
 * - Sauvegarde des modifications
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';

export default function TeacherDetailsPage() {
  const navigate = useNavigate();
  const { teacherId } = useParams();
  const { userProfile } = useAuth();

  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    bio: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadTeacher = async () => {
      if (!userProfile?.universityId || !teacherId) return;

      try {
        setLoading(true);

        // Charger l'enseignant
        const teacherRef = ref(database, `universities/${userProfile.universityId}/teachers/${teacherId}`);
        const teacherSnap = await get(teacherRef);

        if (!teacherSnap.exists()) {
          setError('Enseignant introuvable');
          return;
        }

        const teacherData = teacherSnap.val();
        setTeacher(teacherData);
        setFormData({
          firstName: teacherData.firstName || '',
          lastName: teacherData.lastName || '',
          email: teacherData.email || '',
          phone: teacherData.phone || '',
          specialization: teacherData.specialization || '',
          bio: teacherData.bio || ''
        });

        // Charger tous les cours
        const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
        const coursesSnap = await get(coursesRef);

        if (coursesSnap.exists()) {
          const coursesData = Object.entries(coursesSnap.val()).map(([id, data]) => ({
            id,
            ...data
          }));
          setCourses(coursesData);

          // Filtrer les cours assignés à cet enseignant
          const assigned = coursesData.filter(course => course.teacherId === teacherId);
          setAssignedCourses(assigned);
        }
      } catch (err) {
        console.error('Error loading teacher:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadTeacher();
  }, [teacherId, userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!formData.firstName || !formData.lastName) {
        throw new Error('Le prénom et le nom sont obligatoires');
      }

      if (!formData.email) {
        throw new Error('L\'email est obligatoire');
      }

      // Mettre à jour dans universities/{id}/teachers/{teacherId}
      const teacherRef = ref(database, `universities/${userProfile.universityId}/teachers/${teacherId}`);
      await update(teacherRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        specialization: formData.specialization,
        bio: formData.bio,
        updatedAt: Date.now()
      });

      // Mettre à jour dans users/{teacherId} (displayName)
      const userRef = ref(database, `users/${teacherId}`);
      await update(userRef, {
        displayName: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        updatedAt: Date.now()
      });

      setTeacher(prev => ({ ...prev, ...formData }));
      setIsEditing(false);
      setSuccess('✅ Modifications enregistrées avec succès');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving teacher:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: teacher.firstName || '',
      lastName: teacher.lastName || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      specialization: teacher.specialization || '',
      bio: teacher.bio || ''
    });
    setIsEditing(false);
    setError('');
  };

  const handleAssignCourse = async (courseId) => {
    try {
      setSaving(true);
      setError('');

      // Mettre à jour le cours avec le teacherId
      const courseRef = ref(database, `universities/${userProfile.universityId}/courses/${courseId}`);
      await update(courseRef, {
        teacherId: teacherId,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        updatedAt: Date.now()
      });

      // Recharger les cours assignés
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);

      if (coursesSnap.exists()) {
        const coursesData = Object.entries(coursesSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        setCourses(coursesData);
        const assigned = coursesData.filter(course => course.teacherId === teacherId);
        setAssignedCourses(assigned);
      }

      setShowCourseModal(false);
      setSuccess('✅ Cours assigné avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error assigning course:', err);
      setError('Erreur lors de l\'assignation du cours');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignCourse = async (courseId) => {
    if (!confirm('Voulez-vous vraiment retirer ce cours à cet enseignant ?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Retirer le teacherId du cours
      const courseRef = ref(database, `universities/${userProfile.universityId}/courses/${courseId}`);
      await update(courseRef, {
        teacherId: null,
        teacherName: null,
        updatedAt: Date.now()
      });

      // Recharger les cours assignés
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);

      if (coursesSnap.exists()) {
        const coursesData = Object.entries(coursesSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        setCourses(coursesData);
        const assigned = coursesData.filter(course => course.teacherId === teacherId);
        setAssignedCourses(assigned);
      }

      setSuccess('✅ Cours retiré avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error unassigning course:', err);
      setError('Erreur lors du retrait du cours');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !teacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/admin/teachers')}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
            >
              ← Retour à la liste
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              👨‍🏫 Détails Enseignant
            </h1>
            <p className="text-gray-600">
              {isEditing ? 'Mode édition' : 'Consultation'}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/teachers')}
            className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow"
          >
            ← Retour
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600">
            {success}
          </div>
        )}

        {/* Formulaire */}
        <div className="glass rounded-3xl p-8">
          <form onSubmit={handleSave}>
            <div className="space-y-6">
              {/* Informations personnelles */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Informations Personnelles
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Prénom */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prénom *
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        {teacher.firstName}
                      </div>
                    )}
                  </div>

                  {/* Nom */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nom *
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        {teacher.lastName}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled
                        title="L'email ne peut pas être modifié (lié au compte Firebase Auth)"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        {teacher.email}
                      </div>
                    )}
                    {isEditing && (
                      <p className="text-xs text-gray-500 mt-1">
                        L'email ne peut pas être modifié
                      </p>
                    )}
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Téléphone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+33 6 12 34 56 78"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        {teacher.phone || 'Non renseigné'}
                      </div>
                    )}
                  </div>

                  {/* Spécialisation */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Spécialisation
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        placeholder="Ex: Mathématiques, Physique, Informatique..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        {teacher.specialization || 'Non renseigné'}
                      </div>
                    )}
                  </div>

                  {/* Biographie */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Biographie
                    </label>
                    {isEditing ? (
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Parcours académique, expérience, diplômes..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 min-h-[100px]">
                        {teacher.bio || 'Non renseigné'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Métadonnées */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Informations système
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Rôle:</span>
                    <span className="ml-2 font-semibold text-gray-900">Enseignant</span>
                  </div>
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <span className="ml-2 font-mono text-xs text-gray-700">{teacherId}</span>
                  </div>
                  {teacher.createdAt && (
                    <div>
                      <span className="text-gray-500">Créé le:</span>
                      <span className="ml-2 text-gray-700">
                        {new Date(teacher.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {teacher.updatedAt && (
                    <div>
                      <span className="text-gray-500">Modifié le:</span>
                      <span className="ml-2 text-gray-700">
                        {new Date(teacher.updatedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-semibold"
                      disabled={saving}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                      disabled={saving}
                    >
                      {saving ? '⏳ Enregistrement...' : '💾 Enregistrer'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
                  >
                    ✏️ Modifier
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Section Cours Assignés */}
        <div className="glass rounded-3xl p-8 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">
                📚 Cours Assignés
              </h2>
              <p className="text-gray-600">
                {assignedCourses.length} cours assigné{assignedCourses.length > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowCourseModal(true)}
              className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold shadow-lg"
              disabled={saving}
            >
              ➕ Assigner un Cours
            </button>
          </div>

          {assignedCourses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <div className="text-6xl mb-4">📖</div>
              <p className="text-gray-600">Aucun cours assigné pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedCourses.map(course => (
                <div key={course.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{course.courseName}</h3>
                    <p className="text-sm text-gray-600">
                      {course.courseCode} • {course.credits} ECTS • {course.level || 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnassignCourse(course.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-semibold text-sm"
                    disabled={saving}
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Assigner Cours */}
        {showCourseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-gray-900">
                  Assigner un Cours
                </h2>
                <button
                  onClick={() => setShowCourseModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {courses.filter(course => !course.teacherId || course.teacherId === '' || course.teacherId === teacherId).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <p className="text-gray-900 font-semibold mb-2">Aucun cours disponible</p>
                    <p className="text-gray-600 text-sm mb-4">
                      Tous les cours sont déjà assignés à d'autres enseignants
                    </p>
                    <button
                      onClick={() => {
                        setShowCourseModal(false);
                        navigate('/admin/courses/create');
                      }}
                      className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold"
                    >
                      ➕ Créer un nouveau cours
                    </button>
                  </div>
                ) : (
                  courses
                    .filter(course => !course.teacherId || course.teacherId === '' || course.teacherId === teacherId)
                    .map(course => (
                      <button
                        key={course.id}
                        onClick={() => handleAssignCourse(course.id)}
                        className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-green-500 hover:bg-green-50 transition"
                        disabled={saving}
                      >
                        <h3 className="font-bold text-gray-900">{course.courseName}</h3>
                        <p className="text-sm text-gray-600">
                          {course.courseCode} • {course.credits} ECTS • {course.level || 'N/A'}
                        </p>
                      </button>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </AdminLayout>
  );
}
