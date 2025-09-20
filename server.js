const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANTE: Headers de segurança para SharedArrayBuffer
// Cross-Origin-Opener-Policy (COOP) e Cross-Origin-Embedder-Policy (COEP)
// Necessários para usar SharedArrayBuffer (Seção 4.3)
app.use((req, res, next) => {
    // Headers para contexto isolado de origem cruzada
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Headers adicionais de segurança
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    // Para recursos WASM
    if (req.path.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
    }

    next();
});

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use('/wasm', express.static('wasm-fingerprint/pkg'));
app.use('/wasm-fingerprint', express.static('wasm-fingerprint'));

// In-memory storage (for demo purposes - use database in production)
const fingerprints = new Map();
const sessions = new Map();

// File-based persistence (Seção 5.2)
const LOG_DIR = path.join(__dirname, 'data');
const LOG_FILE = path.join(LOG_DIR, 'fingerprints.log');
const STATS_FILE = path.join(LOG_DIR, 'stats.json');

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
        const fingerprintComponents = {
            proposalA: fingerprintData.proposalA || {},
            proposalB: fingerprintData.proposalB || {},
            browserAttributes: fingerprintData.browserAttributes || {}
        };

        const fingerprintId = crypto
            .createHash('sha256')
            .update(JSON.stringify(fingerprintComponents))
            .digest('hex');

        // Add server metadata
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

        // Store in memory
        fingerprints.set(fingerprintId, storedData);
        sessions.set(sessionId, fingerprintId);

        // Persist to file (append to log)
        const logEntry = JSON.stringify(storedData) + '\n';
        try {
            await fs.appendFile(LOG_FILE, logEntry);
        } catch (err) {
            console.error('Error writing to log file:', err);
        }

        // Check if this fingerprint has been seen before
        const previousSessions = Array.from(fingerprints.values())
            .filter(fp => fp.id === fingerprintId)
            .length;

        console.log(`Received fingerprint: ${fingerprintId.substring(0, 16)}...`);
        console.log(`Session ID: ${sessionId}`);
        if (fingerprintData.proposalA) {
            console.log(`Canvas: ${fingerprintData.proposalA.canvas?.substring(0, 16) || 'N/A'}...`);
            console.log(`WebGL: ${fingerprintData.proposalA.webgl?.substring(0, 30) || 'N/A'}...`);
        }
        if (fingerprintData.proposalB) {
            console.log(`Port Contention: ${fingerprintData.proposalB.portContention?.substring(0, 16) || 'N/A'}...`);
            console.log(`Distinguishers:`, fingerprintData.proposalB.distinguishers?.length || 0);
        }
        console.log(`Previous sessions with this fingerprint: ${previousSessions}`);

        // Update statistics
        await updateStatistics(fingerprintId, sessionId);

        res.json({
            success: true,
            fingerprintId: fingerprintId,
            sessionId: sessionId,
            isReturningUser: previousSessions > 1,
            sessionsCount: previousSessions,
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
app.get('/api/stats', (req, res) => {
    const stats = {
        totalFingerprints: fingerprints.size,
        totalSessions: sessions.size,
        uniqueFingerprints: new Set(
            Array.from(fingerprints.values()).map(fp => fp.id)
        ).size,
        timestamps: Array.from(fingerprints.values())
            .map(fp => fp.timestamp)
            .sort()
    };

    res.json(stats);
});

// Endpoint to get specific fingerprint data
app.get('/api/fingerprint/:id', (req, res) => {
    const fingerprintId = req.params.id;
    const data = fingerprints.get(fingerprintId);

    if (data) {
        res.json(data);
    } else {
        res.status(404).json({
            success: false,
            error: 'Fingerprint not found'
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

    const cpuDiff = Math.abs(hw1.cpu_benchmark - hw2.cpu_benchmark);
    const memDiff = Math.abs(hw1.memory_benchmark - hw2.memory_benchmark);
    const cryptoDiff = Math.abs(hw1.crypto_benchmark - hw2.crypto_benchmark);

    // Normalize differences (assuming max reasonable difference of 100ms)
    const cpuSim = Math.max(0, 1 - cpuDiff / 100);
    const memSim = Math.max(0, 1 - memDiff / 100);
    const cryptoSim = Math.max(0, 1 - cryptoDiff / 100);

    return (cpuSim + memSim + cryptoSim) / 3;
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

// Update statistics helper
async function updateStatistics(fingerprintId, sessionId) {
    try {
        let stats = {};

        // Load existing stats if available
        try {
            const data = await fs.readFile(STATS_FILE, 'utf8');
            stats = JSON.parse(data);
        } catch (err) {
            // File doesn't exist yet
            stats = {
                totalSessions: 0,
                uniqueFingerprints: new Set(),
                firstSeen: new Date().toISOString(),
                lastUpdated: null
            };
        }

        // Update stats
        stats.totalSessions = (stats.totalSessions || 0) + 1;
        if (!stats.uniqueFingerprints) stats.uniqueFingerprints = [];
        if (!stats.uniqueFingerprints.includes(fingerprintId)) {
            stats.uniqueFingerprints.push(fingerprintId);
        }
        stats.lastUpdated = new Date().toISOString();

        // Calculate entropy (simplified version)
        stats.uniqueCount = stats.uniqueFingerprints.length;
        stats.entropy = calculateSimpleEntropy(stats.uniqueFingerprints.length, stats.totalSessions);

        // Save updated stats
        await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2));

    } catch (err) {
        console.error('Error updating statistics:', err);
    }
}

// Simple entropy calculation
function calculateSimpleEntropy(uniqueCount, totalCount) {
    if (totalCount === 0) return 0;
    const probability = uniqueCount / totalCount;
    if (probability === 0 || probability === 1) return 0;
    return -probability * Math.log2(probability) - (1 - probability) * Math.log2(1 - probability);
}

// Endpoint to get detailed statistics with entropy calculation
app.get('/api/analytics', async (req, res) => {
    try {
        // Load stats from file
        let stats = {};
        try {
            const data = await fs.readFile(STATS_FILE, 'utf8');
            stats = JSON.parse(data);
        } catch (err) {
            stats = { message: 'No statistics available yet' };
        }

        // Add current in-memory data
        stats.currentSession = {
            fingerprintsInMemory: fingerprints.size,
            sessionsInMemory: sessions.size
        };

        res.json(stats);
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        dataDir: LOG_DIR,
        logFile: LOG_FILE
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Fingerprint server running on http://localhost:${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  POST /api/fingerprint - Submit fingerprint data`);
    console.log(`  GET  /api/stats - Get statistics`);
    console.log(`  GET  /api/fingerprint/:id - Get specific fingerprint`);
    console.log(`  POST /api/compare - Compare two fingerprints`);
    console.log(`  GET  /health - Health check`);
});