# Inforag Management System — Agent Operating Guide

## 🎯 Core Operating Principles

1. **Never read large files blindly** — Use section maps below to target exact line ranges.
2. **Validate syntax after edits** — Run esbuild check after any JSX edit.
3. **No dead code** — If a function/import isn't used, remove it.
4. **Task functionality is primary** — Timer, task status, and work tracking are the most critical features.

---

## 🏗️ What This App Is

**Inforag Management System** is a **fully working Employee & CRM Management Web App**:
- **Frontend**: React + Vite (SPA)
- **Backend**: Express + MongoDB (Render-hosted, 800ms timeout then localStorage fallback)
- **Auth**: Role-based (Admin / HR / Team Member) via `AuthContext` + `hrService`

### 3 Core Roles:
| Role | Access |
|------|--------|
| **Admin** | Full access — all employees, tasks, attendance, leaves, approvals, reports |
| **HR** | Attendance, leaves, employees, holidays, notices, appreciations |
| **Team Member** | Own dashboard, own tasks, own shift, own leaves ONLY |

---

## 🗺️ Full Project File Map

```
Inforag Management System/
├── src/
│   ├── App.jsx                            # All routes (BrowserRouter)
│   ├── main.jsx                           # Vite entry
│   ├── modules/
│   │   ├── auth/pages/LoginPage.jsx
│   │   ├── hr/
│   │   │   ├── context/HRContext.jsx
│   │   │   ├── services/hrService.js      # Backend API + localStorage fallback (805 lines)
│   │   │   ├── components/
│   │   │   │   ├── employees/EmployeeDirectoryModal.jsx
│   │   │   │   └── leaves/NewLeaveModal.jsx
│   │   │   └── pages/
│   │   │       ├── DashboardPage.jsx      (4672 lines) — MAIN HUB
│   │   │       ├── EmployeesPage.jsx
│   │   │       ├── AttendancePage.jsx
│   │   │       ├── LeavesPage.jsx
│   │   │       ├── HolidayPage.jsx
│   │   │       ├── AppreciationPage.jsx
│   │   │       └── DocumentationPage.jsx
│   │   ├── work/
│   │   │   ├── context/WorkContext.jsx    # tasks, projects, timesheets, all timer ops
│   │   │   ├── pages/
│   │   │   │   ├── TasksPage.jsx          PRIMARY FEATURE PAGE
│   │   │   │   ├── ProjectsPage.jsx
│   │   │   │   └── TimesheetPage.jsx
│   │   │   └── components/
│   │   │       ├── tasks/
│   │   │       │   ├── TasksTable.jsx
│   │   │       │   ├── TasksKanban.jsx
│   │   │       │   ├── AddTaskModal.jsx
│   │   │       │   ├── TaskDetailModal.jsx
│   │   │       │   ├── SnoozeTaskModal.jsx
│   │   │       │   └── OverdueTaskModal.jsx
│   │   │       └── projects/ProjectDetailModal.jsx
│   │   ├── crm/
│   │   │   ├── pages/
│   │   │   │   ├── TicketsPage.jsx
│   │   │   │   ├── LeadsPage.jsx
│   │   │   │   ├── MessagesPage.jsx
│   │   │   │   ├── NoticeBoardPage.jsx
│   │   │   │   └── CalendarPage.jsx
│   │   │   └── components/tickets/TicketDetailModal.jsx
│   │   ├── finance/pages/
│   │   │   ├── ExpensesPage.jsx
│   │   │   └── PayrollPage.jsx
│   │   └── settings/pages/SettingsPage.jsx
│   └── shared/
│       ├── context/
│       │   ├── AuthContext.jsx        # currentUser, role, roleConfig, login/logout
│       │   ├── TimerContext.jsx       # shift clock in/out/break, workSeconds (1285 lines)
│       │   ├── CRMContext.jsx         # tickets, notices, events, leads, weeklyTimeLogs (1382 lines)
│       │   └── ToastContext.jsx       # addToast(msg, type)
│       ├── services/
│       │   ├── storageService.js      # getCollection/saveCollection + KEYS map
│       │   ├── companySettingsService.js
│       │   └── roleManagementService.js
│       ├── utils/permissionUtils.js   # ROLES, ROLE_CONFIGS, getUserRole, canApproveLeaves, isHRorAdmin
│       └── components/
│           ├── layout/Layout.jsx      # Sidebar + Topbar shell
│           ├── common/ErrorBoundary.jsx
│           └── modals/ (see modal table below)
└── backend/src/modules/
    ├── hr/controllers/                # attendanceController, leaveController, employeeController
    ├── work/controllers/              # taskController, timesheetController, projectController
    └── shared/middleware/             # auth middleware
```

---

## ⚡ DashboardPage.jsx Section Map (4672 lines total)

| Lines | Section | Key Contents |
|-------|---------|--------------|
| 1-85 | Imports + formatTimeDurationSafe | All lucide icons, context hooks, modal imports |
| 86-185 | Component init + sync | useHR, useWork, useTimer, useCRM, syncTick, event listeners |
| 186-340 | getEmployeeTodayState(emp) | Reads localStorage + attendance to compute live shift state per employee |
| 341-362 | Team stats | teamTodayStates, teamStats, activeEmpState |
| 363-499 | Admin actions | handleAdminClockOut, handleAdminPauseTask, openDayLogModalForUser |
| 500-573 | Task filtering | baseScopedTasks, activeScopedTasks, completedScopedTasks, counts |
| 574-700 | Tickets + display vars | Scoped tickets, effectiveTargetUser, myTasks, displayActiveTask |
| 700-802 | Weekly hours + leave | weeklyTimeLogs, pendingLeaveRequestsForMe, myDecidedLeaves |
| 802-993 | Alert banners JSX | Due reminder banner, leave decision banner |
| 994-1115 | Admin Control Bar | Team shift monitor, employee perspective dropdown, KPI pills |
| 1116-1300 | Welcome Profile Card | Avatar, role badge, shift status |
| 1301-1665 | Shift Clock Card | Clock-in/out button, Tea/Lunch breaks, shift tracker |
| 1666-2000 | Active Timer Card | Running task, start/pause/stop, upcoming queue |
| 2001-2530 | Today's Activity | Punch log, break log, tasks worked today |
| 2531-2730 | Team Live Table (Admin) | All employees live status, 1-click admin actions |
| 2731-3200 | My Tasks + Tickets Table | Tab filters, task rows, ticket rows |
| 3201-3600 | Projects + Leave Approvals | Active projects, pending leave cards |
| 3601-4100 | Notices + Holidays + Birthdays | Company board, upcoming events |
| 4101-4250 | All Modals rendered | DayTimeLogModal, BreakModal, TaskDetailModal, etc. |

---

## 🔑 Storage Keys (KEYS in storageService.js)

```
KEYS.EMPLOYEES        = 'hrms_employees'
KEYS.ATTENDANCE       = 'hrms_attendance'
KEYS.ATTENDANCE_AUDIT = 'ems_attendance_audit_logs'
KEYS.LEAVES           = 'hrms_leaves'
KEYS.HOLIDAYS         = 'hrms_holidays'
KEYS.APPRECIATIONS    = 'hrms_appreciations'
KEYS.TASKS            = 'ems_tasks'
KEYS.TIMESHEETS       = 'ems_timesheets'
KEYS.PROJECTS         = 'ems_projects'
KEYS.TICKETS          = 'ems_tickets'
KEYS.NOTICES          = 'ems_notices'
KEYS.EVENTS           = 'ems_events'
KEYS.LEADS            = 'ems_leads'
KEYS.EXPENSES         = 'ems_expenses'
KEYS.WEEKLY_TIMELOGS  = 'ems_weekly_timelogs'
KEYS.WFH              = 'ems_wfh_employees'
KEYS.CONVERSATIONS    = 'ems_conversations'

Per-employee live timer keys (empKey = employeeCode or _id string):
  ems_timer_${empKey}_is_clocked_in
  ems_timer_${empKey}_is_on_break
  ems_timer_${empKey}_break_type
  ems_timer_${empKey}_work_seconds
  ems_timer_${empKey}_break_seconds
  ems_timer_${empKey}_login_time
  ems_timer_${empKey}_clock_out
  ems_timer_${empKey}_clock_in_timestamp
  ems_active_task_timer_${empKey}

Auth: ems_auth_session
```

---

## 📡 Custom Browser Events (Reactive Sync)

```
'hrms_storage_change'       General storage mutation (detail: {key})
'ems_clocked_in'            Employee clocked in
'ems_clocked_out'           Employee clocked out
'ems_force_clock_out'       Admin forced clock out
'ems_task_timer_started'    Task timer started
'ems_task_timer_paused'     Task timer paused
'ems_task_timer_stopped'    Task timer stopped/completed
'ems_leaves_updated'        Leave status changed
'company-settings-updated'  Company settings changed
```

---

## ✅ Task Lifecycle & Multi-Assignee Architecture (Core Feature)

```
[Created] → [Assigned (1 or Multiple Members)] → [In Progress / Resumed] ⇄ [On Hold / Paused / Snoozed] → [Under Review] → [Completed]
```

### Multi-Assignee Rules (Team Assignment):
- Tasks can be assigned to **any employee**, and can have **1, 2, or more assigned members** (e.g. `assignedToIds: ['emp_1', 'emp_2']`).
- When a task has multiple assignees:
  - Appears in **all** assigned members' dashboards, personal task queues, and task tables.
  - Any assigned member can start/resume timer, pause, or complete the task.
  - Clicking **"Complete"** marks the task finished for the team, records final duration to Timesheets, and updates audit trail.
- Multi-assignee matching is handled uniformly in `WorkContext` (`isTaskAssignedToMe`), `workService` (`getTasks`), and `DashboardPage` (`isTaskAssignedToUser`).

### Task Timer Rules:
- Only 1 active task timer at a time per user
- `startTaskTimer(taskId)` / `resumeTaskTimer(taskId)` → `timerRunning: true`, records `startedAt: Date.now()`, updates status to `'in_progress'`
- `pauseTaskTimer(taskId)` → `timerRunning: false`, merges live elapsed seconds into `accumulatedSeconds` / `timerSeconds`, updates status
- `completeTask(taskId)` → stops active timer, calculates final elapsed seconds, auto-logs to `KEYS.TIMESHEETS`, sets `completedAt` & `completedOn`, updates status to `'completed'`
- Shift Clock-out auto-pauses any active task timer
- Shift Break (Tea / Lunch) auto-pauses task timer
- Timer survives page refresh via wall-clock timestamp: `accumulatedSeconds + Math.floor((Date.now() - startedAt) / 1000)`

### Task Fields That Matter:
```js
{
  _id, taskCode, title, description,
  // Multi-assignees:
  assignedToIds: ['emp_1', 'emp_2'],
  assignees: [
    { _id, name, avatar, role, email, employeeCode }
  ],
  // Single-assignee backwards compatibility:
  assignedTo, assignedToId, assignedToName, assignedToEmail, assignedToAvatar, assignedToRole,
  assignedBy, assignedById, assignedByAvatar, assignedByRole,
  projectId, projectName, projectCode,
  category,
  priority,           // 'low' | 'medium' | 'high' | 'urgent'
  status,             // 'incomplete' | 'in_progress' | 'on_hold' | 'under_review' | 'completed'
  progress,           // 0 to 100
  startDate, dueDate, hasNoDueDate,
  estimatedHours,
  hoursLogged, hoursLoggedText,
  timerRunning,       // Boolean
  timerSeconds,       // Total accumulated seconds
  startedAt,          // ms timestamp of last timer start
  completedAt,        // ISO string when marked complete
  completedOn,        // 'YYYY-MM-DD' date string
  snoozed, remindAt, reminderNote, reminderDismissed
}
```

### Auto-Classification:
```
Overdue:     dueDate < today && !completed && !hasNoDueDate
Due Today:   dueDate === today && !completed
Upcoming:    startDate > today
In Progress: timerRunning || status === 'in_progress'
On Hold:     status === 'on_hold' || snoozed
Completed:   status === 'completed' (isTaskActuallyCompleted checks completedAt too)
```

### ⏱️ Weekly Task Timelogs & Cumulative Duration Architecture (Core Requirement):
- **Task-Driven Calculation**: Week Timelogs (`weeklyTimeLogs`) and Duration are strictly computed from **actual tasks worked**, NOT baseline shift hours.
- **Actual Elapsed Accumulation**: If a task had an estimated time of 1 hour, but took 1:30 (1 hour 30 mins), the full 1:30 is counted and saved to `KEYS.TIMESHEETS`.
- **Additive Next-Task Workflow**:
  - When subsequent tasks are worked on the same day, their durations are added (`+`):
    `Day Total = Task 1 Duration + Task 2 Duration + ... + Active Timer Elapsed`.
  - For example, Task 1 (1h 30m) + Task 2 (1h 00m) = 2h 30m total duration for the day.
- **Week Total Summation**:
  - The weekly total badge (`XXh YYm This Week`) strictly sums all 7 days of the current week:
    `Week Total = Mon Task Hours + Tue Task Hours + Wed Task Hours + Thu Task Hours + Fri Task Hours + Sat Task Hours + Sun Task Hours`.
  - For example, Monday 4h + Tuesday 5h = 9h (+ any active tasks today).
- **Day Selector & Audit**:
  - Clicking any day (`Mo`, `Tu`, `We`, `Th`, `Fr`, `Sa`, `Su`) in `Week Timelogs` instantly displays that day's duration and allows opening `DayTimeLogModal` to view all tasks worked.

---

## 🔐 Shared Modals (src/shared/components/modals/)

| Modal | Used In | Purpose |
|-------|---------|---------|
| BreakModal.jsx | DashboardPage | Break types, start/end break |
| DayTimeLogModal.jsx | DashboardPage | Day activity log viewer |
| EditProfileModal.jsx | DashboardPage | Edit personal profile |
| AddNoticeModal.jsx | Dashboard + NoticeBoardPage | Post company notice |
| NoticeDetailModal.jsx | DashboardPage | View notice details |
| RaiseTicketModal.jsx | DashboardPage | Create support ticket |
| AddEventModal.jsx | CalendarPage | Add calendar event |
| DashboardOverviewModal.jsx | DashboardPage | KPI detail overlay |
| ScreenRecorderModal.jsx | UNUSED — no trigger anywhere | Can be deleted |
| StickyNotesModal.jsx | UNUSED — no trigger anywhere | Can be deleted |

---

## ⚠️ Cleanup Candidates (Unused / Dead Code)

### App.jsx — Route Aliases to Remove:
```
// All render TimesheetPage — keep only 'timesheet', remove these 8:
'timer', 'work-timer', 'timelog', 'timelogs',
'time-tracker', 'time-tracking', 'active-timer', 'time', 'timesheets'

// All render AttendancePage — keep only 'attendance', remove these 4:
'attendance-clock', 'clock', 'clock-in', 'break', 'breaks'
```

### DashboardPage.jsx — Dead Variables (safe to remove):
- calendarView state (line ~159) — declared, never changes, never drives UI
- todayDisplayTasks (line ~615) — alias of myTasks, never referenced after assignment
- stableLoggedTodaySecs (line ~681) — alias of totalTaskTodaySecs
- totalActivityFormatted (line ~687) — alias of stableActivityFormatted
- activeProjectsCount uses `|| 1` — always shows 1 even when 0 projects exist

---

## 🏛️ Core Architecture Rules

### 1. Role Scope Isolation
- Employee sees ONLY own data — zero leakage to other employee records
- Admin/HR use perspective switcher (selectedAdminEmpId) in dashboard
- Gate all cross-employee data behind isUserAdminOrHR check
- Leave applicant can never approve own leave (enforced in hrService.getLeaves)

### 2. Hybrid Data Layer
- All HR/attendance/leave ops through hrService.xxx()
- All task/project/timesheet ops through WorkContext
- Backend timeout 800ms then localStorage fallback
- hrBackendOnline flag cached 25s between checks

### 3. Real-Time Sync Pattern
- setInterval(1000ms) in DashboardPage drives syncTick state
- Storage writes dispatch hrms_storage_change custom event
- All pages listen and re-render on these events
- Native window storage event handles multi-tab sync

### 4. Shift Clock vs Task Timer (Separate Systems)
- Shift Clock (TimerContext) = total wall-clock time at work (gross minus breaks)
- Task Timer (WorkContext) = time spent on specific task
- workDurationText = net shift time | timerSeconds = task elapsed time
- Both pause on clock-out

### 5. Leave to Attendance Integration
- Approved leave auto-creates attendance records with status: 'on_leave'
- Leave balance auto-deducted in hrService.updateLeaveStatus
- Audit trail written to KEYS.ATTENDANCE_AUDIT

---

## 🚀 Dev Commands

```bash
# Frontend dev server
npm run dev                   # http://localhost:5173

# Backend dev server
cd backend && npm run dev      # http://localhost:5000

# Validate JSX syntax after edits
node -e "const esbuild = require('esbuild'); esbuild.transformSync(require('fs').readFileSync('src/modules/hr/pages/DashboardPage.jsx', 'utf8'), { loader: 'jsx' });"
```

---

## 🎯 Task Feature Next Steps (Priority Order)

1. Timer accuracy — startEpoch-based live ticking, correct accumulatedSeconds merge on pause
2. Status transitions — Visual pipeline with audit trail on each transition
3. Admin task delegation — Employee picker dropdown in AddTaskModal
4. Overdue badge — Auto red badge: dueDate < today && !completed
5. Snooze/Remind — remindAt countdown, dismiss + re-snooze action buttons
6. TasksPage full CRUD — Wire TasksTable.jsx + TasksKanban.jsx toggle
7. Timesheet auto-log — On stopTaskTimer, auto-create entry in KEYS.TIMESHEETS
