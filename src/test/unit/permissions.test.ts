import { describe, expect, it } from 'vitest';
import { getPermissionsForRole, roleHasPermission } from '../../features/authz/permissions';

describe('authz permissions', () => {
  it('grants agents the core action permissions but not cancel', () => {
    expect(roleHasPermission('AGENT', 'orders:mark-packed')).toBe(true);
    expect(roleHasPermission('AGENT', 'orders:hold')).toBe(true);
    expect(roleHasPermission('AGENT', 'orders:cancel')).toBe(false);
  });

  it('grants supervisors every agent permission plus cancel and advanced KPIs', () => {
    const agentPermissions = getPermissionsForRole('AGENT');
    const supervisorPermissions = getPermissionsForRole('SUPERVISOR');

    agentPermissions.forEach((permission) => {
      expect(supervisorPermissions).toContain(permission);
    });
    expect(roleHasPermission('SUPERVISOR', 'orders:cancel')).toBe(true);
    expect(roleHasPermission('SUPERVISOR', 'kpi:view-advanced')).toBe(true);
  });

  it('denies views:save to AGENT but grants it to SUPERVISOR', () => {
    expect(roleHasPermission('AGENT', 'views:save')).toBe(false);
    expect(roleHasPermission('SUPERVISOR', 'views:save')).toBe(true);
  });
});
