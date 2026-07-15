/**
 * libraryService.js - Service de gestion de la bibliothèque & ressources
 *
 * Fonctionnalités:
 * - Ressources pédagogiques numériques (PDF, vidéos, liens)
 * - Gestion du catalogue de livres physiques
 * - Prêts et retours
 * - Suivi progression étudiants
 * - Calcul des amendes
 * - Statistiques
 */

import { ref, set, get, update, remove, push, query, orderByChild, equalTo, increment } from 'firebase/database';
import { database } from '../config/firebase';

// ========== RESOURCES (Digital) ==========

export async function createResource(universityId, resourceData, createdBy) {
  const resourceRef = push(ref(database, `universities/${universityId}/library/resources`));
  await set(resourceRef, {
    ...resourceData,
    viewCount: 0,
    downloadCount: 0,
    createdAt: Date.now(),
    createdBy
  });
  return resourceRef.key;
}

export async function updateResource(universityId, resourceId, updates) {
  const resourceRef = ref(database, `universities/${universityId}/library/resources/${resourceId}`);
  await update(resourceRef, {
    ...updates,
    updatedAt: Date.now()
  });
}

export async function deleteResource(universityId, resourceId) {
  await remove(ref(database, `universities/${universityId}/library/resources/${resourceId}`));
}

export async function getResource(universityId, resourceId) {
  const resourceRef = ref(database, `universities/${universityId}/library/resources/${resourceId}`);
  const snapshot = await get(resourceRef);
  return snapshot.exists() ? { id: resourceId, ...snapshot.val() } : null;
}

export async function getAllResources(universityId) {
  const resourcesRef = ref(database, `universities/${universityId}/library/resources`);
  const snapshot = await get(resourcesRef);

  if (!snapshot.exists()) return [];

  return Object.entries(snapshot.val()).map(([id, data]) => ({
    id,
    ...data
  }));
}

export async function getResourcesByCourse(universityId, courseId) {
  const resourcesRef = query(
    ref(database, `universities/${universityId}/library/resources`),
    orderByChild('courseId'),
    equalTo(courseId)
  );
  const snapshot = await get(resourcesRef);

  if (!snapshot.exists()) return [];

  return Object.entries(snapshot.val()).map(([id, data]) => ({
    id,
    ...data
  }));
}

export async function incrementResourceView(universityId, resourceId) {
  const resourceRef = ref(database, `universities/${universityId}/library/resources/${resourceId}`);
  await update(resourceRef, {
    viewCount: increment(1)
  });
}

export async function incrementResourceDownload(universityId, resourceId) {
  const resourceRef = ref(database, `universities/${universityId}/library/resources/${resourceId}`);
  await update(resourceRef, {
    downloadCount: increment(1)
  });
}

// ========== PROGRESS TRACKING ==========

export async function trackResourceView(universityId, studentId, resourceId) {
  const progressRef = ref(database, `universities/${universityId}/library/progress/${studentId}/${resourceId}`);
  const progressSnap = await get(progressRef);

  if (progressSnap.exists()) {
    const existing = progressSnap.val();
    await update(progressRef, {
      lastViewedAt: Date.now(),
      viewCount: (existing.viewCount || 0) + 1
    });
  } else {
    await set(progressRef, {
      firstViewedAt: Date.now(),
      lastViewedAt: Date.now(),
      viewCount: 1,
      completionRate: 0,
      timeSpent: 0,
      downloaded: false,
      bookmarked: false
    });
  }

  // Incrémenter le compteur global de la ressource
  await incrementResourceView(universityId, resourceId);
}

export async function updateProgress(universityId, studentId, resourceId, updates) {
  const progressRef = ref(database, `universities/${universityId}/library/progress/${studentId}/${resourceId}`);
  await update(progressRef, {
    ...updates,
    lastViewedAt: Date.now()
  });
}

export async function toggleBookmark(universityId, studentId, resourceId) {
  const progressRef = ref(database, `universities/${universityId}/library/progress/${studentId}/${resourceId}`);
  const progressSnap = await get(progressRef);

  const currentBookmarked = progressSnap.exists() ? progressSnap.val().bookmarked : false;

  await update(progressRef, {
    bookmarked: !currentBookmarked
  });

  return !currentBookmarked;
}

export async function getStudentProgress(universityId, studentId) {
  const progressRef = ref(database, `universities/${universityId}/library/progress/${studentId}`);
  const snapshot = await get(progressRef);

  if (!snapshot.exists()) return {};

  return snapshot.val();
}

export async function getResourceProgress(universityId, resourceId) {
  // Récupérer tous les progrès pour cette ressource (tous étudiants)
  const allProgress = {};
  const studentsRef = ref(database, `universities/${universityId}/students`);
  const studentsSnap = await get(studentsRef);

  if (!studentsSnap.exists()) return [];

  const students = Object.keys(studentsSnap.val());

  for (const studentId of students) {
    const progressRef = ref(database, `universities/${universityId}/library/progress/${studentId}/${resourceId}`);
    const progressSnap = await get(progressRef);

    if (progressSnap.exists()) {
      allProgress[studentId] = progressSnap.val();
    }
  }

  return allProgress;
}

// ========== BOOKS (Physical) ==========

export async function createBook(universityId, bookData, createdBy) {
  const bookRef = push(ref(database, `universities/${universityId}/library/books`));
  await set(bookRef, {
    ...bookData,
    availableCopies: bookData.totalCopies,
    createdAt: Date.now(),
    createdBy
  });
  return bookRef.key;
}

export async function updateBook(universityId, bookId, updates) {
  const bookRef = ref(database, `universities/${universityId}/library/books/${bookId}`);
  await update(bookRef, {
    ...updates,
    updatedAt: Date.now()
  });
}

export async function deleteBook(universityId, bookId) {
  // Vérifier qu'il n'y a pas de prêts actifs
  const loansRef = query(
    ref(database, `universities/${universityId}/library/loans`),
    orderByChild('bookId'),
    equalTo(bookId)
  );
  const loansSnap = await get(loansRef);

  if (loansSnap.exists()) {
    const activeLoans = Object.values(loansSnap.val()).filter(loan => loan.status === 'active');
    if (activeLoans.length > 0) {
      throw new Error('Impossible de supprimer un livre avec des prêts actifs');
    }
  }

  await remove(ref(database, `universities/${universityId}/library/books/${bookId}`));
}

export async function getBook(universityId, bookId) {
  const bookRef = ref(database, `universities/${universityId}/library/books/${bookId}`);
  const snapshot = await get(bookRef);
  return snapshot.exists() ? { id: bookId, ...snapshot.val() } : null;
}

export async function getAllBooks(universityId) {
  const booksRef = ref(database, `universities/${universityId}/library/books`);
  const snapshot = await get(booksRef);

  if (!snapshot.exists()) return [];

  return Object.entries(snapshot.val()).map(([id, data]) => ({
    id,
    ...data
  }));
}

export async function searchBooksByISBN(universityId, isbn) {
  const booksRef = query(
    ref(database, `universities/${universityId}/library/books`),
    orderByChild('isbn'),
    equalTo(isbn)
  );
  const snapshot = await get(booksRef);

  if (!snapshot.exists()) return [];

  return Object.entries(snapshot.val()).map(([id, data]) => ({
    id,
    ...data
  }));
}

// ========== LOANS ==========

export async function createLoan(universityId, loanData, createdBy) {
  // 1. Vérifier qu'il y a des copies disponibles
  const book = await getBook(universityId, loanData.bookId);
  if (!book || book.availableCopies <= 0) {
    throw new Error('Aucune copie disponible pour ce livre');
  }

  // 2. Vérifier la limite de prêts de l'étudiant
  const settings = await getLibrarySettings(universityId);
  const studentLoans = await getActiveLoansForStudent(universityId, loanData.studentId);
  if (studentLoans.length >= settings.maxLoansPerStudent) {
    throw new Error(`Limite de ${settings.maxLoansPerStudent} prêts atteinte`);
  }

  // 3. Calculer la date de retour
  const loanDate = Date.now();
  const dueDate = new Date(loanDate);
  dueDate.setDate(dueDate.getDate() + settings.loanDuration);

  // 4. Créer le prêt
  const loanRef = push(ref(database, `universities/${universityId}/library/loans`));
  await set(loanRef, {
    ...loanData,
    loanDate,
    dueDate: dueDate.getTime(),
    returnDate: null,
    status: 'active',
    renewalCount: 0,
    fineAmount: 0,
    finePaid: false,
    createdBy,
    createdAt: Date.now()
  });

  // 5. Décrémenter availableCopies
  await update(ref(database, `universities/${universityId}/library/books/${loanData.bookId}`), {
    availableCopies: book.availableCopies - 1
  });

  return loanRef.key;
}

export async function returnLoan(universityId, loanId) {
  const loanRef = ref(database, `universities/${universityId}/library/loans/${loanId}`);
  const loanSnap = await get(loanRef);

  if (!loanSnap.exists()) {
    throw new Error('Prêt introuvable');
  }

  const loan = loanSnap.val();
  const returnDate = Date.now();

  // Calculer l'amende si retard
  let fineAmount = 0;
  if (returnDate > loan.dueDate) {
    const settings = await getLibrarySettings(universityId);
    const daysLate = Math.ceil((returnDate - loan.dueDate) / (1000 * 60 * 60 * 24));
    fineAmount = daysLate * settings.finePerDay;
  }

  // Mettre à jour le prêt
  await update(loanRef, {
    returnDate,
    status: 'returned',
    fineAmount
  });

  // Incrémenter availableCopies
  const bookRef = ref(database, `universities/${universityId}/library/books/${loan.bookId}`);
  const bookSnap = await get(bookRef);
  if (bookSnap.exists()) {
    const book = bookSnap.val();
    await update(bookRef, {
      availableCopies: book.availableCopies + 1
    });
  }

  return { fineAmount };
}

export async function renewLoan(universityId, loanId) {
  const loanRef = ref(database, `universities/${universityId}/library/loans/${loanId}`);
  const loanSnap = await get(loanRef);

  if (!loanSnap.exists()) {
    throw new Error('Prêt introuvable');
  }

  const loan = loanSnap.val();
  const settings = await getLibrarySettings(universityId);

  // Vérifier limite de renouvellements
  if (loan.renewalCount >= settings.maxRenewals) {
    throw new Error(`Limite de ${settings.maxRenewals} renouvellements atteinte`);
  }

  // Calculer nouvelle date de retour
  const newDueDate = new Date(loan.dueDate);
  newDueDate.setDate(newDueDate.getDate() + settings.loanDuration);

  await update(loanRef, {
    dueDate: newDueDate.getTime(),
    renewalCount: loan.renewalCount + 1
  });
}

export async function getActiveLoansForStudent(universityId, studentId) {
  const loansRef = query(
    ref(database, `universities/${universityId}/library/loans`),
    orderByChild('studentId'),
    equalTo(studentId)
  );
  const snapshot = await get(loansRef);

  if (!snapshot.exists()) return [];

  return Object.entries(snapshot.val())
    .filter(([_, loan]) => loan.status === 'active')
    .map(([id, data]) => ({ id, ...data }));
}

export async function getAllLoans(universityId) {
  const loansRef = ref(database, `universities/${universityId}/library/loans`);
  const snapshot = await get(loansRef);

  if (!snapshot.exists()) return [];

  return Object.entries(snapshot.val()).map(([id, data]) => ({
    id,
    ...data
  }));
}

export async function getOverdueLoans(universityId) {
  const loans = await getAllLoans(universityId);
  const now = Date.now();

  return loans
    .filter(loan => loan.status === 'active' && loan.dueDate < now)
    .map(loan => ({
      ...loan,
      status: 'overdue',
      daysLate: Math.ceil((now - loan.dueDate) / (1000 * 60 * 60 * 24))
    }));
}

// ========== SETTINGS ==========

export async function getLibrarySettings(universityId) {
  const settingsRef = ref(database, `universities/${universityId}/library/settings`);
  const snapshot = await get(settingsRef);

  if (!snapshot.exists()) {
    // Valeurs par défaut
    return {
      loanDuration: 14,
      maxRenewals: 2,
      maxLoansPerStudent: 3,
      finePerDay: 100,
      allowStudentUpload: false,
      maxFileSize: 50
    };
  }

  return snapshot.val();
}

export async function updateLibrarySettings(universityId, settings) {
  const settingsRef = ref(database, `universities/${universityId}/library/settings`);
  await set(settingsRef, {
    ...settings,
    updatedAt: Date.now()
  });
}

// ========== STATISTICS ==========

export async function getLibraryStats(universityId) {
  const [books, loans] = await Promise.all([
    getAllBooks(universityId),
    getAllLoans(universityId)
  ]);

  const totalBooks = books.length;
  const totalCopies = books.reduce((sum, book) => sum + (book.totalCopies || 0), 0);
  const availableCopies = books.reduce((sum, book) => sum + (book.availableCopies || 0), 0);

  const activeLoans = loans.filter(loan => loan.status === 'active');
  const overdueLoans = loans.filter(loan =>
    loan.status === 'active' && loan.dueDate < Date.now()
  );

  const totalFines = loans.reduce((sum, loan) =>
    sum + (loan.fineAmount && !loan.finePaid ? loan.fineAmount : 0), 0
  );

  return {
    totalBooks,
    totalCopies,
    availableCopies,
    activeLoans: activeLoans.length,
    overdueLoans: overdueLoans.length,
    totalFines
  };
}

export async function getPopularBooks(universityId, limit = 10) {
  const loans = await getAllLoans(universityId);

  // Compter les prêts par livre
  const bookCounts = {};
  loans.forEach(loan => {
    bookCounts[loan.bookId] = (bookCounts[loan.bookId] || 0) + 1;
  });

  // Trier par nombre de prêts
  const sorted = Object.entries(bookCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);

  // Récupérer les infos des livres
  const books = await Promise.all(
    sorted.map(async ([bookId, count]) => {
      const book = await getBook(universityId, bookId);
      return { ...book, loanCount: count };
    })
  );

  return books.filter(book => book !== null);
}
