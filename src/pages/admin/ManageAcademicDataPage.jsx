/**
 * ManageAcademicDataPage.jsx - Gestion des départements et modèles de cours
 *
 * Fonctionnalités:
 * - Gestion des départements de l'université
 * - Gestion des modèles de cours (catalogue de cours disponibles)
 * - Création, modification, suppression
 * - Utilisé comme référence dans CreateCoursePage
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, get, push, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function ManageAcademicDataPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('departments'); // 'departments' | 'courses'

  // Départements
  const [departments, setDepartments] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  // Modèles de cours
  const [courseTemplates, setCourseTemplates] = useState([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseFormData, setCourseFormData] = useState({
    name: '',
    code: '',
    department: '',
    credits: '3',
    description: ''
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Charger les données
  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return;

      if (!userProfile?.universityId) {
        setLoading(false);
        return;
      }

      try {
        // Charger départements (globaux)
        const deptsRef = ref(database, 'departments');
        const deptsSnap = await get(deptsRef);
        if (deptsSnap.exists()) {
          const deptsData = deptsSnap.val();
          setDepartments(Object.entries(deptsData).map(([id, data]) => ({ id, ...data })));
        }

        // Charger modèles de cours (globaux)
        const templatesRef = ref(database, 'courseTemplates');
        const templatesSnap = await get(templatesRef);
        if (templatesSnap.exists()) {
          const templatesData = templatesSnap.val();
          setCourseTemplates(Object.entries(templatesData).map(([id, data]) => ({ id, ...data })));
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userProfile, authLoading]);

  // === DÉPARTEMENTS ===

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!deptFormData.name.trim()) {
        throw new Error('Le nom du département est requis');
      }

      // Vérifier unicité du nom
      const exists = departments.some(d => d.name.toLowerCase() === deptFormData.name.trim().toLowerCase());
      if (exists) {
        throw new Error('Ce département existe déjà');
      }

      const deptRef = push(ref(database, 'departments'));
      const deptData = {
        id: deptRef.key,
        name: deptFormData.name.trim(),
        code: deptFormData.code.trim().toUpperCase() || deptFormData.name.substring(0, 3).toUpperCase(),
        description: deptFormData.description.trim(),
        createdAt: Date.now(),
        createdBy: currentUser.uid
      };

      await set(deptRef, deptData);
      setDepartments(prev => [...prev, deptData]);
      setSuccess('Département créé avec succès !');
      setDeptFormData({ name: '', code: '', description: '' });
      setTimeout(() => { setShowDeptModal(false); setSuccess(''); }, 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteDept = async (deptId, deptName) => {
    if (!window.confirm(`Supprimer le département "${deptName}" ?`)) return;

    try {
      // Vérifier si utilisé dans des cours
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);
      if (coursesSnap.exists()) {
        const inUse = Object.values(coursesSnap.val()).some(c => c.department === deptName);
        if (inUse) {
          throw new Error('Ce département est utilisé par des cours existants');
        }
      }

      await remove(ref(database, `departments/${deptId}`));
      setDepartments(prev => prev.filter(d => d.id !== deptId));
      setSuccess('Département supprimé');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // === MODÈLES DE COURS ===

  const handleCourseTemplateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!courseFormData.name.trim()) {
        throw new Error('Le nom du cours est requis');
      }
      if (!courseFormData.department) {
        throw new Error('Le département est requis');
      }

      // Vérifier unicité du code
      if (courseFormData.code.trim()) {
        const exists = courseTemplates.some(c => c.code.toLowerCase() === courseFormData.code.trim().toLowerCase());
        if (exists) {
          throw new Error('Ce code de cours existe déjà');
        }
      }

      const templateRef = push(ref(database, 'courseTemplates'));
      const templateData = {
        id: templateRef.key,
        name: courseFormData.name.trim(),
        code: courseFormData.code.trim().toUpperCase(),
        department: courseFormData.department,
        credits: parseInt(courseFormData.credits),
        description: courseFormData.description.trim(),
        createdAt: Date.now(),
        createdBy: currentUser.uid
      };

      await set(templateRef, templateData);
      setCourseTemplates(prev => [...prev, templateData]);
      setSuccess('Modèle de cours créé avec succès !');
      setCourseFormData({ name: '', code: '', department: '', credits: '3', description: '' });
      setTimeout(() => { setShowCourseModal(false); setSuccess(''); }, 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCourseTemplate = async (templateId, templateName) => {
    if (!window.confirm(`Supprimer le modèle "${templateName}" ?`)) return;

    try {
      await remove(ref(database, `courseTemplates/${templateId}`));
      setCourseTemplates(prev => prev.filter(t => t.id !== templateId));
      setSuccess('Modèle supprimé');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              🎓 Données Académiques
            </h1>
            <p className="text-gray-600">
              Gérez les départements et les modèles de cours
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
          >
            ← Retour
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition ${
              activeTab === 'departments'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50'
            }`}
          >
            🏛️ Départements ({departments.length})
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition ${
              activeTab === 'courses'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50'
            }`}
          >
            📚 Modèles de Cours ({courseTemplates.length})
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-6">
            <p className="text-red-700 font-semibold">❌ {error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl mb-6">
            <p className="text-green-700 font-semibold">✅ {success}</p>
          </div>
        )}

        {/* Content */}
        {activeTab === 'departments' ? (
          <div>
            {/* Header Départements */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Départements</h2>
              <button
                onClick={() => setShowDeptModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold"
              >
                + Nouveau Département
              </button>
            </div>

            {/* Liste Départements */}
            {departments.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <div className="text-6xl mb-4">🏛️</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun département</h3>
                <p className="text-gray-600 mb-6">Créez votre premier département</p>
                <button
                  onClick={() => setShowDeptModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold"
                >
                  + Créer un département
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map(dept => (
                  <div key={dept.id} className="glass rounded-3xl p-6 hover:shadow-xl transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{dept.name}</h3>
                        <p className="text-sm font-mono text-blue-600 font-semibold">{dept.code}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteDept(dept.id, dept.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        🗑️
                      </button>
                    </div>
                    {dept.description && (
                      <p className="text-sm text-gray-600">{dept.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Header Modèles de cours */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Modèles de Cours</h2>
              <button
                onClick={() => setShowCourseModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold"
              >
                + Nouveau Modèle
              </button>
            </div>

            {/* Liste Modèles */}
            {courseTemplates.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun modèle de cours</h3>
                <p className="text-gray-600 mb-6">Créez votre premier modèle de cours</p>
                <button
                  onClick={() => setShowCourseModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold"
                >
                  + Créer un modèle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courseTemplates.map(template => (
                  <div key={template.id} className="glass rounded-3xl p-6 hover:shadow-xl transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">{template.name}</h3>
                        <p className="text-sm font-mono text-blue-600 font-semibold">{template.code}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteCourseTemplate(template.id, template.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="space-y-2">
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                        {template.department}
                      </span>
                      <span className="inline-block ml-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold">
                        {template.credits} ECTS
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-3">{template.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Département */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900">🏛️ Nouveau Département</h2>
              <button onClick={() => { setShowDeptModal(false); setError(''); }} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>

            <form onSubmit={handleDeptSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nom *</label>
                <input
                  type="text"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Mathématiques"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Code (optionnel)</label>
                <input
                  type="text"
                  value={deptFormData.code}
                  onChange={(e) => setDeptFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Ex: MATH"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-généré si vide</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={deptFormData.description}
                  onChange={(e) => setDeptFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-xl">
                  <p className="text-red-700 text-sm font-semibold">❌ {error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-xl">
                  <p className="text-green-700 text-sm font-semibold">✅ {success}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button type="button" onClick={() => { setShowDeptModal(false); setError(''); }} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold">Annuler</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modèle de Cours */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900">📚 Nouveau Modèle</h2>
              <button onClick={() => { setShowCourseModal(false); setError(''); }} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>

            <form onSubmit={handleCourseTemplateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nom du cours *</label>
                <input
                  type="text"
                  value={courseFormData.name}
                  onChange={(e) => setCourseFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Algèbre Linéaire"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Code cours</label>
                <input
                  type="text"
                  value={courseFormData.code}
                  onChange={(e) => setCourseFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Ex: MATH101"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Département *</label>
                <select
                  value={courseFormData.department}
                  onChange={(e) => setCourseFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
                {departments.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Créez d'abord un département</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Crédits ECTS *</label>
                <input
                  type="number"
                  value={courseFormData.credits}
                  onChange={(e) => setCourseFormData(prev => ({ ...prev, credits: e.target.value }))}
                  min="1"
                  max="12"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-xl">
                  <p className="text-red-700 text-sm font-semibold">❌ {error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-xl">
                  <p className="text-green-700 text-sm font-semibold">✅ {success}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button type="button" onClick={() => { setShowCourseModal(false); setError(''); }} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold">Annuler</button>
                <button type="submit" disabled={departments.length === 0} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
