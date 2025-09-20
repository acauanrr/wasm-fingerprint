const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const FingerprintDatabase = require('./database/database');

// Admin authentication token (change this in production)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secure-admin-token-here';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
    // Check for token in header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Check for basic auth
    const basicAuth = req.headers['authorization'];
    if (basicAuth && basicAuth.startsWith('Basic ')) {
        const base64Credentials = basicAuth.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            return next();
        }
    }

    // Check for token in query params
    const queryToken = req.query.token;

    if (token === ADMIN_TOKEN || queryToken === ADMIN_TOKEN) {
        next();
    } else {
        // For browser access, send WWW-Authenticate header
        if (req.path === '/admin' && !authHeader && !queryToken) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
        }
        res.status(401).json({
            success: false,
            error: 'Unauthorized. Please provide valid admin credentials.'
        });
    }
}
app.use(express.static('public'));
app.use('/wasm', express.static('wasm-fingerprint/pkg'));
app.use('/wasm-fingerprint', express.static('wasm-fingerprint'));

// Initialize SQLite database with proper path for Heroku
// On Heroku, we need to use /tmp for writable storage (ephemeral)
const dbPath = process.env.DATABASE_PATH || (process.env.NODE_ENV === 'production' ? '/tmp/fingerprints.db' : './database/fingerprints.db');
const database = new FingerprintDatabase(dbPath);

// Initialize database on startup
database.initialize().then(() => {
    console.log('Database initialized successfully');
}).catch(err => {
    console.error('Failed to initialize database:', err);
});

// Legacy file-based storage (optional backup)
// On Heroku, use /tmp for writable storage
const LOG_DIR = process.env.NODE_ENV === 'production' ? '/tmp/data' : path.join(__dirname, config.storage.dataDir);
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

// Admin endpoint to download database
app.get('/admin/database/download', authenticateAdmin, (req, res) => {
    const actualDbPath = process.env.DATABASE_PATH || (process.env.NODE_ENV === 'production' ? '/tmp/fingerprints.db' : path.join(__dirname, 'database', 'fingerprints.db'));

    if (!fsSync.existsSync(actualDbPath)) {
        return res.status(404).json({
            success: false,
            error: 'Database file not found at: ' + actualDbPath
        });
    }

    res.download(actualDbPath, 'fingerprints.db', (err) => {
        if (err) {
            console.error('Error downloading database:', err);
            res.status(500).json({
                success: false,
                error: 'Failed to download database'
            });
        }
    });
});

// Admin endpoint to get raw database records
app.get('/admin/database/records', authenticateAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const records = await database.getAllRecords(limit, offset);
        const stats = await database.getStatistics();

        res.json({
            success: true,
            stats: stats,
            records: records,
            pagination: {
                limit: limit,
                offset: offset,
                total: stats.totalSessions
            }
        });
    } catch (error) {
        console.error('Error fetching records:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch database records'
        });
    }
});

// Admin endpoint to execute custom SQL queries (READ ONLY)
app.post('/admin/database/query', authenticateAdmin, async (req, res) => {
    try {
        const { query } = req.body;

        // Only allow SELECT queries for safety
        if (!query || !query.trim().toUpperCase().startsWith('SELECT')) {
            return res.status(400).json({
                success: false,
                error: 'Only SELECT queries are allowed'
            });
        }

        const results = await database.executeQuery(query);

        res.json({
            success: true,
            results: results,
            count: results.length
        });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Admin endpoint to reset database and logs
app.post('/admin/database/reset', authenticateAdmin, async (req, res) => {
    try {
        console.log('Admin requested database reset');

        // Reset database using the reset method
        await database.reset();
        console.log('Database tables cleared successfully');

        // Delete log file
        if (fsSync.existsSync(LOG_FILE)) {
            fsSync.unlinkSync(LOG_FILE);
            console.log('Log file deleted:', LOG_FILE);
        }

        // Recreate log file
        fsSync.writeFileSync(LOG_FILE, '');
        console.log('New log file created');

        res.json({
            success: true,
            message: 'Database and logs have been reset successfully',
            timestamp: new Date().toISOString(),
            details: {
                database: 'All tables cleared',
                logs: 'Log file reset',
                path: dbPath
            }
        });
    } catch (error) {
        console.error('Error resetting database:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset database: ' + error.message
        });
    }
});

// Admin endpoint to get log file
app.get('/admin/logs/download', authenticateAdmin, async (req, res) => {
    try {
        if (!fsSync.existsSync(LOG_FILE)) {
            return res.status(404).json({
                success: false,
                error: 'Log file not found'
            });
        }

        res.download(LOG_FILE, 'fingerprints.log', (err) => {
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
});

// Admin dashboard endpoint
app.get('/admin', authenticateAdmin, (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Fingerprint System</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 14px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .card h2 {
            color: #764ba2;
            font-size: 18px;
            margin-bottom: 15px;
        }
        .stat {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .stat:last-child {
            border-bottom: none;
        }
        .stat-label {
            color: #666;
        }
        .stat-value {
            font-weight: bold;
            color: #333;
        }
        .actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .btn {
            display: inline-block;
            padding: 12px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            text-align: center;
            transition: transform 0.2s;
            border: none;
            cursor: pointer;
            font-size: 14px;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(118, 75, 162, 0.3);
        }
        .query-box {
            margin-top: 20px;
        }
        textarea {
            width: 100%;
            min-height: 100px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            margin-bottom: 10px;
        }
        .results {
            background: #f5f5f5;
            border-radius: 5px;
            padding: 15px;
            margin-top: 20px;
            max-height: 400px;
            overflow: auto;
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .loading {
            text-align: center;
            color: #666;
            padding: 20px;
        }
        .error {
            background: #fee;
            color: #c00;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
        }
        .success {
            background: #efe;
            color: #060;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Admin Dashboard</h1>
            <div class="subtitle">Fingerprint System Management</div>
        </div>

        <div class="grid">
            <div class="card">
                <h2>📊 Database Statistics</h2>
                <div id="stats">
                    <div class="loading">Loading statistics...</div>
                </div>
            </div>

            <div class="card">
                <h2>📥 Download Data</h2>
                <div class="actions">
                    <a href="/admin/database/download?token=${ADMIN_TOKEN}" class="btn">Download Database</a>
                    <a href="/admin/logs/download?token=${ADMIN_TOKEN}" class="btn">Download Logs</a>
                    <button onclick="viewRecords()" class="btn">View Records</button>
                </div>
            </div>

            <div class="card">
                <h2>⚠️ Database Management</h2>
                <div class="actions">
                    <button onclick="resetDatabase()" class="btn" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);">
                        🗑️ Reset Database and Logs
                    </button>
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: #999;">
                    This will permanently delete all collected fingerprints and logs.
                </div>
            </div>
        </div>

        <div class="card">
            <h2>🔍 SQL Query Console (Read-Only)</h2>
            <div class="query-box">
                <textarea id="sqlQuery" placeholder="Enter SELECT query...\n\nExamples:\nSELECT * FROM fingerprints LIMIT 10;\nSELECT COUNT(*) as total FROM fingerprints;\nSELECT DISTINCT fingerprint_hash FROM fingerprints;">SELECT * FROM fingerprints ORDER BY server_timestamp DESC LIMIT 10;</textarea>
                <button onclick="executeQuery()" class="btn">Execute Query</button>
            </div>
            <div id="queryResults"></div>
        </div>

        <div class="card" id="recordsCard" style="display:none;">
            <h2>📝 Recent Records</h2>
            <div id="records">
                <div class="loading">Loading records...</div>
            </div>
        </div>
    </div>

    <script>
        const token = '${ADMIN_TOKEN}';
        const urlParams = new URLSearchParams(window.location.search);
        const hasToken = urlParams.has('token');

        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const stats = await response.json();

                document.getElementById('stats').innerHTML = \`
                    <div class="stat">
                        <span class="stat-label">Total Sessions</span>
                        <span class="stat-value">\${stats.totalSessions || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Unique Fingerprints</span>
                        <span class="stat-value">\${stats.uniqueFingerprints || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Total Fingerprints</span>
                        <span class="stat-value">\${stats.totalFingerprints || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Average Sessions</span>
                        <span class="stat-value">\${stats.averageSessionsPerFingerprint?.toFixed(2) || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Returning Users</span>
                        <span class="stat-value">\${stats.returningUsers || 0}</span>
                    </div>
                \`;
            } catch (error) {
                document.getElementById('stats').innerHTML = '<div class="error">Failed to load statistics</div>';
            }
        }

        async function viewRecords() {
            document.getElementById('recordsCard').style.display = 'block';
            try {
                const response = await fetch('/admin/database/records?token=' + token + '&limit=20');
                const data = await response.json();

                if (data.success) {
                    const recordsHtml = data.records.map(record => \`
                        <div class="stat">
                            <span class="stat-label">\${new Date(record.server_timestamp).toLocaleString()}</span>
                            <span class="stat-value">\${record.fingerprint_hash?.substring(0, 16)}...</span>
                        </div>
                    \`).join('');

                    document.getElementById('records').innerHTML = recordsHtml || '<div class="error">No records found</div>';
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                document.getElementById('records').innerHTML = '<div class="error">Failed to load records: ' + error.message + '</div>';
            }
        }

        async function executeQuery() {
            const query = document.getElementById('sqlQuery').value;
            const resultsDiv = document.getElementById('queryResults');

            resultsDiv.innerHTML = '<div class="loading">Executing query...</div>';

            try {
                const response = await fetch('/admin/database/query', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ query })
                });

                const data = await response.json();

                if (data.success) {
                    resultsDiv.innerHTML = \`
                        <div class="success">Query executed successfully. Found \${data.count} results.</div>
                        <div class="results">
                            <pre>\${JSON.stringify(data.results, null, 2)}</pre>
                        </div>
                    \`;
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                resultsDiv.innerHTML = '<div class="error">Error: ' + error.message + '</div>';
            }
        }

        async function resetDatabase() {
            const confirmMessage = \`⚠️ WARNING: Database Reset\n\nThis action will permanently delete:\n• All collected fingerprints\n• All session data\n• All log files\n\nAre you absolutely sure you want to reset the database?\n\nType 'RESET' to confirm:\`;

            const userInput = prompt(confirmMessage);

            if (userInput !== 'RESET') {
                alert('Reset cancelled. Database was not modified.');
                return;
            }

            const secondConfirm = confirm('Final confirmation: Reset database and delete all data?');

            if (!secondConfirm) {
                alert('Reset cancelled. Database was not modified.');
                return;
            }

            try {
                const response = await fetch('/admin/database/reset', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });

                const data = await response.json();

                if (data.success) {
                    alert('✅ Database reset successfully!\n\nAll data has been cleared.');
                    // Reload stats
                    loadStats();
                    // Clear any displayed records
                    document.getElementById('records').innerHTML = '<div class="loading">No records - database is empty</div>';
                    document.getElementById('queryResults').innerHTML = '';
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                alert('❌ Error resetting database: ' + error.message);
            }
        }

        // Load stats on page load
        loadStats();
        setInterval(loadStats, 30000); // Refresh every 30 seconds
    </script>
</body>
</html>
`;
    res.send(html);
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
                path: dbPath,
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
                path: dbPath,
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