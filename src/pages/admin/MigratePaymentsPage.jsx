/**
 * MigratePaymentsPage.jsx - Migration des plans de paiement
 *
 * Convertit les anciens plans (tuitionFee, paidAmount)
 * vers le nouveau format (installments détaillés)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function MigratePaymentsPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [scanning, setScanning] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [oldPlans, setOldPlans] = useState([]);
  const [migrationResults, setMigrationResults] = useState(null);

  const scanPayments = async () => {
    if (!userProfile?.universityId) return;

    try {
      setScanning(true);
      const paymentsRef = ref(database, `universities/${userProfile.universityId}/payments`);
      const paymentsSnap = await get(paymentsRef);

      if (!paymentsSnap.exists()) {
        alert('Aucun plan de paiement trouvé');
        setScanning(false);
        return;
      }

      const allPayments = paymentsSnap.val();
      const toMigrate = [];

      // Identifier les plans au format ancien (sans installments)
      for (const [studentId, plan] of Object.entries(allPayments)) {
        if (!plan.installments || !Array.isArray(plan.installments)) {
          toMigrate.push({
            studentId,
            ...plan
          });
        }
      }

      setOldPlans(toMigrate);
      setScanning(false);

      if (toMigrate.length === 0) {
        alert('✅ Tous les plans sont déjà au nouveau format !');
      }
    } catch (err) {
      console.error('Error scanning payments:', err);
      alert('Erreur lors du scan: ' + err.message);
      setScanning(false);
    }
  };

  const migratePayments = async () => {
    if (!userProfile?.universityId || oldPlans.length === 0) return;

    const confirmMsg = `Vous allez migrer ${oldPlans.length} plan(s) de paiement.\n\nCette opération va :\n- Créer des échéances (3 par défaut)\n- Conserver les montants totaux\n- Marquer les échéances payées selon paidAmount\n\nContinuer ?`;

    if (!confirm(confirmMsg)) return;

    try {
      setMigrating(true);
      const results = {
        success: [],
        failed: []
      };

      for (const plan of oldPlans) {
        try {
          // Calculer les échéances
          const totalAmount = plan.tuitionFee || plan.totalAmount || 0;
          const paidAmount = plan.paidAmount || 0;
          const installmentsCount = 3; // Par défaut 3 échéances

          const baseAmount = Math.floor((totalAmount / installmentsCount) * 100) / 100;
          const lastAmount = totalAmount - (baseAmount * (installmentsCount - 1));

          const installments = [];
          let remainingToPay = totalAmount - paidAmount;

          for (let i = 0; i < installmentsCount; i++) {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + i);

            const installmentAmount = i === installmentsCount - 1 ? lastAmount : baseAmount;

            // Déterminer le statut selon paidAmount
            let status = 'pending';
            let paidDate = null;

            if (paidAmount >= (i + 1) * baseAmount) {
              // Cette échéance est payée
              status = 'paid';
              paidDate = Date.now() - (installmentsCount - i) * 30 * 24 * 60 * 60 * 1000; // Date approximative
            }

            installments.push({
              amount: installmentAmount,
              dueDate: dueDate.getTime(),
              status,
              installmentNumber: i + 1,
              totalInstallments: installmentsCount,
              paidDate: paidDate,
              paymentMethod: status === 'paid' ? 'Non spécifié' : null
            });
          }

          // Créer le nouveau plan
          const newPlan = {
            studentId: plan.studentId,
            totalAmount,
            currency: plan.currency || 'EUR',
            installments,
            academicYear: plan.academicYear || '2025/2026',
            description: plan.description || 'Migré depuis ancien format',
            createdAt: plan.createdAt || Date.now(),
            createdBy: plan.createdBy || 'migration-script',
            migratedAt: Date.now(),
            migratedBy: userProfile.profileId
          };

          // Sauvegarder
          const paymentRef = ref(
            database,
            `universities/${userProfile.universityId}/payments/${plan.studentId}`
          );
          await set(paymentRef, newPlan);

          results.success.push({
            studentId: plan.studentId,
            totalAmount,
            installmentsCreated: installmentsCount
          });
        } catch (err) {
          console.error(`Error migrating plan for ${plan.studentId}:`, err);
          results.failed.push({
            studentId: plan.studentId,
            error: err.message
          });
        }
      }

      setMigrationResults(results);
      setMigrating(false);

      // Afficher résumé
      const successCount = results.success.length;
      const failedCount = results.failed.length;

      alert(`Migration terminée !\n\n✅ Succès: ${successCount}\n❌ Échecs: ${failedCount}`);
    } catch (err) {
      console.error('Error during migration:', err);
      alert('Erreur lors de la migration: ' + err.message);
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin/payments')}
            className="p-2 hover:bg-white rounded-xl transition"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">🔄 Migration Plans de Paiement</h1>
            <p className="text-gray-600 mt-1">Conversion vers le format avec échéances détaillées</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">ℹ️ À propos de cette migration</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Convertit les anciens plans (format simple) vers le nouveau format (avec échéances)</li>
                <li>Génère automatiquement 3 échéances par plan</li>
                <li>Préserve les montants totaux et déjà payés</li>
                <li>Marque les échéances comme payées selon le montant déjà versé</li>
                <li>⚠️ Cette opération écrase les anciennes données (sauvegarde recommandée)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 1: Scan */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Étape 1 : Scanner les plans</h2>
          <p className="text-gray-600 mb-4">
            Identifiez les plans de paiement nécessitant une migration
          </p>
          <button
            onClick={scanPayments}
            disabled={scanning}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition flex items-center gap-2 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-5 w-5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scan en cours...' : 'Scanner les paiements'}
          </button>
        </div>

        {/* Results */}
        {oldPlans.length > 0 && !migrationResults && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📋 Plans à migrer ({oldPlans.length})
            </h2>

            <div className="space-y-3 mb-6">
              {oldPlans.slice(0, 10).map((plan, index) => (
                <div key={index} className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">Étudiant ID: {plan.studentId}</p>
                      <p className="text-sm text-gray-600">
                        Montant: {plan.tuitionFee || plan.totalAmount}€ |
                        Payé: {plan.paidAmount || 0}€ |
                        Année: {plan.academicYear || 'N/A'}
                      </p>
                    </div>
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
              ))}
              {oldPlans.length > 10 && (
                <p className="text-sm text-gray-500 text-center">
                  ... et {oldPlans.length - 10} autre(s)
                </p>
              )}
            </div>

            {/* Step 2: Migrate */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Étape 2 : Lancer la migration</h2>
              <button
                onClick={migratePayments}
                disabled={migrating}
                className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition flex items-center gap-2 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <CheckCircle className="h-5 w-5" />
                {migrating ? 'Migration en cours...' : `Migrer ${oldPlans.length} plan(s)`}
              </button>
            </div>
          </div>
        )}

        {/* Migration Results */}
        {migrationResults && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">✅ Résultats de la migration</h2>

            {/* Success */}
            {migrationResults.success.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h3 className="font-bold text-green-900">
                    Succès ({migrationResults.success.length})
                  </h3>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {migrationResults.success.map((result, index) => (
                    <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                      <p className="font-semibold text-gray-900">Étudiant: {result.studentId}</p>
                      <p className="text-gray-600">
                        {result.installmentsCreated} échéances créées | Total: {result.totalAmount}€
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed */}
            {migrationResults.failed.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <h3 className="font-bold text-red-900">
                    Échecs ({migrationResults.failed.length})
                  </h3>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {migrationResults.failed.map((result, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                      <p className="font-semibold text-gray-900">Étudiant: {result.studentId}</p>
                      <p className="text-red-600">Erreur: {result.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/admin/payments')}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
            >
              Retour aux paiements
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
