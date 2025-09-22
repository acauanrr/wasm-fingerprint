const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secure-admin-token-here';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    const basicAuth = req.headers['authorization'];
    if (basicAuth && basicAuth.startsWith('Basic ')) {
        const base64Credentials = basicAuth.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            return next();
        }
    }

    const queryToken = req.query.token;
    if (token === ADMIN_TOKEN || queryToken === ADMIN_TOKEN) {
        next();
    } else {
        if (req.path === '/admin' && !authHeader && !queryToken) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
        }
        res.status(401).json({
            success: false,
            error: 'Unauthorized. Please provide valid admin credentials.'
        });
    }
};

module.exports = {
    authenticateAdmin
};