/**
 * StudentLibraryPage.jsx - Bibliothèque vue étudiante
 *
 * Fonctionnalités:
 * - Catalogue ressources numériques
 * - Catalogue livres physiques
 * - Mes emprunts en cours
 * - Mes favoris
 * - Tracking automatique progression
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import {
  getAllResources,
  getAllBooks,
  getActiveLoansForStudent,
  getStudentProgress,
  trackResourceView,
  toggleBookmark
} from '../../services/libraryService';
import {
  ChevronLeft, FileText, Video, Link as LinkIcon,
  Eye, Download, Search, Filter, Star, Book, Calendar,
  ExternalLink, Play
} from 'lucide-react';

export default function StudentLibraryPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('resources'); // resources, books, my-loans, favorites
  const [resources, setResources] = useState([]);
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);

      // Charger ressources
      const resourcesList = await getAllResources(userProfile.universityId);
      setResources(resourcesList.filter(r => r.isPublic !== false));

      // Charger livres
      const booksList = await getAllBooks(userProfile.universityId);
      setBooks(booksList);

      // Charger mes emprunts
      if (userProfile.role === 'student') {
        const loansList = await getActiveLoansForStudent(userProfile.universityId, currentUser.uid);
        setLoans(loansList);

        // Charger ma progression
        const progressData = await getStudentProgress(userProfile.universityId, currentUser.uid);
        setProgress(progressData);
      }

      // Charger cours
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);
      if (coursesSnap.exists()) {
        const coursesList = Object.entries(coursesSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        setCourses(coursesList);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setLoading(false);
    }
  };

  const handleResourceClick = async (resource) => {
    // Tracker la vue
    await trackResourceView(userProfile.universityId, currentUser.uid, resource.id);

    // Ouvrir selon le type
    if (resource.type === 'pdf' && resource.fileUrl) {
      window.open(resource.fileUrl, '_blank');
    } else if (resource.type === 'video' && resource.videoUrl) {
      window.open(resource.videoUrl, '_blank');
    } else if (resource.type === 'link' && resource.externalLink) {
      window.open(resource.externalLink, '_blank');
    }

    // Recharger progression
    setTimeout(() => {
      loadData();
    }, 1000);
  };

  const handleToggleBookmark = async (resourceId) => {
    await toggleBookmark(userProfile.universityId, currentUser.uid, resourceId);
    loadData();
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || resource.type === filterType;
    const matchesCourse = filterCourse === 'all' || resource.courseId === filterCourse;

    if (activeTab === 'favorites') {
      const isBookmarked = progress[resource.id]?.bookmarked;
      return matchesSearch && matchesType && matchesCourse && isBookmarked;
    }

    return matchesSearch && matchesType && matchesCourse;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'link': return <LinkIcon className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'pdf': return 'bg-red-100 text-red-700';
      case 'video': return 'bg-purple-100 text-purple-700';
      case 'link': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDaysUntilDue = (dueDate) => {
    const days = Math.ceil((dueDate - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

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
              onClick={() => navigate('/dashboard/student')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📚 Bibliothèque</h1>
              <p className="text-gray-600 mt-1">Accédez aux ressources pédagogiques et livres</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-6 py-3 rounded-xl font-semibold transition ${
                activeTab === 'resources'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📄 Ressources numériques
            </button>
            <button
              onClick={() => setActiveTab('books')}
              className={`px-6 py-3 rounded-xl font-semibold transition ${
                activeTab === 'books'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📖 Livres physiques
            </button>
            <button
              onClick={() => setActiveTab('my-loans')}
              className={`px-6 py-3 rounded-xl font-semibold transition relative ${
                activeTab === 'my-loans'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📚 Mes emprunts
              {loans.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {loans.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-6 py-3 rounded-xl font-semibold transition ${
                activeTab === 'favorites'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ⭐ Favoris
            </button>
          </div>

          {/* Filtres (seulement pour resources et favorites) */}
          {(activeTab === 'resources' || activeTab === 'favorites') && (
            <div className="glass rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">Tous les types</option>
                  <option value="pdf">PDF</option>
                  <option value="video">Vidéo</option>
                  <option value="link">Lien</option>
                </select>

                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">Tous les cours</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Contenu selon onglet */}
        {(activeTab === 'resources' || activeTab === 'favorites') && (
          <div>
            {filteredResources.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {activeTab === 'favorites' ? 'Aucun favori' : 'Aucune ressource'}
                </h3>
                <p className="text-gray-500">
                  {activeTab === 'favorites'
                    ? 'Ajoutez des ressources à vos favoris en cliquant sur ⭐'
                    : 'Aucune ressource disponible pour le moment'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResources.map(resource => {
                  const resourceProgress = progress[resource.id];
                  const isBookmarked = resourceProgress?.bookmarked;
                  const viewCount = resourceProgress?.viewCount || 0;

                  return (
                    <div
                      key={resource.id}
                      className="glass rounded-xl p-6 hover:shadow-lg transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-3 rounded-xl ${getTypeColor(resource.type)}`}>
                          {getTypeIcon(resource.type)}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBookmark(resource.id);
                          }}
                          className={`p-2 rounded-lg transition ${
                            isBookmarked
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-gray-100 text-gray-400 hover:text-yellow-600'
                          }`}
                        >
                          <Star className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{resource.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{resource.description}</p>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                        <span>📚 {resource.courseName || 'Non assigné'}</span>
                        {viewCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {viewCount}
                          </span>
                        )}
                      </div>

                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {resource.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handleResourceClick(resource)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                      >
                        {resource.type === 'video' ? (
                          <>
                            <Play className="h-4 w-4" />
                            Regarder
                          </>
                        ) : resource.type === 'pdf' ? (
                          <>
                            <Download className="h-4 w-4" />
                            Ouvrir PDF
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4" />
                            Accéder
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'books' && (
          <div>
            {books.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Book className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun livre</h3>
                <p className="text-gray-500">Le catalogue de livres est vide</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.map(book => (
                  <div key={book.id} className="glass rounded-xl p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 w-16 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                        📖
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{book.title}</h3>
                        <p className="text-sm text-gray-600">{book.author}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center justify-between">
                        <span>Catégorie:</span>
                        <span className="font-medium">{book.category}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Localisation:</span>
                        <span className="font-medium">{book.location || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Disponibilité:</span>
                        <span className={`font-semibold ${
                          book.availableCopies > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {book.availableCopies}/{book.totalCopies} disponible(s)
                        </span>
                      </div>
                    </div>

                    {book.availableCopies > 0 ? (
                      <div className="text-center p-3 bg-green-50 text-green-700 rounded-lg text-sm font-semibold">
                        ✅ Disponible pour emprunt
                      </div>
                    ) : (
                      <div className="text-center p-3 bg-red-50 text-red-700 rounded-lg text-sm font-semibold">
                        ❌ Toutes les copies empruntées
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-loans' && (
          <div>
            {loans.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Book className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun emprunt</h3>
                <p className="text-gray-500">Vous n'avez aucun livre emprunté actuellement</p>
              </div>
            ) : (
              <div className="space-y-4">
                {loans.map(loan => {
                  const daysUntil = getDaysUntilDue(loan.dueDate);
                  const isOverdue = daysUntil < 0;

                  return (
                    <div key={loan.id} className="glass rounded-xl p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex-shrink-0 w-16 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                            📖
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Livre emprunté
                            </h3>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Emprunté le: {new Date(loan.loanDate).toLocaleDateString('fr-FR')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>À rendre le: {new Date(loan.dueDate).toLocaleDateString('fr-FR')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>Renouvellements: {loan.renewalCount || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                          isOverdue
                            ? 'bg-red-100 text-red-700'
                            : daysUntil <= 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {isOverdue
                            ? `⚠️ En retard de ${Math.abs(daysUntil)} jour(s)`
                            : daysUntil <= 2
                            ? `⏰ ${daysUntil} jour(s) restant(s)`
                            : `✅ ${daysUntil} jour(s) restant(s)`
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
