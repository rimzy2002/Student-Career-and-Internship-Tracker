const express = require('express');
const router = express.Router();
const multer = require('multer');

const studentSkillsController = require('../controllers/studentSkillsController');
const skillSuggestionController = require('../controllers/skillSuggestionController');
const studentProfileController = require('../controllers/studentProfileController');

// Multer Config
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('LIMIT_FILE_TYPES'), false);
    }
  }
});
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// All student routes require authentication and 'student' role
router.use(authenticate);
router.use(requireRole('student'));

// Personal Skills routes
router.get('/me/skills', studentSkillsController.getMySkills);
router.post('/me/skills', studentSkillsController.addMySkill);
router.delete('/me/skills/:skillId', studentSkillsController.removeMySkill);

// AI Skill Suggestion route
router.post('/me/skills/suggest', skillSuggestionController.getSuggestions);

// Profile routes
router.get('/me/profile', studentProfileController.getProfile);
router.patch('/me/profile', studentProfileController.updateProfile);
router.post('/me/avatar', upload.single('avatar'), studentProfileController.uploadAvatar);
router.delete('/me', studentProfileController.softDeleteAccount);

module.exports = router;
