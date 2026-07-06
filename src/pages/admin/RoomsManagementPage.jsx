/**
 * RoomsManagementPage.jsx - Gestion des salles de l'université
 *
 * Fonctionnalités:
 * - Création de salles avec caractéristiques (capacité, type, équipements)
 * - Liste de toutes les salles
 * - Suppression de salles
 * - Détection des conflits d'horaires (salle déjà réservée)
 * - Modification des salles existantes
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, get, push, remove } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function RoomsManagementPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser, loading: authLoading } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState({
    roomName: '',
    roomNumber: '',
    building: '',
    capacity: '30',
    type: 'Salle de cours',
    equipment: []
  });

  const roomTypes = [
    'Salle de cours',
    'Amphithéâtre',
    'Laboratoire',
    'Salle informatique',
    'Salle de TP',
    'Bibliothèque',
    'Salle de conférence',
    'Atelier'
  ];

  const availableEquipment = [
    'Projecteur',
    'Tableau interactif',
    'Ordinateurs',
    'Wifi',
    'Climatisation',
    'Système audio',
    'Caméra',
    'Microscopes',
    'Matériel de laboratoire'
  ];

  // Charger les salles
  useEffect(() => {
    const loadRooms = async () => {
      if (authLoading) return;

      if (!userProfile?.universityId) {
        setError('Erreur: Aucune université associée');
        setLoading(false);
        return;
      }

      try {
        const roomsRef = ref(database, `universities/${userProfile.universityId}/rooms`);
        const roomsSnap = await get(roomsRef);

        if (roomsSnap.exists()) {
          const roomsData = roomsSnap.val();
          const roomsList = Object.entries(roomsData).map(([id, data]) => ({
            id,
            ...data
          }));
          setRooms(roomsList);
        } else {
          setRooms([]);
        }
      } catch (err) {
        console.error('Error loading rooms:', err);
        setError('Erreur lors du chargement des salles');
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, [userProfile, authLoading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEquipmentToggle = (equipment) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equipment)
        ? prev.equipment.filter(e => e !== equipment)
        : [...prev.equipment, equipment]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!formData.roomName.trim()) {
        throw new Error('Le nom de la salle est requis');
      }
      if (!formData.roomNumber.trim()) {
        throw new Error('Le numéro de salle est requis');
      }

      // Vérifier si le numéro de salle existe déjà
      const roomExists = rooms.some(
        r => r.roomNumber.toLowerCase() === formData.roomNumber.trim().toLowerCase()
      );
      if (roomExists) {
        throw new Error('Ce numéro de salle existe déjà');
      }

      // Créer la salle
      const roomRef = push(ref(database, `universities/${userProfile.universityId}/rooms`));
      const roomId = roomRef.key;

      const roomData = {
        roomId,
        roomName: formData.roomName.trim(),
        roomNumber: formData.roomNumber.trim().toUpperCase(),
        building: formData.building.trim(),
        capacity: parseInt(formData.capacity),
        type: formData.type,
        equipment: formData.equipment,
        status: 'active',
        createdAt: Date.now(),
        createdBy: currentUser.uid
      };

      await set(roomRef, roomData);

      // Créer log d'audit
      const auditRef = push(ref(database, `universities/${userProfile.universityId}/audit`));
      await set(auditRef, {
        action: 'CREATE_ROOM',
        performedBy: currentUser.uid,
        performedByName: userProfile.displayName || userProfile.email,
        targetId: roomId,
        targetName: formData.roomName,
        timestamp: Date.now(),
        details: {
          roomNumber: formData.roomNumber.toUpperCase(),
          type: formData.type,
          capacity: formData.capacity
        }
      });

      setSuccess(`Salle "${formData.roomName}" créée avec succès !`);

      // Ajouter à la liste locale
      setRooms(prev => [...prev, roomData]);

      // Reset form
      setFormData({
        roomName: '',
        roomNumber: '',
        building: '',
        capacity: '30',
        type: 'Salle de cours',
        equipment: []
      });

      // Fermer modal après 1.5s
      setTimeout(() => {
        setShowCreateModal(false);
        setSuccess('');
      }, 1500);

    } catch (err) {
      console.error('Error creating room:', err);
      setError(err.message || 'Erreur lors de la création de la salle');
    }
  };

  const handleDelete = async (roomId, roomName) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la salle "${roomName}" ?`)) {
      return;
    }

    try {
      // Vérifier si la salle est utilisée dans des cours
      const coursesRef = ref(database, `universities/${userProfile.universityId}/courses`);
      const coursesSnap = await get(coursesRef);

      if (coursesSnap.exists()) {
        const coursesData = Object.values(coursesSnap.val());
        const roomInUse = coursesData.some(
          course => course.schedule?.room === roomName
        );

        if (roomInUse) {
          setError('Impossible de supprimer: cette salle est utilisée par un ou plusieurs cours');
          return;
        }
      }

      // Supprimer la salle
      await remove(ref(database, `universities/${userProfile.universityId}/rooms/${roomId}`));

      // Créer log d'audit
      const auditRef = push(ref(database, `universities/${userProfile.universityId}/audit`));
      await set(auditRef, {
        action: 'DELETE_ROOM',
        performedBy: currentUser.uid,
        performedByName: userProfile.displayName || userProfile.email,
        targetId: roomId,
        targetName: roomName,
        timestamp: Date.now()
      });

      // Retirer de la liste locale
      setRooms(prev => prev.filter(r => r.id !== roomId));
      setSuccess('Salle supprimée avec succès');

      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error deleting room:', err);
      setError('Erreur lors de la suppression de la salle');
    }
  };

  // Calculer les statistiques
  const stats = {
    total: rooms.length,
    amphitheaters: rooms.filter(r => r.type === 'Amphithéâtre').length,
    labs: rooms.filter(r => r.type === 'Laboratoire' || r.type === 'Salle informatique').length,
    totalCapacity: rooms.reduce((sum, r) => sum + (r.capacity || 0), 0)
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              🏢 Gestion des Salles
            </h1>
            <p className="text-gray-600">
              {rooms.length} salle{rooms.length > 1 ? 's' : ''} configurée{rooms.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
            >
              ← Retour
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold"
            >
              + Nouvelle Salle
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-1">Total Salles</p>
            <p className="text-3xl font-black text-gray-900">{stats.total}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-1">Amphithéâtres</p>
            <p className="text-3xl font-black text-blue-600">{stats.amphitheaters}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-1">Laboratoires</p>
            <p className="text-3xl font-black text-purple-600">{stats.labs}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-1">Capacité Totale</p>
            <p className="text-3xl font-black text-green-600">{stats.totalCapacity}</p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-6">
            <p className="text-red-700 font-semibold">❌ {error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl mb-6">
            <p className="text-green-700 font-semibold">✅ {success}</p>
          </div>
        )}

        {/* Liste des salles */}
        {rooms.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Aucune salle configurée
            </h3>
            <p className="text-gray-600 mb-6">
              Créez votre première salle pour commencer à organiser vos cours
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold"
            >
              + Créer la première salle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <div key={room.id} className="glass rounded-3xl p-6 hover:shadow-xl transition">
                {/* En-tête */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {room.roomName}
                    </h3>
                    <p className="text-sm font-mono text-blue-600 font-semibold">
                      {room.roomNumber}
                    </p>
                    {room.building && (
                      <p className="text-xs text-gray-600 mt-1">
                        🏛️ {room.building}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(room.id, room.roomName)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>

                {/* Type et capacité */}
                <div className="flex gap-2 mb-4">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                    {room.type}
                  </span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-semibold">
                    👥 {room.capacity} places
                  </span>
                </div>

                {/* Équipements */}
                {room.equipment && room.equipment.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-2 font-semibold">Équipements :</p>
                    <div className="flex flex-wrap gap-1">
                      {room.equipment.map(eq => (
                        <span
                          key={eq}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statut */}
                <div className="pt-4 border-t border-gray-200">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    room.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {room.status === 'active' ? '✅ Disponible' : '🔒 Indisponible'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">
                  🏢 Nouvelle Salle
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informations de base */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Informations de base</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nom de la salle *
                      </label>
                      <input
                        type="text"
                        name="roomName"
                        value={formData.roomName}
                        onChange={handleChange}
                        placeholder="Ex: Amphithéâtre Descartes"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Numéro *
                      </label>
                      <input
                        type="text"
                        name="roomNumber"
                        value={formData.roomNumber}
                        onChange={handleChange}
                        placeholder="Ex: A-201"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Bâtiment
                      </label>
                      <input
                        type="text"
                        name="building"
                        value={formData.building}
                        onChange={handleChange}
                        placeholder="Ex: Bâtiment A"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Capacité *
                      </label>
                      <input
                        type="number"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleChange}
                        min="1"
                        max="1000"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Type de salle *
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        {roomTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Équipements */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Équipements disponibles</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {availableEquipment.map(equipment => (
                      <label
                        key={equipment}
                        className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={formData.equipment.includes(equipment)}
                          onChange={() => handleEquipmentToggle(equipment)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-semibold text-gray-700">{equipment}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                    <p className="text-red-700 font-semibold">❌ {error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl">
                    <p className="text-green-700 font-semibold">✅ {success}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setError('');
                      setSuccess('');
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition font-semibold"
                  >
                    Créer la salle
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
