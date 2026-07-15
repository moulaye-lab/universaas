/**
 * LibraryManagementPage.jsx - Page unifiée de gestion bibliothèque
 *
 * Fonctionnalités:
 * - Onglets: Livres physiques, Livres numériques (PDF), Emprunts
 * - Formulaire unique avec choix du type
 * - Upload PDF pour livres numériques
 * - Upload image couverture pour livres physiques (optionnel)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database, storage } from '../../config/firebase';
import { ref as storageRef, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getAllResources,
  getAllBooks,
  getAllLoans,
  createResource,
  createBook,
  createLoan,
  updateResource,
  updateBook,
  deleteResource,
  deleteBook,
  returnLoan
} from '../../services/libraryService';
import {
  ChevronLeft, Plus, BookOpen, FileText, List, Search, Edit2, Trash2,
  X, Upload, Calendar, CheckCircle, AlertCircle, Users
} from 'lucide-react';

export default function LibraryManagementPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('physical'); // physical, digital, loans
  const [physicalBooks, setPhysicalBooks] = useState([]);
  const [digitalBooks, setDigitalBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('physical'); // physical or digital
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCover, setSelectedCover] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    // Commun
    title: '',
    description: '',
    category: '',
    tags: '',

    // Livres physiques
    author: '',
    isbn: '',
    publisher: '',
    publishedYear: new Date().getFullYear(),
    totalCopies: 1,
    location: '',
    language: 'Français',
    coverUrl: '',

    // Livres numériques
    courseId: '',
    courseName: '',
    level: '',
    fileUrl: '',
    type: 'pdf',
    isPublic: true
  });

  // Loan modal
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanFormData, setLoanFormData] = useState({
    bookId: '',
    studentId: '',
    studentName: ''
  });
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentFilters, setStudentFilters] = useState({
    classId: '',
    level: '',
    status: 'active'
  });

  useEffect(() => {
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);

      // Charger livres physiques
      const physicalList = await getAllBooks(userProfile.universityId);
      setPhysicalBooks(physicalList);

      // Charger livres numériques (ressources PDF)
      const digitalList = await getAllResources(userProfile.universityId);
      setDigitalBooks(digitalList.filter(r => r.type === 'pdf'));

      // Charger emprunts
      const loansList = await getAllLoans(userProfile.universityId);
      const now = Date.now();
      const loansWithStatus = loansList.map(loan => ({
        ...loan,
        isOverdue: loan.status === 'active' && loan.dueDate < now
      }));
      setLoans(loansWithStatus);

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

      // Charger étudiants
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);
      if (studentsSnap.exists()) {
        const studentsList = Object.entries(studentsSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        setStudents(studentsList);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setLoading(false);
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'pdf') {
      if (file.size > 50 * 1024 * 1024) {
        alert('Fichier trop volumineux (max 50 MB)');
        return;
      }
      setSelectedFile(file);
    } else if (type === 'cover') {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image trop volumineuse (max 5 MB)');
        return;
      }
      setSelectedCover(file);
    }
  };

  const uploadFile = async (file, path) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      console.log('🔄 Upload démarré:', { fileName: file.name, size: file.size, path });
      console.log('👤 Auth currentUser:', currentUser);
      console.log('👤 Auth UID:', currentUser?.uid);
      console.log('🔐 Storage instance:', storage);

      if (!currentUser) {
        throw new Error('Vous devez être connecté pour uploader des fichiers');
      }

      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${path}/${fileName}`;
      const fileRef = storageRef(storage, filePath);

      console.log('📁 Chemin Firebase Storage:', filePath);

      // TEST: Essai avec uploadBytes simple au lieu de uploadBytesResumable
      console.log('🧪 Tentative upload avec uploadBytes (sans progression)...');

      try {
        const snapshot = await uploadBytes(fileRef, file);
        console.log('✅ uploadBytes réussi, récupération URL...');
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('✅ Upload terminé:', downloadURL);
        setUploading(false);
        setUploadProgress(100);
        return downloadURL;
      } catch (error) {
        console.error('❌ Erreur uploadBytes:', error);
        setUploading(false);
        throw error;
      }
    } catch (error) {
      console.error('❌ Erreur uploadFile:', error);
      setUploading(false);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let fileUrl = formData.fileUrl;
      let coverUrl = formData.coverUrl;

      // Upload PDF si livre numérique
      if (modalType === 'digital' && selectedFile) {
        console.log('📤 Upload PDF démarré...');
        fileUrl = await uploadFile(
          selectedFile,
          `universities/${userProfile.universityId}/library`
        );
        console.log('✅ PDF uploadé:', fileUrl);
      }

      // Upload image couverture si livre physique
      if (modalType === 'physical' && selectedCover) {
        console.log('📤 Upload couverture démarré...');
        coverUrl = await uploadFile(
          selectedCover,
          `universities/${userProfile.universityId}/library/covers`
        );
        console.log('✅ Couverture uploadée:', coverUrl);
      }

      const data = {
        ...formData,
        fileUrl,
        coverUrl,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      console.log('💾 Sauvegarde en base de données...', data);

      if (modalType === 'physical') {
        if (editingItem) {
          await updateBook(userProfile.universityId, editingItem.id, data);
        } else {
          await createBook(userProfile.universityId, data, userProfile.uid);
        }
      } else {
        data.teacherId = userProfile.uid;
        data.teacherName = userProfile.displayName;

        if (editingItem) {
          await updateResource(userProfile.universityId, editingItem.id, data);
        } else {
          await createResource(userProfile.universityId, data, userProfile.uid);
        }
      }

      console.log('✅ Sauvegarde terminée');
      alert('✅ Fichier uploadé avec succès !');
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      setUploading(false);
      setUploadProgress(0);

      let errorMessage = 'Erreur inconnue';
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Permission refusée. Vérifiez vos règles Firebase Storage.';
      } else if (error.code === 'storage/canceled') {
        errorMessage = 'Upload annulé.';
      } else if (error.code === 'storage/unknown') {
        errorMessage = 'Erreur réseau ou serveur Firebase indisponible.';
      } else if (error.message.includes('Timeout')) {
        errorMessage = 'Upload trop long (timeout 60s). Vérifiez votre connexion.';
      } else {
        errorMessage = error.message;
      }

      alert('❌ Erreur: ' + errorMessage);
    }
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Supprimer cet élément ?')) return;

    try {
      if (type === 'physical') {
        await deleteBook(userProfile.universityId, id);
      } else {
        await deleteResource(userProfile.universityId, id);
      }
      loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();

    try {
      await createLoan(userProfile.universityId, loanFormData, userProfile.uid);
      setShowLoanModal(false);
      setLoanFormData({ bookId: '', studentId: '', studentName: '' });
      loadData();
    } catch (error) {
      console.error('Erreur création prêt:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleReturnBook = async () => {
    if (!selectedLoan) return;

    try {
      const result = await returnLoan(userProfile.universityId, selectedLoan.id);

      if (result.fineAmount > 0) {
        alert(`Livre retourné.\nAmende: ${result.fineAmount} FCFA`);
      } else {
        alert('Livre retourné avec succès !');
      }

      setShowReturnModal(false);
      setSelectedLoan(null);
      loadData();
    } catch (error) {
      console.error('Erreur retour:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const openAddModal = (type) => {
    setModalType(type);
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item, type) => {
    setModalType(type);
    setEditingItem(item);

    if (type === 'physical') {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        category: item.category || '',
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
        author: item.author || '',
        isbn: item.isbn || '',
        publisher: item.publisher || '',
        publishedYear: item.publishedYear || new Date().getFullYear(),
        totalCopies: item.totalCopies || 1,
        location: item.location || '',
        language: item.language || 'Français',
        coverUrl: item.coverUrl || '',
        courseId: '',
        courseName: '',
        level: '',
        fileUrl: '',
        type: 'pdf',
        isPublic: true
      });
    } else {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        category: item.category || '',
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
        courseId: item.courseId || '',
        courseName: item.courseName || '',
        level: item.level || '',
        fileUrl: item.fileUrl || '',
        type: item.type || 'pdf',
        isPublic: item.isPublic !== false,
        author: '',
        isbn: '',
        publisher: '',
        publishedYear: new Date().getFullYear(),
        totalCopies: 1,
        location: '',
        language: 'Français',
        coverUrl: ''
      });
    }

    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      tags: '',
      author: '',
      isbn: '',
      publisher: '',
      publishedYear: new Date().getFullYear(),
      totalCopies: 1,
      location: '',
      language: 'Français',
      coverUrl: '',
      courseId: '',
      courseName: '',
      level: '',
      fileUrl: '',
      type: 'pdf',
      isPublic: true
    });
    setSelectedFile(null);
    setSelectedCover(null);
    setUploadProgress(0);
  };

  const filteredPhysical = physicalBooks.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDigital = digitalBooks.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              onClick={() => navigate('/admin/dashboard')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">📚 Bibliothèque</h1>
              <p className="text-gray-600 mt-1">Gérez les livres physiques, numériques et les emprunts</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Livres physiques</p>
              <p className="text-2xl font-bold text-gray-900">{physicalBooks.length}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Livres numériques (PDF)</p>
              <p className="text-2xl font-bold text-indigo-600">{digitalBooks.length}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Emprunts actifs</p>
              <p className="text-2xl font-bold text-blue-600">
                {loans.filter(l => l.status === 'active').length}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">En retard</p>
              <p className="text-2xl font-bold text-red-600">
                {loans.filter(l => l.isOverdue).length}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="glass rounded-xl p-2 flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('physical')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'physical'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              📖 Livres Physiques
            </button>
            <button
              onClick={() => setActiveTab('digital')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'digital'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              📄 Livres Numériques (PDF)
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition relative ${
                activeTab === 'loans'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              📚 Emprunts
              {loans.filter(l => l.isOverdue).length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {loans.filter(l => l.isOverdue).length}
                </span>
              )}
            </button>
          </div>

          {/* Actions bar */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {activeTab === 'physical' && (
                <button
                  onClick={() => openAddModal('physical')}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-semibold whitespace-nowrap"
                >
                  <Plus className="h-5 w-5" />
                  Ajouter livre physique
                </button>
              )}

              {activeTab === 'digital' && (
                <button
                  onClick={() => openAddModal('digital')}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-semibold whitespace-nowrap"
                >
                  <Plus className="h-5 w-5" />
                  Ajouter PDF
                </button>
              )}

              {activeTab === 'loans' && (
                <button
                  onClick={() => setShowLoanModal(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-semibold whitespace-nowrap"
                >
                  <Plus className="h-5 w-5" />
                  Nouveau prêt
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'physical' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPhysical.length === 0 ? (
              <div className="col-span-full glass rounded-2xl p-12 text-center">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun livre physique</h3>
                <p className="text-gray-500">Ajoutez des livres à votre bibliothèque</p>
              </div>
            ) : (
              filteredPhysical.map(book => (
                <div key={book.id} className="glass rounded-xl p-6 hover:shadow-lg transition">
                  <div className="flex items-start gap-4 mb-4">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-16 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                        📖
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{book.title}</h3>
                      <p className="text-sm text-gray-600">{book.author}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex justify-between">
                      <span>Catégorie:</span>
                      <span className="font-medium">{book.category || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Localisation:</span>
                      <span className="font-medium">{book.location || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Disponibilité:</span>
                      <span className={`font-semibold ${
                        book.availableCopies > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {book.availableCopies}/{book.totalCopies}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(book, 'physical')}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold flex items-center justify-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(book.id, 'physical')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'digital' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDigital.length === 0 ? (
              <div className="col-span-full glass rounded-2xl p-12 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun livre numérique</h3>
                <p className="text-gray-500">Uploadez des PDF de cours ou manuels</p>
              </div>
            ) : (
              filteredDigital.map(book => (
                <div key={book.id} className="glass rounded-xl p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 rounded-xl bg-red-100 text-red-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="text-xs text-gray-500">
                      {book.viewCount || 0} vues
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{book.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{book.description}</p>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                    <span>📚 {book.courseName || 'Non assigné'}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(book, 'digital')}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold flex items-center justify-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(book.id, 'digital')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="space-y-4">
            {loans.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <List className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun emprunt</h3>
                <p className="text-gray-500">Créez des prêts pour gérer les emprunts</p>
              </div>
            ) : (
              loans.map(loan => {
                const book = physicalBooks.find(b => b.id === loan.bookId);
                const daysUntil = getDaysUntilDue(loan.dueDate);
                const isOverdue = loan.isOverdue;

                return (
                  <div key={loan.id} className="glass rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                        📖
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {book?.title || 'Livre inconnu'}
                            </h3>
                            <p className="text-sm text-gray-600">{loan.studentName}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {loan.status === 'active' && (
                              <button
                                onClick={() => {
                                  setSelectedLoan(loan);
                                  setShowReturnModal(true);
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Retour
                              </button>
                            )}

                            <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                              loan.status === 'returned'
                                ? 'bg-green-100 text-green-700'
                                : isOverdue
                                ? 'bg-red-100 text-red-700'
                                : daysUntil <= 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {loan.status === 'returned'
                                ? '✅ Retourné'
                                : isOverdue
                                ? `⚠️ Retard ${Math.abs(daysUntil)}j`
                                : daysUntil <= 2
                                ? `⏰ ${daysUntil}j`
                                : `📅 ${daysUntil}j`
                              }
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Emprunté: {new Date(loan.loanDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>À rendre: {new Date(loan.dueDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                          {loan.returnDate && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>Retourné: {new Date(loan.returnDate).toLocaleDateString('fr-FR')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal Ajout/Modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingItem
                    ? `Modifier ${modalType === 'physical' ? 'livre physique' : 'livre numérique'}`
                    : `Nouveau ${modalType === 'physical' ? 'livre physique' : 'livre numérique (PDF)'}`
                  }
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Champs communs */}
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

                {/* Champs spécifiques livres physiques */}
                {modalType === 'physical' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
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

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                        <input
                          type="text"
                          value={formData.isbn}
                          onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Éditeur</label>
                        <input
                          type="text"
                          value={formData.publisher}
                          onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>

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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Exemplaires <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.totalCopies}
                          onChange={(e) => setFormData({ ...formData, totalCopies: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          disabled={editingItem}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                    {/* Upload image couverture */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📷 Image de couverture (facultatif)
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-500 transition">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, 'cover')}
                          className="hidden"
                          id="cover-upload"
                        />
                        <label
                          htmlFor="cover-upload"
                          className="flex flex-col items-center cursor-pointer"
                        >
                          <Upload className="h-10 w-10 text-gray-400 mb-2" />
                          <span className="text-sm font-medium text-gray-700">
                            Cliquer pour choisir une image
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            JPG, PNG • Max 5 MB
                          </span>
                        </label>
                        {selectedCover && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-700 font-medium">
                              ✅ {selectedCover.name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Champs spécifiques livres numériques */}
                {modalType === 'digital' && (
                  <>
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

                    {/* Upload PDF */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📤 Upload PDF <span className="text-red-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-500 transition">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileSelect(e, 'pdf')}
                          className="hidden"
                          id="pdf-upload"
                        />
                        <label
                          htmlFor="pdf-upload"
                          className="flex flex-col items-center cursor-pointer"
                        >
                          <Upload className="h-12 w-12 text-gray-400 mb-2" />
                          <span className="text-sm font-medium text-gray-700">
                            Cliquer pour choisir un PDF
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
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold disabled:opacity-50"
                  >
                    {uploading ? 'Upload en cours...' : editingItem ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
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

      {/* Modal Nouveau prêt */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full my-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">📚 Nouveau prêt</h2>
                <button
                  onClick={() => {
                    setShowLoanModal(false);
                    setBookSearchQuery('');
                    setStudentSearchQuery('');
                    setStudentFilters({ classId: '', level: '', status: 'active' });
                    setLoanFormData({ bookId: '', studentId: '', studentName: '' });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateLoan} className="space-y-4">
                {/* Layout horizontal: Livre et Étudiant côte à côte */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Sélection Livre */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-xl border border-indigo-200">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                      Livre <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher titre, auteur, ISBN..."
                        value={bookSearchQuery}
                        onChange={(e) => setBookSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
                      />
                      {bookSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setBookSearchQuery('')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="bg-white rounded-lg border border-indigo-200 max-h-[320px] overflow-y-auto">
                      {physicalBooks
                        .filter(b => {
                          if (b.availableCopies <= 0) return false;
                          if (!bookSearchQuery.trim()) return true;
                          const query = bookSearchQuery.toLowerCase();
                          return (
                            b.title?.toLowerCase().includes(query) ||
                            b.author?.toLowerCase().includes(query) ||
                            b.isbn?.toLowerCase().includes(query) ||
                            b.category?.toLowerCase().includes(query)
                          );
                        })
                        .map((book, index) => (
                          <button
                            key={book.id}
                            type="button"
                            onClick={() => setLoanFormData({ ...loanFormData, bookId: book.id })}
                            className={`w-full text-left px-3 py-2 hover:bg-indigo-50 transition ${
                              loanFormData.bookId === book.id ? 'bg-indigo-100 border-l-4 border-indigo-600' : ''
                            } ${index > 0 ? 'border-t border-gray-100' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-xs truncate">{book.title}</p>
                                <p className="text-xs text-gray-600 truncate">{book.author}</p>
                                {book.category && (
                                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                    {book.category}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                  {book.availableCopies}
                                </span>
                                {loanFormData.bookId === book.id && (
                                  <CheckCircle className="h-4 w-4 text-indigo-600" />
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      }
                      {physicalBooks.filter(b => {
                        if (b.availableCopies <= 0) return false;
                        if (!bookSearchQuery.trim()) return true;
                        const query = bookSearchQuery.toLowerCase();
                        return (
                          b.title?.toLowerCase().includes(query) ||
                          b.author?.toLowerCase().includes(query) ||
                          b.isbn?.toLowerCase().includes(query)
                        );
                      }).length === 0 && (
                        <div className="p-6 text-center text-gray-500">
                          <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-xs">Aucun livre disponible</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      {physicalBooks.filter(b => {
                        if (b.availableCopies <= 0) return false;
                        if (!bookSearchQuery.trim()) return true;
                        const query = bookSearchQuery.toLowerCase();
                        return (
                          b.title?.toLowerCase().includes(query) ||
                          b.author?.toLowerCase().includes(query) ||
                          b.isbn?.toLowerCase().includes(query)
                        );
                      }).length} livre(s)
                    </p>
                  </div>

                  {/* Sélection Étudiant */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-xl border border-blue-200">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Étudiant <span className="text-red-500">*</span>
                    </label>

                    {/* Filtres compacts */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <select
                        value={studentFilters.level}
                        onChange={(e) => setStudentFilters({ ...studentFilters, level: e.target.value })}
                        className="px-2 py-1.5 rounded-lg border border-blue-200 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">Tous niveaux</option>
                        <option value="L1">L1</option>
                        <option value="L2">L2</option>
                        <option value="L3">L3</option>
                        <option value="M1">M1</option>
                        <option value="M2">M2</option>
                      </select>

                      <select
                        value={studentFilters.classId}
                        onChange={(e) => setStudentFilters({ ...studentFilters, classId: e.target.value })}
                        className="px-2 py-1.5 rounded-lg border border-blue-200 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">Toutes classes</option>
                        {Array.from(new Set(students.map(s => s.className).filter(Boolean))).map(className => (
                          <option key={className} value={className}>{className}</option>
                        ))}
                      </select>
                    </div>

                    {/* Recherche */}
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Nom, matricule..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                      />
                      {studentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setStudentSearchQuery('')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Liste étudiants */}
                    <div className="bg-white rounded-lg border border-blue-200 max-h-[250px] overflow-y-auto">
                      {students
                        .filter(student => {
                          if (studentFilters.status && student.status !== studentFilters.status) return false;
                          if (studentFilters.level && student.level !== studentFilters.level) return false;
                          if (studentFilters.classId && student.className !== studentFilters.classId) return false;
                          if (!studentSearchQuery.trim()) return true;
                          const query = studentSearchQuery.toLowerCase();
                          return (
                            student.firstName?.toLowerCase().includes(query) ||
                            student.lastName?.toLowerCase().includes(query) ||
                            student.matricule?.toLowerCase().includes(query) ||
                            student.email?.toLowerCase().includes(query)
                          );
                        })
                        .map((student, index) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                              setLoanFormData({
                                ...loanFormData,
                                studentId: student.id,
                                studentName: `${student.firstName} ${student.lastName}`
                              });
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition ${
                              loanFormData.studentId === student.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                            } ${index > 0 ? 'border-t border-gray-100' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-xs truncate">
                                  {student.firstName} {student.lastName}
                                </p>
                                <p className="text-xs text-gray-600 truncate">{student.matricule}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  {student.level && (
                                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">
                                      {student.level}
                                    </span>
                                  )}
                                  {student.className && (
                                    <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 text-xs rounded truncate">
                                      {student.className}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {loanFormData.studentId === student.id && (
                                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))
                      }
                      {students.filter(student => {
                        if (studentFilters.status && student.status !== studentFilters.status) return false;
                        if (studentFilters.level && student.level !== studentFilters.level) return false;
                        if (studentFilters.classId && student.className !== studentFilters.classId) return false;
                        if (!studentSearchQuery.trim()) return true;
                        const query = studentSearchQuery.toLowerCase();
                        return (
                          student.firstName?.toLowerCase().includes(query) ||
                          student.lastName?.toLowerCase().includes(query) ||
                          student.matricule?.toLowerCase().includes(query)
                        );
                      }).length === 0 && (
                        <div className="p-6 text-center text-gray-500">
                          <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-xs">Aucun étudiant</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      {students.filter(student => {
                        if (studentFilters.status && student.status !== studentFilters.status) return false;
                        if (studentFilters.level && student.level !== studentFilters.level) return false;
                        if (studentFilters.classId && student.className !== studentFilters.classId) return false;
                        if (!studentSearchQuery.trim()) return true;
                        const query = studentSearchQuery.toLowerCase();
                        return (
                          student.firstName?.toLowerCase().includes(query) ||
                          student.lastName?.toLowerCase().includes(query) ||
                          student.matricule?.toLowerCase().includes(query)
                        );
                      }).length} étudiant(s)
                    </p>
                  </div>
                </div>

                {/* Récapitulatif et Actions */}
                <div className="flex gap-3">
                  {/* Info */}
                  <div className="flex-1 bg-gradient-to-r from-amber-50 to-yellow-50 p-3 rounded-xl border border-amber-200">
                    <p className="text-xs font-semibold text-amber-900 mb-1.5">ℹ️ Conditions</p>
                    <ul className="text-xs text-amber-800 space-y-0.5">
                      <li>• Durée: <strong>14 jours</strong></li>
                      <li>• Retard: <strong>100 FCFA/jour</strong></li>
                    </ul>
                  </div>

                  {/* Récapitulatif si sélection complète */}
                  {loanFormData.bookId && loanFormData.studentId && (
                    <div className="flex-1 bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-200">
                      <p className="text-xs font-semibold text-green-900 mb-1.5">✅ Récapitulatif</p>
                      <div className="space-y-0.5 text-xs text-green-800">
                        <p className="truncate">📚 {physicalBooks.find(b => b.id === loanFormData.bookId)?.title}</p>
                        <p className="truncate">👨‍🎓 {loanFormData.studentName}</p>
                        <p>📅 Retour: <strong>{new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}</strong></p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={!loanFormData.bookId || !loanFormData.studentId}
                    className="flex-1 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    ✓ Créer le prêt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoanModal(false);
                      setBookSearchQuery('');
                      setStudentSearchQuery('');
                      setStudentFilters({ classId: '', level: '', status: 'active' });
                      setLoanFormData({ bookId: '', studentId: '', studentName: '' });
                    }}
                    className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Retour */}
      {showReturnModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Enregistrer le retour</h2>
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setSelectedLoan(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Étudiant</p>
                  <p className="font-semibold text-gray-900">{selectedLoan.studentName}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Date limite</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedLoan.dueDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                {selectedLoan.isOverdue && (
                  <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="font-semibold text-red-900">Retard détecté</p>
                    </div>
                    <p className="text-sm text-red-700">
                      Amende automatique (100 FCFA/jour)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReturnBook}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
                >
                  Confirmer le retour
                </button>
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setSelectedLoan(null);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
