const path = require('path');
const fsSync = require('fs');
const logService = require('../services/log.service');
const adminView = require('../views/admin.view');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secure-admin-token-here';

const renderDashboard = (req, res) => {
    const html = adminView.renderDashboard(ADMIN_TOKEN);
    res.send(html);
};

const resetLogs = async (req, res) => {
    try {
        console.log('Admin requested reset');
        await logService.resetLogs();

        res.json({
            success: true,
            message: 'Logs have been reset successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error resetting logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset logs: ' + error.message
        });
    }
};

const downloadLogs = async (req, res) => {
    try {
        const logFile = logService.getLogFilePath();

        if (!fsSync.existsSync(logFile)) {
            return res.status(404).json({
                success: false,
                error: 'Log file not found'
            });
        }

        res.download(logFile, 'fingerprints.log', (err) => {
            if (err) {
                console.error('Error downloading log file:', err);
                res.status(500).json({
                    success: false,
                    error: 'Failed to download log file'
                });
            }
        });
    } catch (error) {
        console.error('Error accessing log file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to access log file'
        });
    }
};

const viewLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await logService.readLogs();

        res.json({
            success: true,
            total: logs.length,
            logs: logs.slice(-limit).reverse()
        });
    } catch (error) {
        console.error('Error viewing logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to view logs'
        });
    }
};

module.exports = {
    renderDashboard,
    resetLogs,
    downloadLogs,
    viewLogs
};