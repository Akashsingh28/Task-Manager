const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  columns: { type: [String], default: ['To Do', 'In Progress', 'Done'] },
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
