import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles
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
              {companySettings?.showCompanyNameOnLogin && companySettings?.companyLogo ? (
                <img
                  src={companySettings.companyLogo}
                  alt={displayCompanyName}
                  className="h-11 max-w-[110px] object-contain rounded-xl bg-white p-1.5 shadow-lg shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-600/40 shrink-0">
                  <Building2 size={24} className="text-white" />
                </div>
              )}
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
              Sign in with your company work email or Employee ID and password to access your live workspace.
            </p>

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

        {/* Right Side: Clean Login Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-2.5 w-fit">
              <Sparkles size={13} /> Secure Enterprise Authentication
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 m-0 mb-1.5 tracking-tight">
              Sign In to Your Workspace
            </h2>
            <p className="text-[13.5px] text-slate-500 m-0">
              Enter your registered work email / Employee ID and password to sign in.
            </p>
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
                  placeholder="e.g. name@company.com or EMP-001"
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
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
};

export default LoginPage;
