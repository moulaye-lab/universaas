/**
 * routes/onboarding.js - Routes pour l'inscription d'une nouvelle université
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('firebase-admin/database');
const { getAuth } = require('firebase-admin/auth');

const db = getDatabase();

/**
 * POST /api/onboarding/check-slug
 * Vérifier si un slug est disponible
 */
router.post('/check-slug', async (req, res) => {
  try {
    const { slug } = req.body;

    if (!slug || slug.length < 3) {
      return res.status(400).json({
        error: 'Le slug doit contenir au moins 3 caractères'
      });
    }

    // Valider format (a-z, 0-9, tirets)
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      return res.status(400).json({
        error: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'
      });
    }

    // Vérifier unicité dans Firebase
    const universitiesRef = db.ref('universities');
    const snapshot = await universitiesRef.once('value');
    const universities = snapshot.val() || {};

    // Chercher si le slug existe déjà
    const slugExists = Object.values(universities).some(
      univ => univ.slug === slug
    );

    res.json({
      available: !slugExists,
      slug
    });

  } catch (error) {
    console.error('Error checking slug:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification du slug' });
  }
});

/**
 * POST /api/onboarding/create-university
 * Créer une nouvelle université avec son administrateur
 */
router.post('/create-university', async (req, res) => {
  try {
    const {
      universityName,
      country,
      type,
      address,
      city,
      postalCode,
      phone,
      slug,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      currency,
      timezone,
      academicYear,
      language
    } = req.body;

    // Validation
    if (!universityName || !slug || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants'
      });
    }

    // Vérifier que le slug est unique
    const universitiesRef = db.ref('universities');
    const universitiesSnapshot = await universitiesRef.once('value');
    const universities = universitiesSnapshot.val() || {};

    const slugExists = Object.values(universities).some(
      univ => univ.slug === slug
    );

    if (slugExists) {
      return res.status(409).json({
        error: 'Ce slug est déjà utilisé'
      });
    }

    // 1. Créer le compte admin via Firebase Auth REST API
    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyC_qd1R-M4tL_5wkY0B_0dWxYGKS7YB5Zw';
    const signUpResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          returnSecureToken: true
        })
      }
    );

    const authData = await signUpResponse.json();

    if (!signUpResponse.ok) {
      console.error('Firebase Auth Error:', authData);
      return res.status(400).json({
        error: authData.error?.message || 'Erreur lors de la création du compte'
      });
    }

    const adminUid = authData.localId;

    // 2. Générer universityId unique
    const universityId = `univ-${slug}-${Date.now()}`;

    // 3. Créer l'université dans Firebase
    const universityData = {
      universityId,
      name: universityName,
      slug,
      country,
      type: type || 'public',
      address: address || '',
      city: city || '',
      postalCode: postalCode || '',
      phone: phone || '',
      createdAt: Date.now(),
      status: 'active',
      settings: {
        currency: currency || 'EUR',
        timezone: timezone || 'Europe/Paris',
        academicYear: academicYear || '2025/2026',
        language: language || 'fr'
      },
      // Paramètres IA par défaut
      aiEnabled: true,
      aiAssistantName: 'Assistant Académique',
      aiPersonality: 'professional',
      aiLanguage: language || 'fr',
      aiFeatures: {
        studentSupport: true,
        teacherSupport: true,
        adminSupport: true,
        parentSupport: true,
        paymentReminders: true,
        gradeNotifications: true,
        scheduleAssistance: true,
        dataAnalytics: true
      },
      aiResponseStyle: 'balanced',
      aiContextAwareness: 'full'
    };

    await db.ref(`universities/${universityId}`).set(universityData);

    // 4. Créer le profil admin dans users
    const adminProfileData = {
      uid: adminUid,
      email: adminEmail,
      firstName: adminFirstName,
      lastName: adminLastName,
      displayName: `${adminFirstName} ${adminLastName}`,
      role: 'admin_universite',
      universityId,
      profileId: adminUid,
      createdAt: Date.now(),
      loginMethod: 'email'
    };

    await db.ref(`users/${adminUid}`).set(adminProfileData);

    // 5. Créer données initiales (départements, niveaux, etc.)
    const defaultDepartments = [
      { id: 'info', name: 'Informatique' },
      { id: 'math', name: 'Mathématiques' },
      { id: 'phys', name: 'Physique' },
      { id: 'eco', name: 'Économie' },
      { id: 'droit', name: 'Droit' }
    ];

    const defaultLevels = ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3'];

    // Optionnel: créer des départements de base
    for (const dept of defaultDepartments) {
      await db.ref(`universities/${universityId}/departments/${dept.id}`).set({
        id: dept.id,
        name: dept.name,
        createdAt: Date.now()
      });
    }

    console.log(`✅ Université créée: ${universityId} (${universityName})`);
    console.log(`✅ Admin créé: ${adminEmail}`);

    // 6. TODO: Envoyer email de bienvenue (à implémenter)
    // await sendWelcomeEmail(adminEmail, {
    //   universityName,
    //   adminFirstName,
    //   slug
    // });

    res.status(201).json({
      success: true,
      universityId,
      adminUid,
      message: 'Université créée avec succès'
    });

  } catch (error) {
    console.error('Error creating university:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de la création de l\'université'
    });
  }
});

module.exports = router;
