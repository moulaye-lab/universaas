/**
 * LibraryBooksPage.jsx - Gestion des livres physiques
 *
 * Fonctionnalités:
 * - CRUD livres physiques
 * - Gestion du stock (totalCopies, availableCopies)
 * - Filtres et recherche
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAllBooks,
  createBook,
  updateBook,
  deleteBook
} from '../../services/libraryService';
import {
  ChevronLeft, Plus, Book, Edit2, Trash2, Search, X
} from 'lucide-react';

export default function LibraryBooksPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    publishedYear: new Date().getFullYear(),
    category: '',
    totalCopies: 1,
    location: '',
    description: '',
    language: 'Français'
  });

  useEffect(() => {
    loadBooks();
  }, [userProfile]);

  const loadBooks = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const booksList = await getAllBooks(userProfile.universityId);
      setBooks(booksList);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingBook) {
        // Mise à jour: ne pas toucher availableCopies
        const { totalCopies, ...updateData } = formData;
        await updateBook(userProfile.universityId, editingBook.id, updateData);
      } else {
        // Création: availableCopies = totalCopies
        await createBook(userProfile.universityId, formData, userProfile.profileId);
      }

      setShowModal(false);
      setEditingBook(null);
      resetForm();
      loadBooks();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setFormData({
      isbn: book.isbn || '',
      title: book.title || '',
      author: book.author || '',
      publisher: book.publisher || '',
      publishedYear: book.publishedYear || new Date().getFullYear(),
      category: book.category || '',
      totalCopies: book.totalCopies || 1,
      location: book.location || '',
      description: book.description || '',
      language: book.language || 'Français'
    });
    setShowModal(true);
  };

  const handleDelete = async (bookId) => {
    if (!confirm('Supprimer ce livre ? (impossible s\'il y a des prêts actifs)')) return;

    try {
      await deleteBook(userProfile.universityId, bookId);
      loadBooks();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      isbn: '',
      title: '',
      author: '',
      publisher: '',
      publishedYear: new Date().getFullYear(),
      category: '',
      totalCopies: 1,
      location: '',
      description: '',
      language: 'Français'
    });
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.isbn?.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">📖 Livres Physiques</h1>
              <p className="text-gray-600 mt-1">Gérez le catalogue de la bibliothèque</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setEditingBook(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
            >
              <Plus className="h-5 w-5" />
              Ajouter un livre
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Total livres</p>
              <p className="text-2xl font-bold text-gray-900">{books.length}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Total exemplaires</p>
              <p className="text-2xl font-bold text-blue-600">
                {books.reduce((sum, book) => sum + (book.totalCopies || 0), 0)}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">
                {books.reduce((sum, book) => sum + (book.availableCopies || 0), 0)}
              </p>
            </div>
          </div>

          {/* Recherche */}
          <div className="glass rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par titre, auteur ou ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Liste livres */}
        {filteredBooks.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Book className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun livre</h3>
            <p className="text-gray-500">Commencez par ajouter des livres à votre bibliothèque</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredBooks.map(book => (
              <div key={book.id} className="glass rounded-xl p-6 hover:shadow-lg transition">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-16 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                    📖
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{book.title}</h3>
                        <p className="text-sm text-gray-600">{book.author}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(book)}
                          className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(book.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">ISBN:</span> {book.isbn || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Éditeur:</span> {book.publisher || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Catégorie:</span> {book.category || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Localisation:</span> {book.location || 'N/A'}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        book.availableCopies > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {book.availableCopies}/{book.totalCopies} disponible(s)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingBook ? 'Modifier le livre' : 'Nouveau livre'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingBook(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auteur <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                    <input
                      type="text"
                      value={formData.isbn}
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Éditeur</label>
                    <input
                      type="text"
                      value={formData.publisher}
                      onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                    <input
                      type="number"
                      value={formData.publishedYear}
                      onChange={(e) => setFormData({ ...formData, publishedYear: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Sciences, Littérature..."
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="Français">Français</option>
                      <option value="Anglais">Anglais</option>
                      <option value="Espagnol">Espagnol</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre d'exemplaires <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.totalCopies}
                      onChange={(e) => setFormData({ ...formData, totalCopies: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      disabled={editingBook} // Ne pas modifier en édition
                    />
                    {editingBook && (
                      <p className="text-xs text-gray-500 mt-1">
                        Modifiez via la page emprunts pour ajuster le stock
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Rayon A, Étagère 3..."
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
                  >
                    {editingBook ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingBook(null);
                      resetForm();
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
