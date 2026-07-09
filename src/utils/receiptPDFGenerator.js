/**
 * receiptPDFGenerator.js - Génération de reçus de paiement en PDF
 *
 * Utilise jsPDF
 *
 * Fonctions:
 * - generateReceiptPDF: Génère et télécharge un reçu de paiement
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Génère un reçu de paiement en PDF
 * @param {Object} params - Paramètres
 * @param {Object} params.student - Données étudiant { firstName, lastName, matricule, level, email }
 * @param {Object} params.payment - Données paiement { amount, dueDate, paidDate, paymentMethod, receiptNumber }
 * @param {string} params.universityName - Nom de l'université
 * @param {string} params.academicYear - Année académique
 */
export function generateReceiptPDF({
  student,
  payment,
  universityName = 'Université',
  academicYear = new Date().getFullYear()
}) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // ======================
    // EN-TÊTE
    // ======================
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(universityName, pageWidth / 2, currentY, { align: 'center' });

    currentY += 8;
    doc.setFontSize(14);
    doc.text('REÇU DE PAIEMENT', pageWidth / 2, currentY, { align: 'center' });

    currentY += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Année académique ${academicYear}`, pageWidth / 2, currentY, { align: 'center' });

    // Ligne de séparation
    currentY += 8;
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(15, currentY, pageWidth - 15, currentY);

    // ======================
    // NUMÉRO DE REÇU
    // ======================
    currentY += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`N° ${payment.receiptNumber || 'N/A'}`, pageWidth - 15, currentY, { align: 'right' });

    // ======================
    // INFORMATIONS ÉTUDIANT
    // ======================
    currentY += 10;
    doc.setFillColor(240, 248, 255);
    doc.rect(15, currentY, pageWidth - 30, 35, 'F');

    currentY += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ÉTUDIANT', 20, currentY);

    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const studentInfo = [
      `Nom complet : ${student.firstName} ${student.lastName}`,
      `Matricule : ${student.matricule || 'N/A'}`,
      `Niveau : ${student.level || 'N/A'}`,
      `Email : ${student.email || 'N/A'}`
    ];

    studentInfo.forEach(text => {
      doc.text(text, 20, currentY);
      currentY += 5;
    });

    // ======================
    // DÉTAILS DU PAIEMENT
    // ======================
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DÉTAILS DU PAIEMENT', 15, currentY);

    currentY += 10;
    doc.autoTable({
      startY: currentY,
      head: [['Description', 'Montant']],
      body: [
        ['Frais de scolarité', `${payment.amount.toFixed(2)} €`]
      ],
      theme: 'plain',
      headStyles: {
        fillColor: [0, 102, 204],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 }
    });

    currentY = doc.lastAutoTable.finalY + 5;

    // Ligne total
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.3);
    doc.line(15, currentY, pageWidth - 15, currentY);

    currentY += 8;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PAYÉ', 20, currentY);
    doc.setTextColor(0, 150, 0);
    doc.text(`${payment.amount.toFixed(2)} €`, pageWidth - 20, currentY, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // ======================
    // INFORMATIONS PAIEMENT
    // ======================
    currentY += 15;
    doc.setFillColor(240, 255, 240);
    doc.rect(15, currentY, pageWidth - 30, 25, 'F');

    currentY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS DE TRANSACTION', 20, currentY);

    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const transactionInfo = [
      `Date de paiement : ${payment.paidDate ? new Date(payment.paidDate).toLocaleDateString('fr-FR') : 'N/A'}`,
      `Méthode de paiement : ${payment.paymentMethod || 'Non spécifié'}`,
      `Échéance initiale : ${payment.dueDate ? new Date(payment.dueDate).toLocaleDateString('fr-FR') : 'N/A'}`
    ];

    transactionInfo.forEach(text => {
      doc.text(text, 20, currentY);
      currentY += 5;
    });

    // ======================
    // STATUT
    // ======================
    currentY += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 150, 0);
    doc.text('✓ PAIEMENT VALIDÉ', pageWidth / 2, currentY, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // ======================
    // NOTE
    // ======================
    currentY += 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const note = "Ce reçu fait foi de paiement et doit être conservé. En cas de contestation, veuillez contacter le service financier de l'université.";
    const splitNote = doc.splitTextToSize(note, pageWidth - 40);
    doc.text(splitNote, 20, currentY);

    // ======================
    // PIED DE PAGE
    // ======================
    const footerY = pageHeight - 25;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 15, footerY);
    doc.text('Signature électronique', pageWidth - 15, footerY, { align: 'right' });

    // ======================
    // TÉLÉCHARGEMENT
    // ======================
    const filename = `recu_paiement_${payment.receiptNumber || student.matricule}_${Date.now()}.pdf`;
    doc.save(filename);

    return true;
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    throw new Error('Erreur lors de la génération du reçu: ' + error.message);
  }
}

/**
 * Génère un reçu simplifié pour un échéancier complet
 * @param {Object} params - Paramètres
 */
export function generatePaymentPlanPDF({
  student,
  installments,
  totalAmount,
  universityName = 'Université',
  academicYear = new Date().getFullYear()
}) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // En-tête
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(universityName, pageWidth / 2, currentY, { align: 'center' });

    currentY += 8;
    doc.setFontSize(14);
    doc.text('ÉCHÉANCIER DE PAIEMENT', pageWidth / 2, currentY, { align: 'center' });

    currentY += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Année académique ${academicYear}`, pageWidth / 2, currentY, { align: 'center' });

    // Ligne
    currentY += 8;
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(15, currentY, pageWidth - 15, currentY);

    // Info étudiant
    currentY += 10;
    doc.setFontSize(10);
    doc.text(`Étudiant : ${student.firstName} ${student.lastName}`, 15, currentY);
    currentY += 5;
    doc.text(`Matricule : ${student.matricule || 'N/A'}`, 15, currentY);

    // Tableau échéancier
    currentY += 10;
    const tableData = installments.map((inst, index) => [
      `Échéance ${index + 1}`,
      new Date(inst.dueDate).toLocaleDateString('fr-FR'),
      `${inst.amount.toFixed(2)} €`,
      inst.status === 'paid' ? '✓ Payé' : inst.status === 'overdue' ? '✗ Retard' : '⏳ À venir'
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['N°', 'Date d\'échéance', 'Montant', 'Statut']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 102, 204],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        2: { halign: 'right' }
      }
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 15, currentY);
    doc.text(`${totalAmount.toFixed(2)} €`, pageWidth - 15, currentY, { align: 'right' });

    // Téléchargement
    const filename = `echeancier_${student.matricule}_${academicYear}.pdf`;
    doc.save(filename);

    return true;
  } catch (error) {
    console.error('Error generating payment plan PDF:', error);
    throw new Error('Erreur lors de la génération de l\'échéancier: ' + error.message);
  }
}
