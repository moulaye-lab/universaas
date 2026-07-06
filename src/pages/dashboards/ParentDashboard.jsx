import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
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
  ChevronDown
} from 'lucide-react';

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

      const studentRef = ref(database, `universities/${uniId}/students/${childId}`);
      const studentSnap = await get(studentRef);

      if (studentSnap.exists()) {
        const student = { id: childId, ...studentSnap.val() };
        setStudentData(student);

        const gradesRef = ref(database, `universities/${uniId}/grades/${childId}`);
        const gradesSnap = await get(gradesRef);

        let gradesData = [];
        if (gradesSnap.exists()) {
          const data = gradesSnap.val();

          // Charger les noms de cours
          const coursesRef = ref(database, `universities/${uniId}/courses`);
          const coursesSnap = await get(coursesRef);
          const coursesData = coursesSnap.exists() ? coursesSnap.val() : {};

          // Convertir chaque note individuelle en ligne
          Object.keys(data).forEach(courseId => {
            const courseGrades = data[courseId];
            const courseName = coursesData[courseId]?.name || courseId;
            const courseCoefficient = courseGrades.courseCoefficient || coursesData[courseId]?.coefficient || 1;

            // Ajouter chaque devoir
            if (courseGrades.assignments) {
              courseGrades.assignments.forEach(assignment => {
                gradesData.push({
                  courseId,
                  courseName,
                  grade: assignment.grade,
                  coefficient: courseCoefficient,
                  type: 'Devoir',
                  date: assignment.date,
                  maxGrade: assignment.maxGrade || 20,
                });
              });
            }

            // Ajouter chaque examen
            if (courseGrades.exams) {
              courseGrades.exams.forEach(exam => {
                gradesData.push({
                  courseId,
                  courseName,
                  grade: exam.grade,
                  coefficient: courseCoefficient,
                  type: 'Examen',
                  date: exam.date,
                  maxGrade: exam.maxGrade || 20,
                });
              });
            }

            // Ajouter chaque projet
            if (courseGrades.projects) {
              courseGrades.projects.forEach(project => {
                gradesData.push({
                  courseId,
                  courseName,
                  grade: project.grade,
                  coefficient: courseCoefficient,
                  type: 'Projet',
                  date: project.date,
                  maxGrade: project.maxGrade || 20,
                });
              });
            }
          });

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

        calculateStats(gradesData, student, paymentsData);
      }
    } catch (error) {
      console.error('Error loading child data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (gradesData, studentInfo, paymentsData) => {
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
      absences: studentInfo.absences || 0,
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
                  {child.childName} - {child.universityId.replace('univ-', '').replace('-', ' ')}
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
              <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{stats.absences}</h3>
                <p className="text-sm text-gray-600">Absences</p>
              </div>

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

            {/* Notes par Cours */}
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Award className="w-7 h-7 text-green-600" />
                Notes de {selectedChild.childName}
              </h2>

              {grades.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune note disponible pour le moment</p>
                </div>
              ) : (
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
              )}
            </div>

            {/* Paiements */}
            <div className="bg-white rounded-2xl p-6 shadow-xl">
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
