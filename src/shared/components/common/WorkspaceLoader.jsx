import React, { useMemo } from 'react';
import { Building2, Sparkles, ShieldCheck } from 'lucide-react';
import { getCompanySettings } from '../../services/companySettingsService';

/**
 * Premium Enterprise Workspace Loader
 * Replaces raw "Loading workspace..." with a high-fidelity branded loader.
 */
export const WorkspaceLoader = ({
  message = 'Preparing your secure workspace...',
  subtext = 'Initializing modules & cloud sync',
  fullScreen = false
}) => {
  const settings = useMemo(() => {
    try {
      return getCompanySettings();
    } catch {
      return null;
    }
  }, []);

  const companyName = settings?.companyName || 'Inforag Technology';
  const logo = settings?.companyLogo;

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 transition-all ${
        fullScreen
          ? 'fixed inset-0 z-[9999] bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-md min-h-screen'
          : 'min-h-[380px] w-full'
      }`}
    >
      <style>{`
        @keyframes emsShimmerBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>

      <div className="relative flex flex-col items-center max-w-sm w-full mx-auto text-center animate-fade-in">
        {/* Ambient Gradient Glow behind logo */}
        <div className="relative mb-5">
          <div className="absolute -inset-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 rounded-3xl blur-xl opacity-40 dark:opacity-50 animate-pulse" />
          
          {/* Logo container with dual spinner accent ring */}
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl flex items-center justify-center p-3.5">
            {logo ? (
              <img src={logo} alt={companyName} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-inner text-white">
                <Building2 size={28} className="animate-pulse" />
              </div>
            )}
            
            {/* Smooth outer rotating accent ring */}
            <div
              className="absolute -inset-1.5 rounded-[22px] border-2 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin pointer-events-none"
              style={{ animationDuration: '2.5s' }}
            />
          </div>
        </div>

        {/* Company Title */}
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
          {companyName}
        </h2>

        {/* Dynamic status message */}
        <p className="text-xs sm:text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-3.5 flex items-center justify-center gap-1.5">
          <Sparkles size={13} className="text-blue-500 animate-spin" style={{ animationDuration: '4s' }} />
          <span>{message}</span>
        </p>

        {/* Smooth shimmer progress line */}
        <div className="w-44 h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden relative shadow-inner mb-2.5">
          <div
            className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full"
            style={{
              animation: 'emsShimmerBar 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }}
          />
        </div>

        {/* Subtext info */}
        {subtext && (
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 m-0">
            {subtext}
          </p>
        )}

        {/* Micro security badge */}
        <div className="mt-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-[10.5px] font-medium text-slate-500 dark:text-slate-400 shadow-xs">
          <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
          <span>Encrypted Enterprise Session</span>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceLoader;
