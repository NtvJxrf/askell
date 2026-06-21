// Central role definitions shared by the Moleculer backend AND the Next.js
// frontend. Keep this module 100% dependency-free (no dotenv/db/valkey) so it
// can be safely imported anywhere, including the browser bundle.

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  PRODUCTION: 'production',
});

// All known roles as an array (handy for validation and UI dropdowns).
export const ALL_ROLES = Object.freeze(Object.values(ROLES));

/**
 * Role-based access check.
 * - `admin` can do everything.
 * - If no specific roles are required, any authenticated user passes.
 * - Otherwise the user must have at least one of the required roles.
 *
 * @param {{ roles?: string[] } | null | undefined} user
 * @param {string[]} [requiredRoles]
 * @returns {boolean}
 */
export function hasRole(user, requiredRoles) {
  if (!user) return false;
  const roles = user.roles ?? [];
  if (roles.includes(ROLES.ADMIN)) return true;
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.some((role) => roles.includes(role));
}

/** True if the user has the admin role. */
export function isAdmin(user) {
  return !!user && (user.roles ?? []).includes(ROLES.ADMIN);
}
