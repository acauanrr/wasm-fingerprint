const path = require('path');
const fsSync = require('fs');
const crypto = require('crypto');
const logService = require('../services/log.service');
const sessionService = require('../services/session.service');
const adminView = require('../views/admin.view');
const loginView = require('../views/login.view');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secure-admin-token-here';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const renderLogin = (req, res) => {
    const html = loginView.renderLoginPage();
    res.send(html);
};

const verifyLogin = (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Generate a session token
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Store session
        sessionService.createSession(sessionToken, {
            username,
            isAdmin: true
        });

        // Set cookie for 24 hours
        res.cookie('adminSession', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        return res.json({
            success: true,
            token: sessionToken,
            message: 'Login successful'
        });
    }

    res.status(401).json({
        success: false,
        error: 'Invalid credentials'
    });
};

const redirectToLogin = (req, res) => {
    res.redirect('/admin/login');
};

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
    renderLogin,
    verifyLogin,
    redirectToLogin,
    renderDashboard,
    resetLogs,
    downloadLogs,
    viewLogs
};