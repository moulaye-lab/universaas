import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Award,
  AlertCircle,
  CreditCard,
  LogOut,
  User,
  BookOpen,
  Calendar,
  DollarSign,
  Users,
  ChevronDown,
  MessageCircle,
  Phone,
  Mail,
  FilePlus,
  Download
} from 'lucide-react';
import { generateBulletinPDF } from '../../utils/bulletinPDFGenerator';
import { calculateOverallAverage, getMention, exportToCSV } from '../../utils/gradesCalculator';

const ParentDashboard = () => {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [grades, setGrades] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    averageGrade: 0,
    coursesCount: 0,
    absences: 0,
    overduePayments: 0
  });
  const [isPeriodClosed, setIsPeriodClosed] = useState(false);

  // Charger les enfants depuis childrenAccess
  useEffect(() => {
    const loadChildren = async () => {
      if (!userProfile?.childrenAccess) {
        setLoading(false);
        return;
      }

      try {
        const childrenList = [];

        // Parcourir toutes les universités
        for (const [universityId, studentsObj] of Object.entries(userProfile.childrenAccess)) {
          // Charger le nom de l'université
          const uniRef = ref(database, `universities/${universityId}/info`);
          const uniSnap = await get(uniRef);
          const universityName = uniSnap.exists() ? uniSnap.val().name : universityId;

          // Parcourir tous les étudiants de cette université
          for (const studentId of Object.keys(studentsObj)) {
            // Charger les infos de l'étudiant
            const studentRef = ref(database, `universities/${universityId}/students/${studentId}`);
            const studentSnap = await get(studentRef);

            if (studentSnap.exists()) {
              const studentData = studentSnap.val();
              childrenList.push({
                childId: studentId,
                childName: `${studentData.firstName} ${studentData.lastName}`,
                universityId: universityId,
                universityName: universityName,
                relationship: 'parent', // Valeur par défaut
                studentData: studentData
              });
            }
          }
        }

        setChildren(childrenList);

        // Sélectionner le premier enfant par défaut
        if (childrenList.length > 0) {
          setSelectedChildId(childrenList[0].childId);
          setSelectedChild(childrenList[0]);
        }
      } catch (error) {
        console.error('Error loading children:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, [userProfile]);

  useEffect(() => {
    if (selectedChildId && selectedChild) {
      loadChildData();
    }
  }, [selectedChildId, selectedChild]);

  const loadChildData = async () => {
    setLoading(true);
    try {
      const uniId = selectedChild.universityId;
      const childId = selectedChildId;

      // Vérifier statut période académique
      const periodsRef = ref(database, `universities/${uniId}/academic_periods`);
      const periodsSnap = await get(periodsRef);
      if (periodsSnap.exists()) {
        const periods = Object.values(periodsSnap.val());
        const currentPeriod = periods.find(p => p.status === 'en_cours' || p.status === 'cloture');
        setIsPeriodClosed(currentPeriod?.status === 'cloture');
      }

      const studentRef = ref(database, `universities/${uniId}/students/${childId}`);
      const studentSnap = await get(studentRef);

      if (studentSnap.exists()) {
        const student = { id: childId, ...studentSnap.val() };
        setStudentData(student);

        // Charger toutes les notes de l'université et filtrer par studentId
        const gradesRef = ref(database, `universities/${uniId}/grades`);
        const gradesSnap = await get(gradesRef);

        let gradesData = [];
        if (gradesSnap.exists()) {
          const allGrades = gradesSnap.val();

          // Filtrer les notes de cet étudiant
          gradesData = Object.entries(allGrades)
            .map(([id, grade]) => ({ id, ...grade }))
            .filter(grade => grade.studentId === childId)
            .map(grade => ({
              courseId: grade.courseId,
              courseName: grade.courseName,
              grade: grade.grade,
              coefficient: grade.coefficient || 1,
              type: grade.gradeType || 'exam',
              date: grade.date,
              maxGrade: grade.maxGrade || 20,
              title: grade.title || 'Évaluation'
            }));

          // Trier par date
          gradesData.sort((a, b) => (b.date || 0) - (a.date || 0));
        }
        setGrades(gradesData);

        const paymentsRef = ref(database, `universities/${uniId}/payments/${childId}`);
        const paymentsSnap = await get(paymentsRef);

        let paymentsData = [];
        if (paymentsSnap.exists()) {
          const data = paymentsSnap.val();
          paymentsData = data.installments || [];
        }
        setPayments(paymentsData);

        // Load absences
        const absencesRef = ref(database, `universities/${uniId}/absences`);
        const absencesQuery = query(absencesRef, orderByChild('studentId'), equalTo(childId));
        const absencesSnap = await get(absencesQuery);

        let absencesCount = 0;
        if (absencesSnap.exists()) {
          absencesCount = Object.values(absencesSnap.val()).length;
        }

        calculateStats(gradesData, student, paymentsData, absencesCount);
      }
    } catch (error) {
      console.error('Error loading child data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (gradesData, studentInfo, paymentsData, absencesCount = 0) => {
    // Calculer moyenne générale pondérée par coefficient
    let totalWeighted = 0;
    let totalCoeff = 0;
    const uniqueCourses = new Set();

    gradesData.forEach(grade => {
      const gradeValue = parseFloat(grade.grade);
      const coeff = parseFloat(grade.coefficient) || 1;

      if (!isNaN(gradeValue) && gradeValue > 0) {
        totalWeighted += gradeValue * coeff;
        totalCoeff += coeff;
      }

      uniqueCourses.add(grade.courseId);
    });

    const generalAverage = totalCoeff > 0 ? (totalWeighted / totalCoeff).toFixed(1) : 0;

    const overdueCount = paymentsData.filter(p =>
      p.status === 'pending' && p.dueDate < Date.now()
    ).length;

    setStats({
      averageGrade: generalAverage,
      coursesCount: uniqueCourses.size,
      absences: absencesCount,
      overduePayments: overdueCount
    });
  };

  const handleChildChange = (e) => {
    const childId = e.target.value;
    setSelectedChildId(childId);
    const child = children.find(c => c.childId === childId);
    setSelectedChild(child);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucun enfant associé</h2>
          <p className="text-gray-600 mb-6">
            Aucun enfant n'est actuellement lié à votre compte parent.
            Contactez l'administration de l'université.
          </p>
          <button
            onClick={handleSignOut}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
          >
            <LogOut className="inline h-5 w-5 mr-2" />
            Déconnexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Navbar */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Espace Parent</h1>
                <p className="text-sm text-gray-600">{userProfile.displayName}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <LogOut className="inline w-5 h-5 mr-2" />
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Sélecteur d'Enfant */}
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <Users className="inline h-5 w-5 mr-2 text-purple-600" />
            Sélectionner un enfant
          </label>
          <div className="relative">
            <select
              value={selectedChildId || ''}
              onChange={handleChildChange}
              className="w-full md:w-1/2 px-4 py-4 bg-gray-50 border-2 border-gray-300 rounded-xl text-gray-900 font-semibold text-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none cursor-pointer"
            >
              {children.map(child => (
                <option key={child.childId} value={child.childId}>
                  {child.childName} - {child.universityName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-600 pointer-events-none md:right-[52%]" />
          </div>
          {selectedChild && (
            <p className="mt-3 text-sm text-gray-600">
              <Award className="inline h-4 w-4 mr-1 text-purple-600" />
              Relation : <span className="font-semibold text-gray-900 capitalize">{selectedChild.relationship}</span>
            </p>
          )}
        </div>

        {/* Stats Cards */}
        {studentData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Moyenne Générale */}
              <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{stats.averageGrade}/20</h3>
                <p className="text-sm text-gray-600">Moyenne Générale</p>
              </div>

              {/* Nombre de Cours */}
              <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{stats.coursesCount}</h3>
                <p className="text-sm text-gray-600">Cours suivis</p>
              </div>

              {/* Absences */}
              <button
                onClick={() => navigate('/parent/absences')}
                className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all text-left w-full group"
                data-tour="children-absences"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">{stats.absences}</h3>
                <p className="text-sm text-gray-600">Absences & Retards</p>
              </button>

              {/* Paiements en retard */}
              <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  {stats.overduePayments > 0 && (
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{stats.overduePayments}</h3>
                <p className="text-sm text-gray-600">Paiements en retard</p>
              </div>
            </div>

            {/* Contacter l'Administration */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <MessageCircle className="w-7 h-7 text-white" />
                <h2 className="text-xl font-bold text-white">Besoin d'aide ?</h2>
              </div>

              <p className="text-purple-100 text-sm mb-4">
                Pour justifier une absence, obtenir des informations sur les paiements ou toute autre question, contactez l'administration.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a
                  href="mailto:admin@university.com"
                  className="flex items-center gap-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/30 rounded-xl p-4 transition-all group"
                >
                  <div className="p-2 bg-white rounded-lg">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm">Email</p>
                    <p className="text-purple-100 text-xs">admin@university.com</p>
                  </div>
                </a>

                <a
                  href="tel:+33123456789"
                  className="flex items-center gap-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/30 rounded-xl p-4 transition-all group"
                >
                  <div className="p-2 bg-white rounded-lg">
                    <Phone className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm">Téléphone</p>
                    <p className="text-purple-100 text-xs">+33 1 23 45 67 89</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Notes par Cours */}
            <div className="bg-white rounded-2xl p-6 shadow-xl" data-tour="children-grades">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Award className="w-7 h-7 text-green-600" />
                  Notes de {selectedChild.childName}
                </h2>
                {grades.length > 0 && isPeriodClosed && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        try {
                          const { overall } = calculateOverallAverage(grades);
                          generateBulletinPDF({
                            student: {
                              firstName: selectedChild.studentData?.firstName || 'Prénom',
                              lastName: selectedChild.studentData?.lastName || 'Nom',
                              matricule: selectedChild.studentData?.matricule || 'N/A',
                              level: selectedChild.studentData?.level || 'N/A',
                              className: selectedChild.studentData?.className || 'N/A'
                            },
                            grades: grades,
                            universityName: userProfile?.universityName || 'Université',
                            period: 'Année académique 2025/2026',
                            academicYear: '2025/2026'
                          });
                        } catch (err) {
                          alert('Erreur lors de la génération du PDF: ' + err.message);
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 text-sm font-semibold"
                    >
                      <FilePlus className="w-4 h-4" />
                      Bulletin PDF
                    </button>
                    <button
                      onClick={() => exportToCSV(grades, `notes_${selectedChild.childName.replace(' ', '_')}`)}
                      className="px-4 py-2 bg-white text-purple-600 border-2 border-purple-200 rounded-xl hover:bg-purple-50 transition flex items-center gap-2 text-sm font-semibold"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>
                )}
                {grades.length > 0 && !isPeriodClosed && (
                  <div className="text-sm text-gray-500 italic">
                    📅 Bulletin disponible après clôture du semestre
                  </div>
                )}
              </div>

              {grades.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune note disponible pour le moment</p>
                </div>
              ) : (
                <>
                  {/* Stats enrichies */}
                  {(() => {
                    const { overall, byCourse } = calculateOverallAverage(grades);
                    const mention = getMention(overall);
                    const coursesCount = Object.keys(byCourse).length;
                    const validatedCourses = Object.values(byCourse).filter(c => c.average >= 10).length;
                    const successRate = coursesCount > 0 ? ((validatedCourses / coursesCount) * 100).toFixed(0) : 0;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                          <p className="text-xs text-gray-600 mb-1">Moyenne Générale</p>
                          <p className={`text-3xl font-black ${overall >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                            {overall !== null ? overall.toFixed(2) : 'N/A'}/20
                          </p>
                          {mention && (
                            <p className="text-xs font-semibold text-gray-700 mt-1">{mention}</p>
                          )}
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                          <p className="text-xs text-gray-600 mb-1">Nombre de Cours</p>
                          <p className="text-3xl font-black text-blue-600">{coursesCount}</p>
                          <p className="text-xs text-gray-600 mt-1">{grades.length} notes</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                          <p className="text-xs text-gray-600 mb-1">Cours Validés</p>
                          <p className="text-3xl font-black text-purple-600">{validatedCourses}/{coursesCount}</p>
                          <p className="text-xs text-gray-600 mt-1">≥ 10/20</p>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
                          <p className="text-xs text-gray-600 mb-1">Taux de Réussite</p>
                          <p className={`text-3xl font-black ${successRate >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
                            {successRate}%
                          </p>
                          <p className="text-xs text-gray-600 mt-1">sur tous les cours</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Graphiques */}
                  {(() => {
                    const { byCourse } = calculateOverallAverage(grades);

                    // Données pour graphique moyennes par cours (BarChart)
                    const courseChartData = Object.entries(byCourse).map(([courseId, data]) => ({
                      cours: data.courseName.length > 15 ? data.courseName.substring(0, 15) + '...' : data.courseName,
                      moyenne: data.average !== null ? parseFloat(data.average.toFixed(2)) : 0,
                      notes: data.gradesCount
                    }));

                    // Données pour graphique évolution (LineChart) - notes chronologiques
                    const sortedGrades = [...grades].sort((a, b) => (a.date || 0) - (b.date || 0));
                    const evolutionData = sortedGrades.map((grade, index) => {
                      const normalized = (grade.grade / grade.maxGrade) * 20;
                      return {
                        index: index + 1,
                        note: parseFloat(normalized.toFixed(2)),
                        cours: grade.courseName.substring(0, 10),
                        date: new Date(grade.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                      };
                    });

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Graphique Moyennes par Cours */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            📊 Moyennes par Cours
                          </h3>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={courseChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis
                                dataKey="cours"
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis
                                domain={[0, 20]}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                label={{ value: 'Moyenne /20', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#fff',
                                  border: '2px solid #3b82f6',
                                  borderRadius: '8px',
                                  fontSize: '12px'
                                }}
                                formatter={(value, name) => {
                                  if (name === 'moyenne') return [value + '/20', 'Moyenne'];
                                  if (name === 'notes') return [value, 'Nombre de notes'];
                                  return [value, name];
                                }}
                              />
                              <Legend
                                wrapperStyle={{ fontSize: '12px' }}
                                formatter={(value) => value === 'moyenne' ? 'Moyenne /20' : 'Nb notes'}
                              />
                              <Bar dataKey="moyenne" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Graphique Évolution Notes */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            📈 Évolution des Notes
                          </h3>
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={evolutionData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis
                                dataKey="index"
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                label={{ value: 'N° Note', position: 'insideBottom', offset: -5, style: { fontSize: 11, fill: '#6b7280' } }}
                              />
                              <YAxis
                                domain={[0, 20]}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                label={{ value: 'Note /20', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#fff',
                                  border: '2px solid #a855f7',
                                  borderRadius: '8px',
                                  fontSize: '12px'
                                }}
                                formatter={(value, name, props) => {
                                  if (name === 'note') return [value + '/20', `${props.payload.cours} (${props.payload.date})`];
                                  return [value, name];
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px' }} />
                              <Line
                                type="monotone"
                                dataKey="note"
                                stroke="#a855f7"
                                strokeWidth={3}
                                dot={{ fill: '#a855f7', r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Note /20"
                              />
                              {/* Ligne moyenne générale */}
                              <Line
                                type="monotone"
                                dataKey={() => calculateOverallAverage(grades).overall}
                                stroke="#10b981"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                name="Moyenne générale"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        <th className="text-left py-4 px-4 text-sm font-bold text-gray-700">Cours</th>
                        <th className="text-center py-4 px-4 text-sm font-bold text-gray-700">Type</th>
                        <th className="text-center py-4 px-4 text-sm font-bold text-gray-700">Note</th>
                        <th className="text-center py-4 px-4 text-sm font-bold text-gray-700">Coefficient</th>
                        <th className="text-center py-4 px-4 text-sm font-bold text-gray-700">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((grade, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-purple-50 transition-colors">
                          <td className="py-4 px-4">
                            <p className="font-semibold text-gray-900">{grade.courseName}</p>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              grade.type === 'Examen' ? 'bg-red-100 text-red-700' :
                              grade.type === 'Projet' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {grade.type}
                            </span>
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className={`font-bold text-lg ${
                              grade.grade >= 16 ? 'text-green-600' :
                              grade.grade >= 14 ? 'text-blue-600' :
                              grade.grade >= 12 ? 'text-yellow-600' :
                              grade.grade >= 10 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {grade.grade}/{grade.maxGrade}
                            </span>
                          </td>
                          <td className="text-center py-4 px-4 text-gray-700 font-semibold">
                            {grade.coefficient}
                          </td>
                          <td className="text-center py-4 px-4 text-gray-600 text-sm">
                            {new Date(grade.date).toLocaleDateString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>

            {/* Paiements */}
            <div className="bg-white rounded-2xl p-6 shadow-xl" data-tour="children-payments">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <CreditCard className="w-7 h-7 text-emerald-600" />
                Paiements
              </h2>

              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun paiement enregistré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-purple-300 transition-all"
                    >
                      <div>
                        <p className="text-gray-900 font-semibold">{payment.amount} €</p>
                        <p className="text-sm text-gray-600">
                          Échéance : {new Date(payment.dueDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className={`px-4 py-2 rounded-xl font-semibold ${
                        payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                        payment.status === 'pending' && payment.dueDate < Date.now() ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payment.status === 'paid' ? '✓ Payé' :
                         payment.dueDate < Date.now() ? '⚠ En retard' : '⏳ En attente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
