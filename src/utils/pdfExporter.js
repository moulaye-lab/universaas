/**
 * pdfExporter.js - Utilitaires export PDF bulletins de notes
 *
 * Fonctions:
 * - generateReportCard: Bulletin individuel étudiant
 * - generateClassReport: Bulletin classe entière
 * - addUniversityHeader: En-tête avec logo université
 * - addSignature: Bloc signature directeur
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Génère bulletin de notes PDF pour un étudiant
 * @param {Object} student - Données étudiant
 * @param {Array} grades - Notes de l'étudiant
 * @param {Object} university - Infos université
 * @param {Object} averages - Moyennes calculées
 * @returns {void} - Télécharge PDF
 */
export function generateReportCard(student, grades, university, averages) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // === EN-TÊTE ===
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(university.name || 'Université', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(16);
  doc.text('BULLETIN DE NOTES', pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Année académique: ${university.academicYear || '2025-2026'}`, pageWidth / 2, 38, { align: 'center' });

  // === INFORMATIONS ÉTUDIANT ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations de l\'étudiant', 14, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom: ${student.lastName} ${student.firstName}`, 14, 58);
  doc.text(`Matricule: ${student.matricule}`, 14, 65);
  doc.text(`Niveau: ${student.level}`, 14, 72);
  doc.text(`Filière: ${student.fieldOfStudy}`, 14, 79);
  doc.text(`Classe: ${student.className || 'Non assigné'}`, 14, 86);

  // === MOYENNES ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Moyennes', pageWidth - 70, 50);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const avgColor = parseFloat(averages.overall) >= 10 ? [34, 197, 94] : [239, 68, 68]; // green ou red
  doc.setTextColor(...avgColor);
  doc.text(`${averages.overall}/20`, pageWidth - 70, 62);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Moyenne générale', pageWidth - 70, 68);

  // === TABLEAU NOTES ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Détail des notes', 14, 100);

  // Grouper par cours
  const gradesByCourse = {};
  grades.forEach(grade => {
    if (!gradesByCourse[grade.courseId]) {
      gradesByCourse[grade.courseId] = {
        courseName: grade.courseName,
        grades: []
      };
    }
    gradesByCourse[grade.courseId].grades.push(grade);
  });

  // Préparer données table
  const tableData = [];

  Object.values(gradesByCourse).forEach(course => {
    // Ligne cours (en-tête)
    tableData.push([
      { content: course.courseName, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
    ]);

    // Lignes notes du cours
    course.grades.forEach(grade => {
      const normalized = ((grade.grade / grade.maxGrade) * 20).toFixed(2);
      const typeLabels = {
        exam: 'Examen',
        homework: 'Devoir',
        continuous_assessment: 'CC',
        project: 'Projet',
        oral: 'Oral',
        practical: 'TP'
      };

      tableData.push([
        grade.title,
        typeLabels[grade.gradeType] || grade.gradeType,
        `${grade.grade}/${grade.maxGrade}`,
        `${normalized}/20`,
        `Coef. ${grade.coefficient}`
      ]);
    });

    // Ligne moyenne cours
    const totalWeighted = course.grades.reduce((sum, g) => {
      const norm = (g.grade / g.maxGrade) * 20;
      return sum + (norm * g.coefficient);
    }, 0);
    const totalCoef = course.grades.reduce((sum, g) => sum + g.coefficient, 0);
    const courseAvg = (totalWeighted / totalCoef).toFixed(2);

    tableData.push([
      { content: `Moyenne ${course.courseName}`, colSpan: 3, styles: { fontStyle: 'bold' } },
      { content: `${courseAvg}/20`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [243, 244, 246] } }
    ]);
  });

  // Générer table
  doc.autoTable({
    startY: 105,
    head: [['Évaluation', 'Type', 'Note', 'Note/20', 'Coefficient']],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 30 }
    },
    margin: { left: 14, right: 14 }
  });

  // === STATISTIQUES ===
  const finalY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const stats = [
    `Nombre d'évaluations: ${grades.length}`,
    `Nombre de cours: ${Object.keys(gradesByCourse).length}`,
    `Taux de réussite: ${averages.successRate}%`
  ];

  stats.forEach((stat, index) => {
    doc.text(stat, 14, finalY + (index * 6));
  });

  // === MENTION ===
  if (averages.mention) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Mention: ${averages.mention}`, pageWidth / 2, finalY + 20, { align: 'center' });
  }

  // === SIGNATURE ===
  const signatureY = pageHeight - 40;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, signatureY);

  doc.setFont('helvetica', 'normal');
  doc.text('Le Directeur', pageWidth - 60, signatureY + 10);
  doc.line(pageWidth - 60, signatureY + 12, pageWidth - 14, signatureY + 12); // Ligne signature

  // === TÉLÉCHARGER ===
  const filename = `bulletin_${student.matricule}_${Date.now()}.pdf`;
  doc.save(filename);
}

/**
 * Génère rapport PDF pour toute une classe
 * @param {Object} classData - Données classe
 * @param {Array} students - Liste étudiants
 * @param {Object} gradesMap - Map studentId => grades[]
 * @param {Object} university - Infos université
 * @returns {void} - Télécharge PDF
 */
export function generateClassReport(classData, students, gradesMap, university) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // === EN-TÊTE ===
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(university.name || 'Université', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.text(`RAPPORT DE CLASSE - ${classData.name}`, pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Année académique: ${university.academicYear || '2025-2026'}`, pageWidth / 2, 38, { align: 'center' });

  // === STATISTIQUES CLASSE ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Statistiques de la classe', 14, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Effectif: ${students.length} étudiant${students.length > 1 ? 's' : ''}`, 14, 58);
  doc.text(`Niveau: ${classData.level}`, 14, 65);
  doc.text(`Filière: ${classData.domain}`, 14, 72);

  // Calculer moyenne classe
  const allAverages = students.map(student => {
    const studentGrades = gradesMap[student.id] || [];
    if (studentGrades.length === 0) return null;

    const totalWeighted = studentGrades.reduce((sum, g) => {
      const norm = (g.grade / g.maxGrade) * 20;
      return sum + (norm * g.coefficient);
    }, 0);
    const totalCoef = studentGrades.reduce((sum, g) => sum + g.coefficient, 0);

    return totalCoef > 0 ? totalWeighted / totalCoef : null;
  }).filter(avg => avg !== null);

  const classAverage = allAverages.length > 0
    ? (allAverages.reduce((sum, avg) => sum + avg, 0) / allAverages.length).toFixed(2)
    : 'N/A';

  doc.text(`Moyenne classe: ${classAverage}/20`, 14, 79);

  // === TABLEAU ÉTUDIANTS ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Liste des étudiants et moyennes', 14, 95);

  const tableData = students.map(student => {
    const studentGrades = gradesMap[student.id] || [];

    if (studentGrades.length === 0) {
      return [
        `${student.lastName} ${student.firstName}`,
        student.matricule,
        'N/A',
        '0',
        'Aucune note'
      ];
    }

    const totalWeighted = studentGrades.reduce((sum, g) => {
      const norm = (g.grade / g.maxGrade) * 20;
      return sum + (norm * g.coefficient);
    }, 0);
    const totalCoef = studentGrades.reduce((sum, g) => sum + g.coefficient, 0);
    const avg = (totalWeighted / totalCoef).toFixed(2);

    const passedCount = studentGrades.filter(g => ((g.grade / g.maxGrade) * 20) >= 10).length;
    const successRate = Math.round((passedCount / studentGrades.length) * 100);

    return [
      `${student.lastName} ${student.firstName}`,
      student.matricule,
      `${avg}/20`,
      studentGrades.length.toString(),
      `${successRate}%`
    ];
  });

  doc.autoTable({
    startY: 100,
    head: [['Nom complet', 'Matricule', 'Moyenne', 'Notes', 'Réussite']],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 40 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25 }
    },
    margin: { left: 14, right: 14 }
  });

  // === TÉLÉCHARGER ===
  const filename = `rapport_classe_${classData.name.replace(/\s/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
}

/**
 * Calcule mention selon moyenne
 * @param {number} average - Moyenne sur 20
 * @returns {string|null} - Mention
 */
export function getMention(average) {
  if (!average || isNaN(average)) return null;
  const avg = parseFloat(average);
  if (avg >= 16) return 'Très Bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez Bien';
  if (avg >= 10) return 'Passable';
  return null; // Pas de mention si < 10
}

/**
 * Calcule taux de réussite
 * @param {Array} grades - Notes
 * @returns {number} - Pourcentage
 */
export function getSuccessRate(grades) {
  if (!grades || grades.length === 0) return 0;

  const normalizedGrades = grades.map(g => (g.grade / g.maxGrade) * 20);
  const passedCount = normalizedGrades.filter(g => g >= 10).length;

  return Math.round((passedCount / grades.length) * 100);
}
