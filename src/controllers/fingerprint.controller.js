const crypto = require('crypto');
const fingerprintService = require('../services/fingerprint.service');
const logService = require('../services/log.service');
const FingerprintMatcher = require('../../fingerprint-matcher');
const config = require('../../config');

const collectFingerprint = async (req, res) => {
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

        await logService.appendLog(logEntry);

        console.log(`Fingerprint logged: ${fingerprintId.substring(0, 16)}...`);
        console.log(`Session ID: ${sessionId}`);

        const logs = await logService.readLogs();
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
};

const getFingerprint = async (req, res) => {
    try {
        const logs = await logService.readLogs();
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
};

const compareFingerprints = (req, res) => {
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
        similarityScore: similarity,
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
};

const getStats = async (req, res) => {
    try {
        const stats = await fingerprintService.calculateStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics'
        });
    }
};

const getAnalytics = async (req, res) => {
    try {
        const stats = await fingerprintService.calculateStats();
        const logs = await logService.readLogs();

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
};

const getConfig = (req, res) => {
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
};

module.exports = {
    collectFingerprint,
    getFingerprint,
    compareFingerprints,
    getStats,
    getAnalytics,
    getConfig
};