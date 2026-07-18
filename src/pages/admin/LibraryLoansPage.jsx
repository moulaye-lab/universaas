/**
 * LibraryLoansPage.jsx - Gestion des emprunts
 *
 * Fonctionnalités:
 * - Liste tous les prêts (actifs, retournés, en retard)
 * - Créer un nouveau prêt
 * - Enregistrer un retour
 * - Calcul automatique des amendes
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import {
  getAllLoans,
  getAllBooks,
  createLoan,
  returnLoan,
  getOverdueLoans
} from '../../services/libraryService';
import {
  ChevronLeft, Plus, Book, Calendar, AlertCircle, CheckCircle, X, Search
} from 'lucide-react';

export default function LibraryLoansPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [loans, setLoans] = useState([]);
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [formData, setFormData] = useState({
    bookId: '',
    studentId: '',
    studentName: ''
  });

  useEffect(() => {
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);

      // Charger prêts
      const loansList = await getAllLoans(userProfile.universityId);

      // Marquer les prêts en retard
      const now = Date.now();
      const loansWithStatus = loansList.map(loan => ({
        ...loan,
        isOverdue: loan.status === 'active' && loan.dueDate < now
      }));

      setLoans(loansWithStatus);

      // Charger livres
      const booksList = await getAllBooks(userProfile.universityId);
      setBooks(booksList);

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

  const handleCreateLoan = async (e) => {
    e.preventDefault();

    try {
      await createLoan(userProfile.universityId, formData, userProfile.profileId);
      setShowModal(false);
      resetForm();
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
        alert(`Livre retourné avec succès.\nAmende de retard: ${result.fineAmount} FCFA`);
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

  const resetForm = () => {
    setFormData({
      bookId: '',
      studentId: '',
      studentName: ''
    });
  };

  const filteredLoans = loans.filter(loan => {
    // Filtre par statut
    const statusMatch =
      filterStatus === 'all' ? true :
      filterStatus === 'overdue' ? loan.isOverdue :
      loan.status === filterStatus;

    if (!statusMatch) return false;

    // Filtre par recherche
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const book = books.find(b => b.id === loan.bookId);

    // Recherche dans tous les champs pertinents
    const searchableText = [
      loan.studentName,
      loan.studentId,
      book?.title,
      book?.author,
      book?.isbn,
      loan.status,
      new Date(loan.loanDate).toLocaleDateString('fr-FR'),
      new Date(loan.dueDate).toLocaleDateString('fr-FR'),
      loan.returnDate ? new Date(loan.returnDate).toLocaleDateString('fr-FR') : ''
    ].filter(Boolean).join(' ').toLowerCase();

    return searchableText.includes(query);
  });

  const getDaysUntilDue = (dueDate) => {
    const days = Math.ceil((dueDate - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const overdueLoans = loans.filter(l => l.isOverdue).length;

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
              <h1 className="text-3xl font-bold text-gray-900">📚 Gestion des Emprunts</h1>
              <p className="text-gray-600 mt-1">Créez et suivez les prêts de livres</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
            >
              <Plus className="h-5 w-5" />
              Nouveau prêt
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Total prêts</p>
              <p className="text-2xl font-bold text-gray-900">{loans.length}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Actifs</p>
              <p className="text-2xl font-bold text-blue-600">
                {loans.filter(l => l.status === 'active').length}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">En retard</p>
              <p className="text-2xl font-bold text-red-600">{overdueLoans}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-gray-600">Retournés</p>
              <p className="text-2xl font-bold text-green-600">
                {loans.filter(l => l.status === 'returned').length}
              </p>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="glass rounded-xl p-4 mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par étudiant, livre, ISBN, matricule, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtres */}
          <div className="glass rounded-xl p-4">
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'active'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Actifs
              </button>
              <button
                onClick={() => setFilterStatus('overdue')}
                className={`px-4 py-2 rounded-lg font-medium transition relative ${
                  filterStatus === 'overdue'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                En retard
                {overdueLoans > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {overdueLoans}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilterStatus('returned')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === 'returned'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Retournés
              </button>
            </div>
            {searchQuery && (
              <div className="mt-3 text-sm text-gray-600">
                📊 {filteredLoans.length} résultat{filteredLoans.length > 1 ? 's' : ''} trouvé{filteredLoans.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Liste emprunts */}
        {filteredLoans.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Book className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun emprunt</h3>
            <p className="text-gray-500">
              {filterStatus === 'all' ? 'Aucun prêt enregistré' : 'Aucun prêt pour ce filtre'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLoans.map(loan => {
              const book = books.find(b => b.id === loan.bookId);
              const daysUntil = getDaysUntilDue(loan.dueDate);
              const isOverdue = loan.isOverdue;

              return (
                <div key={loan.id} className="glass rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-16 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
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
                              ? `⏰ ${daysUntil}j restant(s)`
                              : `📅 ${daysUntil}j restant(s)`
                            }
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
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
                        {loan.fineAmount > 0 && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-red-600 font-semibold">
                              Amende: {loan.fineAmount} FCFA {loan.finePaid && '(payée)'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nouveau prêt */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Nouveau prêt</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateLoan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Livre <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.bookId}
                    onChange={(e) => setFormData({ ...formData, bookId: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un livre</option>
                    {books.filter(b => b.availableCopies > 0).map(book => (
                      <option key={book.id} value={book.id}>
                        {book.title} ({book.availableCopies} dispo)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Étudiant <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.studentId}
                    onChange={(e) => {
                      const student = students.find(s => s.id === e.target.value);
                      setFormData({
                        ...formData,
                        studentId: e.target.value,
                        studentName: student ? `${student.firstName} ${student.lastName}` : ''
                      });
                    }}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un étudiant</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.firstName} {student.lastName} - {student.matricule}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                  ℹ️ Durée du prêt: 14 jours (configurable dans les paramètres)
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
                  >
                    Créer le prêt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
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
                  <p className="text-sm text-gray-600 mb-1">Date limite de retour</p>
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
                      Une amende sera calculée automatiquement (100 FCFA/jour par défaut)
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
