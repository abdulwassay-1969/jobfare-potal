import type { User } from 'firebase/auth';

export const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() || 'abdulwassaynisar@gmail.com';

export const ADMIN_USERNAME =
  process.env.NEXT_PUBLIC_ADMIN_USERNAME?.trim().toLowerCase() || 'admin';

export async function hasAdminClaim(user: User | null | undefined): Promise<boolean> {
  if (!user) return false;
  try {
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims.admin === true;
  } catch {
    return false;
  }
}
