import admin from 'firebase-admin';

const [emailArg] = process.argv.slice(2);
const targetEmail = (emailArg || process.env.ADMIN_EMAIL || '').trim().toLowerCase();

if (!targetEmail) {
  console.error('Usage: node scripts/set-admin-claim.mjs <admin-email>');
  process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS is not set.');
  console.error('Set it to your Firebase service account JSON path and retry.');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const auth = admin.auth();

try {
  const user = await auth.getUserByEmail(targetEmail);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  await auth.revokeRefreshTokens(user.uid);

  console.log(`Admin claim set for ${targetEmail} (uid: ${user.uid}).`);
  console.log('User must sign out and sign in again to refresh token claims.');
} catch (error) {
  console.error('Failed to set admin claim:', error.message || error);
  process.exit(1);
}
