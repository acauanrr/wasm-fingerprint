const express = require('express');
const fingerprintRoutes = require('./fingerprint.routes');
const adminRoutes = require('./admin.routes');
const healthRoutes = require('./health.routes');

const router = express.Router();

router.use('/api', fingerprintRoutes);
router.use('/admin', adminRoutes);
router.use('/', healthRoutes);

module.exports = router;