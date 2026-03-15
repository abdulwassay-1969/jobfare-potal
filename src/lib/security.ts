export const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() || 'admin@example.com';

export const ADMIN_USERNAME =
  process.env.NEXT_PUBLIC_ADMIN_USERNAME?.trim().toLowerCase() || 'admin';

export function isAdminEmail(email: string | null | undefined): boolean {
  return (email || '').trim().toLowerCase() === ADMIN_EMAIL;
}
