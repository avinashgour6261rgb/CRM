/**
 * @file filterUtils.js
 * @description Standardized CRM filtering utilities for cross-module consistency,
 * case-insensitive matching, multi-assignee support, ID/code normalization, and date comparison.
 */

/**
 * Normalizes string for fuzzy/case-insensitive comparison
 * Replaces underscores, hyphens, and multiple spaces with a single space.
 */
export const normalizeString = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ');
};

/**
 * Normalize date string/object to YYYY-MM-DD
 */
export const normalizeDate = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    if (val.includes('T')) return val.split('T')[0];
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(val)) {
      const parts = val.split(/[-/]/);
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return val.trim();
  }
  if (val instanceof Date && !isNaN(val)) {
    return val.toISOString().split('T')[0];
  }
  return '';
};

/**
 * Generic status / enum / string filter matching
 * Handles:
 * - Empty / 'all' returns true
 * - Case-insensitive string matching
 * - 'in_progress' matches 'in progress', 'In Progress', 'IN_PROGRESS'
 * - 'under_review' matches 'under review'
 * - 'on_hold' matches 'on hold'
 * - Array support (e.g. if item has multiple tags)
 */
export const matchesFilter = (itemValue, filterValue) => {
  if (!filterValue || filterValue === 'all') return true;
  if (itemValue === null || itemValue === undefined) return false;

  const cleanFilter = normalizeString(filterValue);
  if (!cleanFilter || cleanFilter === 'all') return true;

  if (Array.isArray(itemValue)) {
    return itemValue.some(subItem => matchesFilter(subItem, filterValue));
  }

  if (typeof itemValue === 'object') {
    const candidateKeys = ['_id', 'id', 'employeeCode', 'code', 'projectCode', 'taskCode', 'name', 'title', 'value', 'email', 'status', 'type'];
    return candidateKeys.some(key => {
      if (itemValue[key] !== undefined && itemValue[key] !== null) {
        return matchesFilter(itemValue[key], filterValue);
      }
      return false;
    });
  }

  const cleanItem = normalizeString(itemValue);
  return cleanItem === cleanFilter;
};

/**
 * Checks if a task or item is assigned to a specific filter user/member.
 * Supports:
 * - single assignedToId / assignedTo string or object
 * - multi assignedToIds array of strings
 * - multi assignees array of objects
 * - employeeCode, email, name matching
 */
export const matchesAssignee = (task, targetMemberIdOrCode) => {
  if (!targetMemberIdOrCode || targetMemberIdOrCode === 'all') return true;
  if (!task) return false;

  const target = normalizeString(targetMemberIdOrCode);

  // 1. Direct assignedTo (object or primitive string)
  if (task.assignedTo) {
    if (typeof task.assignedTo === 'object') {
      if (
        normalizeString(task.assignedTo._id) === target ||
        normalizeString(task.assignedTo.id) === target ||
        normalizeString(task.assignedTo.employeeCode) === target ||
        normalizeString(task.assignedTo.name) === target
      ) {
        return true;
      }
    } else if (normalizeString(task.assignedTo) === target) {
      return true;
    }
  }

  // 2. Direct assignee IDs and codes
  if (task.assignedToId && normalizeString(task.assignedToId) === target) return true;
  if (task.assignedToCode && normalizeString(task.assignedToCode) === target) return true;
  if (task.assignedToEmail && normalizeString(task.assignedToEmail) === target) return true;
  if (task.employeeId && normalizeString(task.employeeId) === target) return true;
  if (task.employeeCode && normalizeString(task.employeeCode) === target) return true;
  if (task.assignedToName && normalizeString(task.assignedToName) === target) return true;

  // 3. Multi-assignee array of IDs (e.g. assignedToIds: ['emp_1', 'emp_2'])
  if (Array.isArray(task.assignedToIds) && task.assignedToIds.some(id => normalizeString(id) === target)) {
    return true;
  }

  // 4. Multi-assignee array of objects (e.g. assignees: [{ _id, name, employeeCode }])
  if (Array.isArray(task.assignees) && task.assignees.some(a => {
    if (!a) return false;
    return (
      normalizeString(a._id) === target ||
      normalizeString(a.id) === target ||
      normalizeString(a.employeeCode) === target ||
      normalizeString(a.name) === target ||
      normalizeString(a.email) === target
    );
  })) {
    return true;
  }

  return false;
};

/**
 * Checks if an item (task, timesheet) matches a project filter
 * Matches by _id, id, projectCode, or projectName
 */
export const matchesProject = (item, filterProjectIdOrCode) => {
  if (!filterProjectIdOrCode || filterProjectIdOrCode === 'all') return true;
  if (!item) return false;

  const target = normalizeString(filterProjectIdOrCode);

  if (item.projectId && normalizeString(item.projectId) === target) return true;
  if (item.projectCode && normalizeString(item.projectCode) === target) return true;
  if (item.projectName && normalizeString(item.projectName) === target) return true;

  if (item.project) {
    if (typeof item.project === 'object') {
      if (
        normalizeString(item.project._id) === target ||
        normalizeString(item.project.id) === target ||
        normalizeString(item.project.projectCode) === target ||
        normalizeString(item.project.code) === target ||
        normalizeString(item.project.name) === target
      ) {
        return true;
      }
    } else if (normalizeString(item.project) === target) {
      return true;
    }
  }

  return false;
};

/**
 * Checks date range (inclusive)
 */
export const matchesDateRange = (itemDate, startDate, endDate) => {
  const normItemDate = normalizeDate(itemDate);
  if (!normItemDate) {
    return !startDate && !endDate;
  }

  const normStart = normalizeDate(startDate);
  const normEnd = normalizeDate(endDate);

  if (normStart && normItemDate < normStart) return false;
  if (normEnd && normItemDate > normEnd) return false;
  return true;
};

/**
 * General text search across multiple fields of an object
 */
export const matchesSearch = (item, searchQuery, customFields = []) => {
  if (!searchQuery || !searchQuery.trim()) return true;
  if (!item) return false;

  const query = normalizeString(searchQuery);

  if (customFields.length > 0) {
    return customFields.some(field => {
      const val = item[field];
      if (Array.isArray(val)) {
        return val.some(sub => {
          if (typeof sub === 'object' && sub !== null) {
            return normalizeString(sub.name || sub.title || sub.employeeCode || '').includes(query);
          }
          return normalizeString(sub).includes(query);
        });
      }
      if (typeof val === 'object' && val !== null) {
        return normalizeString(val.name || val.title || val.code || '').includes(query);
      }
      return normalizeString(val).includes(query);
    });
  }

  const defaultValues = [
    item.title, item.name, item.subject, item.itemName, item.taskCode,
    item.projectCode, item.ticketCode, item.expenseCode, item.employeeCode,
    item.projectName, item.client, item.companyName, item.assignedToName,
    item.employeeName, item.requestedByName, item.department, item.category
  ];

  return defaultValues.some(val => val && normalizeString(val).includes(query));
};

