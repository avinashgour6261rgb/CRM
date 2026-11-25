import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCollection, saveCollection, KEYS, syncDatabaseToStorage } from '../services/storageService';
import { ROLES, ROLE_CONFIGS, getUserRole, isAdmin, isHR, isTeamMember, isHRorAdmin, isLeaderOrAbove, getRoleConfig } from '../utils/permissionUtils';
import { API_BASE, getAuthHeaders } from '../config/apiConfig';
import { subscribeToSyncEvents } from '../services/realtimeSyncService';
import { registerSocketUser, subscribeToSocketEvent } from '../services/socketService';
import { performShiftClockOut } from '../utils/timerUtils';

const AuthContext = createContext();

export const PRESET_USERS = {};

const AUTH_STORAGE_KEY = 'ems_auth_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 3600 * 1000; // 7 days

const isSessionExpired = (parsedUser) => {
  try {
    const token = localStorage.getItem('ems_auth_token') || parsedUser?.token;
    if (token && typeof token === 'string' && token.split('.').length === 3) {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(b64));
      if (payload?.exp && Date.now() >= Number(payload.exp) * 1000) {
        return true;
      }
    }
    if (parsedUser?.loginAt && (Date.now() - Number(parsedUser.loginAt) >= SESSION_MAX_AGE_MS)) {
      return true;
    }
  } catch (_) {}
  return false;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && parsed._id !== 'emp_admin' && parsed._id !== 'emp_001') {
          if (isSessionExpired(parsed)) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem('ems_auth_token');
            return null;
          }
          const isParsedInactive = String(parsed.employeeCode || '').toUpperCase() !== 'ADM-001' &&
            ['resigned', 'inactive', 'terminated', 'suspended', 'archived', 'relieved'].includes(String(parsed.status || 'active').toLowerCase());
          if (isParsedInactive) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem('ems_auth_token');
            return null;
          }
          try {
            const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
            const pMap = rawMap ? JSON.parse(rawMap) : {};
            const uKey = parsed._id || parsed.employeeCode || parsed.email;
            const freshPerms = (parsed._id && pMap[String(parsed._id)]) ||
              (parsed.employeeCode && pMap[String(parsed.employeeCode)]) ||
              (parsed.email && pMap[String(parsed.email).toLowerCase()]) ||
              (uKey && pMap[uKey]);
            if (freshPerms) {
              return {
                ...parsed,
                permissions: { ...(parsed.permissions || {}), ...freshPerms },
                isDelegatedAdmin: freshPerms.isDelegatedAdmin !== undefined ? Boolean(freshPerms.isDelegatedAdmin) : Boolean(parsed.isDelegatedAdmin),
                delegationExpiresAt: freshPerms.delegationExpiresAt !== undefined ? freshPerms.delegationExpiresAt : parsed.delegationExpiresAt
              };
            }
          } catch (_) {}
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved auth session:', e);
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && parsed._id !== 'emp_admin' && parsed._id !== 'emp_001' && !isSessionExpired(parsed)) {
          return true;
        }
      }
    } catch {}
    return false;
  });

    // 1. Initial Load & Active Real-Time Database Synchronizer across devices & tabs
  useEffect(() => {
    let isMounted = true;
    const syncCurrentSessionUser = async () => {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (isSessionExpired(parsed)) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem('ems_auth_token');
          if (isMounted) {
            setCurrentUser(null);
            setIsAuthenticated(false);
          }
          return;
        }
        const query = parsed?.email || parsed?.employeeCode;
        if (!query) return;

        let matched = null;
        try {
          const res = await fetch(`${API_BASE}/employees?search=${encodeURIComponent(query)}`, {
            headers: getAuthHeaders(),
            signal: AbortSignal.timeout(3500)
          });
          if (res.status === 401 && isMounted) {
            const errJson = await res.json().catch(() => null);
            if (errJson?.code === 'TOKEN_EXPIRED' || errJson?.code === 'ACCOUNT_INACTIVE' || errJson?.code === 'SESSION_REVOKED') {
              localStorage.removeItem(AUTH_STORAGE_KEY);
              localStorage.removeItem('ems_auth_token');
              setCurrentUser(null);
              setIsAuthenticated(false);
              return;
            }
          }
          if (res.ok && isMounted) {
            const json = await res.json();
            const list = json.data || [];
            matched = list.find(e =>
              (parsed.email && e.email?.toLowerCase().trim() === parsed.email.toLowerCase().trim()) ||
              (parsed.employeeCode && e.employeeCode?.toUpperCase().trim() === parsed.employeeCode.toUpperCase().trim()) ||
              (parsed._id && String(e._id) === String(parsed._id))
            );
            // If employee was relieved/deactivated in DB, immediately log them out
            if (matched && String(matched.employeeCode || '').toUpperCase() !== 'ADM-001' && ['resigned', 'relieved', 'inactive', 'terminated', 'suspended', 'archived'].includes(String(matched.status || 'active').toLowerCase())) {
              localStorage.removeItem(AUTH_STORAGE_KEY);
              localStorage.removeItem('ems_auth_token');
              setCurrentUser(null);
              setIsAuthenticated(false);
              return;
            }
          }
        } catch (_) {}

        // Fallback: check local storage if backend offline or employee not returned by search
        if (!matched) {
          const localEmps = getCollection(KEYS.EMPLOYEES) || [];
          matched = localEmps.find(e =>
            (parsed.email && e.email?.toLowerCase().trim() === parsed.email.toLowerCase().trim()) ||
            (parsed.employeeCode && e.employeeCode?.toUpperCase().trim() === parsed.employeeCode.toUpperCase().trim()) ||
            (parsed._id && (String(e._id) === String(parsed._id) || String(e.id) === String(parsed._id)))
          );
          if (matched && String(matched.employeeCode || '').toUpperCase() !== 'ADM-001' && ['resigned', 'inactive', 'terminated', 'suspended', 'archived', 'relieved'].includes(String(matched.status || 'active').toLowerCase())) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem('ems_auth_token');
            setCurrentUser(null);
            setIsAuthenticated(false);
            return;
          }
        }

        if (matched && isMounted) {
          const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
          const pMap = rawMap ? JSON.parse(rawMap) : {};
          const freshPerms = (matched._id && pMap[String(matched._id)]) ||
            (matched.employeeCode && pMap[String(matched.employeeCode)]) ||
            (matched.email && pMap[String(matched.email).toLowerCase()]);
          // Authoritative MongoDB permissions ALWAYS take precedence over stale localStorage cache
          const hasDbPerms = matched.permissions && typeof matched.permissions === 'object' && Object.keys(matched.permissions).length > 0;
          const effectivePerms = hasDbPerms ? matched.permissions : (freshPerms || {});

          const hasPermsChanged =
            JSON.stringify(effectivePerms) !== JSON.stringify(parsed.permissions || {}) ||
            Boolean(matched.isDelegatedAdmin) !== Boolean(parsed.isDelegatedAdmin) ||
            Boolean(matched.isAdmin) !== Boolean(parsed.isAdmin) ||
            (matched.systemRole && matched.systemRole !== parsed.systemRole) ||
            (matched.role && matched.role !== parsed.role);

          if (hasPermsChanged) {
            const updatedUser = {
              ...parsed,
              ...matched,
              permissions: effectivePerms,
              isDelegatedAdmin: Boolean(matched.isDelegatedAdmin),
              delegationExpiresAt: matched.delegationExpiresAt || null,
              systemRole: matched.systemRole || parsed.systemRole
            };
            setCurrentUser(updatedUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));

            // Sync EMS_USER_PERMISSIONS cache
            if (effectivePerms && typeof effectivePerms === 'object') {
              try {
                if (matched._id) pMap[String(matched._id)] = effectivePerms;
                if (matched.employeeCode) pMap[String(matched.employeeCode)] = effectivePerms;
                if (matched.email) pMap[String(matched.email).toLowerCase()] = effectivePerms;
                localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(pMap));
              } catch (_) {}
            }

            window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
            window.dispatchEvent(new CustomEvent('ems_permissions_updated', { detail: { user: updatedUser } }));
          }
        }
      } catch (_) {}
    };

    // Immediate reactive handler for live permissions grant / revocation
    const handlePermissionsUpdated = (event) => {
      const data = event?.detail || event?.payload;
      if (!data) return;
      setCurrentUser(prev => {
        if (!prev) return prev;
        const targetId = data.employeeId || data.user?._id;
        const targetCode = data.employeeCode || data.user?.employeeCode;
        const targetEmail = data.email || data.user?.email;

        const isTarget =
          (targetId && String(prev._id) === String(targetId)) ||
          (targetCode && String(prev.employeeCode).toUpperCase() === String(targetCode).toUpperCase()) ||
          (targetEmail && String(prev.email).toLowerCase() === String(targetEmail).toLowerCase());

        if (isTarget) {
          const newPerms = data.permissions !== undefined ? (data.permissions || {}) : (data.user?.permissions || prev.permissions || {});
          const nextSystemRole = data.systemRole || data.user?.systemRole || prev.systemRole;
          const updatedUser = {
            ...prev,
            permissions: newPerms,
            isDelegatedAdmin: data.isDelegatedAdmin !== undefined ? Boolean(data.isDelegatedAdmin) : Boolean(prev.isDelegatedAdmin),
            delegationExpiresAt: data.delegationExpiresAt !== undefined ? data.delegationExpiresAt : prev.delegationExpiresAt,
            systemRole: nextSystemRole,
            isAdmin: prev.employeeCode === 'ADM-001' || prev.isSuperAdmin
              ? true
              : (nextSystemRole === 'admin' || Boolean(data.isDelegatedAdmin))
          };
          try {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
          } catch (_) {}
          return updatedUser;
        }
        return prev;
      });
    };

    const handleForceLogout = () => {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('ems_auth_token');
      setCurrentUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('ems_permissions_updated', handlePermissionsUpdated);
    window.addEventListener('ems_force_logout', handleForceLogout);

    // Initial check on mount
    syncCurrentSessionUser();

    // Re-verify immediately whenever browser window gains focus
    const onWindowFocus = () => {
      syncCurrentSessionUser();
    };
    window.addEventListener('focus', onWindowFocus);

    // Periodic check every 2 minutes for cross-device live sync (saves bandwidth)
    const intervalId = setInterval(syncCurrentSessionUser, 120000);

    // Subscribe to cross-tab broadcast events (0ms latency across tabs)
    const unsubscribeSync = subscribeToSyncEvents((event) => {
      if (event?.type === 'PERMISSIONS_UPDATED') {
        if (event?.payload) handlePermissionsUpdated({ detail: event.payload });
        syncCurrentSessionUser();
      }
    });

    // 🔒 Instant Force Logout on all devices when an employee account is relieved / deactivated
    const unsubscribeForceLogout = subscribeToSocketEvent('user:force_logout', (payload) => {
      if (!payload) return;
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!saved) return;
        const user = JSON.parse(saved);
        const uId = String(user?._id || user?.id || '');
        const uCode = String(user?.employeeCode || '').toUpperCase();
        const pId = String(payload.employeeId || '');
        const pCode = String(payload.employeeCode || '').toUpperCase();

        if ((pId && uId && pId === uId) || (pCode && uCode && pCode === uCode)) {
          handleForceLogout();
        }
      } catch (_) {}
    });

    return () => {
      isMounted = false;
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('ems_permissions_updated', handlePermissionsUpdated);
      window.removeEventListener('ems_force_logout', handleForceLogout);
      clearInterval(intervalId);
      unsubscribeSync();
      if (typeof unsubscribeForceLogout === 'function') unsubscribeForceLogout();
    };
  }, []);

  // Sync state with localStorage & join Socket.IO multi-device user rooms
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      registerSocketUser(currentUser);
    }
  }, [currentUser]);

  // Reactive Cross-App Synchronization for Profile Updates & Auth Sessions
  useEffect(() => {
    const handleStorageChange = (e) => {
      const key = e?.detail?.key;
      if (key === AUTH_STORAGE_KEY || key === 'ems_auth_session' || key === KEYS.EMPLOYEES || key === 'EMS_USER_PERMISSIONS') {
        try {
          const raw = localStorage.getItem(AUTH_STORAGE_KEY);
          if (!raw && (key === AUTH_STORAGE_KEY || key === 'ems_auth_session')) {
            setCurrentUser(null);
            setIsAuthenticated(false);
            return;
          }
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.email || parsed._id || parsed.employeeCode)) {
              const localEmps = getCollection(KEYS.EMPLOYEES) || [];
              const matchedEmp = localEmps.find(emp =>
                (parsed._id && (String(emp._id) === String(parsed._id) || String(emp.id) === String(parsed._id))) ||
                (parsed.employeeCode && emp.employeeCode && String(emp.employeeCode).toUpperCase() === String(parsed.employeeCode).toUpperCase()) ||
                (parsed.email && emp.email && emp.email.toLowerCase() === parsed.email.toLowerCase())
              );
              const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
              const pMap = rawMap ? JSON.parse(rawMap) : {};
              const freshPerms = (parsed._id && pMap[String(parsed._id)]) ||
                (parsed.employeeCode && pMap[String(parsed.employeeCode)]) ||
                (parsed.email && pMap[String(parsed.email).toLowerCase()]);

              const hasDbPerms = matchedEmp?.permissions && typeof matchedEmp.permissions === 'object' && Object.keys(matchedEmp.permissions).length > 0;
              const updatedPermissions = (key === 'EMS_USER_PERMISSIONS' && freshPerms)
                ? freshPerms
                : (hasDbPerms ? matchedEmp.permissions : (freshPerms || parsed.permissions || {}));
              const isDelegated = matchedEmp?.isDelegatedAdmin !== undefined ? Boolean(matchedEmp.isDelegatedAdmin) : (freshPerms?.isDelegatedAdmin !== undefined ? Boolean(freshPerms.isDelegatedAdmin) : Boolean(parsed.isDelegatedAdmin));
              const updatedUser = {
                ...parsed,
                ...(matchedEmp || {}),
                permissions: updatedPermissions,
                isDelegatedAdmin: isDelegated,
                delegationExpiresAt: matchedEmp?.delegationExpiresAt || freshPerms?.delegationExpiresAt || parsed.delegationExpiresAt || null,
                systemRole: matchedEmp?.systemRole || parsed.systemRole,
                isAdmin: parsed.employeeCode === 'ADM-001' || parsed.isSuperAdmin
                  ? true
                  : (matchedEmp?.isAdmin !== undefined ? Boolean(matchedEmp.isAdmin) : (matchedEmp?.systemRole === 'admin' || isDelegated))
              };
              if (JSON.stringify(updatedUser) !== JSON.stringify(parsed)) {
                setCurrentUser(updatedUser);
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
              }
            }
          }
        } catch (_) {}
      }
    };

    const handleNativeStorage = (e) => {
      if (e.key === AUTH_STORAGE_KEY) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed && (parsed.email || parsed._id)) {
              setCurrentUser(parsed);
              setIsAuthenticated(true);
            }
          } catch (_) {}
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    window.addEventListener('hrms_storage_change', handleStorageChange);
    window.addEventListener('storage', handleNativeStorage);
    return () => {
      window.removeEventListener('hrms_storage_change', handleStorageChange);
      window.removeEventListener('storage', handleNativeStorage);
    };
  }, []);

  // Terminal-scoped role switcher with authoritative DB record pull
  const switchRole = useCallback(async (roleId) => {
    const employees = getCollection(KEYS.EMPLOYEES) || [];
    let targetUser = null;
    if (roleId === 'admin') {
      targetUser = employees.find(e => e.role?.toLowerCase().includes('admin') || e.isAdmin) || null;
    } else if (roleId === 'hr') {
      targetUser = employees.find(e => e.systemRole === 'hr' || e.department === 'Human Resources') || null;
    } else if (roleId === 'employee' || roleId === 'team_member') {
      targetUser = employees.find(e => e.systemRole === 'team_member' && !e.isAdmin) || null;
    }
    if (!targetUser) return null;

    if (currentUser) {
      performShiftClockOut(currentUser, { reason: 'Role Switch' });
    }
    const query = targetUser.email || targetUser.employeeCode || '';

    try {
      const res = await fetch(`${API_BASE}/employees?search=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        const freshUser = list.find(e =>
          (targetUser.email && e.email?.toLowerCase().trim() === targetUser.email.toLowerCase().trim()) ||
          (targetUser.employeeCode && e.employeeCode?.toUpperCase().trim() === targetUser.employeeCode.toUpperCase().trim()) ||
          (targetUser._id && String(e._id) === String(targetUser._id))
        );
        if (freshUser) {
          targetUser = { ...targetUser, ...freshUser, permissions: freshUser.permissions || targetUser.permissions || {} };
        }
      }
    } catch (_) {}

    setCurrentUser(targetUser);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(targetUser));
    if (targetUser.permissions && typeof targetUser.permissions === 'object') {
      try {
        const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
        const parsedMap = rawMap ? JSON.parse(rawMap) : {};
        if (targetUser._id) parsedMap[String(targetUser._id)] = targetUser.permissions;
        if (targetUser.employeeCode) parsedMap[String(targetUser.employeeCode)] = targetUser.permissions;
        if (targetUser.email) parsedMap[String(targetUser.email).toLowerCase()] = targetUser.permissions;
        localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(parsedMap));
      } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
    syncDatabaseToStorage().catch(() => {});
    return targetUser;
  }, [currentUser]);

  // Quick switch to any specific employee or user object
  const switchUser = useCallback(async (userOrId) => {
    let targetUser = null;
    if (typeof userOrId === 'object' && userOrId !== null) {
      targetUser = { ...userOrId, isCurrentUser: true };
    } else {
      try {
        const res = await fetch(`${API_BASE}/employees/switch/${userOrId}`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          signal: AbortSignal.timeout(2500)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            targetUser = json.data;
          }
        }
      } catch (e) {}

      if (!targetUser) {
        const employees = getCollection(KEYS.EMPLOYEES) || [];
        const found = employees.find(e => e._id === userOrId || e.id === userOrId || e.employeeCode === userOrId || e.email === userOrId);
        if (found) {
          targetUser = { ...found, isCurrentUser: true };
        }
      }
    }

    if (targetUser) {
      if (currentUser) {
        performShiftClockOut(currentUser, { reason: 'User Switch' });
      }
      setCurrentUser(targetUser);
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(targetUser));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
      syncDatabaseToStorage().catch(() => {});
    }
    return targetUser;
  }, [currentUser]);

  // Login handler with strict backend credential verification (Email or Employee Code + Password)
  const login = useCallback(async ({ email, employeeCode, identifier, password }) => {
    const inputId = (identifier || email || employeeCode || '').toLowerCase().trim();
    const cleanPass = (password || '').trim();

    if (!inputId) {
      throw new Error('Please enter your work email or Employee ID.');
    }
    if (!cleanPass) {
      throw new Error('Please enter your password.');
    }

    // Authenticate strictly against MongoDB Atlas backend
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: inputId, password: cleanPass })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          if (currentUser) {
            performShiftClockOut(currentUser, { reason: 'New Login' });
          }
          if (json.token) {
            localStorage.setItem('ems_auth_token', json.token);
          }
          const dbUser = {
            ...json.user,
            token: json.token || undefined,
            loginAt: Date.now(),
            isCurrentUser: true,
            isAdmin: json.user.systemRole === 'admin' || json.user.isAdmin
          };
          setCurrentUser(dbUser);
          setIsAuthenticated(true);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(dbUser));
          // Mirror employee to local storage list
          const localEmps = getCollection(KEYS.EMPLOYEES) || [];
          const idx = localEmps.findIndex(e => e._id === dbUser._id || e.employeeCode === dbUser.employeeCode);
          if (idx >= 0) {
            localEmps[idx] = { ...localEmps[idx], ...dbUser };
          } else {
            localEmps.push(dbUser);
          }
          saveCollection(KEYS.EMPLOYEES, localEmps);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
          syncDatabaseToStorage().catch(() => {});
          return dbUser;
        }
        throw new Error(json.message || 'Authentication failed. Please check your credentials.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Invalid credentials. Please verify your email/ID and password.');
      }
    } catch (apiErr) {
      if (apiErr.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('NetworkError') && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
      throw new Error('Unable to reach authentication server. Please check your connection and try again.');
    }
  }, [currentUser]);

  // Logout handler: cleanly pauses running task timer, stops shift clock, and logs out
  const logout = useCallback(() => {
    if (currentUser) {
      performShiftClockOut(currentUser, { reason: 'User Logout' });
    }

    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('ems_auth_token');
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
  }, [currentUser]);

  const role = getUserRole(currentUser);
  const roleConfig = getRoleConfig(currentUser);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated,
        role,
        roleConfig,
        isAdmin: isAdmin(currentUser),
        isHR: isHR(currentUser),
        isTeamMember: isTeamMember(currentUser),
        isHRorAdmin: isHRorAdmin(currentUser),
        isLeaderOrAbove: isLeaderOrAbove(currentUser),
        login,
        logout,
        switchRole,
        switchUser,
        PRESET_USERS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    let fallbackUser = null;
    try {
      const s = localStorage.getItem('ems_auth_session');
      if (s) {
        const p = JSON.parse(s);
        fallbackUser = p?.user || p;
      }
    } catch (_) {}
    const role = fallbackUser?.systemRole || fallbackUser?.role || 'team_member';
    return {
      currentUser: fallbackUser,
      setCurrentUser: () => {},
      isAuthenticated: !!fallbackUser,
      role,
      roleConfig: getRoleConfig(role),
      isAdmin: isAdmin(fallbackUser),
      isHR: isHR(fallbackUser),
      isTeamMember: isTeamMember(fallbackUser),
      isHRorAdmin: isHRorAdmin(fallbackUser),
      isLeaderOrAbove: isLeaderOrAbove(fallbackUser),
      login: async () => {},
      logout: () => {},
      switchRole: () => {},
      switchUser: () => {},
      PRESET_USERS
    };
  }
  return context;
};
