const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const FingerprintDatabase = require('./database/database');

const app = express();
const PORT = config.server.port;

// Security headers middleware
app.use((req, res, next) => {
    if (config.security.enableCoopCoep) {
        // Headers for SharedArrayBuffer support
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }

    // WASM content type
    if (req.path.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
    }

    next();
});

// CORS middleware with config
app.use(cors(config.security.cors));

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));

// Rate limiting middleware (if enabled)
if (config.security.rateLimit.enabled) {
    const rateLimit = require('express-rate-limit');
    const limiter = rateLimit({
        windowMs: config.security.rateLimit.windowMs,
        max: config.security.rateLimit.maxRequests,
        message: 'Too many requests from this IP'
    });
    app.use('/api/', limiter);
}
app.use(express.static('public'));
app.use('/wasm', express.static('wasm-fingerprint/pkg'));
app.use('/wasm-fingerprint', express.static('wasm-fingerprint'));

// Initialize SQLite database
const database = new FingerprintDatabase('./database/fingerprints.db');

// Legacy file-based storage (optional backup)
const LOG_DIR = path.join(__dirname, config.storage.dataDir);
const LOG_FILE = path.join(LOG_DIR, config.storage.logFile);

// Ensure data directory exists
if (!fsSync.existsSync(LOG_DIR)) {
    fsSync.mkdirSync(LOG_DIR, { recursive: true });
}

// Endpoint to receive fingerprint data (Seção 5.2)
app.post('/api/fingerprint', async (req, res) => {
    try {
        const fingerprintData = req.body;

        // Validate required fields
        if (!fingerprintData || !fingerprintData.sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid fingerprint payload'
            });
        }

        // Use provided session ID or generate new one
        const sessionId = fingerprintData.sessionId || crypto.randomBytes(16).toString('hex');

        // Generate composite fingerprint ID from all data
        const fingerprintId = crypto
            .createHash('sha256')
            .update(JSON.stringify(fingerprintData))
            .digest('hex');

        // Prepare data for storage
        const storedData = {
            id: fingerprintId,
            sessionId: sessionId,
            clientTimestamp: fingerprintData.timestamp,
            serverTimestamp: new Date().toISOString(),
            data: fingerprintData,
            metadata: {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent'],
                referer: req.headers['referer'],
                acceptLanguage: req.headers['accept-language']
            }
        };

        // Store in SQLite database
        try {
            await database.storeFingerprint(storedData);
            console.log(`Fingerprint stored in database: ${fingerprintId.substring(0, 16)}...`);
        } catch (dbError) {
            console.error('Error storing in database:', dbError);
            // Continue with file backup if database fails
        }

        // Backup to file (optional)
        const logEntry = JSON.stringify(storedData) + '\n';
        try {
            await fs.appendFile(LOG_FILE, logEntry);
        } catch (err) {
            console.error('Error writing to log file:', err);
        }

        // Check session count from database
        const sessionCount = await database.getSessionCount(fingerprintData.fingerprint_hash || fingerprintId);
        const isReturningUser = sessionCount > 1;

        console.log(`Received fingerprint: ${fingerprintId.substring(0, 16)}...`);
        console.log(`Session ID: ${sessionId}`);
        console.log(`Fingerprint Hash: ${fingerprintData.fingerprint_hash?.substring(0, 16) || 'N/A'}...`);
        if (fingerprintData.canvas_fingerprint) {
            console.log(`Canvas: ${fingerprintData.canvas_fingerprint.hash?.substring(0, 16) || 'N/A'}...`);
        }
        if (fingerprintData.webgl_fingerprint) {
            console.log(`WebGL: ${fingerprintData.webgl_fingerprint.vendor || 'N/A'} - ${fingerprintData.webgl_fingerprint.renderer || 'N/A'}`);
        }
        if (fingerprintData.hardware_profile) {
            console.log(`Hardware: ${fingerprintData.hardware_profile.cores || 'N/A'} cores, ${fingerprintData.hardware_profile.memory || 'N/A'}GB`);
        }
        console.log(`Session count for this fingerprint: ${sessionCount}`);

        res.json({
            success: true,
            fingerprintId: fingerprintId,
            sessionId: sessionId,
            isReturningUser: isReturningUser,
            sessionsCount: sessionCount,
            timestamp: storedData.serverTimestamp
        });

    } catch (error) {
        console.error('Error processing fingerprint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process fingerprint'
        });
    }
});

// Endpoint to get fingerprint statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await database.getStatistics();
        res.json(stats);
    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics'
        });
    }
});

// Endpoint to get specific fingerprint data
app.get('/api/fingerprint/:id', async (req, res) => {
    try {
        const fingerprintId = req.params.id;
        const data = await database.getFingerprint(fingerprintId);

        if (data) {
            res.json(data);
        } else {
            res.status(404).json({
                success: false,
                error: 'Fingerprint not found'
            });
        }
    } catch (error) {
        console.error('Error getting fingerprint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve fingerprint'
        });
    }
});

// Endpoint to compare two fingerprints
app.post('/api/compare', (req, res) => {
    const { fingerprint1, fingerprint2 } = req.body;

    if (!fingerprint1 || !fingerprint2) {
        return res.status(400).json({
            success: false,
            error: 'Two fingerprints required for comparison'
        });
    }

    // Calculate similarity scores
    const canvasSimilarity = fingerprint1.canvas_hash === fingerprint2.canvas_hash ? 1.0 : 0.0;
    const webglSimilarity = fingerprint1.webgl_hash === fingerprint2.webgl_hash ? 1.0 : 0.0;
    const audioSimilarity = fingerprint1.audio_hash === fingerprint2.audio_hash ? 1.0 : 0.0;

    // Hardware similarity (based on timing differences)
    const hwSimilarity = calculateHardwareSimilarity(
        fingerprint1.hardware_profile,
        fingerprint2.hardware_profile
    );

    // Browser attributes similarity
    const browserSimilarity = calculateBrowserSimilarity(
        fingerprint1.browser_attributes,
        fingerprint2.browser_attributes
    );

    const overallSimilarity = (
        canvasSimilarity * 0.25 +
        webglSimilarity * 0.25 +
        audioSimilarity * 0.2 +
        hwSimilarity * 0.2 +
        browserSimilarity * 0.1
    );

    res.json({
        success: true,
        similarity: {
            overall: overallSimilarity,
            canvas: canvasSimilarity,
            webgl: webglSimilarity,
            audio: audioSimilarity,
            hardware: hwSimilarity,
            browser: browserSimilarity
        },
        isLikelyMatch: overallSimilarity > 0.85
    });
});

function calculateHardwareSimilarity(hw1, hw2) {
    if (!hw1 || !hw2) return 0;

    // Helper function to calculate similarity with percentage threshold
    const calculateThresholdSimilarity = (val1, val2, thresholdPercent = 0.15) => {
        if (val1 === 0 && val2 === 0) return 1.0;
        if (val1 === 0 || val2 === 0) return 0.0;

        const percentageDiff = Math.abs(val1 - val2) / Math.max(val1, val2);
        return percentageDiff <= thresholdPercent ? 1.0 : Math.max(0, 1 - (percentageDiff / thresholdPercent));
    };

    // Calculate similarity with 15% tolerance for benchmarks
    const cpuSim = calculateThresholdSimilarity(hw1.cpu_benchmark, hw2.cpu_benchmark);
    const memSim = calculateThresholdSimilarity(hw1.memory_benchmark, hw2.memory_benchmark);
    const cryptoSim = calculateThresholdSimilarity(hw1.crypto_benchmark, hw2.crypto_benchmark);

    // Check hardware specs (should be exact matches)
    const coresSim = (hw1.cores === hw2.cores) ? 1.0 : 0.0;
    const memorySim = (hw1.memory === hw2.memory) ? 1.0 : 0.0;
    const concurrencySim = (hw1.concurrency === hw2.concurrency) ? 1.0 : 0.0;

    // Weight: 60% benchmarks (with tolerance), 40% hardware specs (exact)
    const benchmarkScore = (cpuSim + memSim + cryptoSim) / 3;
    const hardwareScore = (coresSim + memorySim + concurrencySim) / 3;

    return benchmarkScore * 0.6 + hardwareScore * 0.4;
}

function calculateBrowserSimilarity(attr1, attr2) {
    if (!attr1 || !attr2) return 0;

    let matches = 0;
    let total = 0;

    if (attr1.user_agent === attr2.user_agent) matches++;
    total++;

    if (attr1.platform === attr2.platform) matches++;
    total++;

    if (attr1.language === attr2.language) matches++;
    total++;

    if (attr1.hardware_concurrency === attr2.hardware_concurrency) matches++;
    total++;

    if (attr1.screen_resolution === attr2.screen_resolution) matches++;
    total++;

    return matches / total;
}

// Enhanced fingerprint comparison with tolerance
function compareFingerprints(fp1, fp2) {
    if (!fp1 || !fp2) return { isMatch: false, confidence: 0, details: {} };

    // Direct hash comparison (for exact matches)
    if (fp1.fingerprint_hash === fp2.fingerprint_hash) {
        return { isMatch: true, confidence: 1.0, details: { reason: 'exact_hash_match' } };
    }

    // Component-wise comparison with tolerances
    const canvasMatch = fp1.canvas_fingerprint?.hash === fp2.canvas_fingerprint?.hash;
    const webglMatch = fp1.webgl_fingerprint?.hash === fp2.webgl_fingerprint?.hash;
    const audioMatch = fp1.audio_fingerprint?.hash === fp2.audio_fingerprint?.hash;

    // Browser attributes comparison
    const browserSimilarity = calculateBrowserSimilarity(fp1.browser_info, fp2.browser_info);

    // Hardware comparison with tolerance
    const hardwareSimilarity = calculateHardwareSimilarity(fp1.hardware_profile, fp2.hardware_profile);

    // Calculate weighted confidence score
    const weights = {
        canvas: 0.25,
        webgl: 0.25,
        audio: 0.20,
        hardware: 0.20,
        browser: 0.10
    };

    const confidence =
        (canvasMatch ? weights.canvas : 0) +
        (webglMatch ? weights.webgl : 0) +
        (audioMatch ? weights.audio : 0) +
        (hardwareSimilarity * weights.hardware) +
        (browserSimilarity * weights.browser);

    // Device is considered the same if confidence > 0.85
    const isMatch = confidence > 0.85;

    return {
        isMatch,
        confidence: Math.round(confidence * 100) / 100,
        details: {
            canvas: canvasMatch,
            webgl: webglMatch,
            audio: audioMatch,
            hardware: Math.round(hardwareSimilarity * 100) / 100,
            browser: Math.round(browserSimilarity * 100) / 100,
            threshold: 0.85
        }
    };
}

// New endpoint for intelligent fingerprint comparison
app.post('/api/compare-fingerprints', (req, res) => {
    const { fingerprint1, fingerprint2 } = req.body;

    if (!fingerprint1 || !fingerprint2) {
        return res.status(400).json({
            success: false,
            error: 'Two fingerprints required for comparison'
        });
    }

    const comparison = compareFingerprints(fingerprint1, fingerprint2);

    res.json({
        success: true,
        ...comparison
    });
});


// Endpoint to get detailed statistics with entropy calculation
app.get('/api/analytics', async (req, res) => {
    try {
        const stats = await database.getStatistics();
        const entropy = await database.calculateEntropy();
        const recentFingerprints = await database.getRecentFingerprints(50);

        const analyticsData = {
            ...stats,
            entropy: entropy,
            recentActivity: recentFingerprints.length,
            recentFingerprints: recentFingerprints.map(fp => ({
                id: fp.fingerprint_id.substring(0, 16) + '...',
                hash: fp.fingerprint_hash.substring(0, 16) + '...',
                timestamp: fp.server_timestamp
            })),
            lastUpdated: new Date().toISOString()
        };

        res.json(analyticsData);
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve analytics'
        });
    }
});

// Configuration endpoint for client
app.get('/api/config', (req, res) => {
    // Send public configuration to client
    res.json({
        features: config.features,
        benchmarks: {
            cpuIterations: config.benchmarks.cpuIterations,
            memorySizeMB: config.benchmarks.memorySizeMB,
            cryptoIterations: config.benchmarks.cryptoIterations,
            timeoutMs: config.benchmarks.timeoutMs
        },
        api: {
            version: config.api.version,
            timeout: config.api.timeout
        },
        environment: config.server.nodeEnv
    });
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const stats = await database.getStatistics();
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            database: {
                type: 'SQLite',
                path: './database/fingerprints.db',
                totalFingerprints: stats.totalFingerprints,
                totalSessions: stats.totalSessions,
                uniqueFingerprints: stats.uniqueFingerprints
            },
            legacy: {
                dataDir: LOG_DIR,
                logFile: LOG_FILE
            }
        });
    } catch (error) {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            database: {
                type: 'SQLite',
                path: './database/fingerprints.db',
                status: 'error',
                error: error.message
            }
        });
    }
});

// Start server
app.listen(PORT, config.server.host, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Fingerprint Server Started`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Environment: ${config.server.nodeEnv}`);
    console.log(`Server: http://${config.server.host}:${PORT}`);
    console.log(`Data Directory: ${LOG_DIR}`);
    console.log(`\nFeatures Enabled:`);
    Object.entries(config.features).forEach(([feature, enabled]) => {
        console.log(`  ${enabled ? '✅' : '❌'} ${feature}`);
    });
    console.log(`\nAPI Endpoints:`);
    Object.entries(config.api.endpoints).forEach(([name, path]) => {
        console.log(`  ${path} - ${name}`);
    });
    console.log(`${'='.repeat(60)}\n`);
});