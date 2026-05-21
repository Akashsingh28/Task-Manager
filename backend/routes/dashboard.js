const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');

// Get dashboard stats
router.get('/', authenticate, async (req, res) => {
  try {
    let filters = { $or: [{ admin: req.user._id }, { members: req.user._id }] };
    if (req.query.projectId && req.query.projectId !== 'all') {
      filters._id = req.query.projectId;
    }

    // Get projects for this user
    const projects = await Project.find(filters);
    const projectIds = projects.map(p => p._id);

    // Total projects
    const totalProjects = projects.length;

    // Total unique members in these projects
    const allMembers = new Set();
    projects.forEach(p => {
      if (p.admin) allMembers.add(p.admin.toString());
      if (p.members) p.members.forEach(m => allMembers.add(m.toString()));
    });
    const totalMembers = allMembers.size;

    // Total tasks
    const totalTasks = await Task.countDocuments({ project: { $in: projectIds } });

    // Tasks by status
    const byStatus = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Overdue tasks
    const now = new Date();
    const overdueTasks = await Task.countDocuments({
      project: { $in: projectIds },
      dueDate: { $lt: now },
      status: { $ne: 'Done' }
    });

    // Tasks by priority
    const byPriority = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Tasks by user (assignee)
    const byUser = await Task.aggregate([
      { $match: { project: { $in: projectIds }, assignee: { $exists: true, $ne: null } } },
      { $group: { _id: '$assignee', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
    ]);

    // Also get all projects for the dropdown
    const allUserProjects = await Project.find({
      $or: [{ admin: req.user._id }, { members: req.user._id }]
    }).select('name _id');

    res.json({
      totalProjects,
      totalMembers,
      totalTasks,
      byStatus: Object.fromEntries(byStatus.map(b => [b._id, b.count])),
      byPriority: Object.fromEntries(byPriority.map(b => [b._id || 'Unassigned', b.count])),
      overdueTasks,
      projectsList: allUserProjects,
      byUser: byUser.map(b => ({
        user: b.user[0]?.name || 'Unknown',
        count: b.count
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
