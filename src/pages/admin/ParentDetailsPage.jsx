/**
 * ParentDetailsPage.jsx - Détails d'un parent et gestion de ses enfants
 *
 * Fonctionnalités:
 * - Afficher infos parent (nom, email, téléphone)
 * - Liste des enfants affiliés
 * - Bouton pour affilier un nouvel enfant
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function ParentDetailsPage() {
  const navigate = useNavigate();
  const { parentId } = useParams();
  const { userProfile } = useAuth();

  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadParentData = async () => {
      if (!userProfile?.universityId || !parentId) return;

      try {
        setLoading(true);

        // Charger tous les étudiants pour trouver les infos du parent (dénormalisées)
        const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
        const studentsSnap = await get(studentsRef);

        if (!studentsSnap.exists()) {
          setError('Aucun étudiant trouvé');
          return;
        }

        const allStudents = studentsSnap.val();
        let parentInfo = null;
        const affiliatedChildren = [];

        // Parcourir tous les étudiants pour trouver ce parent
        for (const [studentId, studentData] of Object.entries(allStudents)) {
          if (studentData.parents && Array.isArray(studentData.parents)) {
            const parent = studentData.parents.find(p => p.id === parentId);

            if (parent) {
              // Première occurrence: récupérer les infos du parent
              if (!parentInfo) {
                parentInfo = {
                  uid: parent.id,
                  displayName: parent.displayName,
                  phone: parent.phone,
                  email: parent.email || 'Non disponible'
                };
              }

              // Ajouter cet enfant à la liste
              affiliatedChildren.push({
                id: studentId,
                ...studentData
              });
            }
          }
        }

        if (!parentInfo) {
          setError('Parent introuvable');
          return;
        }

        setParent(parentInfo);
        setChildren(affiliatedChildren);

      } catch (err) {
        console.error('Error loading parent data:', err);
        setError('Erreur lors du chargement des données du parent');
      } finally {
        setLoading(false);
      }
    };

    loadParentData();
  }, [parentId, userProfile]);

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

  if (error || !parent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
            <p className="text-gray-600 mb-6">{error || 'Parent introuvable'}</p>
            <button
              onClick={() => navigate('/admin/students')}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              👨‍👩‍👧 Informations Parent
            </h1>
            <p className="text-gray-600">
              Détails et enfants affiliés
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/students')}
            className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold shadow"
          >
            ← Retour
          </button>
        </div>

        {/* Infos parent */}
        <div className="glass rounded-3xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Informations du Parent
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom complet
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                {parent.displayName}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                {parent.email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Téléphone
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                {parent.phone || 'Non renseigné'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Rôle
              </label>
              <div className="px-4 py-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-700 font-semibold">
                Parent
              </div>
            </div>
          </div>
        </div>

        {/* Enfants affiliés */}
        <div className="glass rounded-3xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Enfants Affiliés ({children.length})
            </h2>
            <button
              onClick={() => navigate(`/admin/parents/${parentId}/add-child`)}
              className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold"
            >
              ➕ Affilier un nouvel enfant
            </button>
          </div>

          {children.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👶</div>
              <p className="text-gray-500">Aucun enfant affilié</p>
            </div>
          ) : (
            <div className="space-y-4">
              {children.map(child => (
                <div
                  key={child.id}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {child.firstName?.[0]}{child.lastName?.[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {child.firstName} {child.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {child.matricule} • {child.department} • {child.level}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/admin/students`)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-semibold"
                  >
                    Voir l'étudiant
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
