const FingerprintMatcher = require('../../fingerprint-matcher');
const logService = require('./log.service');

const calculateStats = async () => {
    const logs = await logService.readLogs();

    const matcher = new FingerprintMatcher();
    const stats = matcher.calculateStatistics(logs);

    stats.recentActivity = logs.filter(entry => {
        const entryTime = new Date(entry.serverTimestamp || entry.clientTimestamp);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return entryTime > dayAgo;
    }).length;

    return {
        totalFingerprints: stats.totalFingerprints,
        uniqueFingerprints: stats.uniqueDevices,
        totalSessions: stats.uniqueDevices,
        returningUsers: stats.returningDevices,
        averageSessionsPerFingerprint: stats.averageCollectionsPerDevice,
        recentActivity: stats.recentActivity,
        deviceGroups: stats.deviceGroups
    };
};

module.exports = {
    calculateStats
};