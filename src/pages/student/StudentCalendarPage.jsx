/**
 * StudentCalendarPage.jsx - Calendrier Académique Étudiant
 *
 * Affichage filtré des événements académiques selon:
 * - Événements globaux (tous)
 * - Événements de son niveau
 * - Événements de sa classe
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getCalendarForUser,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS
} from '../../services/calendarService';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, List
} from 'lucide-react';

export default function StudentCalendarPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState(['exam', 'vacation', 'holiday', 'school_start', 'school_end', 'event']);
  const [viewMode, setViewMode] = useState('month'); // 'month' ou 'all'

  useEffect(() => {
    loadEvents();
  }, [userProfile, currentDate]);

  useEffect(() => {
    // Filtrer par types sélectionnés
    const sourceEvents = viewMode === 'all' ? allEvents : events;
    setFilteredEvents(sourceEvents.filter(e => selectedTypes.includes(e.type)));
  }, [events, allEvents, selectedTypes, viewMode]);

  const loadEvents = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);

      // Construire le contexte utilisateur pour le filtrage intelligent
      const userContext = {
        level: userProfile.level || null,
        classId: userProfile.classId || null,
        className: userProfile.className || null,
        role: 'student'
      };

      // Récupérer TOUS les événements filtrés pour cet utilisateur
      const userEvents = await getCalendarForUser(
        userProfile.universityId,
        userContext
      );

      setAllEvents(userEvents);

      // Filtrer par mois actuel pour la vue mensuelle
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime();
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).getTime();

      const monthEvents = userEvents.filter(event => {
        const eventStart = new Date(event.startDate).getTime();
        const eventEnd = event.endDate ? new Date(event.endDate).getTime() : eventStart;
        return eventStart <= monthEnd && eventEnd >= monthStart;
      });

      setEvents(monthEvents);
    } catch (error) {
      console.error('Erreur chargement calendrier:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (delta) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const toggleTypeFilter = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Générer calendrier
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];

    // Jours du mois précédent
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Jours du mois actuel
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDay = (date) => {
    if (!date) return [];

    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startDate).getTime();
      const eventEnd = event.endDate ? new Date(event.endDate).getTime() : eventStart;
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">📅 Calendrier Académique</h1>
              <p className="text-gray-600 mt-1">Événements et dates importantes</p>
            </div>
          </div>

          {/* Filtres par type */}
          <div className="glass rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filtrer:</span>
              {['exam', 'vacation', 'holiday', 'school_start', 'school_end', 'event'].map(type => (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    selectedTypes.includes(type)
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  style={{
                    backgroundColor: selectedTypes.includes(type) ? EVENT_TYPE_COLORS[type] : undefined
                  }}
                >
                  {EVENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation calendrier */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                disabled={viewMode === 'all'}
              >
                <ChevronLeft className={`h-5 w-5 ${viewMode === 'all' ? 'text-gray-300' : ''}`} />
              </button>

              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900 capitalize">
                  {viewMode === 'all' ? 'Tous les événements' : monthName}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={goToToday}
                    className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                      viewMode === 'month'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    disabled={viewMode === 'all'}
                  >
                    Aujourd'hui
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === 'month' ? 'all' : 'month')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium ${
                      viewMode === 'all'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <List className="h-4 w-4" />
                    {viewMode === 'all' ? 'Vue Mois' : 'Tout Voir'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                disabled={viewMode === 'all'}
              >
                <ChevronRight className={`h-5 w-5 ${viewMode === 'all' ? 'text-gray-300' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Calendrier (seulement en mode mois) */}
        {viewMode === 'month' && (
        <div className="glass rounded-2xl p-6">
          {/* En-têtes jours */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-700 text-sm py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Grille calendrier */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((date, index) => {
              const dayEvents = date ? getEventsForDay(date) : [];
              const today = date && isToday(date);

              return (
                <div
                  key={index}
                  className={`min-h-[80px] p-1.5 rounded-lg border-2 transition ${
                    date
                      ? today
                        ? 'bg-purple-50 border-purple-400'
                        : 'bg-white border-gray-200'
                      : 'bg-gray-50 border-transparent'
                  }`}
                >
                  {date && (
                    <>
                      <div className={`text-xs font-semibold mb-1 ${today ? 'text-purple-600' : 'text-gray-700'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className="w-full text-left px-1.5 py-0.5 rounded text-xs font-medium text-white truncate"
                            style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] }}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <p className="text-xs text-gray-500 px-1">+{dayEvents.length - 2}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Liste des événements */}
        <div className="glass rounded-2xl p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {viewMode === 'all' ? 'Tous les événements' : 'Événements ce mois-ci'}
            </h3>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
              {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''}
            </span>
          </div>
          {filteredEvents.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {viewMode === 'all' ? 'Aucun événement à venir' : 'Aucun événement ce mois-ci'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredEvents
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                .map(event => (
                  <div key={event.id} className="flex items-center gap-4 p-4 bg-white rounded-lg hover:shadow-md transition">
                    <div
                      className="w-1 h-16 rounded-full"
                      style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] }}
                    ></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{event.title}</h4>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] }}
                        >
                          {EVENT_TYPE_LABELS[event.type]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {new Date(event.startDate).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                        {event.endDate && event.endDate !== event.startDate && (
                          <> - {new Date(event.endDate).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}</>
                        )}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                      )}
                      {event.location && (
                        <p className="text-xs text-gray-500 mt-1">📍 {event.location}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
