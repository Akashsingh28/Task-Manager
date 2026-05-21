const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');

// Create project (any logged-in user becomes Admin)
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const project = new Project({
      name,
      description,
      admin: req.user._id,
      members: [req.user._id]
    });
    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all projects for user
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ admin: req.user._id }, { members: req.user._id }]
    }).populate('admin members');
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('admin members');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.admin.toString() !== req.user._id.toString() && !project.members.find(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to project (Admin only)
router.post('/:id/members', authenticate, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can add members' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const alreadyMember = project.members.some(m => m.toString() === user._id.toString());
    if (!alreadyMember) {
      project.members.push(user._id);
      await project.save();
    }
    const updated = await Project.findById(project._id).populate('admin members');
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove member from project (Admin only)
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can remove members' });
    }
    project.members = project.members.filter(m => m.toString() !== req.params.userId);
    await project.save();
    const updated = await Project.findById(project._id).populate('admin members');
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add custom column to project (Admin only)
router.post('/:id/columns', authenticate, async (req, res) => {
  try {
    const { column } = req.body;
    if (!column) return res.status(400).json({ message: 'Column name required' });
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can add columns' });
    }
    if (!project.columns.includes(column)) {
      project.columns.push(column);
      await project.save();
    }
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
