const sessionService = require('../services/session.service');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secure-admin-token-here';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const authenticateAdmin = (req, res, next) => {
    // Check cookie session first
    const sessionToken = req.cookies?.adminSession;
    if (sessionToken) {
        const session = sessionService.getSession(sessionToken);
        if (session && session.isAdmin) {
            req.adminSession = session;
            return next();
        }
    }

    const authHeader = req.headers['authorization'];

    // Check Basic Auth
    if (authHeader && authHeader.startsWith('Basic ')) {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            return next();
        }
    }

    // Check Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token === ADMIN_TOKEN) {
            return next();
        }
    }

    // Check query token
    const queryToken = req.query.token;
    if (queryToken === ADMIN_TOKEN) {
        return next();
    }

    // If it's an AJAX request, return JSON error
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized. Please provide valid admin credentials.'
        });
    }

    // Otherwise redirect to login page
    res.redirect('/admin/login');
};

module.exports = {
    authenticateAdmin
};