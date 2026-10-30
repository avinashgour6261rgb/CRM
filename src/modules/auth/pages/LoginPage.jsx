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
  const { login, currentUser, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [companySettings, setCompanySettings] = useState(() => getCompanySettings());

  React.useEffect(() => {
    if (currentUser && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isAuthenticated, navigate]);

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

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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
      badgeColorCls: 'text-red-400 bg-red-500/15',
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
      badgeColorCls: 'text-pink-400 bg-pink-500/15',
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
      badgeColorCls: 'text-blue-400 bg-blue-500/15',
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
    <div className="min-h-screen w-full bg-[#0b132b] bg-[radial-gradient(at_0%_0%,rgba(37,99,235,0.25)_0px,transparent_50%),radial-gradient(at_100%_100%,rgba(124,58,237,0.2)_0px,transparent_50%)] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-[1120px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl ring-1 ring-white/10 dark:ring-slate-800 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] overflow-hidden">
        {/* Left Side: Enterprise Branding & 1-Click Demo Accounts */}
        <div className="bg-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
          <div>
            {/* Logo & Brand Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-600/40 shrink-0">
                <Building2 size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white m-0">
                  {displayCompanyName}
                </h1>
                <span className="text-xs text-blue-400 font-semibold">
                  {displayTagline}
                </span>
              </div>
            </div>

            <p className="text-[13px] text-slate-400 leading-relaxed mb-5">
              Sign in with your registered account, or use 1-click demo accounts below for instant testing.
            </p>

            {/* 1-Click Demo Accounts Container */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-sky-400" />
                  <span className="text-[13px] font-extrabold text-white tracking-wide">
                    ⚡ 1-Click Demo Accounts
                  </span>
                </div>
                <span className="text-[11px] text-sky-400 font-bold bg-sky-400/12 px-2 py-0.5 rounded-full">
                  Tap to Login
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {demoAccounts.map(acc => (
                  <div
                    key={acc.id}
                    className="bg-slate-950/75 border border-white/10 rounded-xl p-2.5 px-3 flex items-center justify-between gap-2.5 transition-all duration-200"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{acc.icon}</span>
                        <strong className="text-[13px] text-white truncate">
                          {acc.name}
                        </strong>
                        <span className={`text-[10px] font-bold px-1.5 py-[1px] rounded ${acc.badgeColorCls}`}>
                          {acc.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <span>{acc.email}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-sky-400 font-semibold">Pass: <code className="bg-black/30 px-1 py-[1px] rounded font-mono text-[10.5px]">{acc.password}</code></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fillCredentials(acc.email, acc.password)}
                        title="Auto-fill credentials in form"
                        className="bg-white/[0.08] hover:bg-white/[0.16] text-slate-300 border-0 py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer transition-colors"
                      >
                        Fill
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickLogin(acc.email, acc.password, acc.name)}
                        disabled={loading}
                        title={`Instantly open workspace as ${acc.name}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 py-1.5 px-2.5 rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap shadow-md shadow-blue-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 px-3.5 text-xs text-slate-300">
              <div className="font-bold text-sky-400 mb-1">
                🔒 Strict Privacy & Access Control:
              </div>
              <div className="text-slate-400 leading-relaxed">
                Team members only see their own tasks and records. HR manages approvals. Admin oversees the entire organization.
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-white/[0.08] text-xs text-slate-500 flex items-center justify-between">
            <span>{companySettings?.showCompanyNameOnLogin && companySettings?.companyName ? `© ${new Date().getFullYear()} ${companySettings.companyName}` : `© ${new Date().getFullYear()} Enterprise Management System`}</span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              ● System Online
            </span>
          </div>
        </div>

        {/* Right Side: Clean Login Form + Fast Demo Switcher */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-2.5 w-fit">
              <Sparkles size={13} /> Secure Enterprise Authentication
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 m-0 mb-1.5 tracking-tight">
              Sign In to Your Workspace
            </h2>
            <p className="text-[13.5px] text-slate-500 m-0">
              Click any quick demo account or enter your credentials to open your workspace.
            </p>
          </div>

          {/* Fast 1-Click Demo Buttons Bar (Direct Tap to Open) */}
          <div className="mb-5 p-3 px-3.5 bg-emerald-50/60 border border-emerald-300 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <Zap size={14} className="text-emerald-600" /> ⚡ 1-Click Fast Login (Tap to Open):
              </span>
              <span className="text-[10.5px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">
                Instant Access
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin(currentAdmin.email || 'admin@inforag.com', currentAdmin.password || 'admin123', 'Administrator')}
                disabled={loading}
                className="p-2 px-1.5 bg-white dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer flex flex-col items-center gap-0.5 transition-all hover:-translate-y-0.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xs font-bold text-slate-900">👑 Admin</span>
                <span className="text-[10px] text-slate-500">admin123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('janvi@inforag.com', 'emp123', 'Janvi Hiwse')}
                disabled={loading}
                className="p-2 px-1.5 bg-white dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer flex flex-col items-center gap-0.5 transition-all hover:-translate-y-0.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xs font-bold text-slate-900">💼 Janvi (HR)</span>
                <span className="text-[10px] text-slate-500">emp123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sandeep@inforag.com', 'emp123', 'Sandeep Meena')}
                disabled={loading}
                className="p-2 px-1.5 bg-white dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer flex flex-col items-center gap-0.5 transition-all hover:-translate-y-0.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xs font-bold text-slate-900">👤 Sandeep</span>
                <span className="text-[10px] text-slate-500">emp123</span>
              </button>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-300 rounded-[10px] p-2.5 px-3.5 text-red-700 text-[13px] font-semibold mb-4">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email / ID Field */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Work Email or Employee ID *
              </label>
              <div className="relative">
                <Mail size={17} className="text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. sandeep@inforag.com or EMP-002"
                  required
                  className="w-full py-3 pr-3.5 pl-[42px] rounded-[10px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                <label className="text-[13px] font-semibold text-slate-700">
                  Password *
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Fill:</span>
                  <span
                    className="text-[11px] text-blue-600 cursor-pointer font-bold hover:underline"
                    onClick={() => fillCredentials(currentAdmin.email || 'admin@inforag.com', currentAdmin.password || 'admin123')}
                    title="Fill Admin"
                  >
                    Admin
                  </span>
                  <span className="text-slate-300 text-[10px]">•</span>
                  <span
                    className="text-[11px] text-pink-600 cursor-pointer font-bold hover:underline"
                    onClick={() => fillCredentials('janvi@inforag.com', 'emp123')}
                    title="Fill Janvi"
                  >
                    Janvi
                  </span>
                  <span className="text-slate-300 text-[10px]">•</span>
                  <span
                    className="text-[11px] text-sky-600 cursor-pointer font-bold hover:underline"
                    onClick={() => fillCredentials('sandeep@inforag.com', 'emp123')}
                    title="Fill Sandeep"
                  >
                    Sandeep
                  </span>
                  <span className="text-slate-300 text-[10px]">•</span>
                  <span
                    className="text-[11px] text-red-600 cursor-pointer font-semibold hover:underline"
                    onClick={() => setIsForgotModalOpen(true)}
                    title="Request password reset or recover access"
                  >
                    Forgot?
                  </span>
                </div>
              </div>
              <div className="relative">
                <Lock size={17} className="text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full py-3 px-[42px] rounded-[10px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 bg-transparent border-0 cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1.5 py-3 px-5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 text-[14.5px] font-bold cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/35 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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
          <div className="mt-[18px] p-2.5 px-3 rounded-[10px] bg-slate-50 border border-slate-200 text-xs text-slate-500 leading-relaxed">
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
