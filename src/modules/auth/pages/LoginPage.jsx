import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  User,
  Briefcase,
  Zap
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { getCompanySettings } from '../../../shared/services/companySettingsService';
import { ForgotPasswordModal } from '../../../shared/components/modals/ForgotPasswordModal';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();
  const [companySettings, setCompanySettings] = useState(() => getCompanySettings());

  // Dynamically resolve actual admin credentials from storage
  const currentAdmin = React.useMemo(() => {
    try {
      const emps = JSON.parse(localStorage.getItem('hrms_employees') || '[]');
      const found = emps.find(e =>
        e.employeeCode === 'ADM-001' ||
        e.email === 'admin@inforag.com' ||
        e.isAdmin ||
        e.systemRole === 'admin'
      );
      if (found) {
        return {
          email: found.email || 'admin@inforag.com',
          employeeCode: found.employeeCode || 'ADM-001',
          password: found.password || 'admin123'
        };
      }
    } catch (e) {}
    return { email: 'admin@inforag.com', employeeCode: 'ADM-001', password: 'admin123' };
  }, []);

  const [identifier, setIdentifier] = useState(() => currentAdmin.email || 'admin@inforag.com');
  const [password, setPassword] = useState(() => currentAdmin.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  React.useEffect(() => {
    const handleUpdate = () => setCompanySettings(getCompanySettings());
    window.addEventListener('company-settings-updated', handleUpdate);
    return () => window.removeEventListener('company-settings-updated', handleUpdate);
  }, []);

  const demoAccounts = [
    {
      id: 'admin',
      name: 'Administrator',
      role: 'Master Admin',
      badge: 'Admin',
      badgeColor: '#ef4444',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      email: currentAdmin.email || 'admin@inforag.com',
      code: currentAdmin.employeeCode || 'ADM-001',
      password: currentAdmin.password || 'admin123',
      icon: '👑',
      desc: 'Full system control, directory, permissions & settings'
    },
    {
      id: 'janvi',
      name: 'Janvi Hiwse',
      role: 'HR Specialist & Recruiter',
      badge: 'HR / Approver',
      badgeColor: '#ec4899',
      badgeBg: 'rgba(236, 72, 153, 0.15)',
      email: 'janvi@inforag.com',
      code: 'EMP-003',
      password: 'emp123',
      icon: '💼',
      desc: 'Manage & approve leaves, attendance, notices & reviews'
    },
    {
      id: 'sandeep',
      name: 'Sandeep Meena',
      role: 'Team Member',
      badge: 'Team Member',
      badgeColor: '#3b82f6',
      badgeBg: 'rgba(59, 130, 246, 0.15)',
      email: 'sandeep@inforag.com',
      code: 'EMP-002',
      password: 'emp123',
      icon: '👤',
      desc: 'Personal tasks, live timer, shift clock & own leaves'
    }
  ];

  const fillCredentials = (id, pass) => {
    setIdentifier(id);
    setPassword(pass);
    setLoginError('');
  };

  const handleQuickLogin = async (id, pass, name) => {
    setIdentifier(id);
    setPassword(pass);
    setLoginError('');
    setLoading(true);
    try {
      const user = await login({ identifier: id, password: pass });
      addToast(`Logged in as ${user.name || name || id}! Opening workspace...`, 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.message || 'Login failed. Please verify credentials.';
      setLoginError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');
    if (!identifier.trim()) {
      setLoginError('Please enter your work email or Employee ID');
      addToast('Please enter your work email or Employee ID', 'error');
      return;
    }
    if (!password.trim()) {
      setLoginError('Please enter your password');
      addToast('Please enter your password', 'error');
      return;
    }

    setLoading(true);
    try {
      const user = await login({ identifier, password });
      addToast(`Welcome back, ${user.name}! Logged in as ${user.role || (user.isAdmin ? 'Admin' : 'Team Member')}`, 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.message || 'Login failed. Please verify your email/ID and password.';
      setLoginError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const displayCompanyName = companySettings?.showCompanyNameOnLogin && companySettings?.companyName
    ? companySettings.companyName
    : 'ENTERPRISE WORKSPACE';

  const displayTagline = companySettings?.showCompanyNameOnLogin && companySettings?.tagline
    ? companySettings.tagline
    : 'Enterprise Management System & CRM';

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#0b132b',
      backgroundImage: 'radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.25) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(124, 58, 237, 0.2) 0px, transparent 50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1120px',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        overflow: 'hidden'
      }}>
        {/* Left Side: Enterprise Branding & 1-Click Demo Accounts */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '40px 32px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div>
            {/* Logo & Brand Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)'
              }}>
                <Building2 size={24} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff', margin: 0 }}>
                  {displayCompanyName}
                </h1>
                <span style={{ fontSize: '12px', color: '#60a5fa', fontWeight: '600' }}>
                  {displayTagline}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', marginBottom: '20px' }}>
              Sign in with your registered account, or use 1-click demo accounts below for instant testing.
            </p>

            {/* 1-Click Demo Accounts Container */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={18} color="#38bdf8" />
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.02em' }}>
                    ⚡ 1-Click Demo Accounts
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', backgroundColor: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '12px' }}>
                  Tap to Login
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {demoAccounts.map(acc => (
                  <div
                    key={acc.id}
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '14px' }}>{acc.icon}</span>
                        <strong style={{ fontSize: '13px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {acc.name}
                        </strong>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          color: acc.badgeColor,
                          backgroundColor: acc.badgeBg,
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          {acc.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{acc.email}</span>
                        <span style={{ color: '#475569' }}>•</span>
                        <span style={{ color: '#38bdf8', fontWeight: '600' }}>Pass: <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: '4px' }}>{acc.password}</code></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => fillCredentials(acc.email, acc.password)}
                        title="Auto-fill credentials in form"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          color: '#cbd5e1',
                          border: 'none',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                      >
                        Fill
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin(acc.email, acc.password, acc.name)}
                        disabled={loading}
                        title={`Instantly open workspace as ${acc.name}`}
                        style={{
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                        onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = '#2563eb')}
                      >
                        <Zap size={12} />
                        <span>Login</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role Access Security Notice */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#cbd5e1'
            }}>
              <div style={{ fontWeight: '700', color: '#38bdf8', marginBottom: '3px' }}>
                🔒 Strict Privacy & Access Control:
              </div>
              <div style={{ color: '#94a3b8', lineHeight: '1.5' }}>
                Team members only see their own tasks and records. HR manages approvals. Admin oversees the entire organization.
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{companySettings?.showCompanyNameOnLogin && companySettings?.companyName ? `© ${new Date().getFullYear()} ${companySettings.companyName}` : `© ${new Date().getFullYear()} Enterprise Management System`}</span>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ● System Online
            </span>
          </div>
        </div>

        {/* Right Side: Clean Login Form + Fast Demo Switcher */}
        <div style={{
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              fontSize: '12px',
              fontWeight: '700',
              marginBottom: '10px'
            }}>
              <Sparkles size={13} /> Secure Enterprise Authentication
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Sign In to Your Workspace
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              Click any quick demo account or enter your credentials to open your workspace.
            </p>
          </div>

          {/* Fast 1-Click Demo Buttons Bar (Direct Tap to Open) */}
          <div style={{
            marginBottom: '20px',
            padding: '12px 14px',
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Zap size={14} color="#16a34a" /> ⚡ 1-Click Fast Login (Tap to Open):
              </span>
              <span style={{ fontSize: '10.5px', color: '#15803d', fontWeight: '600', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '6px' }}>
                Instant Access
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin(currentAdmin.email || 'admin@inforag.com', currentAdmin.password || 'admin123', 'Administrator')}
                disabled={loading}
                style={{
                  padding: '8px 6px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#22c55e';
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#bbf7d0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>👑 Admin</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>admin123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('janvi@inforag.com', 'emp123', 'Janvi Hiwse')}
                disabled={loading}
                style={{
                  padding: '8px 6px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#22c55e';
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#bbf7d0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>💼 Janvi (HR)</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>emp123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sandeep@inforag.com', 'emp123', 'Sandeep Meena')}
                disabled={loading}
                style={{
                  padding: '8px 6px',
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#22c55e';
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#bbf7d0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>👤 Sandeep</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>emp123</span>
              </button>
            </div>
          </div>

          {loginError && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1.5px solid #f87171',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#b91c1c',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '16px'
            }}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email / ID Field */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Work Email or Employee ID *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={17} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. sandeep@inforag.com or EMP-002"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '14px',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: '#f8fafc'
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                  Password *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Fill:</span>
                  <span
                    style={{ fontSize: '11px', color: '#2563eb', cursor: 'pointer', fontWeight: '700' }}
                    onClick={() => fillCredentials(currentAdmin.email || 'admin@inforag.com', currentAdmin.password || 'admin123')}
                    title="Fill Admin"
                  >
                    Admin
                  </span>
                  <span style={{ color: '#cbd5e1', fontSize: '10px' }}>•</span>
                  <span
                    style={{ fontSize: '11px', color: '#ec4899', cursor: 'pointer', fontWeight: '700' }}
                    onClick={() => fillCredentials('janvi@inforag.com', 'emp123')}
                    title="Fill Janvi"
                  >
                    Janvi
                  </span>
                  <span style={{ color: '#cbd5e1', fontSize: '10px' }}>•</span>
                  <span
                    style={{ fontSize: '11px', color: '#0284c7', cursor: 'pointer', fontWeight: '700' }}
                    onClick={() => fillCredentials('sandeep@inforag.com', 'emp123')}
                    title="Fill Sandeep"
                  >
                    Sandeep
                  </span>
                  <span style={{ color: '#cbd5e1', fontSize: '10px' }}>•</span>
                  <span
                    style={{ fontSize: '11px', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}
                    onClick={() => setIsForgotModalOpen(true)}
                    title="Request password reset or recover access"
                  >
                    Forgot?
                  </span>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={17} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 42px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '14px',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: '#f8fafc'
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                padding: '13px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                fontSize: '14.5px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* New Employee Notice */}
          <div style={{
            marginTop: '18px',
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
            color: '#64748b',
            lineHeight: '1.5'
          }}>
            💡 <strong>Testing Tip:</strong> Simply tap any demo button above or on the left to immediately log in without typing!
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onAutoFillAdmin={() => fillCredentials(currentAdmin.email || 'admin@inforag.com', currentAdmin.password || 'admin123')}
      />
    </div>
  );
};

export default LoginPage;
