# 🐛 Bugs à Corriger

## 🔴 Priorité Haute

### 1. Calendrier - Glisser-Déposer ne fonctionne pas
**Page:** `/admin/calendar`  
**Problème:** Le drag & drop d'événements ne fonctionne pas  
**Code concerné:**
- `src/pages/admin/CalendarManagementPage.jsx` (lignes 200-239)
- Handlers: `handleDragStart`, `handleDragOver`, `handleDrop`
- Service: `updateEvent` dans `calendarService.js`

**Status:** Code en place, handlers attachés, mais ne répond pas  
**À vérifier:**
- Console errors lors du drag
- Permissions Firebase pour `update` sur calendar/events
- Event propagation (stopPropagation manquant ?)

**Date ajout:** 2026-07-18

---

## 🟡 Priorité Moyenne

(Vide pour le moment)

---

## 🟢 Priorité Basse

(Vide pour le moment)
