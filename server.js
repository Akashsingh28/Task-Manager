require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/team-task-manager';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// Routes
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/projects', require('./backend/routes/projects'));
app.use('/api/tasks', require('./backend/routes/tasks'));
app.use('/api/dashboard', require('./backend/routes/dashboard'));

// Serve frontend
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
