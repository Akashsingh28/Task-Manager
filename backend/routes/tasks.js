const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

// Create task
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, dueDate, priority, projectId } = req.body;
    if (!title || !projectId) return res.status(400).json({ message: 'Missing fields' });
    
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project admin can create tasks' });
    }

    const task = new Task({
      title,
      description,
      dueDate,
      priority: priority || 'Medium',
      project: projectId,
      createdBy: req.user._id
    });
    await task.save();
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks by project
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    const isMember = project.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Forbidden' });

    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignee createdBy');
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await Project.findById(task.project._id);
    const isAdmin = project.admin.toString() === req.user._id.toString();
    const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
    const isMember = project.members.some(m => m.toString() === req.user._id.toString());

    if (!isAdmin && !isAssignee && !isMember) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    task.status = status;
    await task.save();
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign task
router.patch('/:id/assign', authenticate, async (req, res) => {
  try {
    const { assigneeId } = req.body;
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const project = await Project.findById(task.project._id);
    if (project.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can assign' });
    }

    // Validate assignee exists and is a member of the project
    const user = await User.findById(assigneeId);
    if (!user) return res.status(400).json({ message: 'Assignee user not found' });

    // Normalize project members to IDs (handles populated user objects or raw ObjectId strings)
    const memberIds = (project.members || []).map(m => (typeof m === 'object' ? String(m._id) : String(m)));
    const adminId = typeof project.admin === 'object' ? String(project.admin._id) : String(project.admin);
    const isMember = memberIds.includes(String(user._id)) || adminId === String(user._id);
    if (!isMember) return res.status(400).json({ message: 'User is not a project member' });

    task.assignee = user._id;
    await task.save();
    // Populate assignee and createdBy for clearer response
    await task.populate('assignee createdBy');
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await Project.findById(task.project._id);
    if (project.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can delete' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
