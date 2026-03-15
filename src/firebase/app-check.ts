'use client';

import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';

let appCheckInstance: AppCheck | null = null;

export function initializeFirebaseAppCheck(firebaseApp: FirebaseApp): AppCheck | null {
  if (typeof window === 'undefined') return null;

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY;
  if (!siteKey) return null;

  if (appCheckInstance) return appCheckInstance;

  try {
    appCheckInstance = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    return appCheckInstance;
  } catch (error) {
    console.warn('Firebase App Check initialization skipped:', error);
    return null;
  }
}
