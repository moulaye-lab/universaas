/**
 * MyPaymentsPage.jsx - Mes paiements (Étudiant)
 *
 * Fonctionnalités:
 * - Voir échéancier complet
 * - Historique paiements
 * - Télécharger reçus PDF
 * - Alertes paiements en retard
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, DollarSign, AlertCircle, CheckCircle, Clock, Download, FilePlus } from 'lucide-react';
import { generateReceiptPDF, generatePaymentPlanPDF } from '../../utils/receiptPDFGenerator';

export default function MyPaymentsPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [studentData, setStudentData] = useState(null);

  useEffect(() => {
    loadPayments();
  }, [userProfile, currentUser]);

  const loadPayments = async () => {
    if (!userProfile?.universityId || !currentUser?.uid) return;

    try {
      setLoading(true);
      const studentId = userProfile.profileId || currentUser.uid;

      // Charger infos étudiant
      const studentRef = ref(database, `universities/${userProfile.universityId}/students/${studentId}`);
      const studentSnap = await get(studentRef);
      if (studentSnap.exists()) {
        setStudentData({ id: studentId, ...studentSnap.val() });
      }

      // Charger plan de paiement
      const paymentsRef = ref(database, `universities/${userProfile.universityId}/payments/${studentId}`);
      const paymentsSnap = await get(paymentsRef);

      if (paymentsSnap.exists()) {
        setPaymentPlan(paymentsSnap.val());
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading payments:', err);
      setLoading(false);
    }
  };

  const handleDownloadReceipt = (installment, index) => {
    if (installment.status !== 'paid') {
      alert('Ce paiement n\'a pas encore été effectué');
      return;
    }

    try {
      generateReceiptPDF({
        student: {
          firstName: studentData?.firstName || 'Prénom',
          lastName: studentData?.lastName || 'Nom',
          matricule: studentData?.matricule || 'N/A',
          level: studentData?.level || 'N/A',
          email: studentData?.email || 'N/A'
        },
        payment: {
          amount: installment.amount,
          dueDate: installment.dueDate,
          paidDate: installment.paidDate,
          paymentMethod: installment.paymentMethod || 'Non spécifié',
          receiptNumber: `${studentData?.matricule}-${paymentPlan?.academicYear}-${index + 1}`
        },
        universityName: userProfile?.universityName || 'Université',
        academicYear: paymentPlan?.academicYear || '2025/2026'
      });
    } catch (err) {
      alert('Erreur lors de la génération du reçu: ' + err.message);
    }
  };

  const handleDownloadFullPlan = () => {
    if (!paymentPlan || !studentData) return;

    try {
      generatePaymentPlanPDF({
        student: {
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          matricule: studentData.matricule
        },
        installments: paymentPlan.installments,
        totalAmount: paymentPlan.totalAmount,
        universityName: userProfile?.universityName || 'Université',
        academicYear: paymentPlan.academicYear
      });
    } catch (err) {
      alert('Erreur: ' + err.message);
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

  const paidCount = paymentPlan?.installments?.filter(i => i.status === 'paid').length || 0;
  const totalInstallments = paymentPlan?.installments?.length || 0;
  const paidAmount = paymentPlan?.installments?.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0) || 0;
  const remainingAmount = (paymentPlan?.totalAmount || 0) - paidAmount;
  const overdueCount = paymentPlan?.installments?.filter(i => i.status === 'pending' && i.dueDate < Date.now()).length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard/student')}
            className="p-2 hover:bg-white rounded-xl transition"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">💰 Mes Paiements</h1>
            <p className="text-gray-600 mt-1">Frais de scolarité et échéancier</p>
          </div>
          {paymentPlan && (
            <button
              onClick={handleDownloadFullPlan}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition flex items-center gap-2 font-semibold"
            >
              <Download className="h-5 w-5" />
              Échéancier PDF
            </button>
          )}
        </div>

        {!paymentPlan ? (
          <div className="glass rounded-2xl p-12 text-center">
            <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Aucun plan de paiement</h2>
            <p className="text-gray-600">
              Votre plan de paiement n'a pas encore été configuré. Contactez l'administration.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{paymentPlan.totalAmount}€</p>
                <p className="text-sm text-gray-600">Montant total</p>
              </div>

              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{paidAmount.toFixed(2)}€</p>
                <p className="text-sm text-gray-600">Déjà payé</p>
              </div>

              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{remainingAmount.toFixed(2)}€</p>
                <p className="text-sm text-gray-600">Restant</p>
              </div>

              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{overdueCount}</p>
                <p className="text-sm text-gray-600">En retard</p>
              </div>
            </div>

            {/* Alertes */}
            {overdueCount > 0 && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">
                    ⚠️ {overdueCount} paiement{overdueCount > 1 ? 's' : ''} en retard
                  </p>
                  <p className="text-sm text-red-700">
                    Veuillez régulariser votre situation au plus vite. Contactez l'administration pour plus d'informations.
                  </p>
                </div>
              </div>
            )}

            {/* Échéancier */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📅 Échéancier de Paiement ({paidCount}/{totalInstallments})
              </h2>

              <div className="space-y-3">
                {paymentPlan.installments.map((installment, index) => {
                  const isOverdue = installment.status === 'pending' && installment.dueDate < Date.now();
                  const isPaid = installment.status === 'paid';

                  return (
                    <div
                      key={index}
                      className={`p-5 rounded-xl border-2 ${
                        isPaid
                          ? 'bg-green-50 border-green-200'
                          : isOverdue
                          ? 'bg-red-50 border-red-200'
                          : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-gray-900">
                              Échéance {index + 1}/{totalInstallments}
                            </span>

                            {isPaid ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                ✓ Payé le {new Date(installment.paidDate).toLocaleDateString('fr-FR')}
                              </span>
                            ) : isOverdue ? (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                ✗ En retard
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                                ⏳ À venir
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Montant</p>
                              <p className="font-bold text-gray-900 text-lg">{installment.amount.toFixed(2)}€</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Date d'échéance</p>
                              <p className="font-semibold text-gray-900">
                                {new Date(installment.dueDate).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {isPaid && (
                          <button
                            onClick={() => handleDownloadReceipt(installment, index)}
                            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition flex items-center gap-2 font-semibold text-sm"
                          >
                            <Download className="h-4 w-4" />
                            Reçu PDF
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info */}
            <div className="glass rounded-2xl p-6 mt-6">
              <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                💡 Informations importantes
              </h3>
              <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                <li>Les paiements doivent être effectués avant la date d'échéance</li>
                <li>Conservez vos reçus de paiement en cas de contestation</li>
                <li>En cas de difficulté financière, contactez rapidement l'administration</li>
                <li>Un retard de paiement peut entraîner des pénalités ou le blocage de votre inscription</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
