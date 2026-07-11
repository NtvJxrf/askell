// Central permission definitions shared by the Moleculer backend AND the
// Next.js frontend. Keep this module 100% dependency-free (no dotenv/db/valkey)
// so it can be safely imported anywhere, including the browser bundle.
//
// These are NOT roles — a user simply has a list of access rights
// (`user.roles`, kept as the DB column name) drawn from this array. Any
// combination is allowed. `Админ` is special: it grants access to everything.

export const PERMISSIONS = Object.freeze([
  'Админ',
  'Калькулятор',
  'Отчеты',
  'Настройки',
  'Игнорировать ограничения',
  'Производство-выполнение'
]);

/**
 * Permission-based access check.
 * - `Админ` can do everything.
 * - If no specific permissions are required, any authenticated user passes.
 * - Otherwise the user must have at least one of the required permissions.
 *
 * @param {{ roles?: string[] } | null | undefined} user
 * @param {string[]} [requiredPermissions]
 * @returns {boolean}
 */
export function hasPermission(user, requiredPermissions) {
  if (!user) return false;
  const permissions = user.roles ?? [];
  if (permissions.includes('Админ')) return true;
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  return requiredPermissions.some((permission) => permissions.includes(permission));
}

/** True if the user has the admin permission. */
export function isAdmin(user) {
  return !!user && (user.roles ?? []).includes('Админ');
}
