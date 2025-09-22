const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authenticateAdmin, adminController.renderDashboard);
router.post('/reset', authenticateAdmin, adminController.resetLogs);
router.get('/logs/download', authenticateAdmin, adminController.downloadLogs);
router.get('/logs/view', authenticateAdmin, adminController.viewLogs);

module.exports = router;