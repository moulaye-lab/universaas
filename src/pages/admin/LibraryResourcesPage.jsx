/**
 * LibraryResourcesPage.jsx - Gestion des ressources pédagogiques
 *
 * Fonctionnalités:
 * - Liste toutes les ressources numériques
 * - CRUD complet (PDF, vidéos, liens)
 * - Filtres par cours, type, catégorie
 * - Stats engagement (vues, téléchargements)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database, storage } from '../../config/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  getAllResources,
  deleteResource,
  createResource,
  updateResource
} from '../../services/libraryService';
import {
  ChevronLeft, Plus, FileText, Video, Link as LinkIcon,
  Eye, Download, Edit2, Trash2, Search, Filter, X, Upload
} from 'lucide-react';

export default function LibraryResourcesPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [resources, setResources] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'pdf',
    category: 'cours',
    courseId: '',
    courseName: '',
    level: '',
    fileUrl: '',
    videoUrl: '',
    externalLink: '',
    tags: '',
    isPublic: true
  });

  useEffect(() => {
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);

      // Charger ressources
      const resourcesList = await getAllResources(userProfile.universityId);
      setResources(resourcesList);

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier taille (50 MB max)
      if (file.size > 50 * 1024 * 1024) {
        alert('Fichier trop volumineux (max 50 MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Créer chemin unique dans Storage
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `universities/${userProfile.universityId}/library/${fileName}`;
      const fileRef = storageRef(storage, filePath);

      // Upload avec progression
      const uploadTask = uploadBytesResumable(fileRef, selectedFile);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (error) => {
            console.error('Erreur upload:', error);
            setUploading(false);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploading(false);
            resolve(downloadURL);
          }
        );
      });
    } catch (error) {
      setUploading(false);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let fileUrl = formData.fileUrl;

      // Si un fichier est sélectionné, l'uploader
      if (selectedFile && formData.type === 'pdf') {
        fileUrl = await uploadFile();
      }

      const resourceData = {
        ...formData,
        fileUrl,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        teacherId: userProfile.profileId,
        teacherName: userProfile.displayName
      };

      if (editingResource) {
        await updateResource(userProfile.universityId, editingResource.id, resourceData);
      } else {
        await createResource(userProfile.universityId, resourceData, userProfile.profileId);
      }

      setShowModal(false);
      setEditingResource(null);
      setSelectedFile(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title || '',
      description: resource.description || '',
      type: resource.type || 'pdf',
      category: resource.category || 'cours',
      courseId: resource.courseId || '',
      courseName: resource.courseName || '',
      level: resource.level || '',
      fileUrl: resource.fileUrl || '',
      videoUrl: resource.videoUrl || '',
      externalLink: resource.externalLink || '',
      tags: Array.isArray(resource.tags) ? resource.tags.join(', ') : '',
      isPublic: resource.isPublic !== false
    });
    setShowModal(true);
  };

  const handleDelete = async (resourceId) => {
    if (!confirm('Supprimer cette ressource ?')) return;

    try {
      await deleteResource(userProfile.universityId, resourceId);
      loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'pdf',
      category: 'cours',
      courseId: '',
      courseName: '',
      level: '',
      fileUrl: '',
      videoUrl: '',
      externalLink: '',
      tags: '',
      isPublic: true
    });
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || resource.type === filterType;
    const matchesCourse = filterCourse === 'all' || resource.courseId === filterCourse;

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
              <h1 className="text-3xl font-bold text-gray-900">📚 Ressources Pédagogiques</h1>
              <p className="text-gray-600 mt-1">Gérez les PDF, vidéos et liens pour vos cours</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setEditingResource(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
            >
              <Plus className="h-5 w-5" />
              Ajouter une ressource
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Total ressources</p>
              <p className="text-2xl font-bold text-gray-900">{resources.length}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">PDF</p>
              <p className="text-2xl font-bold text-red-600">
                {resources.filter(r => r.type === 'pdf').length}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Vidéos</p>
              <p className="text-2xl font-bold text-purple-600">
                {resources.filter(r => r.type === 'video').length}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Liens</p>
              <p className="text-2xl font-bold text-blue-600">
                {resources.filter(r => r.type === 'link').length}
              </p>
            </div>
          </div>

          {/* Filtres */}
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
        </div>

        {/* Liste ressources */}
        {filteredResources.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucune ressource</h3>
            <p className="text-gray-500">Commencez par ajouter votre première ressource pédagogique</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredResources.map(resource => (
              <div key={resource.id} className="glass rounded-xl p-6 hover:shadow-lg transition">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${getTypeColor(resource.type)}`}>
                    {getTypeIcon(resource.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{resource.title}</h3>
                        <p className="text-sm text-gray-600">{resource.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(resource)}
                          className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {resource.viewCount || 0} vues
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        {resource.downloadCount || 0} téléchargements
                      </span>
                      <span>📚 {resource.courseName || 'Non assigné'}</span>
                      <span>👤 {resource.teacherName}</span>
                    </div>

                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {resource.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ajouter/Modifier */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingResource ? 'Modifier la ressource' : 'Nouvelle ressource'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingResource(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="pdf">PDF</option>
                      <option value="video">Vidéo</option>
                      <option value="link">Lien externe</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="cours">Cours</option>
                      <option value="td">TD</option>
                      <option value="tp">TP</option>
                      <option value="examen">Examen</option>
                      <option value="projet">Projet</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cours</label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => {
                      const course = courses.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        courseId: e.target.value,
                        courseName: course?.name || '',
                        level: course?.level || ''
                      });
                    }}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un cours</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>

                {formData.type === 'pdf' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📤 Upload de fichier PDF <span className="text-red-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-500 transition">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="flex flex-col items-center cursor-pointer"
                        >
                          <Upload className="h-12 w-12 text-gray-400 mb-2" />
                          <span className="text-sm font-medium text-gray-700">
                            Cliquer pour choisir un fichier
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            PDF • Max 50 MB
                          </span>
                        </label>
                        {selectedFile && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-700 font-medium">
                              ✅ {selectedFile.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        )}
                        {uploading && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                              <span>Upload en cours...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full transition-all"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">OU</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        🔗 URL du PDF (lien externe)
                      </label>
                      <input
                        type="url"
                        value={formData.fileUrl}
                        onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        disabled={selectedFile}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Alternative : Coller un lien Google Drive, Dropbox, etc.
                      </p>
                    </div>
                  </div>
                )}

                {formData.type === 'video' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL de la vidéo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lien YouTube, Vimeo ou autre plateforme vidéo
                    </p>
                  </div>
                )}

                {formData.type === 'link' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lien externe <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.externalLink}
                      onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="analyse, algorithme, exercices"
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                    Ressource publique (visible par tous les étudiants)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
                  >
                    {editingResource ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingResource(null);
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
