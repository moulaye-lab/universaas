/**
 * bulletinPDFGenerator.js - Génération de bulletins de notes en PDF
 *
 * Utilise jsPDF + jspdf-autotable
 *
 * Fonctions:
 * - generateBulletinPDF: Génère et télécharge le bulletin d'un étudiant
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { calculateOverallAverage, getMention } from './gradesCalculator';

/**
 * Génère un bulletin de notes en PDF
 * @param {Object} params - Paramètres
 * @param {Object} params.student - Données étudiant { firstName, lastName, matricule, level, className }
 * @param {Array} params.grades - Toutes les notes de l'étudiant
 * @param {string} params.universityName - Nom de l'université
 * @param {string} params.period - Période (ex: "Semestre 1 - 2025/2026")
 * @param {string} params.academicYear - Année académique (ex: "2025/2026")
 */
export function generateBulletinPDF({
  student,
  grades,
  universityName = 'Université',
  period = 'Année académique',
  academicYear = new Date().getFullYear()
}) {
  try {
    // Créer le document PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // ======================
    // EN-TÊTE
    // ======================
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(universityName, pageWidth / 2, currentY, { align: 'center' });

    currentY += 10;
    doc.setFontSize(16);
    doc.text('BULLETIN DE NOTES', pageWidth / 2, currentY, { align: 'center' });

    currentY += 7;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(period, pageWidth / 2, currentY, { align: 'center' });

    // Ligne de séparation
    currentY += 8;
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(15, currentY, pageWidth - 15, currentY);

    // ======================
    // INFORMATIONS ÉTUDIANT
    // ======================
    currentY += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS ÉTUDIANT', 15, currentY);

    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const studentInfo = [
      [`Nom complet : ${student.firstName} ${student.lastName}`],
      [`Matricule : ${student.matricule || 'N/A'}`],
      [`Classe : ${student.className || 'N/A'}`],
      [`Niveau : ${student.level || 'N/A'}`]
    ];

    studentInfo.forEach(([text]) => {
      doc.text(text, 15, currentY);
      currentY += 5;
    });

    // ======================
    // CALCUL DES MOYENNES
    // ======================
    const { overall, byCourse } = calculateOverallAverage(grades);
    const mention = getMention(overall);

    // ======================
    // TABLEAU DES NOTES
    // ======================
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RELEVÉ DE NOTES', 15, currentY);
    currentY += 7;

    // Grouper notes par cours
    const tableData = [];
    Object.entries(byCourse).forEach(([courseId, courseData]) => {
      tableData.push([
        courseData.courseName,
        courseData.gradesCount.toString(),
        courseData.average !== null ? courseData.average.toFixed(2) : 'N/A',
        courseData.average !== null
          ? (courseData.average >= 10 ? '✓ Validé' : '✗ Non validé')
          : 'N/A'
      ]);
    });

    // Ajouter le tableau avec autoTable
    doc.autoTable({
      startY: currentY,
      head: [['Cours', 'Nb Notes', 'Moyenne', 'Statut']],
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
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 40, halign: 'center' }
      },
      margin: { left: 15, right: 15 }
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // ======================
    // MOYENNE GÉNÉRALE ET MENTION
    // ======================
    doc.setFillColor(240, 248, 255);
    doc.rect(15, currentY, pageWidth - 30, 30, 'F');

    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('MOYENNE GÉNÉRALE', 20, currentY);

    doc.setFontSize(18);
    const moyenneColor = overall >= 10 ? [0, 150, 0] : [200, 0, 0];
    doc.setTextColor(...moyenneColor);
    doc.text(`${overall !== null ? overall.toFixed(2) : 'N/A'}/20`, pageWidth / 2, currentY, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    currentY += 10;
    doc.text(`Mention : ${mention || 'Aucune'}`, 20, currentY);

    // ======================
    // STATISTIQUES
    // ======================
    currentY += 15;
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('STATISTIQUES', 15, currentY);

    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const totalGrades = grades.length;
    const coursesCount = Object.keys(byCourse).length;
    const validatedCourses = Object.values(byCourse).filter(c => c.average >= 10).length;
    const successRate = coursesCount > 0 ? ((validatedCourses / coursesCount) * 100).toFixed(0) : 0;

    const stats = [
      `Nombre total de notes : ${totalGrades}`,
      `Nombre de cours : ${coursesCount}`,
      `Cours validés : ${validatedCourses}/${coursesCount}`,
      `Taux de réussite : ${successRate}%`
    ];

    stats.forEach(stat => {
      doc.text(stat, 15, currentY);
      currentY += 5;
    });

    // ======================
    // OBSERVATIONS
    // ======================
    currentY += 10;
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('OBSERVATIONS', 15, currentY);

    currentY += 7;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);

    let observation = '';
    if (overall >= 16) {
      observation = 'Excellent travail ! Continuez ainsi.';
    } else if (overall >= 14) {
      observation = 'Très bon travail, félicitations !';
    } else if (overall >= 12) {
      observation = 'Bon travail dans l\'ensemble.';
    } else if (overall >= 10) {
      observation = 'Résultats satisfaisants, des efforts supplémentaires sont recommandés.';
    } else {
      observation = 'Résultats insuffisants. Un soutien pédagogique est recommandé.';
    }

    doc.text(observation, 15, currentY);

    // ======================
    // PIED DE PAGE
    // ======================
    const footerY = pageHeight - 30;
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
    const filename = `bulletin_${student.matricule || student.lastName}_${academicYear.replace('/', '-')}.pdf`;
    doc.save(filename);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Erreur lors de la génération du PDF: ' + error.message);
  }
}

/**
 * Génère un bulletin simplifié (version courte)
 * @param {Object} params - Mêmes paramètres que generateBulletinPDF
 */
export function generateSimpleBulletinPDF(params) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 30;

    // En-tête simple
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RELEVÉ DE NOTES', pageWidth / 2, currentY, { align: 'center' });

    currentY += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${params.student.firstName} ${params.student.lastName}`, pageWidth / 2, currentY, { align: 'center' });

    currentY += 20;

    // Moyenne générale
    const { overall } = calculateOverallAverage(params.grades);
    const mention = getMention(overall);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Moyenne Générale', pageWidth / 2, currentY, { align: 'center' });

    currentY += 10;
    doc.setFontSize(24);
    doc.text(`${overall !== null ? overall.toFixed(2) : 'N/A'}/20`, pageWidth / 2, currentY, { align: 'center' });

    currentY += 10;
    doc.setFontSize(14);
    doc.text(`Mention : ${mention || 'Aucune'}`, pageWidth / 2, currentY, { align: 'center' });

    // Téléchargement
    const filename = `releve_${params.student.matricule || params.student.lastName}_simple.pdf`;
    doc.save(filename);

    return true;
  } catch (error) {
    console.error('Error generating simple PDF:', error);
    throw new Error('Erreur lors de la génération du PDF: ' + error.message);
  }
}
