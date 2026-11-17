# 🚀 Inforag Management System (EMS & CRM) — Ralph Loop Master Prompt & Specification

> **Target Agent**: Ralph Loop / Autonomous Coding Agent  
> **Repository**: `Inforag Management System`  
> **Tech Stack**: React 18, Vite, Tailwind CSS, Lucide Icons, Express.js, MongoDB (Atlas), Socket.IO  
> **Primary Goal**: Complete stabilization, real-time cross-browser synchronization, task timer mathematical integrity, strict role-based access control (RBAC), and robust CRM & HRMS module execution.

---

## 📋 Executive Overview & Core Problem Statement

The **Inforag Management System** is a full-featured Employee Management System (EMS) and Customer Relationship Management (CRM) platform supporting **Administrator**, **HR Manager**, and **Team Member** roles.

Recent user testing across multiple devices and browsers revealed 5 critical architectural challenges that must be permanently resolved by Ralph Loop:
1. **The 14-Hour Runaway Cap**: Task timers suddenly jumped to `14:00:00` (50,400 seconds) due to stale timestamp fallback to midnight (`Date.now() - midnight`) clamped at `14 * 3600`.
2. **Cross-Browser Sync Failure on Admin Force Clock-Out**: When Admin forces clock-out on Browser 1, Browser 2 continues showing the employee as "Clocked In" because local mirror storage keys and telemetry maps are not immediately synchronized.
3. **Header vs Table Time Discrepancy**: Top header timer showed `04:17:14` while the Tasks Table row showed `04:53:18` due to multiple uncoordinated sources of truth reading active timer snapshots vs raw database documents.
4. **Pause-Resume Reset to 0**: Pausing and resuming a task that was created on a previous date erroneously reset today's tracked work seconds to 0 due to an overly aggressive guard in `timerUtils.js` (`if (todayVal === lifetime && task.startDate < targetDate) baseSecs = 0`).
5. **Cross-User Timesheet Leakage**: Tasks worked by employees (e.g. Sandeep Meena's TSK-8) were erroneously auto-saved to Administrator's activity log and timesheets with the memo `"Shift clock-out auto-save"`.

---

## 🏛️ Core Architecture Principles (NON-NEGOTIABLE)

### 1. Single Source of Truth (SSOT)
- **All task time calculations** must pass through `getTaskTodaySeconds` in `src/shared/utils/timerUtils.js`.
- Never calculate task elapsed seconds independently in UI components (`TopNavbar`, `TasksTable`, `WeeklyTimeLogsCard`, `DashboardPage`).
- Shift Clock (`TimerContext`) and Task Timer (`WorkContext`) are **strictly decoupled**:
  - Shift Clock = Total net presence during working hours (Gross minus breaks).
  - Task Timer = Time dedicated to a specific task.
  - A task timer cannot run if the user is clocked out or on break, but task time must NEVER simply duplicate shift time.

### 2. Multi-Day Rollover & Date-Partitioned Sessions
- Tasks worked across multiple calendar days must maintain granular daily breakdown via `task.dailySessions[YYYY-MM-DD]`.
- Work done on previous days (e.g., yesterday 4h) must **NEVER** leak into today's logged hours.
- Completing a task today must strictly record today's elapsed seconds to today's timesheet without inflating today's day log with yesterday's work.
- When an employee pauses and resumes a task today, the timer must resume **from the exact accumulated seconds of today**, never resetting to 0 and never duplicating prior sessions.

### 3. Cross-Browser & Multi-Device Real-Time Sync (0ms Latency)
- All shift and task state changes (`clock-in`, `clock-out`, `force-clock-out`, `break-start`, `break-end`, `task-start`, `task-pause`, `task-stop`) must be broadcast via **Socket.IO** (`sync:event`, `attendance:force_clock_out`, `task:updated`, `employee:permissions:updated`).
- Incoming socket events must:
  1. Update target employee's localStorage mirror keys (`ems_timer_${empKey}_*`) immediately.
  2. Update `liveTelemetryMap` in `DashboardPage` without waiting for the 20-second polling interval.
  3. Reload `attendance` / `tasks` collections in `HRContext` and `WorkContext`.

### 4. Strict Role-Based Scope & Privacy Isolation
- **Team Member**: Sees ONLY own tasks, own shift, own attendance, own leaves, and assigned tickets. Zero data leakage of other team members' private tasks.
- **HR Manager**: Manages company-wide attendance, leaves, employees, notices, and appreciations. Cannot view private tasks of others unless assigned.
- **Administrator**: Full system visibility, team shift monitoring, employee perspective switcher, and permission delegation.
- **Permission Delegation**: When Admin grants an employee permissions (e.g. `viewAllAttendance`, `viewAllTasks`, `manageEmployees`), the toggle in `RoleManagementModal` must save to MongoDB, emit `employee:permissions:updated`, and update the employee's browser session with 0ms delay.

---

## 🗺️ Project Structure Map

```
Inforag Management System/
├── src/
│   ├── App.jsx                                # React Router definitions
│   ├── main.jsx                               # Vite entry
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── context/AuthContext.jsx        # Authentication, session, active role
│   │   │   └── pages/LoginPage.jsx
│   │   ├── hr/
│   │   │   ├── context/HRContext.jsx          # Employees, leaves, attendance, holidays
│   │   │   ├── services/hrService.js          # REST API + localStorage fallback
│   │   │   └── pages/
│   │   │       ├── DashboardPage.jsx          # Main operations hub (Live shift table, cards)
│   │   │       ├── AttendancePage.jsx         # Attendance matrix & punch timeline
│   │   │       ├── EmployeesPage.jsx          # Employee directory & role management
│   │   │       ├── LeavesPage.jsx             # Leave applications & approval workflows
│   │   │       └── HolidayPage.jsx
│   │   ├── work/
│   │   │   ├── context/WorkContext.jsx        # Tasks, projects, timesheets, timer ticking loop
│   │   │   ├── services/workService.js
│   │   │   ├── pages/
│   │   │   │   ├── TasksPage.jsx              # Main Tasks Table & Kanban views
│   │   │   │   ├── ProjectsPage.jsx           # Projects management
│   │   │   │   └── TimesheetPage.jsx          # Timesheet logging & export
│   │   │   └── components/tasks/
│   │   │       ├── TasksTable.jsx             # Table with live timer pills
│   │   │       ├── TasksKanban.jsx            # Drag-and-drop / stage pipeline
│   │   │       ├── AddTaskModal.jsx           # Task creation & multi-assignee picker
│   │   │       └── TaskDetailModal.jsx
│   │   └── crm/
│   │       ├── pages/
│   │       │   ├── TicketsPage.jsx            # Support ticket system
│   │       │   ├── LeadsPage.jsx              # Lead contact management
│   │       │   ├── MessagesPage.jsx           # Internal real-time team chat
│   │       │   └── NoticeBoardPage.jsx        # Company announcements
│   └── shared/
│       ├── context/
│       │   ├── TimerContext.jsx               # Shift clock in/out, break management
│       │   ├── CRMContext.jsx                 # Tickets, notices, leads
│       │   └── ToastContext.jsx               # Toast notifications
│       ├── services/
│       │   ├── storageService.js              # LocalStorage collections (KEYS)
│       │   ├── realtimeSyncService.js         # Socket.IO & BroadcastChannel relay
│       │   └── roleManagementService.js       # Permission overrides storage
│       ├── utils/
│       │   ├── timerUtils.js                  # SSOT calculation engine (getTaskTodaySeconds)
│       │   └── permissionUtils.js             # RBAC checks (canViewAllTasks, isHRorAdmin)
│       └── components/
│           ├── layout/
│           │   ├── TopNavbar.jsx              # Header with live Task & Shift pills
│           │   ├── Sidebar.jsx                # Navigation menu
│           │   └── Layout.jsx
│           └── modals/
│               ├── DayTimeLogModal.jsx        # Daily punch & task breakdown modal
│               └── BreakModal.jsx             # Tea / Lunch break modal
└── backend/
    ├── src/
    │   ├── server.js                          # Express & Socket.IO server
    │   ├── modules/
    │   │   ├── hr/controllers/attendanceController.js
    │   │   ├── work/controllers/taskController.js
    │   │   └── work/controllers/timesheetController.js
    │   └── shared/socket/socketManager.js     # Socket broadcasting engine
```

---

## 🛠️ Step-by-Step Execution Plan for Ralph Loop

### Phase 1: Math & Timer Engine Stabilization (`timerUtils.js` & `WorkContext.jsx`)
- [ ] **Remove 14-Hour Runaway Clamp**:
  - In `src/shared/utils/timerUtils.js` line ~484 and `src/modules/work/context/WorkContext.jsx` lines ~1148-1166:
    - Replace `Math.min(..., 14 * 3600)` with logical validation.
    - If `task.startedAt` is not a valid timestamp from today (`!task.startedAt || task.startedAt < todayMidnightMs || task.startedAt > now`), treat today's live elapsed seconds as `0` rather than defaulting to midnight.
- [ ] **Fix Pause-Resume Reset to 0**:
  - In `src/shared/utils/timerUtils.js` lines ~450-465:
    - Remove the erroneous check: `if (todayVal === lifetime && task.startDate && task.startDate < targetDate && !task.timerRunning) baseSecs = 0;`.
    - Ensure that when a task was worked on today, `task.dailySessions[today]` or `task.todayWorkSeconds` is ALWAYS preserved upon pause and properly resumed.
- [ ] **Coordinate Header and Table Timer**:
  - Ensure `TopNavbar.jsx` and `TasksTable.jsx` both read the exact same `task.todayWorkSeconds` computed by `WorkContext.jsx`.
  - Guarantee that `activeRunningTask.todayWorkSeconds` and the table row for that task show the identical HH:MM:SS string.

### Phase 2: Cross-Browser Real-Time Sync (`realtimeSyncService.js` & `DashboardPage.jsx`)
- [ ] **Immediate Mirror Key Updates on Socket Event**:
  - In `src/shared/services/realtimeSyncService.js`:
    - On receiving `attendance:force_clock_out`:
      - Extract `employeeId` and `employeeCode`.
      - Set `ems_timer_${empKey}_clock_out = logoutTime`, `ems_timer_${empKey}_is_clocked_in = 'false'`, `ems_timer_${empKey}_had_clocked_out = 'true'` in localStorage.
      - Dispatch `ems_telemetry_update` event so `DashboardPage` updates `liveTelemetryMap` instantly without 20s delay.
- [ ] **Immediate Attendance Reload**:
  - In `src/modules/hr/context/HRContext.jsx`:
    - Add listener for `ems_force_clock_out` to immediately execute `loadData(true)` to pull latest attendance from MongoDB.

### Phase 3: Prevent Cross-User Timesheet Leakage (`timesheetController.js` & `DashboardPage.jsx`)
- [ ] **Strict Assignee Guard on Auto-Save**:
  - In `src/modules/work/context/WorkContext.jsx` line ~1080:
    - Verify that when shift clock-out pauses a running task, the timesheet is logged ONLY for the task's actual assigned employee (`matchedTask.assignedToId` / `assignedToName`), NEVER for the Administrator unless Admin was the designated assignee.
  - In `backend/src/modules/work/controllers/timesheetController.js`:
    - Enforce that `employeeId` matches task `assignedToId` on auto-saves.

### Phase 4: Role-Based Access Control (RBAC) & Dynamic Toggles
- [ ] **Permissions Delegation Persistence**:
  - In `src/modules/hr/pages/EmployeesPage.jsx` and `RoleManagementModal`:
    - Ensure permission updates persist to MongoDB `/api/employees/:id/permissions`.
    - Broadcast `employee:permissions:updated` via Socket.IO so the target employee's browser immediately receives access without logging out.
  - In `src/shared/utils/permissionUtils.js`:
    - Verify that `canViewAllTasks`, `canViewAllAttendance`, `canApproveLeaves`, and `canManageEmployees` correctly evaluate both base roles and dynamic permission overrides.

### Phase 5: Verification & Quality Assurance
- [ ] **JSX Syntax Validation**:
  - Run:
    ```bash
    node -e "const esbuild = require('esbuild'); esbuild.transformSync(require('fs').readFileSync('src/modules/hr/pages/DashboardPage.jsx', 'utf8'), { loader: 'jsx' }); console.log('Syntax OK');"
    ```
- [ ] **Production Build Check**:
  - Run:
    ```bash
    npm run build
    ```
  - Verify that `vite build` completes with exit code 0.
- [ ] **End-to-End Functional Test Matrix**:
  - Clock in Employee 1 in Browser 1.
  - Clock in Admin in Browser 2.
  - Start Task TSK-7 in Browser 2. Confirm Header and Table show identical ticking seconds.
  - Pause Task TSK-7 and resume. Confirm it does NOT reset to 0:00:00.
  - In Browser 2, click "Force Clock Out" on Employee 1. Confirm Browser 1 immediately reflects "Shift Clocked Out" without page reload.
  - Check Admin's Attendance & Activity Log (DayTimeLogModal). Confirm Employee 1's tasks do NOT appear in Admin's activity log.

---

## ⚡ Developer Execution Commands

```bash
# Install dependencies
npm install

# Run frontend development server
npm run dev

# Run backend server
cd backend && npm run dev

# Verify clean production build
npm run build
```

---
*Generated for Ralph Loop Autonomous Implementation — Inforag Management System.*
