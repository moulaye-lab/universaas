/**
 * MigrateAcademicYearPage.jsx - Page de migration academicYear
 *
 * Ajoute le champ academicYear aux étudiants existants qui n'en ont pas
 * Accessible uniquement aux admin_universite
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { ArrowLeft, Search, Zap, CheckCircle, AlertCircle, Loader } from 'lucide-react';

// Calculer l'année académique actuelle
function getCurrentAcademicYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = janvier

  if (currentMonth >= 8) { // Septembre à décembre
    return `${currentYear}-${currentYear + 1}`;
  } else { // Janvier à août
    return `${currentYear - 1}-${currentYear}`;
  }
}

export default function MigrateAcademicYearPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [analyzing, setAnalyzing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const currentAcademicYear = getCurrentAcademicYear();

  // Vérifier que l'utilisateur est admin
  if (userProfile?.role !== 'admin_universite') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Cette page est réservée aux administrateurs.</p>
          <button
            onClick={() => navigate('/admin')}
            className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  // Analyser les étudiants
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    setAnalysisResult(null);
    setMigrationResult(null);

    try {
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      if (!studentsSnap.exists()) {
        setError('Aucun étudiant trouvé dans cette université.');
        return;
      }

      const studentsData = studentsSnap.val();
      const studentEntries = Object.entries(studentsData);
      const studentsWithoutYear = studentEntries.filter(([id, student]) => !student.academicYear);

      setAnalysisResult({
        total: studentEntries.length,
        withYear: studentEntries.length - studentsWithoutYear.length,
        withoutYear: studentsWithoutYear.length,
        examples: studentsWithoutYear.slice(0, 5).map(([id, s]) => ({
          id,
          name: `${s.firstName} ${s.lastName}`,
          level: s.level,
          matricule: s.matricule
        }))
      });

    } catch (err) {
      console.error('Error analyzing students:', err);
      setError('Erreur lors de l\'analyse: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // Migrer les étudiants
  const handleMigrate = async () => {
    if (!analysisResult || analysisResult.withoutYear === 0) {
      alert('Veuillez d\'abord analyser les données.');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir ajouter academicYear="${currentAcademicYear}" à ${analysisResult.withoutYear} étudiants?\n\nCette action ne peut pas être annulée.`)) {
      return;
    }

    setMigrating(true);
    setError('');
    setProgress(0);

    try {
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      if (!studentsSnap.exists()) {
        throw new Error('Aucun étudiant trouvé');
      }

      const studentsData = studentsSnap.val();
      const studentsToMigrate = Object.entries(studentsData).filter(([id, student]) => !student.academicYear);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < studentsToMigrate.length; i++) {
        const [studentId, student] = studentsToMigrate[i];

        try {
          const studentRef = ref(database, `universities/${userProfile.universityId}/students/${studentId}`);
          await update(studentRef, {
            academicYear: currentAcademicYear,
            updatedAt: Date.now()
          });
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push({
            name: `${student.firstName} ${student.lastName}`,
            error: err.message
          });
        }

        // Mettre à jour la progression
        setProgress(Math.round(((i + 1) / studentsToMigrate.length) * 100));
      }

      setMigrationResult({
        total: studentsToMigrate.length,
        success: successCount,
        errors: errorCount,
        errorDetails: errors
      });

    } catch (err) {
      console.error('Error migrating students:', err);
      setError('Erreur lors de la migration: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
          <h1 className="text-3xl font-black text-gray-900">🔧 Migration AcademicYear</h1>
          <p className="text-gray-600 mt-2">
            Ajouter le champ <code className="bg-gray-100 px-2 py-1 rounded text-sm">academicYear</code> aux étudiants existants
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Info Box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-500 rounded-full p-3">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">À propos de cette migration</h3>
              <p className="text-gray-700 mb-3">
                Cette page ajoute automatiquement le champ <strong>academicYear</strong> à tous les étudiants qui n'en ont pas.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                <li>Année académique actuelle: <strong>{currentAcademicYear}</strong></li>
                <li>Seuls les étudiants SANS academicYear seront modifiés</li>
                <li>Cette action est nécessaire pour que les filtres par année fonctionnent</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Étapes</h2>

          <div className="space-y-4">
            {/* Step 1: Analyze */}
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center font-bold text-blue-600">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Analyser les données</h3>
                <p className="text-sm text-gray-600">Vérifier combien d'étudiants doivent être migrés</p>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || migrating}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Analyse...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Analyser
                  </>
                )}
              </button>
            </div>

            {/* Step 2: Migrate */}
            <div className="flex items-center gap-4">
              <div className="bg-green-100 rounded-full w-10 h-10 flex items-center justify-center font-bold text-green-600">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Appliquer la migration</h3>
                <p className="text-sm text-gray-600">Ajouter academicYear aux étudiants identifiés</p>
              </div>
              <button
                onClick={handleMigrate}
                disabled={!analysisResult || analysisResult.withoutYear === 0 || analyzing || migrating}
                className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {migrating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Migration... {progress}%
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Migrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Analysis Result */}
        {analysisResult && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Résultat de l'analyse</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-black text-blue-600">{analysisResult.total}</div>
                <div className="text-sm text-gray-600 mt-1">Total étudiants</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-black text-green-600">{analysisResult.withYear}</div>
                <div className="text-sm text-gray-600 mt-1">Avec academicYear</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-black text-orange-600">{analysisResult.withoutYear}</div>
                <div className="text-sm text-gray-600 mt-1">À migrer</div>
              </div>
            </div>

            {analysisResult.withoutYear > 0 && (
              <>
                <h3 className="font-semibold text-gray-900 mb-2">Exemples d'étudiants à migrer:</h3>
                <ul className="space-y-2">
                  {analysisResult.examples.map((student) => (
                    <li key={student.id} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      <span className="font-medium">{student.name}</span>
                      <span className="text-gray-500">({student.level})</span>
                      <span className="text-gray-400">{student.matricule}</span>
                    </li>
                  ))}
                  {analysisResult.withoutYear > 5 && (
                    <li className="text-sm text-gray-500 ml-5">
                      ... et {analysisResult.withoutYear - 5} autres
                    </li>
                  )}
                </ul>
              </>
            )}

            {analysisResult.withoutYear === 0 && (
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="w-6 h-6" />
                <span className="font-semibold">Tous les étudiants ont déjà un academicYear. Aucune migration nécessaire.</span>
              </div>
            )}
          </div>
        )}

        {/* Migration Result */}
        {migrationResult && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">✅ Résultat de la migration</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-black text-green-600">{migrationResult.success}</div>
                <div className="text-sm text-gray-600 mt-1">Réussies</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-black text-red-600">{migrationResult.errors}</div>
                <div className="text-sm text-gray-600 mt-1">Erreurs</div>
              </div>
            </div>

            {migrationResult.errors > 0 && (
              <>
                <h3 className="font-semibold text-red-600 mb-2">Erreurs rencontrées:</h3>
                <ul className="space-y-1 text-sm">
                  {migrationResult.errorDetails.slice(0, 10).map((err, idx) => (
                    <li key={idx} className="text-red-600">
                      {err.name}: {err.error}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {migrationResult.success === migrationResult.total && (
              <div className="flex items-center gap-3 text-green-600 bg-green-50 rounded-lg p-4">
                <CheckCircle className="w-6 h-6" />
                <span className="font-semibold">Migration terminée avec succès! Vous pouvez maintenant utiliser les filtres par année.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
