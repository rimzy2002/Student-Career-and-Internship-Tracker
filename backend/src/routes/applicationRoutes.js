const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// All application routes require authentication and 'student' role
router.use(authenticate);
router.use(requireRole('student'));

router.get('/', applicationController.getApplications);
router.post('/', applicationController.createApplication);
router.get('/:id/history', applicationController.getApplicationHistory);
router.patch('/:id/status', applicationController.updateApplicationStatus);
router.patch('/:id/skills', applicationController.updateApplicationSkills);
router.delete('/:id', applicationController.archiveApplication);

module.exports = router;
