
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;

    try {
      // Use explicit config first for stable behavior across local/dev/prod builds.
      firebaseApp = initializeApp(firebaseConfig);
    } catch {
      // Fallback for environments where Firebase App Hosting provides config automatically.
      try {
        firebaseApp = initializeApp();
      } catch (error) {
        throw new Error('Firebase initialization failed. Check firebase config and hosting environment.', {
          cause: error,
        });
      }
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}
