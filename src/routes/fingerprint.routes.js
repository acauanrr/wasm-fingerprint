const express = require('express');
const fingerprintController = require('../controllers/fingerprint.controller');

const router = express.Router();

router.post('/fingerprint', fingerprintController.collectFingerprint);
router.get('/fingerprint/:id', fingerprintController.getFingerprint);
router.post('/compare-fingerprints', fingerprintController.compareFingerprints);
router.get('/stats', fingerprintController.getStats);
router.get('/analytics', fingerprintController.getAnalytics);
router.get('/config', fingerprintController.getConfig);

module.exports = router;