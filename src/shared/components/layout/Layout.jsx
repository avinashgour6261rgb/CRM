import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { useAuth } from '../../context/AuthContext';
import { useHR } from '../../../modules/hr/context/HRContext';
import { useCRM } from '../../context/CRMContext';
import { useUserShiftStatus } from '../../../modules/crm/utils/useUserShiftStatus';
import { IncomingCallModal } from '../../../modules/crm/components/messages/IncomingCallModal';
import { IncomingScreenShareModal } from '../../../modules/crm/components/messages/IncomingScreenShareModal';
import { ringtoneService } from '../../../modules/crm/utils/ringtoneService';
import { emitSocketEvent } from '../../services/socketService';
import { canAccessModule } from '../../utils/permissionUtils';
import { playTimerChime } from '../../utils/soundUtils';

// Map protected URL paths to their RBAC module key
const getRequiredModuleForPath = (pathname) => {
  const p = String(pathname || '').toLowerCase();
  if (p.startsWith('/employees') || p.startsWith('/team-directory') || p === '/team') return 'employees';
  if (p.startsWith('/team-operations') || p.startsWith('/operations')) return 'liveOperations';
  if (p.startsWith('/leads') || p.startsWith('/lead-contact')) return 'leads';
  if (p.startsWith('/leaves')) return 'leaves';
  if (p.startsWith('/attendance')) return 'attendance';
  if (p.startsWith('/appreciation')) return 'appreciation';
  if (p.startsWith('/documents') || p.startsWith('/documentation')) return 'documentation';
  if (p.startsWith('/projects')) return 'projects';
  if (p.startsWith('/tasks') || p.startsWith('/timesheet')) return 'tasks';
  if (p.startsWith('/payroll') || p.startsWith('/payslips') || p.startsWith('/finance/payroll')) return 'payroll';
  if (p.startsWith('/expenses') || p.startsWith('/finance')) return 'expenses';
  if (p.startsWith('/tickets')) return 'tickets';
  if (p.startsWith('/events') || p.startsWith('/calendar')) return 'events';
  return null;
};

export const Layout = () => {
  const { currentUser: authUser, isAuthenticated } = useAuth();
  const { employees = [] } = useHR() || {};
  const { setActiveConversationId, sendMessage } = useCRM() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [permTick, setPermTick] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingScreenShare, setIncomingScreenShare] = useState(null);

  // Auto-close mobile drawer when location / route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Subtle Web Audio chimes on shift & task timer events (respects Settings -> Timer Audio Chimes)
  useEffect(() => {
    const onStart = () => playTimerChime('start');
    const onPause = () => playTimerChime('pause');
    const onStop = () => playTimerChime('stop');
    window.addEventListener('ems_clocked_in', onStart);
    window.addEventListener('ems_clocked_out', onStop);
    window.addEventListener('ems_task_timer_started', onStart);
    window.addEventListener('ems_task_timer_paused', onPause);
    window.addEventListener('ems_task_timer_stopped', onStop);
    return () => {
      window.removeEventListener('ems_clocked_in', onStart);
      window.removeEventListener('ems_clocked_out', onStop);
      window.removeEventListener('ems_task_timer_started', onStart);
      window.removeEventListener('ems_task_timer_paused', onPause);
      window.removeEventListener('ems_task_timer_stopped', onStop);
    };
  }, []);

  // Re-evaluate route access immediately whenever permissions change live
  useEffect(() => {
    const bump = () => setPermTick(t => t + 1);
    window.addEventListener('ems_permissions_updated', bump);
    window.addEventListener('hrms_storage_change', bump);
    return () => {
      window.removeEventListener('ems_permissions_updated', bump);
      window.removeEventListener('hrms_storage_change', bump);
    };
  }, []);

  const effectiveUser = useMemo(() => {
    if (!authUser) return null;
    const matched = (employees || []).find(e =>
      (authUser._id && String(e._id) === String(authUser._id)) ||
      (authUser.employeeCode && String(e.employeeCode).toUpperCase() === String(authUser.employeeCode).toUpperCase())
    );
    if (!matched) return authUser;
    const hasAuthPerms = authUser.permissions && Object.keys(authUser.permissions).length > 0;
    const hasDbPerms = matched.permissions && Object.keys(matched.permissions).length > 0;
    return {
      ...authUser,
      ...matched,
      permissions: hasDbPerms ? matched.permissions : (hasAuthPerms ? authUser.permissions : {}),
      systemRole: matched.systemRole || authUser.systemRole,
      isDelegatedAdmin: matched.isDelegatedAdmin !== undefined ? Boolean(matched.isDelegatedAdmin) : Boolean(authUser.isDelegatedAdmin)
    };
  }, [authUser, employees, permTick]);

  const shiftStatus = useUserShiftStatus(effectiveUser);

  // 📞 WhatsApp-Style Incoming Voice Call Listener (App-Wide Ringing & Chime)
  useEffect(() => {
    const handleIncoming = (e) => {
      const callData = e.detail;
      if (!callData) return;
      const myId = String(effectiveUser?._id || effectiveUser?.id || effectiveUser?.employeeCode || '');
      const callerId = String(callData.caller?.id || '');

      // Never ring oneself
      if (callerId && callerId === myId) return;

      // Shift gate check: must be clocked in and not on break
      if (!shiftStatus.isClockedIn || shiftStatus.isOnBreak) {
        emitSocketEvent('call:decline', {
          callId: callData.callId,
          conversationId: callData.conversationId,
          callerSocketId: callData.callerSocketId,
          callerId: callData.caller?.id,
          decliner: { id: myId, name: effectiveUser?.name || 'Teammate' },
          reason: shiftStatus.isOnBreak ? 'Recipient is on Break' : 'Recipient is Clocked Out'
        });
        return;
      }

      setIncomingCall(callData);
      ringtoneService.startIncomingRingtone();
    };

    const handleCancelledOrEnded = (e) => {
      const callData = e.detail;
      const matches =
        !incomingCall ||
        !callData?.callId ||
        callData.callId === incomingCall.callId ||
        (callData.conversationId && incomingCall.conversationId && String(callData.conversationId) === String(incomingCall.conversationId));

      if (matches) {
        ringtoneService.stop();
        setIncomingCall(null);
      }
    };

    window.addEventListener('ems_call_incoming', handleIncoming);
    window.addEventListener('ems_call_cancelled', handleCancelledOrEnded);
    window.addEventListener('ems_call_ended', handleCancelledOrEnded);

    return () => {
      window.removeEventListener('ems_call_incoming', handleIncoming);
      window.removeEventListener('ems_call_cancelled', handleCancelledOrEnded);
      window.removeEventListener('ems_call_ended', handleCancelledOrEnded);
    };
  }, [effectiveUser, shiftStatus, incomingCall]);

  // 🖥️ Live Incoming Screen Share Alert Listener
  useEffect(() => {
    const handleScreenStarted = (e) => {
      const screenData = e.detail;
      if (!screenData) return;
      const myId = String(effectiveUser?._id || effectiveUser?.id || effectiveUser?.employeeCode || '');
      const hostId = String(screenData.host?.id || '');

      // Don't alert the host
      if (hostId && hostId === myId) return;

      // Must be clocked in
      if (!shiftStatus.isClockedIn) return;

      setIncomingScreenShare(screenData);
    };

    const handleScreenStopped = (e) => {
      const screenData = e.detail;
      if (!incomingScreenShare || !screenData?.conversationId || screenData.conversationId === incomingScreenShare.conversationId) {
        setIncomingScreenShare(null);
      }
    };

    window.addEventListener('ems_screen_started', handleScreenStarted);
    window.addEventListener('ems_screen_stopped', handleScreenStopped);

    return () => {
      window.removeEventListener('ems_screen_started', handleScreenStarted);
      window.removeEventListener('ems_screen_stopped', handleScreenStopped);
    };
  }, [effectiveUser, shiftStatus, incomingScreenShare]);

  const handleWatchIncomingScreen = () => {
    if (!incomingScreenShare) return;
    const targetConvId = incomingScreenShare.conversationId;
    try {
      sessionStorage.setItem('ems_pending_watch_screen', JSON.stringify(incomingScreenShare));
    } catch (_) {}

    if (targetConvId && setActiveConversationId) {
      setActiveConversationId(targetConvId);
    }
    setIncomingScreenShare(null);
    if (!location.pathname.startsWith('/messages')) {
      navigate('/messages');
    }
  };

  const handleAcceptIncomingCall = () => {
    if (!incomingCall) return;
    ringtoneService.stop();
    ringtoneService.unlock();
    try {
      const dummy = new Audio();
      dummy.play().catch(() => {});
    } catch (_) {}

    const myId = String(effectiveUser?._id || effectiveUser?.id || effectiveUser?.employeeCode || '');
    emitSocketEvent('call:accept', {
      callId: incomingCall.callId,
      conversationId: incomingCall.conversationId,
      callerSocketId: incomingCall.callerSocketId,
      callerId: incomingCall.caller?.id,
      acceptor: {
        id: myId,
        name: effectiveUser?.name || 'Teammate',
        avatar: effectiveUser?.avatar || '',
        role: effectiveUser?.role || 'Team Member'
      }
    });

    const targetConvId = incomingCall.conversationId;
    try {
      sessionStorage.setItem('ems_pending_accepted_call', JSON.stringify({
        ...incomingCall,
        acceptedAt: Date.now()
      }));
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('ems_call_user_accepted', {
      detail: { ...incomingCall, acceptedAt: Date.now() }
    }));

    setIncomingCall(null);
    if (targetConvId && setActiveConversationId) {
      setActiveConversationId(targetConvId);
    }
    if (!location.pathname.startsWith('/messages')) {
      navigate('/messages');
    }
  };

  const handleDeclineIncomingCall = () => {
    if (!incomingCall) return;
    ringtoneService.stop();
    ringtoneService.playCallEndTone();

    const myId = String(effectiveUser?._id || effectiveUser?.id || effectiveUser?.employeeCode || '');
    emitSocketEvent('call:decline', {
      callId: incomingCall.callId,
      conversationId: incomingCall.conversationId,
      callerSocketId: incomingCall.callerSocketId,
      callerId: incomingCall.caller?.id,
      decliner: {
        id: myId,
        name: effectiveUser?.name || 'Teammate'
      },
      reason: 'User declined'
    });

    if (incomingCall.conversationId && sendMessage) {
      sendMessage(incomingCall.conversationId, '📞 Call Declined');
    }
    setIncomingCall(null);
  };

  if (!authUser || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const requiredModule = getRequiredModuleForPath(location.pathname);
  const hasRouteAccess = !requiredModule || canAccessModule(effectiveUser, requiredModule);

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950 overflow-x-hidden relative">
      {/* Mobile Drawer Backdrop overlay to tap anywhere to dismiss sidebar */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[140] lg:hidden animate-fade-in transition-opacity cursor-pointer"
          title="Click to close menu"
          aria-label="Close menu backdrop"
        />
      )}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden bg-slate-100 dark:bg-slate-950">
        <TopNavbar
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        />
        <main className="flex-1 p-3.5 sm:p-5 md:px-6 md:py-5 max-w-[1680px] w-full mx-auto box-border min-w-0">
          {hasRouteAccess ? (
            <Outlet />
          ) : (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
              <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-200 dark:border-amber-800">
                  <ShieldAlert size={24} />
                </div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
                  Access Restricted
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-4 leading-relaxed">
                  You currently do not have permission to access this module. Please contact your Administrator if you need access enabled.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard', { replace: true })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 cursor-pointer transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Dashboard</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 📞 WhatsApp-Style Global Incoming Live Voice Call Modal */}
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

      {/* 🖥️ Global Incoming Live Screen Share Alert Modal */}
      <IncomingScreenShareModal
        incomingSession={incomingScreenShare}
        onWatch={handleWatchIncomingScreen}
        onDismiss={() => setIncomingScreenShare(null)}
      />
    </div>
  );
};
