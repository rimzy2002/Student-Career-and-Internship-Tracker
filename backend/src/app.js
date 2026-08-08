const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const skillRoutes = require('./routes/skillRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();

// Middleware
const defaultFrontendOrigins = [
  'http://localhost:3000',
  'https://student-career-and-internship-track-mu.vercel.app'
];

const configuredFrontendOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedFrontendOrigins = new Set([
  ...defaultFrontendOrigins,
  ...configuredFrontendOrigins
]);

app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header are from non-browser clients such as
    // health checks. Browser requests must match an explicitly allowed origin.
    callback(null, !origin || allowedFrontendOrigins.has(origin));
  },
  credentials: true
}));
app.use(express.json());

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running' });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/skills', skillRoutes);
app.use('/api/v1/students', studentRoutes);

// 404 handler for unmatched routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'API route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
  }
  if (err.message === 'LIMIT_FILE_TYPES') {
    return res.status(400).json({ message: 'Only image files are allowed.' });
  }

  res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
