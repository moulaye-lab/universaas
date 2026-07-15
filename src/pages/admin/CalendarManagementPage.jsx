/**
 * CalendarManagementPage.jsx - Gestion du Calendrier Académique
 *
 * Interface admin pour créer/modifier/supprimer des événements académiques
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsForMonth,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS
} from '../../services/calendarService';
import {
  ChevronLeft, Plus, Calendar as CalendarIcon, ChevronRight, Edit2, Trash2, X, Filter
} from 'lucide-react';
import { database } from '../../config/firebase';
import { ref, get } from 'firebase/database';

export default function CalendarManagementPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState(Object.values(EVENT_TYPES));
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [availableLevels, setAvailableLevels] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: EVENT_TYPES.EVENT,
    startDate: '',
    endDate: '',
    location: '',
    allDay: true,
    target: { type: 'all', value: null }
  });

  useEffect(() => {
    loadEvents();
    loadLevelsAndClasses();
  }, [userProfile, currentDate]);

  useEffect(() => {
    // Filtrer par types sélectionnés
    setFilteredEvents(events.filter(e => selectedTypes.includes(e.type)));
  }, [events, selectedTypes]);

  const loadEvents = async () => {
    if (!userProfile?.universityId) return;

    try {
      setLoading(true);
      const eventsList = await getEventsForMonth(
        userProfile.universityId,
        currentDate.getFullYear(),
        currentDate.getMonth()
      );
      setEvents(eventsList);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLevelsAndClasses = async () => {
    if (!userProfile?.universityId) return;

    try {
      // Charger tous les étudiants pour extraire les niveaux uniques
      const studentsRef = ref(database, `universities/${userProfile.universityId}/students`);
      const studentsSnap = await get(studentsRef);

      const levels = new Set();
      if (studentsSnap.exists()) {
        Object.values(studentsSnap.val()).forEach(student => {
          if (student.level) levels.add(student.level);
        });
      }
      setAvailableLevels([...levels].sort());

      // Charger toutes les classes
      const classesRef = ref(database, `universities/${userProfile.universityId}/classes`);
      const classesSnap = await get(classesRef);

      if (classesSnap.exists()) {
        const classesData = Object.entries(classesSnap.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        setAvailableClasses(classesData);
      }
    } catch (error) {
      console.error('Erreur chargement niveaux/classes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const eventData = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null
      };

      if (editingEvent) {
        await updateEvent(userProfile.universityId, editingEvent.id, eventData);
      } else {
        await createEvent(userProfile.universityId, eventData, userProfile.uid);
      }

      setShowModal(false);
      resetForm();
      loadEvents();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Supprimer cet événement ?')) return;

    try {
      await deleteEvent(userProfile.universityId, eventId);
      loadEvents();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const openAddModal = () => {
    resetForm();
    setEditingEvent(null);
    setShowModal(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      type: event.type,
      startDate: event.startDate.split('T')[0],
      endDate: event.endDate ? event.endDate.split('T')[0] : '',
      location: event.location || '',
      allDay: event.allDay !== false,
      target: event.target || { type: 'all', value: null }
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: EVENT_TYPES.EVENT,
      startDate: '',
      endDate: '',
      location: '',
      allDay: true,
      target: { type: 'all', value: null }
    });
  };

  const toggleTypeFilter = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const changeMonth = (delta) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Drag & Drop handlers
  const handleDragStart = (e, event) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetDate) => {
    e.preventDefault();
    if (!draggedEvent || !targetDate) return;

    try {
      const daysDiff = Math.floor((targetDate - new Date(draggedEvent.startDate)) / (1000 * 60 * 60 * 24));

      const newStartDate = new Date(targetDate);
      let newEndDate = null;

      if (draggedEvent.endDate) {
        const originalDuration = Math.floor(
          (new Date(draggedEvent.endDate) - new Date(draggedEvent.startDate)) / (1000 * 60 * 60 * 24)
        );
        newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + originalDuration);
      }

      await updateEvent(userProfile.universityId, draggedEvent.id, {
        startDate: newStartDate.toISOString(),
        endDate: newEndDate ? newEndDate.toISOString() : null
      });

      setDraggedEvent(null);
      loadEvents();
    } catch (error) {
      console.error('Erreur déplacement:', error);
      alert('Erreur lors du déplacement');
    }
  };

  const handleDayClick = (date) => {
    if (!date) return;

    // Pré-remplir avec la date cliquée
    resetForm();
    setFormData(prev => ({
      ...prev,
      startDate: date.toISOString().split('T')[0]
    }));
    setEditingEvent(null);
    setShowModal(true);
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

    // Normaliser les dates à minuit UTC
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startDate).getTime();
      const eventEnd = event.endDate ? new Date(event.endDate).getTime() : eventStart;

      // L'événement chevauche ce jour
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
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
              onClick={() => navigate('/dashboard/admin')}
              className="p-2 hover:bg-white rounded-xl transition shadow-sm"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">📅 Calendrier Académique</h1>
              <p className="text-gray-600 mt-1">Gérez les événements universitaires</p>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
            >
              <Plus className="h-5 w-5" />
              Nouvel événement
            </button>
          </div>

          {/* Filtres par type */}
          <div className="glass rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filtrer:</span>
              {Object.values(EVENT_TYPES).map(type => (
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
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900 capitalize">{monthName}</h2>
                <button
                  onClick={goToToday}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                >
                  Aujourd'hui
                </button>
              </div>

              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendrier */}
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
                  className={`min-h-[80px] p-1.5 rounded-lg border-2 transition cursor-pointer ${
                    date
                      ? today
                        ? 'bg-indigo-50 border-indigo-400'
                        : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      : 'bg-gray-50 border-transparent'
                  } ${draggedEvent && date ? 'hover:border-indigo-500 hover:bg-indigo-100' : ''}`}
                  onDragOver={date ? handleDragOver : undefined}
                  onDrop={date ? (e) => handleDrop(e, date) : undefined}
                  onClick={date ? () => handleDayClick(date) : undefined}
                >
                  {date && (
                    <>
                      <div className={`text-xs font-semibold mb-1 ${today ? 'text-indigo-600' : 'text-gray-700'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map(event => (
                          <button
                            key={event.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, event)}
                            onDragEnd={() => setDraggedEvent(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(event);
                            }}
                            className="w-full text-left px-1.5 py-0.5 rounded text-xs font-medium text-white truncate hover:opacity-80 transition cursor-move"
                            style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] }}
                            title={`${event.title} - Glisser pour déplacer ou cliquer pour éditer`}
                          >
                            {event.title}
                          </button>
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

        {/* Liste des événements du mois */}
        <div className="glass rounded-2xl p-6 mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Événements ce mois-ci</h3>
          {filteredEvents.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucun événement ce mois-ci</p>
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-gray-900">{event.title}</h4>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] }}
                        >
                          {EVENT_TYPE_LABELS[event.type]}
                        </span>
                        {/* Badge cible */}
                        {event.target?.type === 'all' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            🌍 Tous
                          </span>
                        )}
                        {event.target?.type === 'level' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            📊 {event.target.value}
                          </span>
                        )}
                        {event.target?.type === 'class' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                            👥 {availableClasses.find(c => c.id === event.target.value)?.name || event.target.value}
                          </span>
                        )}
                        {event.target?.type === 'teachers_of_class' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            👨‍🏫 Profs: {availableClasses.find(c => c.id === event.target.value)?.name || event.target.value}
                          </span>
                        )}
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
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(event)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Ajout/Modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date début <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date fin (optionnel)
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={formData.startDate}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Amphithéâtre A, Salle 201..."
                  />
                </div>

                {/* 🎯 TARGET SELECTION */}
                <div className="border-t-2 border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎯 Cible de l'événement <span className="text-red-500">*</span>
                  </label>

                  <div className="space-y-3">
                    {/* Type de cible */}
                    <div>
                      <select
                        value={formData.target.type}
                        onChange={(e) => setFormData({
                          ...formData,
                          target: { type: e.target.value, value: null }
                        })}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="all">🌍 Tous (Toute l'université)</option>
                        <option value="level">📊 Par niveau (L1, M2...)</option>
                        <option value="class">👥 Par classe spécifique (étudiants)</option>
                        <option value="teachers_of_class">👨‍🏫 Professeurs d'une classe</option>
                      </select>
                    </div>

                    {/* Valeur de cible conditionnelle */}
                    {formData.target.type === 'level' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Sélectionner le niveau</label>
                        <select
                          required
                          value={formData.target.value || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            target: { ...formData.target, value: e.target.value }
                          })}
                          className="w-full px-4 py-2 rounded-lg border-2 border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">-- Choisir un niveau --</option>
                          {availableLevels.map(level => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formData.target.type === 'class' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Sélectionner la classe (étudiants)</label>
                        <select
                          required
                          value={formData.target.value || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            target: { ...formData.target, value: e.target.value }
                          })}
                          className="w-full px-4 py-2 rounded-lg border-2 border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">-- Choisir une classe --</option>
                          {availableClasses.map(cls => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name} ({cls.level || 'Non défini'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formData.target.type === 'teachers_of_class' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Sélectionner la classe (professeurs uniquement)</label>
                        <select
                          required
                          value={formData.target.value || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            target: { ...formData.target, value: e.target.value }
                          })}
                          className="w-full px-4 py-2 rounded-lg border-2 border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">-- Choisir une classe --</option>
                          {availableClasses.map(cls => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name} ({cls.level || 'Non défini'}) - Professeurs uniquement
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-purple-600 mt-1">
                          💡 Seuls les enseignants ayant des cours dans cette classe verront cet événement
                        </p>
                      </div>
                    )}

                    {/* Badge de prévisualisation */}
                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                      <p className="text-xs font-medium text-indigo-900">Aperçu de la cible:</p>
                      <p className="text-sm text-indigo-700 mt-1">
                        {formData.target.type === 'all' && '🌍 Visible par tous les étudiants et enseignants'}
                        {formData.target.type === 'level' && formData.target.value && `📊 Visible uniquement par les étudiants en ${formData.target.value}`}
                        {formData.target.type === 'level' && !formData.target.value && '📊 Niveau non sélectionné'}
                        {formData.target.type === 'class' && formData.target.value && `👥 Visible uniquement par les étudiants de la classe: ${availableClasses.find(c => c.id === formData.target.value)?.name}`}
                        {formData.target.type === 'class' && !formData.target.value && '👥 Classe non sélectionnée'}
                        {formData.target.type === 'teachers_of_class' && formData.target.value && `👨‍🏫 Visible uniquement par les enseignants de la classe: ${availableClasses.find(c => c.id === formData.target.value)?.name}`}
                        {formData.target.type === 'teachers_of_class' && !formData.target.value && '👨‍🏫 Classe non sélectionnée'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
                  >
                    {editingEvent ? 'Modifier' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
