/**
 * StudentSchedulePage.jsx - Emploi du temps étudiant
 *
 * Fonctionnalités:
 * - Affichage de l'emploi du temps de la semaine
 * - Vue grille avec jours et heures
 * - Détails des cours (salle, prof, horaires)
 * - Vue liste et vue calendrier
 * - Export PDF de l'emploi du temps
 * - Filtrage par jour
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock,
  MapPin,
  User,
  Calendar,
  Download,
  Grid,
  List,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentSchedulePage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState([]);
  const [className, setClassName] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  const [selectedDay, setSelectedDay] = useState('all');

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  useEffect(() => {
    loadSchedule();
  }, [userProfile]);

  const loadSchedule = async () => {
    if (!userProfile?.universityId) {
      setLoading(false);
      return;
    }

    try {
      const studentId = userProfile.profileId || userProfile.profileId;

      // Charger les infos de l'étudiant pour obtenir classId
      const studentRef = ref(database, `universities/${userProfile.universityId}/students/${studentId}`);
      const studentSnap = await get(studentRef);

      if (!studentSnap.exists()) {
        setLoading(false);
        return;
      }

      const studentData = studentSnap.val();
      const classId = studentData.classId;

      if (!classId) {
        setLoading(false);
        return;
      }

      // Charger la classe pour obtenir l'emploi du temps
      const classRef = ref(database, `universities/${userProfile.universityId}/classes/${classId}`);
      const classSnap = await get(classRef);

      if (classSnap.exists()) {
        const classData = classSnap.val();
        setClassName(classData.name || '');
        setSchedule(classData.schedule || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading schedule:', error);
      setLoading(false);
    }
  };

  const getCourseColor = (index) => {
    const colors = [
      'bg-blue-100 border-blue-300 text-blue-900',
      'bg-purple-100 border-purple-300 text-purple-900',
      'bg-green-100 border-green-300 text-green-900',
      'bg-orange-100 border-orange-300 text-orange-900',
      'bg-pink-100 border-pink-300 text-pink-900',
      'bg-indigo-100 border-indigo-300 text-indigo-900',
      'bg-teal-100 border-teal-300 text-teal-900',
      'bg-red-100 border-red-300 text-red-900'
    ];
    return colors[index % colors.length];
  };

  const getScheduleForDay = (day) => {
    return schedule
      .filter(item => item.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const handleExportPDF = () => {
    // Créer un contenu HTML pour l'export
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Emploi du Temps - ${className}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #6366f1; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #6366f1; color: white; }
          .course { background-color: #f0f9ff; padding: 8px; margin: 4px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Emploi du Temps - ${className}</h1>
        <table>
          <thead>
            <tr>
              <th>Jour</th>
              <th>Horaires</th>
              <th>Cours</th>
              <th>Enseignant</th>
              <th>Salle</th>
            </tr>
          </thead>
          <tbody>
            ${days.map(day => {
              const dayCourses = getScheduleForDay(day);
              if (dayCourses.length === 0) return '';
              return dayCourses.map((course, idx) => `
                <tr>
                  ${idx === 0 ? `<td rowspan="${dayCourses.length}"><strong>${day}</strong></td>` : ''}
                  <td>${course.startTime} - ${course.endTime}</td>
                  <td>${course.courseName}</td>
                  <td>${course.teacherName}</td>
                  <td>${course.room}</td>
                </tr>
              `).join('');
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emploi-du-temps-${className.replace(/\s+/g, '-')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredDays = selectedDay === 'all' ? days : [selectedDay];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l'emploi du temps...</p>
        </div>
      </div>
    );
  }

  if (!schedule || schedule.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate('/dashboard/student')}
                className="p-2 hover:bg-white rounded-xl transition shadow-sm"
              >
                <ChevronLeft className="h-6 w-6 text-gray-600" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-indigo-600" />
                Mon Emploi du Temps
              </h1>
            </div>
          </div>

          {/* Empty State */}
          <div className="glass p-12 rounded-3xl text-center">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Aucun emploi du temps</h2>
            <p className="text-gray-600">
              Votre emploi du temps n'a pas encore été configuré par l'administration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/dashboard/student')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-indigo-600" />
                Mon Emploi du Temps
              </h1>
              {className && (
                <p className="text-gray-600 mt-1">Classe: {className}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 font-medium"
              >
                <Download className="h-5 w-5" />
                Export
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Grid className="h-4 w-4" />
                Grille
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <List className="h-4 w-4" />
                Liste
              </button>
            </div>

            {/* Day Filter */}
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
            >
              <option value="all">Tous les jours</option>
              {days.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Schedule Content */}
        {viewMode === 'grid' ? (
          // Vue Grille
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Horaires</th>
                    {filteredDays.map(day => (
                      <th key={day} className="px-4 py-3 text-left font-semibold">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time, timeIndex) => {
                    // Vérifier s'il y a des cours à cette heure
                    const hasCourses = filteredDays.some(day => {
                      return getScheduleForDay(day).some(course => {
                        const startHour = parseInt(course.startTime.split(':')[0]);
                        const startMin = parseInt(course.startTime.split(':')[1]);
                        const endHour = parseInt(course.endTime.split(':')[0]);
                        const endMin = parseInt(course.endTime.split(':')[1]);
                        const currentHour = parseInt(time.split(':')[0]);
                        const currentMin = parseInt(time.split(':')[1]);

                        const courseStartMinutes = startHour * 60 + startMin;
                        const courseEndMinutes = endHour * 60 + endMin;
                        const currentMinutes = currentHour * 60 + currentMin;

                        return currentMinutes >= courseStartMinutes && currentMinutes < courseEndMinutes;
                      });
                    });

                    if (!hasCourses) return null;

                    return (
                      <tr key={time} className="border-b border-gray-200 hover:bg-indigo-50/50 transition">
                        <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">
                          {time}
                        </td>
                        {filteredDays.map((day, dayIndex) => {
                          const dayCourses = getScheduleForDay(day);
                          const currentCourse = dayCourses.find(course => {
                            const startHour = parseInt(course.startTime.split(':')[0]);
                            const startMin = parseInt(course.startTime.split(':')[1]);
                            const endHour = parseInt(course.endTime.split(':')[0]);
                            const endMin = parseInt(course.endTime.split(':')[1]);
                            const currentHour = parseInt(time.split(':')[0]);
                            const currentMin = parseInt(time.split(':')[1]);

                            const courseStartMinutes = startHour * 60 + startMin;
                            const courseEndMinutes = endHour * 60 + endMin;
                            const currentMinutes = currentHour * 60 + currentMin;

                            return currentMinutes >= courseStartMinutes && currentMinutes < courseEndMinutes && course.startTime === time;
                          });

                          if (currentCourse) {
                            const colorClass = getCourseColor(dayIndex);
                            return (
                              <td key={day} className="px-4 py-3">
                                <div className={`${colorClass} border-l-4 rounded-lg p-3`}>
                                  <p className="font-bold text-sm mb-1">{currentCourse.courseName}</p>
                                  <div className="text-xs space-y-1 opacity-90">
                                    <p className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {currentCourse.startTime} - {currentCourse.endTime}
                                    </p>
                                    <p className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {currentCourse.teacherName}
                                    </p>
                                    <p className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {currentCourse.room}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          return <td key={day} className="px-4 py-3"></td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Vue Liste
          <div className="space-y-6">
            {filteredDays.map((day, dayIndex) => {
              const dayCourses = getScheduleForDay(day);

              if (dayCourses.length === 0) return null;

              return (
                <div key={day} className="glass rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                    <h2 className="text-2xl font-bold text-white">{day}</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    {dayCourses.map((course, courseIndex) => {
                      const colorClass = getCourseColor(dayIndex * 10 + courseIndex);
                      return (
                        <div
                          key={courseIndex}
                          className={`${colorClass} border-l-4 rounded-lg p-4 hover:shadow-md transition`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-5 w-5" />
                              <h3 className="font-bold text-lg">{course.courseName}</h3>
                            </div>
                            <span className="text-sm font-semibold px-3 py-1 bg-white/50 rounded-full">
                              {course.startTime} - {course.endTime}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span><strong>Enseignant:</strong> {course.teacherName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span><strong>Salle:</strong> {course.room}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
