import type { ActionCodeSettings } from 'firebase/auth';

export function getEmailVerificationActionSettings(): ActionCodeSettings {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const baseUrl = appUrl || browserOrigin || 'https://jobfare-potal.vercel.app';

  return {
    url: `${baseUrl}/login?verified=1`,
    handleCodeInApp: false,
  };
}
