/**
 * Fingerprint Matching System with Similarity Thresholds
 *
 * This module implements intelligent fingerprint matching that can identify
 * the same user even when benchmarks vary between collections.
 */

class FingerprintMatcher {
    constructor() {
        // Component weights - stable components have higher weights
        this.weights = {
            canvas: 0.30,        // Very stable, unique per GPU/driver
            webgl: 0.20,         // Stable, identifies hardware
            audio: 0.20,         // Stable, identifies audio stack
            browser: 0.20,       // Semi-stable (user agent, resolution, etc)
            hardware_stable: 0.07, // Cores, memory (stable parts)
            hardware_dynamic: 0.03 // Benchmarks (variable parts)
        };

        // Similarity thresholds
        this.thresholds = {
            exact_match: 1.0,      // 100% match
            same_device: 0.85,     // 85%+ = same device
            likely_same: 0.75,     // 75-85% = likely same
            possibly_same: 0.65,   // 65-75% = possibly same
            different: 0.0         // < 65% = different device
        };
    }

    /**
     * Calculate similarity between two fingerprints
     * Returns a score between 0 and 1
     */
    calculateSimilarity(fp1, fp2) {
        if (!fp1 || !fp2) return 0;

        let totalScore = 0;
        let totalWeight = 0;

        // Canvas fingerprint comparison (exact match or not)
        if (fp1.canvas_fingerprint && fp2.canvas_fingerprint) {
            const canvasMatch = fp1.canvas_fingerprint.hash === fp2.canvas_fingerprint.hash ? 1 : 0;
            totalScore += canvasMatch * this.weights.canvas;
            totalWeight += this.weights.canvas;
        }

        // WebGL comparison
        if (fp1.webgl_fingerprint && fp2.webgl_fingerprint) {
            const webglScore = this.compareWebGL(fp1.webgl_fingerprint, fp2.webgl_fingerprint);
            totalScore += webglScore * this.weights.webgl;
            totalWeight += this.weights.webgl;
        }

        // Audio comparison
        if (fp1.audio_fingerprint && fp2.audio_fingerprint) {
            const audioMatch = fp1.audio_fingerprint.hash === fp2.audio_fingerprint.hash ? 1 : 0;
            totalScore += audioMatch * this.weights.audio;
            totalWeight += this.weights.audio;
        }

        // Browser info comparison
        if (fp1.browser_info && fp2.browser_info) {
            const browserScore = this.compareBrowserInfo(fp1.browser_info, fp2.browser_info);
            totalScore += browserScore * this.weights.browser;
            totalWeight += this.weights.browser;
        }

        // Hardware comparison (split into stable and dynamic)
        if (fp1.hardware_profile && fp2.hardware_profile) {
            const stableScore = this.compareHardwareStable(fp1.hardware_profile, fp2.hardware_profile);
            totalScore += stableScore * this.weights.hardware_stable;
            totalWeight += this.weights.hardware_stable;

            const dynamicScore = this.compareHardwareDynamic(fp1.hardware_profile, fp2.hardware_profile);
            totalScore += dynamicScore * this.weights.hardware_dynamic;
            totalWeight += this.weights.hardware_dynamic;
        }

        // Normalize score
        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    /**
     * Compare WebGL fingerprints
     */
    compareWebGL(webgl1, webgl2) {
        let score = 0;
        let components = 0;

        // Vendor match (very stable)
        if (webgl1.vendor === webgl2.vendor) {
            score += 0.6;
        }
        components += 0.6;

        // Renderer match (stable)
        if (webgl1.renderer === webgl2.renderer) {
            score += 0.3;
        }
        components += 0.3;

        // Hash match
        if (webgl1.hash === webgl2.hash) {
            score += 0.1;
        }
        components += 0.1;

        return score / components;
    }

    /**
     * Compare browser information
     */
    compareBrowserInfo(browser1, browser2) {
        let matches = 0;
        let total = 0;

        // User agent family (Chrome, Firefox, Safari) - CRITICAL for browser identification
        const ua1Family = this.getUserAgentFamily(browser1.user_agent);
        const ua2Family = this.getUserAgentFamily(browser2.user_agent);
        if (ua1Family === ua2Family) matches += 4; // Much higher weight for browser type
        total += 4;

        // Platform
        if (browser1.platform === browser2.platform) matches++;
        total++;

        // Language
        if (browser1.language === browser2.language) matches++;
        total++;

        // Screen resolution
        if (browser1.screen_resolution === browser2.screen_resolution) matches++;
        total++;

        // Color depth
        if (browser1.color_depth === browser2.color_depth) matches++;
        total++;

        // Timezone
        if (browser1.timezone_offset === browser2.timezone_offset) matches++;
        total++;

        // Hardware concurrency
        if (browser1.hardware_concurrency === browser2.hardware_concurrency) matches++;
        total++;

        return total > 0 ? matches / total : 0;
    }

    /**
     * Compare stable hardware features
     */
    compareHardwareStable(hw1, hw2) {
        let matches = 0;
        let total = 0;

        // CPU cores (very stable)
        if (hw1.cores === hw2.cores) matches += 2;
        total += 2;

        // Memory (stable)
        if (hw1.memory === hw2.memory) matches += 2;
        total += 2;

        // Concurrency (stable)
        if (hw1.concurrency === hw2.concurrency) matches++;
        total++;

        return total > 0 ? matches / total : 0;
    }

    /**
     * Compare dynamic hardware features (benchmarks)
     * Uses tolerance for variations
     */
    compareHardwareDynamic(hw1, hw2) {
        if (!hw1.benchmarks || !hw2.benchmarks) return 0;

        let totalSimilarity = 0;
        let benchmarkCount = 0;

        // Compare each benchmark with tolerance
        const benchmarks = ['math_ops', 'string_ops', 'array_ops', 'crypto_ops'];

        for (const benchmark of benchmarks) {
            if (hw1.benchmarks[benchmark] !== undefined && hw2.benchmarks[benchmark] !== undefined) {
                const similarity = this.calculateBenchmarkSimilarity(
                    hw1.benchmarks[benchmark],
                    hw2.benchmarks[benchmark]
                );
                totalSimilarity += similarity;
                benchmarkCount++;
            }
        }

        return benchmarkCount > 0 ? totalSimilarity / benchmarkCount : 0;
    }

    /**
     * Calculate similarity between two benchmark values
     * Allows for up to 20% variation
     */
    calculateBenchmarkSimilarity(val1, val2) {
        if (val1 === 0 && val2 === 0) return 1;
        if (val1 === 0 || val2 === 0) return 0;

        const ratio = Math.min(val1, val2) / Math.max(val1, val2);

        // Map ratio to similarity score
        if (ratio >= 0.9) return 1.0;      // Within 10% = perfect match
        if (ratio >= 0.8) return 0.9;      // Within 20% = very good match
        if (ratio >= 0.7) return 0.7;      // Within 30% = good match
        if (ratio >= 0.6) return 0.5;      // Within 40% = fair match
        return 0.3;                         // More than 40% difference = poor match
    }

    /**
     * Extract browser family from user agent
     */
    getUserAgentFamily(userAgent) {
        if (!userAgent) return 'unknown';

        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
        if (userAgent.includes('Edg')) return 'Edge';
        if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';

        return 'other';
    }

    /**
     * Determine if two fingerprints are from the same device
     */
    isSameDevice(fp1, fp2) {
        const similarity = this.calculateSimilarity(fp1, fp2);
        return similarity >= this.thresholds.same_device;
    }

    /**
     * Get match confidence level
     */
    getMatchConfidence(similarity) {
        if (similarity >= this.thresholds.exact_match) return 'exact';
        if (similarity >= this.thresholds.same_device) return 'high';
        if (similarity >= this.thresholds.likely_same) return 'medium';
        if (similarity >= this.thresholds.possibly_same) return 'low';
        return 'none';
    }

    /**
     * Group fingerprints by device
     * Returns array of device groups
     */
    groupFingerprintsByDevice(fingerprints) {
        const groups = [];

        for (const fp of fingerprints) {
            let foundGroup = false;

            // Try to find an existing group for this fingerprint
            for (const group of groups) {
                // Compare with the first fingerprint in the group
                const similarity = this.calculateSimilarity(fp.data || fp, group.fingerprints[0].data || group.fingerprints[0]);

                if (similarity >= this.thresholds.same_device) {
                    group.fingerprints.push(fp);
                    group.sessions.add(fp.sessionId);
                    foundGroup = true;
                    break;
                }
            }

            // Create new group if no match found
            if (!foundGroup) {
                groups.push({
                    deviceId: `device_${groups.length + 1}`,
                    fingerprints: [fp],
                    sessions: new Set([fp.sessionId])
                });
            }
        }

        return groups;
    }

    /**
     * Calculate statistics based on fingerprint similarity
     */
    calculateStatistics(logs) {
        if (!logs || logs.length === 0) {
            return {
                totalFingerprints: 0,
                uniqueDevices: 0,
                returningDevices: 0,
                averageCollectionsPerDevice: 0,
                deviceGroups: []
            };
        }

        // Group fingerprints by device
        const deviceGroups = this.groupFingerprintsByDevice(logs);

        // Calculate statistics
        const uniqueDevices = deviceGroups.length;
        const returningDevices = deviceGroups.filter(g => g.fingerprints.length > 1).length;
        const totalFingerprints = logs.length;
        const averageCollectionsPerDevice = uniqueDevices > 0
            ? (totalFingerprints / uniqueDevices).toFixed(2)
            : 0;

        return {
            totalFingerprints,
            uniqueDevices,
            returningDevices,
            averageCollectionsPerDevice,
            deviceGroups: deviceGroups.map(g => ({
                deviceId: g.deviceId,
                fingerprintCount: g.fingerprints.length,
                sessionCount: g.sessions.size,
                firstSeen: g.fingerprints[0].serverTimestamp,
                lastSeen: g.fingerprints[g.fingerprints.length - 1].serverTimestamp
            }))
        };
    }
}

module.exports = FingerprintMatcher;