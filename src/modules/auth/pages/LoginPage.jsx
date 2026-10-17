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
  Briefcase
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

  const [showAdminCard, setShowAdminCard] = useState(false);

  const fillCredentials = (id, pass) => {
    setIdentifier(id);
    setPassword(pass);
    setLoginError('');
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
        maxWidth: '1080px',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        overflow: 'hidden'
      }}>
        {/* Left Side: Enterprise Branding & Subtle Admin Access */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
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

            <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>
              Welcome to your unified workspace. Sign in using your registered Work Email or Employee ID and password.
            </p>

            {/* Collapsible Master Admin Credentials Card */}
            <div style={{
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '20px',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#60a5fa" />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                    👑 Master Admin Access
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminCard(!showAdminCard)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#93c5fd',
                    border: '1px solid rgba(147, 197, 253, 0.3)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {showAdminCard ? 'Hide' : 'Show Credentials'}
                </button>
              </div>

              {showAdminCard && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                    <div><strong>Email:</strong> <code style={{ color: '#93c5fd', backgroundColor: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px' }}>{currentAdmin.email}</code> or ID: <code style={{ color: '#93c5fd', backgroundColor: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px' }}>{currentAdmin.employeeCode}</code></div>
                    <div style={{ marginTop: '4px' }}><strong>Password:</strong> <code style={{ color: '#93c5fd', backgroundColor: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px' }}>{currentAdmin.password}</code></div>
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => fillCredentials(currentAdmin.email, currentAdmin.password)}
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Quick Admin Login
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Role Access Security Notice */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '12px',
              color: '#cbd5e1'
            }}>
              <div style={{ fontWeight: '700', color: '#38bdf8', marginBottom: '4px' }}>
                🔒 Strict Privacy & Access Control:
              </div>
              <div>
                Employees only see their own tasks, shift hours, and records. Cross-employee data is protected unless Admin explicitly grants extra permissions.
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{companySettings?.showCompanyNameOnLogin && companySettings?.companyName ? `© ${new Date().getFullYear()} ${companySettings.companyName}` : `© ${new Date().getFullYear()} Enterprise Management System`}</span>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ● System Online
            </span>
          </div>
        </div>

        {/* Right Side: Clean Login Form */}
        <div style={{
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ marginBottom: '28px' }}>
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
              marginBottom: '12px'
            }}>
              <Sparkles size={13} /> Secure Enterprise Authentication
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Sign In to Your Workspace
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              Enter your work email or employee ID and password to access your workspace.
            </p>
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
                  placeholder="e.g. admin@inforag.com or ADM-001"
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                  Password *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}
                    onClick={() => fillCredentials(currentAdmin.email || 'admin@inforag.com', currentAdmin.password || '')}
                    title="Auto-fill active admin credentials"
                  >
                    Fill Admin
                  </span>
                  <span style={{ color: '#cbd5e1', fontSize: '11px' }}>•</span>
                  <span
                    style={{ fontSize: '12px', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}
                    onClick={() => setIsForgotModalOpen(true)}
                    title="Request password reset or recover access"
                  >
                    Forgot Password?
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
                marginTop: '8px',
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
            marginTop: '20px',
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
            color: '#64748b',
            lineHeight: '1.5'
          }}>
            💡 <strong>New Employee?</strong> Admin or HR registers your account and assigns your Employee ID and password in the Employee Directory. Use those credentials to sign in.
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onAutoFillAdmin={() => fillCredentials(currentAdmin.email || 'admin@inforag.com', currentAdmin.password || '')}
      />
    </div>
  );
};

export default LoginPage;
