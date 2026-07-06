/**
 * EditGradePage.jsx - Modification d'une note (Admin + Teacher)
 *
 * Fonctionnalités:
 * - Charger note existante depuis Firebase
 * - Modifier: titre, type, coefficient, note, maxGrade, date
 * - Validation: note <= maxGrade, coefficient > 0
 * - Historique: conserver createdAt, mettre à jour updatedAt
 * - Sécurité: Vérifier rôle (admin ou teacher propriétaire)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function EditGradePage() {
  const navigate = useNavigate();
  const { gradeId } = useParams();
  const { currentUser, userProfile } = useAuth();

  const [grade, setGrade] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    gradeType: 'exam',
    coefficient: 1,
    maxGrade: 20,
    grade: 0,
    date: '',
    comments: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger la note depuis Firebase
  useEffect(() => {
    const loadGrade = async () => {
      if (!userProfile?.universityId || !gradeId) return;

      try {
        setLoading(true);

        const gradeRef = ref(database, `universities/${userProfile.universityId}/grades/${gradeId}`);
        const gradeSnap = await get(gradeRef);

        if (!gradeSnap.exists()) {
          setError('Note introuvable');
          setLoading(false);
          return;
        }

        const gradeData = gradeSnap.val();

        // Vérification sécurité: Seul l'enseignant propriétaire ou admin peut modifier
        const isOwner = gradeData.teacherId === currentUser.uid;
        const isAdmin = userProfile.role === 'admin_universite';

        if (!isOwner && !isAdmin) {
          setError('Vous n\'avez pas l\'autorisation de modifier cette note');
          setLoading(false);
          return;
        }

        setGrade(gradeData);

        // Convertir timestamp en date ISO (YYYY-MM-DD)
        const dateObj = gradeData.date ? new Date(gradeData.date) : new Date();
        const dateString = dateObj.toISOString().split('T')[0];

        setFormData({
          title: gradeData.title || '',
          gradeType: gradeData.gradeType || 'exam',
          coefficient: gradeData.coefficient || 1,
          maxGrade: gradeData.maxGrade || 20,
          grade: gradeData.grade || 0,
          date: dateString,
          comments: gradeData.comments || ''
        });
      } catch (err) {
        console.error('Error loading grade:', err);
        setError('Erreur lors du chargement de la note');
      } finally {
        setLoading(false);
      }
    };

    loadGrade();
  }, [userProfile, gradeId, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Validations
      if (!formData.title.trim()) {
        throw new Error('Le titre est obligatoire');
      }

      const gradeValue = parseFloat(formData.grade);
      const maxGradeValue = parseFloat(formData.maxGrade);
      const coefficientValue = parseFloat(formData.coefficient);

      if (isNaN(gradeValue) || gradeValue < 0) {
        throw new Error('La note doit être un nombre positif');
      }

      if (isNaN(maxGradeValue) || maxGradeValue <= 0) {
        throw new Error('La note maximale doit être supérieure à 0');
      }

      if (gradeValue > maxGradeValue) {
        throw new Error(`La note ne peut pas dépasser ${maxGradeValue}`);
      }

      if (isNaN(coefficientValue) || coefficientValue <= 0) {
        throw new Error('Le coefficient doit être supérieur à 0');
      }

      if (!formData.date) {
        throw new Error('La date est obligatoire');
      }

      // Mettre à jour la note dans Firebase
      const gradeRef = ref(database, `universities/${userProfile.universityId}/grades/${gradeId}`);

      const updates = {
        title: formData.title.trim(),
        gradeType: formData.gradeType,
        coefficient: coefficientValue,
        maxGrade: maxGradeValue,
        grade: gradeValue,
        date: new Date(formData.date).getTime(),
        comments: formData.comments.trim() || null,
        updatedAt: Date.now(),
        updatedBy: currentUser.uid
      };

      await update(gradeRef, updates);

      setSuccess('✅ Note modifiée avec succès');

      setTimeout(() => {
        // Rediriger selon le rôle
        if (userProfile.role === 'admin_universite') {
          navigate('/admin/grades');
        } else {
          navigate('/dashboard/teacher');
        }
      }, 1500);
    } catch (err) {
      console.error('Error updating grade:', err);
      setError(err.message || 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (userProfile.role === 'admin_universite') {
      navigate('/admin/grades');
    } else {
      navigate('/dashboard/teacher');
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

  if (error && !grade) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{error}</h2>
            <button
              onClick={handleCancel}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
            >
              ← Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              ✏️ Modifier la Note
            </h1>
            <p className="text-gray-600">
              Étudiant: <span className="font-semibold">{grade?.studentName}</span>
            </p>
            <p className="text-gray-600">
              Cours: <span className="font-semibold">{grade?.courseName}</span>
            </p>
          </div>
          <button
            onClick={handleCancel}
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
        <form onSubmit={handleSubmit} className="glass rounded-3xl p-8">
          <div className="space-y-6">
            {/* Informations en lecture seule */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-blue-900 mb-3">Informations fixes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Étudiant</p>
                  <p className="font-semibold text-gray-900">{grade?.studentName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Classe</p>
                  <p className="font-semibold text-gray-900">{grade?.className || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Cours</p>
                  <p className="font-semibold text-gray-900">{grade?.courseName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Enseignant</p>
                  <p className="font-semibold text-gray-900">{grade?.teacherName || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Champs modifiables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Titre */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titre de l'évaluation *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Examen final, TP n°3..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={formData.gradeType}
                  onChange={(e) => setFormData(prev => ({ ...prev, gradeType: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="exam">Examen</option>
                  <option value="homework">Devoir</option>
                  <option value="quiz">Contrôle continu</option>
                  <option value="project">Projet</option>
                  <option value="oral">Oral</option>
                  <option value="practical">TP</option>
                </select>
              </div>

              {/* Coefficient */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Coefficient *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={formData.coefficient}
                  onChange={(e) => setFormData(prev => ({ ...prev, coefficient: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Note *
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max={formData.maxGrade}
                  value={formData.grade}
                  onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Note maximale */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Note maximale *
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={formData.maxGrade}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxGrade: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Date */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date de l'évaluation *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Commentaires */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Commentaires (optionnel)
                </label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Remarques sur cette évaluation..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.comments.length}/500 caractères
                </p>
              </div>
            </div>

            {/* Aperçu normalisation */}
            {formData.maxGrade && formData.maxGrade !== '20' && formData.grade && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-yellow-800 mb-1">
                  📊 Note normalisée sur 20
                </p>
                <p className="text-2xl font-black text-yellow-900">
                  {((parseFloat(formData.grade) / parseFloat(formData.maxGrade)) * 20).toFixed(2)}/20
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
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
                {saving ? '⏳ Enregistrement...' : '💾 Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </form>

        {/* Métadonnées */}
        {grade && (
          <div className="mt-6 glass rounded-xl p-4">
            <p className="text-xs text-gray-500">
              Créée le {new Date(grade.createdAt).toLocaleString('fr-FR')}
              {grade.updatedAt && grade.updatedAt !== grade.createdAt && (
                <> • Modifiée le {new Date(grade.updatedAt).toLocaleString('fr-FR')}</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
