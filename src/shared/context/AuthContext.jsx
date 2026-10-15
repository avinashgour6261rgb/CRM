import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCollection, saveCollection, KEYS } from '../services/storageService';
import { ROLES, ROLE_CONFIGS, getUserRole, isAdmin, isHR, isTeamMember, isHRorAdmin, isLeaderOrAbove, getRoleConfig } from '../utils/permissionUtils';
import { API_BASE } from '../config/apiConfig';

const AuthContext = createContext();

export const PRESET_USERS = {
  admin: {
    _id: '6acc811b9fa84342850a5ab9',
    employeeCode: 'ADM-001',
    name: 'Admin User',
    email: 'admin@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'Administrator',
    systemRole: ROLES.ADMIN,
    department: 'Management',
    status: 'active',
    joiningDate: '2023-01-01',
    isCurrentUser: true,
    isAdmin: true,
    isSuperAdmin: true,
    leaveBalance: { casual: 12, sick: 10, earned: 18, maternity: 0 }
  },
  hr: {
    _id: '6acc811b9fa84342850a5aba',
    employeeCode: 'HR-001',
    name: 'Pooja Sharma',
    email: 'hr@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    role: 'HR Manager',
    systemRole: ROLES.HR,
    department: 'Human Resources',
    status: 'active',
    joiningDate: '2023-03-01',
    isCurrentUser: true,
    isAdmin: false,
    leaveBalance: { casual: 10, sick: 8, earned: 15, maternity: 0 }
  },
  employee: {
    _id: '6acc811b9fa84342850a5abb',
    employeeCode: 'ENG-001',
    name: 'Rahul Verma',
    email: 'rahul.verma@inforag.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    role: 'Senior Full Stack Developer',
    systemRole: ROLES.TEAM_MEMBER,
    department: 'Engineering',
    status: 'active',
    joiningDate: '2023-02-15',
    isCurrentUser: true,
    isAdmin: false,
    leaveBalance: { casual: 10, sick: 6, earned: 14, maternity: 0 }
  }
};

const AUTH_STORAGE_KEY = 'ems_auth_session';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && !parsed.name?.includes('Avinash') && parsed._id !== 'emp_admin' && parsed._id !== 'emp_001') {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading saved auth session:', e);
    }
    return PRESET_USERS.admin;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // 1. Initial Load: Sync profile from backend without overwriting local terminal's user
  useEffect(() => {
    let isMounted = true;
    const fetchDbUser = async () => {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email) {
            // Keep local terminal session; fetch live updates for this specific user
            try {
              const res = await fetch(`${API_BASE}/employees?search=${encodeURIComponent(parsed.email)}`, { signal: AbortSignal.timeout(2000) });
              if (res.ok) {
                const json = await res.json();
                const matched = (json.data || []).find(e => e.email?.toLowerCase() === parsed.email.toLowerCase());
                if (matched && isMounted) {
                  setCurrentUser(prev => ({ ...prev, ...matched }));
                  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ ...parsed, ...matched }));
                  return;
                }
              }
            } catch {}
            return;
          }
        }

        // Only if NO local user session exists, fall back to default
        const res = await fetch(`${API_BASE}/employees/current`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && isMounted) {
            const dbUser = json.data;
            setCurrentUser(dbUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(dbUser));
          }
        }
      } catch (err) {
        // Backend offline or timeout
      }
    };

    fetchDbUser();
    return () => { isMounted = false; };
  }, []);

  // Sync state with localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Terminal-scoped role switcher
  const switchRole = useCallback(async (roleId) => {
    // Match target user from local presets or collection
    let targetUser = PRESET_USERS[roleId] || PRESET_USERS.admin;
    const employees = getCollection(KEYS.EMPLOYEES) || [];
    if (roleId === 'admin') {
      targetUser = employees.find(e => e.employeeCode === 'ADM-001' || e.role?.toLowerCase().includes('admin') || e.isAdmin) || PRESET_USERS.admin;
    } else if (roleId === 'hr') {
      targetUser = employees.find(e => e.employeeCode === 'HR-001' || e.department === 'Human Resources') || PRESET_USERS.hr;
    } else if (roleId === 'employee' || roleId === 'team_member') {
      targetUser = employees.find(e => e.employeeCode === 'ENG-001' || e.department === 'Engineering') || PRESET_USERS.employee;
    }

    setCurrentUser(targetUser);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(targetUser));
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
    return targetUser;
  }, []);

  // Quick switch to any specific employee or user object
  const switchUser = useCallback(async (userOrId) => {
    let targetUser = null;
    if (typeof userOrId === 'object' && userOrId !== null) {
      targetUser = { ...userOrId, isCurrentUser: true };
    } else {
      try {
        const res = await fetch(`${API_BASE}/employees/switch/${userOrId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        } else if (PRESET_USERS[userOrId]) {
          targetUser = PRESET_USERS[userOrId];
        }
      }
    }

    if (targetUser) {
      setCurrentUser(targetUser);
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(targetUser));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
    }
    return targetUser;
  }, []);

  // Login handler
  const login = useCallback(async ({ email, password, role }) => {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (role) {
      return await switchRole(role);
    }
    try {
      const res = await fetch(`${API_BASE}/employees?search=${encodeURIComponent(cleanEmail)}`);
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        const found = list.find(e => e.email?.toLowerCase() === cleanEmail);
        if (found) {
          return await switchUser(found._id);
        }
      }
    } catch (e) {}

    return await switchRole('admin');
  }, [switchRole, switchUser]);

  // Logout handler
  const logout = useCallback(() => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
  }, []);

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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
