/**
 * RevenueCategoriesPage.jsx - Gestion des catégories de revenus
 *
 * Fonctionnalités:
 * - Créer/modifier/supprimer des catégories
 * - Couleurs personnalisées
 * - Utilisé par admin et comptable
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set, push, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, Tag, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';

export default function RevenueCategoriesPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    label: '',
    value: '',
    color: 'green'
  });

  const availableColors = [
    { value: 'blue', label: 'Bleu', bg: 'bg-blue-100', text: 'text-blue-700' },
    { value: 'purple', label: 'Violet', bg: 'bg-purple-100', text: 'text-purple-700' },
    { value: 'green', label: 'Vert', bg: 'bg-green-100', text: 'text-green-700' },
    { value: 'orange', label: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700' },
    { value: 'red', label: 'Rouge', bg: 'bg-red-100', text: 'text-red-700' },
    { value: 'pink', label: 'Rose', bg: 'bg-pink-100', text: 'text-pink-700' },
    { value: 'yellow', label: 'Jaune', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    { value: 'indigo', label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { value: 'gray', label: 'Gris', bg: 'bg-gray-100', text: 'text-gray-700' }
  ];

  useEffect(() => {
    loadCategories();
  }, [userProfile]);

  const loadCategories = async () => {
    if (!userProfile?.universityId) return;

    try {
      const categoriesRef = ref(database, `universities/${userProfile.universityId}/accounting/revenueCategories`);
      const snapshot = await get(categoriesRef);

      if (snapshot.exists()) {
        const categoriesData = snapshot.val();
        const categoriesArray = Object.keys(categoriesData).map(key => ({
          id: key,
          ...categoriesData[key]
        }));
        setCategories(categoriesArray);
      } else {
        // Initialiser avec les catégories par défaut
        const defaultCategories = [
          { value: 'frais_scolarite', label: 'Frais de Scolarité', color: 'blue' },
          { value: 'subventions', label: 'Subventions', color: 'green' },
          { value: 'donations', label: 'Donations', color: 'purple' },
          { value: 'partenariats', label: 'Partenariats', color: 'orange' },
          { value: 'autres', label: 'Autres', color: 'gray' }
        ];

        for (const cat of defaultCategories) {
          const newCatRef = push(categoriesRef);
          await set(newCatRef, { ...cat, id: newCatRef.key });
        }

        loadCategories();
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading categories:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.label || !formData.value) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      setLoading(true);

      const categoryData = {
        label: formData.label,
        value: formData.value.toLowerCase().replace(/\s+/g, '_'),
        color: formData.color
      };

      if (editingCategory) {
        const categoryRef = ref(database, `universities/${userProfile.universityId}/accounting/revenueCategories/${editingCategory.id}`);
        await set(categoryRef, { ...categoryData, id: editingCategory.id });
      } else {
        const categoriesRef = ref(database, `universities/${userProfile.universityId}/accounting/revenueCategories`);
        const newCategoryRef = push(categoriesRef);
        await set(newCategoryRef, { ...categoryData, id: newCategoryRef.key });
      }

      setShowModal(false);
      setEditingCategory(null);
      setFormData({ label: '', value: '', color: 'green' });

      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Erreur lors de l\'enregistrement');
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      label: category.label,
      value: category.value,
      color: category.color
    });
    setShowModal(true);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;

    try {
      const categoryRef = ref(database, `universities/${userProfile.universityId}/accounting/revenueCategories/${categoryId}`);
      await remove(categoryRef);
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white rounded-xl transition"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Tag className="h-8 w-8 text-green-600" />
              Catégories de Revenus
            </h1>
            <p className="text-gray-600 mt-1">Gérer les catégories personnalisées</p>
          </div>
          <button
            onClick={() => {
              setEditingCategory(null);
              setFormData({ label: '', value: '', color: 'green' });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 font-semibold"
          >
            <Plus className="h-5 w-5" />
            Nouvelle Catégorie
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="font-semibold text-gray-900">Aucune catégorie trouvée</p>
              <p className="text-sm text-gray-600 mt-1">Créez votre première catégorie</p>
            </div>
          ) : (
            categories.map((category) => {
              const colorConfig = availableColors.find(c => c.value === category.color);
              return (
                <div
                  key={category.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`px-4 py-2 rounded-xl ${colorConfig?.bg} ${colorConfig?.text} font-semibold`}>
                      {category.label}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Identifiant: <code className="bg-gray-100 px-2 py-1 rounded">{category.value}</code>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition flex items-center justify-center gap-2 font-semibold"
                    >
                      <Edit className="h-4 w-4" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2 font-semibold"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingCategory ? 'Modifier la Catégorie' : 'Nouvelle Catégorie'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nom *</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  required
                  placeholder="Ex: Partenariats"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Identifiant *</label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required
                  placeholder="Ex: partenariats"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Utilisé dans la base de données (minuscules, sans espaces)</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Couleur *</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`px-4 py-2 rounded-xl font-semibold transition ${color.bg} ${color.text} ${
                        formData.color === color.value ? 'ring-4 ring-indigo-300' : ''
                      }`}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCategory(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {editingCategory ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
