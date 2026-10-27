import React from 'react';
import {
  Users,
  UserCheck,
  Palmtree,
  Clock,
  Play,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  Calendar as CalendarIcon
} from 'lucide-react';

export const DashboardKpiStrip = ({
  isUserAdminOrHR,
  isViewingOtherEmployee,
  navigate,
  employees = [],
  teamStats = {},
  employeesOnLeave = [],
  allInProgressTasksCount = 0,
  allPendingTasksCount = 0,
  allOverdueTasksCount = 0,
  allCompletedTodayCount = 0,
  setPendingTasksModalFilter,
  setIsPendingTasksModalOpen,
  totalTaskTodaySecs = 0,
  displayedWorkDuration = '0h 0m',
  displayActiveTask = null,
  taskStatusTab = 'pending',
  setTaskStatusTab,
  myPendingTasks = [],
  myDueTodayTasksCount = 0,
  overdueTasksCount = 0,
  myCompletedTodayCount = 0,
  currentUser = null
}) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: '10px'
    }}>
      {isUserAdminOrHR && !isViewingOtherEmployee ? (
        <>
          <div
            onClick={() => navigate('/team-operations')}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
            title="Click to open Live Operations"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Total Team</span>
              <Users size={13} color="#0284c7" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              {(employees || []).length}
            </div>
          </div>

          <div
            onClick={() => navigate('/attendance')}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
            title="Click to view Attendance"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Present Today</span>
              <UserCheck size={13} color="#16a34a" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>
              {teamStats.present || 0}
            </div>
          </div>

          <div
            onClick={() => navigate('/leaves')}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
            title="Click to open Leave Requests"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>On Leave</span>
              <Palmtree size={13} color="#d97706" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>
              {employeesOnLeave.length}
            </div>
          </div>

          <div
            onClick={() => navigate('/team-operations')}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
            title="Click to view Live Operations"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Working Now</span>
              <Clock size={13} color="#2563eb" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>
              {teamStats.clockedIn}
            </div>
          </div>

          <div
            onClick={() => navigate('/tasks')}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
            title="Click to open Tasks Board"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>In Progress</span>
              <Play size={13} color="#2563eb" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>
              {allInProgressTasksCount}
            </div>
          </div>

          <div
            onClick={() => {
              setPendingTasksModalFilter('all');
              setIsPendingTasksModalOpen(true);
            }}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
            title="Click to view all pending tasks list"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Pending</span>
              <Clock size={13} color="#d97706" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>
              {allPendingTasksCount}
            </div>
          </div>

          <div
            onClick={() => {
              setPendingTasksModalFilter('overdue');
              setIsPendingTasksModalOpen(true);
            }}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
            title="Click to view overdue tasks"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700' }}>Overdue 🔥</span>
              <AlertCircle size={13} color="#dc2626" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#dc2626' }}>
              {allOverdueTasksCount}
            </div>
          </div>

          <div
            onClick={() => navigate('/tasks')}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
            title="Click to open Tasks Board"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Done Today</span>
              <CheckCircle2 size={13} color="#16a34a" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>
              {allCompletedTodayCount}
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Today's Time</span>
              <Clock size={13} color="#0284c7" />
            </div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              {totalTaskTodaySecs > 0
                ? (totalTaskTodaySecs < 60 ? `${totalTaskTodaySecs}s` : `${Math.floor(totalTaskTodaySecs / 3600)}h ${String(Math.floor((totalTaskTodaySecs % 3600) / 60)).padStart(2, '0')}m`)
                : (displayedWorkDuration || '0h 0m')}
            </div>
          </div>

          <div
            onClick={() => document.getElementById('active-timer-card')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            title="Active Task"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Active Task</span>
              <Play size={13} color="#7c3aed" />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#7c3aed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayActiveTask ? `#${displayActiveTask.taskCode || 'TSK'}` : 'None'}
            </div>
          </div>

          <div
            onClick={() => {
              if (setTaskStatusTab) setTaskStatusTab('pending');
              document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              backgroundColor: taskStatusTab === 'pending' ? '#fffbeb' : '#ffffff',
              border: taskStatusTab === 'pending' ? '1px solid #d97706' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            title="Click to view Pending tasks"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>My Pending</span>
              <ListTodo size={13} color="#d97706" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>
              {myPendingTasks.length}
            </div>
          </div>

          <div
            onClick={() => {
              if (setTaskStatusTab) setTaskStatusTab('due_today');
              document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              backgroundColor: taskStatusTab === 'due_today' ? '#fae8ff' : '#ffffff',
              border: taskStatusTab === 'due_today' ? '1px solid #c026d3' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            title="Click to view tasks Due Today"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Due Today</span>
              <CalendarIcon size={13} color="#c026d3" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#c026d3' }}>
              {myDueTodayTasksCount}
            </div>
          </div>

          <div
            onClick={() => {
              if (setTaskStatusTab) setTaskStatusTab('overdue');
              document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              backgroundColor: taskStatusTab === 'overdue' ? '#fef2f2' : '#ffffff',
              border: taskStatusTab === 'overdue' ? '1px solid #dc2626' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            title="Click to view Overdue tasks 🔥"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700' }}>Overdue 🔥</span>
              <AlertCircle size={13} color="#dc2626" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#dc2626' }}>
              {overdueTasksCount}
            </div>
          </div>

          <div
            onClick={() => {
              if (setTaskStatusTab) setTaskStatusTab('completed');
              document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              backgroundColor: taskStatusTab === 'completed' ? '#f0fdf4' : '#ffffff',
              border: taskStatusTab === 'completed' ? '1px solid #16a34a' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            title="Click to view Completed tasks"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Done Today</span>
              <CheckCircle2 size={13} color="#16a34a" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>
              {myCompletedTodayCount}
            </div>
          </div>

          <div
            onClick={() => navigate('/leaves')}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
            title="Click to view Leaves"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Leave Balance</span>
              <Palmtree size={13} color="#059669" />
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669' }}>
              {currentUser?.leaveBalance ? (
                (Number(currentUser.leaveBalance.casual) || 0) +
                (Number(currentUser.leaveBalance.sick) || 0) +
                (Number(currentUser.leaveBalance.earned) || 0)
              ) : 35} Days
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              CL: {currentUser?.leaveBalance?.casual ?? 10} • SL: {currentUser?.leaveBalance?.sick ?? 8} • EL: {currentUser?.leaveBalance?.earned ?? 15}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
