export type Role = 'AGENT' | 'SUPERVISOR';

export type Permission =
  | 'orders:view'
  | 'orders:mark-packed'
  | 'orders:hold'
  | 'orders:cancel'
  | 'orders:add-note'
  | 'kpi:view-basic'
  | 'kpi:view-advanced'
  | 'views:save';

/**
 * Single source of truth mapping roles to permissions. Adding a new role or
 * permission means editing this table only - feature code asks
 * `can('orders:cancel')` and never branches on role directly.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  AGENT: ['orders:view', 'orders:mark-packed', 'orders:hold', 'orders:add-note', 'kpi:view-basic'],
  SUPERVISOR: [
    'orders:view',
    'orders:mark-packed',
    'orders:hold',
    'orders:cancel',
    'orders:add-note',
    'kpi:view-basic',
    'kpi:view-advanced',
    'views:save',
  ],
};

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
