const express = require('express');
const router = express.Router();
const multer = require('multer');

const studentSkillsController = require('../controllers/studentSkillsController');
const skillSuggestionController = require('../controllers/skillSuggestionController');
const studentProfileController = require('../controllers/studentProfileController');
const aiMatchController = require('../controllers/aiMatchController');

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

// Personal Skills routes (supporting both /me/skills and /skills)
router.get('/me/skills', studentSkillsController.getMySkills);
router.get('/skills', studentSkillsController.getMySkills);
router.post('/me/skills', studentSkillsController.addMySkill);
router.post('/skills', studentSkillsController.addMySkill);
router.delete('/me/skills/:skillId', studentSkillsController.removeMySkill);
router.delete('/skills/:skillId', studentSkillsController.removeMySkill);

// AI Skill Suggestion & Resume Match routes
router.post('/me/skills/suggest', skillSuggestionController.getSuggestions);
router.post('/skills/suggest', skillSuggestionController.getSuggestions);
router.post('/me/skill-suggestions', skillSuggestionController.getSuggestions); // compatibility alias
router.post('/me/resume-match', aiMatchController.matchResumeToJob);
router.post('/resume-match', aiMatchController.matchResumeToJob);


// Profile routes
router.get('/me/profile', studentProfileController.getProfile);
router.patch('/me/profile', studentProfileController.updateProfile);
router.post('/me/avatar', upload.single('avatar'), studentProfileController.uploadAvatar);
router.delete('/me', studentProfileController.softDeleteAccount);

module.exports = router;
