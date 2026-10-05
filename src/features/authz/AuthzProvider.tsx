import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Permission, Role } from './permissions';
import { roleHasPermission } from './permissions';

interface AuthzContextValue {
  role: Role;
  setRole: (role: Role) => void;
  can: (permission: Permission) => boolean;
}

const AuthzContext = createContext<AuthzContextValue | null>(null);

const ROLE_STORAGE_KEY = 'orderpulse.role';

function readStoredRole(): Role {
  if (typeof window === 'undefined') return 'AGENT';
  const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
  return stored === 'SUPERVISOR' ? 'SUPERVISOR' : 'AGENT';
}

export function AuthzProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(readStoredRole);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    window.localStorage.setItem(ROLE_STORAGE_KEY, next);
  }, []);

  const can = useCallback((permission: Permission) => roleHasPermission(role, permission), [role]);

  const value = useMemo(() => ({ role, setRole, can }), [role, setRole, can]);

  return <AuthzContext.Provider value={value}>{children}</AuthzContext.Provider>;
}

export function useAuthz(): AuthzContextValue {
  const ctx = useContext(AuthzContext);
  if (!ctx) throw new Error('useAuthz must be used within an AuthzProvider');
  return ctx;
}

/** Declarative gate so JSX doesn't need scattered `can()` conditionals. */
export function Can({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuthz();
  if (!can(permission)) return null;
  return <>{children}</>;
}
