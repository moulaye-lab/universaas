import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Upload,
  Download,
  FileText,
  Users,
  UserCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Loader
} from 'lucide-react';

export default function ImportDataPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('students'); // students | teachers
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [importResult, setImportResult] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      parseCSVPreview(droppedFile);
    } else {
      alert('Veuillez déposer un fichier CSV');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSVPreview(selectedFile);
    }
  };

  const parseCSVPreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        alert('Le fichier CSV doit contenir au moins une ligne de données');
        return;
      }

      // Parser les 5 premières lignes pour prévisualisation
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setPreviewData({ headers, rows, totalRows: lines.length - 1 });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file) {
      alert('Veuillez sélectionner un fichier');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('universityId', userProfile.universityId);
      formData.append('createdBy', currentUser.uid);

      const endpoint = activeTab === 'students'
        ? '/api/import/students'
        : '/api/import/teachers';

      const response = await fetch(`${import.meta.env.VITE_AI_API_URL || 'http://localhost:3001'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'import');
      }

      setImportResult(result);
      setFile(null);
      setPreviewData([]);

    } catch (error) {
      console.error('Import error:', error);
      alert(error.message || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    let csvContent = '';
    let filename = '';

    if (activeTab === 'students') {
      csvContent = 'firstName,lastName,email,matricule,level,class,department,fieldOfStudy,dateOfBirth\n';
      csvContent += 'Jean,Dupont,jean.dupont@email.fr,STU-2025-0001,L1,L1-INFO-A,Informatique,Informatique,2005-03-15\n';
      csvContent += 'Marie,Martin,marie.martin@email.fr,STU-2025-0002,L2,L2-MATH-B,Mathématiques,Mathématiques,2004-07-22\n';
      csvContent += 'Ahmed,Ben Ali,ahmed.benali@email.fr,STU-2025-0003,M1,M1-ECO-A,Économie,Économie,2001-11-10';
      filename = 'template_etudiants.csv';
    } else {
      csvContent = 'firstName,lastName,email,department,specialization,phone\n';
      csvContent += 'Pierre,Durand,pierre.durand@univ.fr,Informatique,Réseaux,+33612345678\n';
      csvContent += 'Sophie,Bernard,sophie.bernard@univ.fr,Mathématiques,Algèbre,+33687654321\n';
      csvContent += 'Mohamed,Alami,mohamed.alami@univ.fr,Physique,Mécanique,+33698765432';
      filename = 'template_enseignants.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-white rounded-xl transition"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">📥 Import de Données</h1>
            <p className="text-gray-600 mt-1">Importez vos étudiants et enseignants depuis un fichier CSV</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setActiveTab('students');
              setFile(null);
              setPreviewData([]);
              setImportResult(null);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'students'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Étudiants
          </button>
          <button
            onClick={() => {
              setActiveTab('teachers');
              setFile(null);
              setPreviewData([]);
              setImportResult(null);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'teachers'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            Enseignants
          </button>
        </div>

        {/* Template Download */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Download className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                1. Téléchargez le modèle CSV
              </h3>
              <p className="text-gray-600 mb-3">
                Utilisez notre modèle pour formater correctement vos données
              </p>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
              >
                <Download className="w-4 h-4" />
                Télécharger le modèle {activeTab === 'students' ? 'étudiants' : 'enseignants'}
              </button>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                2. Importez votre fichier CSV
              </h3>
              <p className="text-gray-600">
                Glissez-déposez ou cliquez pour sélectionner votre fichier
              </p>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-3 border-dashed rounded-2xl p-12 text-center transition ${
              dragging
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }`}
          >
            {file ? (
              <div>
                <FileText className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-900 mb-1">{file.name}</p>
                <p className="text-sm text-gray-600 mb-4">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewData([]);
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-semibold"
                >
                  Supprimer
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Glissez-déposez votre fichier CSV ici
                </p>
                <p className="text-sm text-gray-600 mb-4">ou</p>
                <label className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold cursor-pointer transition">
                  <Upload className="w-5 h-5" />
                  Parcourir
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {previewData.headers && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              📋 Prévisualisation (5 premières lignes)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    {previewData.headers.map((header, index) => (
                      <th key={index} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-gray-200">
                      {previewData.headers.map((header, colIndex) => (
                        <td key={colIndex} className="px-4 py-3 text-sm text-gray-600">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Total: <strong>{previewData.totalRows}</strong> lignes à importer
            </p>
          </div>
        )}

        {/* Import Button */}
        {file && (
          <div className="flex justify-center mb-6">
            <button
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg text-white rounded-xl font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader className="w-6 h-6 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Lancer l'import
                </>
              )}
            </button>
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-3 rounded-xl ${
                importResult.errors?.length > 0 ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                {importResult.errors?.length > 0 ? (
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Résultat de l'import
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm text-green-700 mb-1">Succès</p>
                    <p className="text-3xl font-bold text-green-600">
                      {importResult.success || 0}
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-700 mb-1">Erreurs</p>
                    <p className="text-3xl font-bold text-red-600">
                      {importResult.errors?.length || 0}
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-700 mb-1">Total traité</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {importResult.total || 0}
                    </p>
                  </div>
                </div>

                {/* Errors List */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="font-semibold text-yellow-900 mb-2">
                      ⚠️ Erreurs rencontrées:
                    </p>
                    <ul className="space-y-1 text-sm text-yellow-800 max-h-64 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>
                          Ligne {error.line}: {error.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.success > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => navigate(activeTab === 'students' ? '/admin/students' : '/admin/teachers')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition"
                    >
                      Voir la liste
                      <ArrowLeft className="w-5 h-5 rotate-180" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            📝 Instructions
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Le fichier doit être au format CSV (virgule comme séparateur)</li>
            <li>• La première ligne doit contenir les en-têtes de colonnes</li>
            <li>• Les emails doivent être uniques et valides</li>
            <li>• Les matricules doivent être uniques (générés automatiquement si vides)</li>
            <li>• Encodage recommandé: UTF-8</li>
            <li>• Taille maximale: 10 MB</li>
            <li>• Les comptes seront créés automatiquement avec un mot de passe temporaire</li>
            <li>• Un email sera envoyé à chaque utilisateur avec ses identifiants</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
