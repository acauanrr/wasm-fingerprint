const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticateAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Login routes (no auth required)
router.get('/login', adminController.renderLogin);
router.post('/verify', adminController.verifyLogin);

// Protected routes
router.get('/', adminController.redirectToLogin);
router.get('/dashboard', authenticateAdmin, adminController.renderDashboard);
router.post('/reset', authenticateAdmin, adminController.resetLogs);
router.get('/logs/download', authenticateAdmin, adminController.downloadLogs);
router.get('/logs/view', authenticateAdmin, adminController.viewLogs);

module.exports = router;