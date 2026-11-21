/**
 * @file handoverService.js
 * @description Work & Asset Handover Engine for Resigning, Relieved, or Transferred Employees.
 * Gathers pending tasks, active leads, ongoing projects, and open tickets,
 * and transfers them to a designated successor with audit logging and notifications.
 */

import { getCollection, saveCollection, KEYS } from '../../../shared/services/storageService';
import { hrService } from './hrService';
import { getLocalDateString } from '../../../shared/utils/timerUtils';
import { API_BASE, getAuthHeaders } from '../../../shared/config/apiConfig';

/**
 * Scan all pending work and active assets belonging to an employee
 */
export const getEmployeePendingAssets = (employee) => {
  if (!employee) return { tasks: [], leads: [], projects: [], tickets: [], totalCount: 0 };

  const empId = String(employee._id || employee.id || employee.employeeId || '');
  const empCode = String(employee.employeeCode || '').toUpperCase();
  const empName = (employee.name || employee.employeeName || '').toLowerCase().trim();

  const matchesEmp = (id, code, name) => {
    if (empId && String(id) === empId) return true;
    if (empCode && String(code || id).toUpperCase() === empCode) return true;
    if (empName && String(name || '').toLowerCase().trim() === empName) return true;
    return false;
  };

  // 1. Pending / Incomplete Tasks
  const allTasks = getCollection(KEYS.TASKS) || [];
  const pendingTasks = allTasks.filter(t => {
    if (t.status === 'completed') return false;
    // Check single assignee
    if (matchesEmp(t.assignedToId, t.assignedToCode, t.assignedToName) || matchesEmp(t.assignedTo, null, t.assignedToName)) {
      return true;
    }
    // Check multi-assignees
    if (Array.isArray(t.assignedToIds) && t.assignedToIds.some(id => matchesEmp(id, id, null))) {
      return true;
    }
    if (Array.isArray(t.assignees) && t.assignees.some(a => matchesEmp(a._id || a.id, a.employeeCode, a.name))) {
      return true;
    }
    return false;
  });

  // 2. Active Leads (not won/lost)
  const allLeads = getCollection(KEYS.LEADS) || [];
  const activeLeads = allLeads.filter(l => {
    if (l.status === 'converted' || l.status === 'lost') return false;
    if (matchesEmp(l.leadOwnerId, l.leadOwnerCode, l.leadOwnerName)) return true;
    if (matchesEmp(l.assignedToId, l.assignedToCode, l.assignedToName)) return true;
    if (matchesEmp(l.ownerId, null, l.owner || l.leadOwnerName)) return true;
    return false;
  });

  // 3. Ongoing Projects
  const allProjects = getCollection(KEYS.PROJECTS) || [];
  const ongoingProjects = allProjects.filter(p => {
    if (p.status === 'completed' && p.finalApproved) return false;
    // Manager
    if (matchesEmp(p.projectManagerId, p.projectManagerCode, p.projectManager || p.projectManagerName)) return true;
    // Team member
    if (Array.isArray(p.teamMembers) && p.teamMembers.some(m => matchesEmp(m.employeeId || m._id || m.id, m.employeeCode, m.name))) return true;
    if (Array.isArray(p.teamMemberIds) && p.teamMemberIds.some(id => matchesEmp(id, id, null))) return true;
    return false;
  });

  // 4. Open / Pending Support Tickets
  const allTickets = getCollection(KEYS.TICKETS) || [];
  const openTickets = allTickets.filter(t => {
    if (t.status === 'closed' || t.status === 'resolved') return false;
    if (matchesEmp(t.assignedToId, t.assignedToCode, t.assignedToName)) return true;
    return false;
  });

  return {
    tasks: pendingTasks,
    leads: activeLeads,
    projects: ongoingProjects,
    tickets: openTickets,
    totalCount: pendingTasks.length + activeLeads.length + ongoingProjects.length + openTickets.length
  };
};

/**
 * Execute transfer of assets from sourceEmployee to targetEmployee
 */
export const executeAssetHandover = async ({
  sourceEmployee,
  targetEmployee,
  selections = { tasks: true, leads: true, projects: true, tickets: true },
  handoverNotes = '',
  performedBy = null
}) => {
  if (!sourceEmployee || !targetEmployee) {
    throw new Error('Both source and target employees are required for handover.');
  }

  const today = getLocalDateString();
  const sourceId = String(sourceEmployee._id || sourceEmployee.id || sourceEmployee.employeeId || '');
  const sourceCode = String(sourceEmployee.employeeCode || '').toUpperCase();
  const sourceName = sourceEmployee.name || sourceEmployee.employeeName || 'Ex-Employee';

  const targetId = String(targetEmployee._id || targetEmployee.id || '');
  const targetCode = targetEmployee.employeeCode || '';
  const targetName = targetEmployee.name || 'Successor Employee';
  const targetRole = targetEmployee.role || 'Team Member';
  const targetAvatar = targetEmployee.avatar || '';
  const targetEmail = targetEmployee.email || '';

  const matchesSource = (id, code, name) => {
    if (sourceId && String(id) === sourceId) return true;
    if (sourceCode && String(code || id).toUpperCase() === sourceCode) return true;
    if (sourceName && String(name || '').toLowerCase().trim() === sourceName.toLowerCase().trim()) return true;
    return false;
  };

  let transferredTasksCount = 0;
  let transferredLeadsCount = 0;
  let transferredProjectsCount = 0;
  let transferredTicketsCount = 0;

  // 1. Transfer Tasks
  if (selections.tasks) {
    const allTasks = getCollection(KEYS.TASKS) || [];
    let tasksModified = false;

    const updatedTasks = allTasks.map(t => {
      if (t.status === 'completed') return t;
      const isTargetTask = Array.isArray(selections.taskIds)
        ? selections.taskIds.includes(String(t._id || t.id))
        : (matchesSource(t.assignedToId, t.assignedToCode, t.assignedToName) ||
           matchesSource(t.assignedTo, null, t.assignedToName) ||
           (Array.isArray(t.assignedToIds) && t.assignedToIds.some(id => matchesSource(id, id, null))) ||
           (Array.isArray(t.assignees) && t.assignees.some(a => matchesSource(a._id || a.id, a.employeeCode, a.name))));

      if (!isTargetTask) return t;

      tasksModified = true;
      transferredTasksCount++;

      // Reassign multi-assignees
      let newAssignedToIds = Array.isArray(t.assignedToIds) ? [...t.assignedToIds] : [];
      newAssignedToIds = newAssignedToIds.filter(id => !matchesSource(id, id, null));
      if (!newAssignedToIds.includes(targetId)) {
        newAssignedToIds.push(targetId);
      }

      let newAssignees = Array.isArray(t.assignees) ? [...t.assignees] : [];
      newAssignees = newAssignees.filter(a => !matchesSource(a._id || a.id, a.employeeCode, a.name));
      newAssignees.push({
        _id: targetId,
        id: targetId,
        name: targetName,
        role: targetRole,
        avatar: targetAvatar,
        email: targetEmail,
        employeeCode: targetCode
      });

      const auditEntry = {
        action: 'handover_reassigned',
        date: today,
        fromEmployee: sourceName,
        toEmployee: targetName,
        notes: handoverNotes || 'Handover upon separation / offboarding'
      };

      return {
        ...t,
        assignedTo: targetName,
        assignedToId: targetId,
        assignedToCode: targetCode,
        assignedToName: targetName,
        assignedToRole: targetRole,
        assignedToAvatar: targetAvatar,
        assignedToEmail: targetEmail,
        assignedToIds: newAssignedToIds,
        assignees: newAssignees,
        handoverHistory: [...(t.handoverHistory || []), auditEntry],
        memo: t.memo ? `${t.memo}\n[Handover ${today}]: Reassigned from ${sourceName} to ${targetName}` : `[Handover ${today}]: Reassigned from ${sourceName} to ${targetName}`
      };
    });

    if (tasksModified) {
      saveCollection(KEYS.TASKS, updatedTasks);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
    }
  }

  // 2. Transfer Leads
  if (selections.leads) {
    const allLeads = getCollection(KEYS.LEADS) || [];
    let leadsModified = false;

    const updatedLeads = allLeads.map(l => {
      if (l.status === 'converted' || l.status === 'lost') return l;
      const isTargetLead = Array.isArray(selections.leadIds)
        ? selections.leadIds.includes(String(l._id || l.id))
        : (matchesSource(l.leadOwnerId, l.leadOwnerCode, l.leadOwnerName) ||
           matchesSource(l.assignedToId, l.assignedToCode, l.assignedToName) ||
           matchesSource(l.ownerId, null, l.owner || l.leadOwnerName));

      if (!isTargetLead) return l;

      leadsModified = true;
      transferredLeadsCount++;

      return {
        ...l,
        leadOwnerId: targetId,
        leadOwnerName: targetName,
        leadOwnerRole: targetRole,
        leadOwnerAvatar: targetAvatar,
        leadOwnerEmail: targetEmail,
        assignedToId: targetId,
        assignedToName: targetName,
        owner: targetName,
        notes: l.notes
          ? `${l.notes}\n[Handover ${today}]: Reassigned from ${sourceName} to ${targetName}. ${handoverNotes || ''}`
          : `[Handover ${today}]: Reassigned from ${sourceName} to ${targetName}. ${handoverNotes || ''}`
      };
    });

    if (leadsModified) {
      saveCollection(KEYS.LEADS, updatedLeads);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));
    }
  }

  // 3. Transfer Projects
  if (selections.projects) {
    const allProjects = getCollection(KEYS.PROJECTS) || [];
    let projectsModified = false;

    const updatedProjects = allProjects.map(p => {
      if (p.status === 'completed' && p.finalApproved) return p;
      const isTargetProject = Array.isArray(selections.projectIds)
        ? selections.projectIds.includes(String(p._id || p.id))
        : (matchesSource(p.projectManagerId, p.projectManagerCode, p.projectManager || p.projectManagerName) ||
           (Array.isArray(p.teamMembers) && p.teamMembers.some(m => matchesSource(m.employeeId || m._id || m.id, m.employeeCode, m.name))) ||
           (Array.isArray(p.teamMemberIds) && p.teamMemberIds.some(id => matchesSource(id, id, null))));

      if (!isTargetProject) return p;

      projectsModified = true;
      transferredProjectsCount++;

      let newMgrId = p.projectManagerId;
      let newMgrName = p.projectManager || p.projectManagerName;
      let newMgrAvatar = p.projectManagerAvatar;

      if (matchesSource(p.projectManagerId, p.projectManagerCode, p.projectManager || p.projectManagerName)) {
        newMgrId = targetId;
        newMgrName = targetName;
        newMgrAvatar = targetAvatar;
      }

      let newTeamMembers = Array.isArray(p.teamMembers) ? [...p.teamMembers] : [];
      newTeamMembers = newTeamMembers.filter(m => !matchesSource(m.employeeId || m._id || m.id, m.employeeCode, m.name));
      if (!newTeamMembers.some(m => String(m.employeeId || m._id || m.id) === targetId)) {
        newTeamMembers.push({
          employeeId: targetId,
          _id: targetId,
          id: targetId,
          name: targetName,
          role: targetRole,
          avatar: targetAvatar
        });
      }

      return {
        ...p,
        projectManagerId: newMgrId,
        projectManager: newMgrName,
        projectManagerName: newMgrName,
        projectManagerAvatar: newMgrAvatar,
        teamMembers: newTeamMembers,
        notes: p.notes
          ? `${p.notes}\n[Handover ${today}]: Handover from ${sourceName} to ${targetName}. ${handoverNotes || ''}`
          : `[Handover ${today}]: Handover from ${sourceName} to ${targetName}. ${handoverNotes || ''}`
      };
    });

    if (projectsModified) {
      saveCollection(KEYS.PROJECTS, updatedProjects);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.PROJECTS } }));
    }
  }

  // 4. Transfer Tickets
  if (selections.tickets) {
    const allTickets = getCollection(KEYS.TICKETS) || [];
    let ticketsModified = false;

    const updatedTickets = allTickets.map(t => {
      if (t.status === 'closed' || t.status === 'resolved') return t;
      const isTargetTicket = Array.isArray(selections.ticketIds)
        ? selections.ticketIds.includes(String(t._id || t.id))
        : matchesSource(t.assignedToId, t.assignedToCode, t.assignedToName);

      if (!isTargetTicket) return t;

      ticketsModified = true;
      transferredTicketsCount++;

      return {
        ...t,
        assignedToId: targetId,
        assignedToName: targetName,
        assignedToRole: targetRole,
        assignedToAvatar: targetAvatar
      };
    });

    if (ticketsModified) {
      saveCollection(KEYS.TICKETS, updatedTickets);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
    }
  }

  // 5. Attendance & HR Audit Trail
  const actorName = performedBy?.name || 'HR Management';
  try {
    hrService.createAttendanceAuditLog({
      type: 'work_handover',
      action: 'work_handover',
      date: today,
      employeeId: targetId,
      employeeName: targetName,
      note: `Work Handover: ${transferredTasksCount} tasks, ${transferredLeadsCount} leads, ${transferredProjectsCount} projects, ${transferredTicketsCount} tickets transferred from ${sourceName} to ${targetName}. Authorized by ${actorName}.`
    });
  } catch (_) {}

  // 6. Direct Conversation Notification to Successor
  try {
    const allConvs = getCollection(KEYS.CONVERSATIONS) || [];
    const convIdx = allConvs.findIndex(c =>
      !c.isChannel &&
      c.participants &&
      c.participants.some(p => String(p._id || p.id) === targetId)
    );

    const handoverMsg = {
      _id: `msg_ho_${Date.now()}`,
      senderId: performedBy?._id || 'admin',
      senderName: actorName,
      senderRole: 'HR / Leadership',
      senderAvatar: performedBy?.avatar || '',
      content: `📋 **Official Work Handover Notice**:\nYou have been designated as the handover successor for **${sourceName}**.\n\n` +
        `• **Tasks Assigned**: ${transferredTasksCount}\n` +
        `• **Active Leads Assigned**: ${transferredLeadsCount}\n` +
        `• **Projects Joined/Managed**: ${transferredProjectsCount}\n` +
        `• **Open Tickets**: ${transferredTicketsCount}\n` +
        (handoverNotes ? `\n*Handover Note*: "${handoverNotes}"\n` : '') +
        `\nAll items are now active in your dashboard and ready for continuation.`,
      timestamp: new Date().toISOString(),
      date: today,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      readBy: [performedBy?._id || 'admin']
    };

    if (convIdx >= 0) {
      allConvs[convIdx].messages = [...(allConvs[convIdx].messages || []), handoverMsg];
      allConvs[convIdx].lastMessage = `Work Handover from ${sourceName} (${transferredTasksCount} tasks, ${transferredLeadsCount} leads)`;
      allConvs[convIdx].lastMessageTime = 'Just now';
      saveCollection(KEYS.CONVERSATIONS, allConvs);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS } }));
    }
  } catch (_) {}

  // 7. Background Server Database Persistence (Express & MongoDB)
  try {
    fetch(`${API_BASE}/employees/handover`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sourceEmployeeId: sourceId,
        sourceEmployeeCode: sourceCode,
        targetEmployeeId: targetId,
        selections,
        handoverNotes
      })
    }).catch(err => console.warn('[Handover] Server sync queued:', err));
  } catch (_) {}

  return {
    success: true,
    transferred: {
      tasksCount: transferredTasksCount,
      leadsCount: transferredLeadsCount,
      projectsCount: transferredProjectsCount,
      ticketsCount: transferredTicketsCount
    }
  };
};
