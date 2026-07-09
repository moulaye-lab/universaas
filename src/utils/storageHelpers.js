/**
 * storageHelpers.js - Utilitaires pour Firebase Storage
 *
 * Fonctions pour uploader et gérer les fichiers (justificatifs d'absence)
 */

import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Upload un justificatif d'absence vers Firebase Storage
 * @param {File} file - Le fichier à uploader
 * @param {string} universityId - ID de l'université
 * @param {string} absenceId - ID de l'absence
 * @returns {Promise<{url: string, filename: string}>}
 */
export const uploadJustificatif = async (file, universityId, absenceId) => {
  if (!file) {
    throw new Error('Aucun fichier fourni');
  }

  // Validation taille (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('Le fichier est trop volumineux (max 5MB)');
  }

  // Validation type
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Type de fichier non autorisé (PDF, JPG, PNG uniquement)');
  }

  try {
    // Générer un nom de fichier unique avec timestamp
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `justificatif_${timestamp}.${extension}`;

    // Chemin dans Storage
    const path = `justificatifs/${universityId}/${absenceId}/${filename}`;
    const fileRef = storageRef(storage, path);

    // Upload
    const snapshot = await uploadBytes(fileRef, file);

    // Récupérer l'URL de téléchargement
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      url: downloadUrl,
      filename: file.name,
      storagePath: path,
      uploadedAt: timestamp
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Erreur d'upload: ${error.message}`);
  }
};

/**
 * Supprimer un justificatif du Storage
 * @param {string} storagePath - Chemin du fichier dans Storage
 * @returns {Promise<void>}
 */
export const deleteJustificatif = async (storagePath) => {
  if (!storagePath) return;

  try {
    const fileRef = storageRef(storage, storagePath);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Ne pas throw pour éviter de bloquer si le fichier n'existe pas
  }
};

/**
 * Valider qu'un fichier est une image ou un PDF
 * @param {File} file
 * @returns {boolean}
 */
export const isValidFileType = (file) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  return allowedTypes.includes(file.type);
};

/**
 * Formater la taille d'un fichier en KB/MB
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
