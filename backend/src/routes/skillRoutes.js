const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');
const aiMatchController = require('../controllers/aiMatchController');
const skillSuggestionController = require('../controllers/skillSuggestionController');
const authenticate = require('../middleware/auth');

// Public read access to master skills catalog for fast client combobox loading
router.get('/', skillController.getSkills);

// Protected endpoints
router.post('/suggest', authenticate, skillSuggestionController.getSuggestions);
router.post('/match-resume', authenticate, aiMatchController.matchResumeToJob);

module.exports = router;
