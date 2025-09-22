const config = require('../../config');

const securityHeaders = (req, res, next) => {
    if (config.security.enableCoopCoep) {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }
    if (req.path.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
    }
    next();
};

const createRateLimiter = () => {
    if (!config.security.rateLimit.enabled) {
        return (req, res, next) => next();
    }

    const rateLimit = require('express-rate-limit');
    return rateLimit({
        windowMs: config.security.rateLimit.windowMs,
        max: config.security.rateLimit.maxRequests,
        message: 'Too many requests from this IP'
    });
};

module.exports = {
    securityHeaders,
    createRateLimiter
};