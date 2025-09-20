const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const FingerprintMatcher = require('./fingerprint-matcher');

// Admin authentication
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-secure-admin-token-here';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const app = express();
const PORT = config.server.port;

// Security headers middleware
app.use((req, res, next) => {
    if (config.security.enableCoopCoep) {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }
    if (req.path.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
    }
    next();
});

// CORS and body parser
app.use(cors(config.security.cors));
app.use(bodyParser.json({ limit: '10mb' }));

// Rate limiting
if (config.security.rateLimit.enabled) {
    const rateLimit = require('express-rate-limit');
    const limiter = rateLimit({
        windowMs: config.security.rateLimit.windowMs,
        max: config.security.rateLimit.maxRequests,
        message: 'Too many requests from this IP'
    });
    app.use('/api/', limiter);
}

// Static files
app.use(express.static('public'));
app.use('/wasm', express.static('wasm-fingerprint/pkg'));
app.use('/wasm-fingerprint', express.static('wasm-fingerprint'));

// Log file path - use /tmp in production for Heroku
const LOG_DIR = process.env.NODE_ENV === 'production' ? '/tmp/data' : path.join(__dirname, 'data');
const LOG_FILE = path.join(LOG_DIR, 'fingerprints.log');

// Ensure data directory exists
if (!fsSync.existsSync(LOG_DIR)) {
    fsSync.mkdirSync(LOG_DIR, { recursive: true });
}

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
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
}

// Helper function to read all logs
async function readLogs() {
    try {
        if (!fsSync.existsSync(LOG_FILE)) {
            return [];
        }
        const content = await fs.readFile(LOG_FILE, 'utf-8');
        return content.trim().split('\n').filter(line => line).map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        }).filter(entry => entry);
    } catch (error) {
        console.error('Error reading logs:', error);
        return [];
    }
}

// Calculate statistics from logs using fingerprint matching
async function calculateStats() {
    const logs = await readLogs();

    // Use FingerprintMatcher to identify unique devices
    const matcher = new FingerprintMatcher();
    const stats = matcher.calculateStatistics(logs);

    // Add recent activity count
    stats.recentActivity = logs.filter(entry => {
        const entryTime = new Date(entry.serverTimestamp || entry.clientTimestamp);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return entryTime > dayAgo;
    }).length;

    // Rename for backwards compatibility
    return {
        totalFingerprints: stats.totalFingerprints,
        uniqueFingerprints: stats.uniqueDevices,  // Now based on fingerprint similarity!
        totalSessions: stats.uniqueDevices,
        returningUsers: stats.returningDevices,
        averageSessionsPerFingerprint: stats.averageCollectionsPerDevice,
        recentActivity: stats.recentActivity,
        deviceGroups: stats.deviceGroups  // New: detailed device grouping info
    };
}

// API endpoint to receive fingerprint data
app.post('/api/fingerprint', async (req, res) => {
    try {
        const fingerprintData = req.body;

        if (!fingerprintData || !fingerprintData.sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid fingerprint payload'
            });
        }

        const sessionId = fingerprintData.sessionId || crypto.randomBytes(16).toString('hex');
        const fingerprintId = crypto
            .createHash('sha256')
            .update(JSON.stringify(fingerprintData))
            .digest('hex');

        const logEntry = {
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

        // Append to log file
        const logLine = JSON.stringify(logEntry) + '\n';
        await fs.appendFile(LOG_FILE, logLine);

        console.log(`Fingerprint logged: ${fingerprintId.substring(0, 16)}...`);
        console.log(`Session ID: ${sessionId}`);

        // Check if returning user
        const logs = await readLogs();
        const sessionCount = logs.filter(log =>
            log.data && log.data.fingerprint_hash === fingerprintData.fingerprint_hash
        ).length;

        res.json({
            success: true,
            fingerprintId: fingerprintId,
            sessionId: sessionId,
            isReturningUser: sessionCount > 1,
            sessionsCount: sessionCount,
            timestamp: logEntry.serverTimestamp
        });

    } catch (error) {
        console.error('Error processing fingerprint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process fingerprint'
        });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await calculateStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics'
        });
    }
});

// Get specific fingerprint
app.get('/api/fingerprint/:id', async (req, res) => {
    try {
        const logs = await readLogs();
        const fingerprint = logs.find(log => log.id === req.params.id);

        if (fingerprint) {
            res.json(fingerprint);
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

// Compare fingerprints using intelligent matching
app.post('/api/compare-fingerprints', (req, res) => {
    const { fingerprint1, fingerprint2 } = req.body;

    if (!fingerprint1 || !fingerprint2) {
        return res.status(400).json({
            success: false,
            error: 'Two fingerprints required for comparison'
        });
    }

    const matcher = new FingerprintMatcher();
    const similarity = matcher.calculateSimilarity(fingerprint1, fingerprint2);
    const isMatch = matcher.isSameDevice(fingerprint1, fingerprint2);
    const confidence = matcher.getMatchConfidence(similarity);

    res.json({
        success: true,
        isMatch,
        similarity: (similarity * 100).toFixed(1) + '%',
        similarityScore: similarity,  // Return numeric value too
        confidence,
        details: {
            canvas: fingerprint1.canvas_fingerprint?.hash === fingerprint2.canvas_fingerprint?.hash,
            webgl: fingerprint1.webgl_fingerprint?.hash === fingerprint2.webgl_fingerprint?.hash,
            audio: fingerprint1.audio_fingerprint?.hash === fingerprint2.audio_fingerprint?.hash,
            browser: matcher.compareBrowserInfo(fingerprint1.browser_info || {}, fingerprint2.browser_info || {}),
            hardware: Math.max(
                matcher.compareHardwareStable(fingerprint1.hardware_profile || {}, fingerprint2.hardware_profile || {}),
                matcher.compareHardwareDynamic(fingerprint1.hardware_profile || {}, fingerprint2.hardware_profile || {})
            )
        },
        thresholds: {
            sameDevice: '85%+',
            likely: '75-85%',
            possible: '65-75%',
            different: '<65%'
        }
    });
});

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
    try {
        const stats = await calculateStats();
        const logs = await readLogs();

        res.json({
            ...stats,
            recentFingerprints: logs.slice(-10).map(fp => ({
                id: fp.id.substring(0, 16) + '...',
                timestamp: fp.serverTimestamp
            })),
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve analytics'
        });
    }
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
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

// Health check
app.get('/health', async (req, res) => {
    try {
        const stats = await calculateStats();
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            storage: {
                type: 'JSON Log File',
                path: LOG_FILE,
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
                path: LOG_FILE,
                status: 'error',
                error: error.message
            }
        });
    }
});

// Admin: Reset logs
app.post('/admin/reset', authenticateAdmin, async (req, res) => {
    try {
        console.log('Admin requested reset');

        // Delete log file if it exists
        if (fsSync.existsSync(LOG_FILE)) {
            await fs.unlink(LOG_FILE);
            console.log('Log file deleted');
        }

        // Create empty log file
        await fs.writeFile(LOG_FILE, '');
        console.log('New log file created');

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
});

// Admin: Download logs
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

// Admin: View logs as JSON
app.get('/admin/logs/view', authenticateAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await readLogs();

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
});

// Admin dashboard
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
        .btn-danger {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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
            <div class="subtitle">Fingerprint System Management (JSON Log Based)</div>
        </div>

        <div class="grid">
            <div class="card">
                <h2>📊 Statistics</h2>
                <div id="stats">
                    <div class="loading">Loading statistics...</div>
                </div>
            </div>

            <div class="card">
                <h2>📥 Data Management</h2>
                <div class="actions">
                    <a href="/admin/logs/download?token=${ADMIN_TOKEN}" class="btn">Download Logs</a>
                    <button onclick="viewLogs()" class="btn">View Recent Logs</button>
                    <button onclick="resetLogs()" class="btn btn-danger">🗑️ Reset All Logs</button>
                </div>
            </div>
        </div>

        <div class="card" id="logsCard" style="display:none;">
            <h2>📝 Recent Logs</h2>
            <div id="logs" class="results">
                <div class="loading">Loading logs...</div>
            </div>
        </div>
    </div>

    <script>
        const token = '${ADMIN_TOKEN}';

        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const stats = await response.json();

                document.getElementById('stats').innerHTML = \`
                    <div class="stat">
                        <span class="stat-label">Total Fingerprints</span>
                        <span class="stat-value">\${stats.totalFingerprints || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Unique Fingerprints</span>
                        <span class="stat-value">\${stats.uniqueFingerprints || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Returning Users</span>
                        <span class="stat-value">\${stats.returningUsers || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Avg Sessions/User</span>
                        <span class="stat-value">\${stats.averageSessionsPerFingerprint || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Last 24h Activity</span>
                        <span class="stat-value">\${stats.recentActivity || 0}</span>
                    </div>
                \`;
            } catch (error) {
                document.getElementById('stats').innerHTML = '<div class="error">Failed to load statistics</div>';
            }
        }

        async function viewLogs() {
            document.getElementById('logsCard').style.display = 'block';
            try {
                const response = await fetch('/admin/logs/view?token=' + token + '&limit=20');
                const data = await response.json();

                if (data.success) {
                    const logsHtml = data.logs.map(log => \`
                        <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 5px;">
                            <strong>ID:</strong> \${log.id?.substring(0, 16)}...<br>
                            <strong>Time:</strong> \${new Date(log.serverTimestamp).toLocaleString()}<br>
                            <strong>Session:</strong> \${log.sessionId}<br>
                            <strong>Hash:</strong> \${log.data?.fingerprint_hash?.substring(0, 16) || 'N/A'}...
                        </div>
                    \`).join('');

                    document.getElementById('logs').innerHTML = logsHtml || '<div class="error">No logs found</div>';
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                document.getElementById('logs').innerHTML = '<div class="error">Failed to load logs: ' + error.message + '</div>';
            }
        }

        async function resetLogs() {
            const confirmMessage = '⚠️ WARNING: Reset All Logs\\n\\nThis action will permanently delete all collected fingerprint logs.\\n\\nType \\'RESET\\' to confirm:';
            const userInput = prompt(confirmMessage);

            if (userInput !== 'RESET') {
                alert('Reset cancelled. Logs were not modified.');
                return;
            }

            const secondConfirm = confirm('Final confirmation: Delete all logs?');
            if (!secondConfirm) {
                alert('Reset cancelled. Logs were not modified.');
                return;
            }

            try {
                const response = await fetch('/admin/reset', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });

                const data = await response.json();

                if (data.success) {
                    alert('✅ Logs reset successfully!\\n\\nAll data has been cleared.');
                    loadStats();
                    document.getElementById('logs').innerHTML = '<div class="loading">No logs - system is empty</div>';
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                alert('❌ Error resetting logs: ' + error.message);
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

// Start server
app.listen(PORT, config.server.host, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Fingerprint Server Started (Simplified JSON Version)`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Environment: ${config.server.nodeEnv}`);
    console.log(`Server: http://${config.server.host}:${PORT}`);
    console.log(`Log File: ${LOG_FILE}`);
    console.log(`\nFeatures Enabled:`);
    Object.entries(config.features).forEach(([feature, enabled]) => {
        console.log(`  ${enabled ? '✅' : '❌'} ${feature}`);
    });
    console.log(`${'='.repeat(60)}\n`);
});

module.exports = app;