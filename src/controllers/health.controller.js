const fingerprintService = require('../services/fingerprint.service');
const logService = require('../services/log.service');

const checkHealth = async (req, res) => {
    try {
        const stats = await fingerprintService.calculateStats();
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            storage: {
                type: 'JSON Log File',
                path: logService.getLogFilePath(),
                ...stats
            }
        });
    } catch (error) {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            storage: {
                type: 'JSON Log File',
                path: logService.getLogFilePath(),
                status: 'error',
                error: error.message
            }
        });
    }
};

module.exports = {
    checkHealth
};