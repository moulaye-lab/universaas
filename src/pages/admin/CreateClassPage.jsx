/**
 * CreateClassPage.jsx - Création d'une classe
 *
 * Fonctionnalités:
 * - Créer une classe avec niveau, domaine, capacité
 * - Définir période académique (début/fin)
 * - Auto-génération du nom de classe
 * - Validation et sauvegarde Firebase
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, get, push } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { logCreate, SEVERITY_LEVELS } from '../../utils/auditLogger';

export default function CreateClassPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    level: 'L1',
    domain: '',
    classNumber: '1',
    capacity: '50',
    periodStart: '',
    periodEnd: '',
    academicYear: '2025-2026',
    description: ''
  });

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const levels = ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3'];

  // Charger les départements
  useEffect(() => {
    const loadDepartments = async () => {
      if (authLoading || !userProfile?.universityId) return;

      try {
        const deptsRef = ref(database, 'departments');
        const deptsSnap = await get(deptsRef);
        if (deptsSnap.exists()) {
          const deptsData = Object.values(deptsSnap.val());
          setDepartments(deptsData);
        }
      } catch (err) {
        console.error('Error loading departments:', err);
      }
    };

    loadDepartments();
  }, [userProfile, authLoading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Générer le nom complet de la classe
  const generateClassName = () => {
    if (!formData.level || !formData.domain || !formData.classNumber) {
      return 'Classe';
    }
    return `${formData.level} ${formData.domain} - Classe ${formData.classNumber}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 🔍 DEBUG - Afficher les infos utilisateur
      console.log('🔍 DEBUG AUTH:');
      console.log('currentUser.uid:', currentUser?.uid);
      console.log('currentUser.email:', currentUser?.email);
      console.log('userProfile:', userProfile);
      console.log('userProfile.universityId:', userProfile?.universityId);
      console.log('userProfile.role:', userProfile?.role);

      // Validation
      if (!formData.level) {
        throw new Error('Le niveau est requis');
      }
      if (!formData.domain) {
        throw new Error('Le domaine/département est requis');
      }
      if (!formData.classNumber) {
        throw new Error('Le numéro de classe est requis');
      }
      if (!formData.capacity || parseInt(formData.capacity) < 1) {
        throw new Error('La capacité doit être d\'au moins 1 étudiant');
      }
      if (!formData.periodStart || !formData.periodEnd) {
        throw new Error('Les dates de début et fin de période sont requises');
      }

      // Vérifier que periodEnd > periodStart
      if (new Date(formData.periodEnd) <= new Date(formData.periodStart)) {
        throw new Error('La date de fin doit être après la date de début');
      }

      const className = generateClassName();

      // Vérifier si une classe avec ce nom existe déjà
      const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
      const classesSnap = await get(classesRef);

      if (classesSnap.exists()) {
        const classes = Object.values(classesSnap.val());
        const nameExists = classes.some(c => c.name === className);
        if (nameExists) {
          throw new Error(`Une classe "${className}" existe déjà. Modifiez le numéro de classe.`);
        }
      }

      // Créer la classe
      const classRef = push(classesRef);
      const classId = classRef.key;

      const classData = {
        id: classId,
        name: className,
        level: formData.level,
        domain: formData.domain,
        classNumber: parseInt(formData.classNumber),  // 🔧 FIX: Convert to number
        capacity: parseInt(formData.capacity),
        occupiedSeats: 0,
        // students: [], // ❌ Ne pas envoyer tableau vide (Firebase le transforme en null)
        // schedule: [], // ❌ Ne pas envoyer tableau vide (Firebase le transforme en null)
        period: {
          start: formData.periodStart,
          end: formData.periodEnd
        },
        academicYear: formData.academicYear,
        description: formData.description.trim(),
        status: 'active',
        createdAt: Date.now(),
        createdBy: currentUser.uid
      };

      await set(classRef, classData);

      // Créer log d'audit complet
      await logCreate('CLASS', {
        id: classId,
        name: className,
        level: formData.level,
        domain: formData.domain,
        capacity: formData.capacity
      }, userProfile.universityId, currentUser.uid, userProfile.displayName || userProfile.email);

      setSuccess(`Classe "${className}" créée avec succès !`);

      // Demander si l'admin veut créer une autre classe
      const createAnother = window.confirm(
        `✅ La classe "${className}" a été créée avec succès !\n\n` +
        `Voulez-vous créer une autre classe ?\n\n` +
        `• OUI → Rester sur cette page\n` +
        `• NON → Voir la liste des classes`
      );

      if (createAnother) {
        // Reset form pour nouvelle classe
        setFormData({
          level: formData.level,
          domain: formData.domain,
          classNumber: (parseInt(formData.classNumber) + 1).toString(),
          capacity: '50',
          periodStart: formData.periodStart,
          periodEnd: formData.periodEnd,
          academicYear: formData.academicYear,
          description: ''
        });
        setSuccess('');
        setError('');
      } else {
        navigate('/admin/classes');
      }

    } catch (err) {
      console.error('Error creating class:', err);
      setError(err.message || 'Erreur lors de la création de la classe');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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

  return (
    <AdminLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              🎓 Créer une Nouvelle Classe
            </h1>
            <p className="text-gray-600">
              Définissez une classe avec son niveau, domaine et capacité
            </p>
          </div>

          {/* Preview */}
          <div className="glass rounded-3xl p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Aperçu du nom de classe</h3>
            <p className="text-2xl font-black text-gray-900">
              {generateClassName()}
            </p>
          </div>

          {/* Form */}
          <div className="glass rounded-3xl p-8">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Informations de base */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📋</span> Informations de Base
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Niveau */}
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
                      {levels.map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  {/* Domaine/Département */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Domaine/Département *
                    </label>
                    <select
                      name="domain"
                      value={formData.domain}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Sélectionner un domaine</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Numéro de classe */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Numéro de Classe *
                    </label>
                    <input
                      type="number"
                      name="classNumber"
                      value={formData.classNumber}
                      onChange={handleChange}
                      min="1"
                      max="99"
                      placeholder="1"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Ex: 1 pour "Classe 1", 2 pour "Classe 2"
                    </p>
                  </div>

                  {/* Capacité maximale */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Capacité Maximale *
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      min="1"
                      max="500"
                      placeholder="50"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      👥 Nombre maximum d'étudiants
                    </p>
                  </div>
                </div>
              </div>

              {/* Période académique */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📅</span> Période Académique
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date début */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date de Début *
                    </label>
                    <input
                      type="date"
                      name="periodStart"
                      value={formData.periodStart}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Date fin */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date de Fin *
                    </label>
                    <input
                      type="date"
                      name="periodEnd"
                      value={formData.periodEnd}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Année académique */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Année Académique
                    </label>
                    <input
                      type="text"
                      name="academicYear"
                      value={formData.academicYear}
                      onChange={handleChange}
                      placeholder="2025-2026"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Notes ou informations supplémentaires sur cette classe..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                  <p className="text-red-700 font-semibold">❌ {error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl">
                  <p className="text-green-700 font-semibold">✅ {success}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/classes')}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Création...' : 'Créer la Classe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
