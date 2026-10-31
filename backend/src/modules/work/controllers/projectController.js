/**
 * @file projectController.js
 * @description Controller for Projects in EMS Work Module.
 */

const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');

// @desc    Get all projects with optional filtering
// @route   GET /api/projects
exports.getProjects = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database connecting, standby' });
    }
    const { status, category, department, search } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    if (department && department !== 'all') {
      query.department = department;
    }
    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { projectCode: { $regex: escapedSearch, $options: 'i' } },
        { client: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const user = req.user;
    const isPrivileged = user && (user.isAdmin || user.systemRole === 'admin' || user.systemRole === 'hr' || user.role === 'Administrator' || user.role === 'HR Manager');

    // Role-based tenant isolation: Regular employees can strictly access:
    // 1. Projects where they are an assigned member (teamIds, visibleToIds, members._id, members.employeeCode)
    // 2. Projects created by them (createdBy, createdById)
    // 3. Projects explicitly flagged as company-wide public (isCompanyWide: true, visibility: 'all')
    if (!isPrivileged && user) {
      const userAssignedFilter = [
        { isCompanyWide: true, visibility: 'all' },
        { createdBy: String(user._id) },
        { createdById: String(user._id) },
        { createdBy: String(user.employeeCode) },
        { visibleToIds: String(user._id) },
        { visibleToIds: String(user.employeeCode) },
        { teamIds: String(user._id) },
        { teamIds: String(user.employeeCode) },
        { 'members._id': String(user._id) },
        { 'members.id': String(user._id) },
        { 'members.employeeCode': String(user.employeeCode) },
        { 'membersList._id': String(user._id) }
      ];
      if (user.name) {
        const escapedName = String(user.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        userAssignedFilter.push({ creatorName: new RegExp(`^${escapedName}$`, 'i') });
        userAssignedFilter.push({ 'members.name': new RegExp(`^${escapedName}$`, 'i') });
        userAssignedFilter.push({ 'membersList.name': new RegExp(`^${escapedName}$`, 'i') });
      }

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: userAssignedFilter }];
        delete query.$or;
      } else {
        query.$or = userAssignedFilter;
      }
    }

    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
exports.getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new project
// @route   POST /api/projects
exports.createProject = async (req, res, next) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
exports.updateProject = async (req, res, next) => {
  try {
    let project = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      project = await Project.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });
    }
    if (!project) {
      project = await Project.findOneAndUpdate({ projectCode: req.params.id.toUpperCase() }, req.body, {
        new: true,
        runValidators: true
      });
    }
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
exports.deleteProject = async (req, res, next) => {
  try {
    let project = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      project = await Project.findByIdAndDelete(req.params.id);
    } else {
      project = await Project.findOneAndDelete({ $or: [{ projectCode: req.params.id }, { _id: req.params.id }] });
    }
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Cleanup child tasks associated with this project
    try {
      await Task.deleteMany({
        $or: [
          { project: project._id },
          { projectId: String(project._id) },
          { projectCode: project.projectCode }
        ]
      });
    } catch (cleanErr) {
      console.warn('Child tasks cleanup warning:', cleanErr);
    }

    res.status(200).json({
      success: true,
      message: 'Project and associated tasks deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
