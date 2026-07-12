const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// All admin routes require authentication and 'admin' role
// and must be READ-ONLY (no POST/PATCH/DELETE)
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/analytics/skills', adminController.getSkillsAnalytics);
router.get('/analytics/applications', adminController.getApplicationsAnalytics);

module.exports = router;
