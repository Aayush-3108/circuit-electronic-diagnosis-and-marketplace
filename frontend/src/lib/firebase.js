import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Fill these in from your free Firebase project:
// Firebase Console -> Project Settings -> General -> Your apps -> Web app -> SDK config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = firebaseConfigured ? getAuth(app) : null;

// Note: image uploads for marketplace listings use Cloudinary, not Firebase
// Storage -- see lib/cloudinary.js. Firebase Storage now requires the paid
// Blaze plan (as of Feb 2026), which breaks the ₹0 budget constraint, so
// Cloudinary's free unsigned-upload tier is used instead.
