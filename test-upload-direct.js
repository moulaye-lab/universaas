// Test direct Node.js
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { readFileSync } from 'fs';

const firebaseConfig = {
  storageBucket: "university-saas-7b31e.firebasestorage.app",
  projectId: "university-saas-7b31e",
  apiKey: process.env.VITE_FIREBASE_API_KEY
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const testFile = Buffer.from('test content');
const storageRef = ref(storage, 'test-node.txt');

console.log('Uploading...');
uploadBytes(storageRef, testFile)
  .then(() => console.log('✅ SUCCESS'))
  .catch(e => console.error('❌ ERROR:', e.message, e.code));
