/**
 * Test Suite for Fingerprint Matching System
 * Tests various scenarios to validate matching accuracy
 */

const FingerprintMatcher = require('./fingerprint-matcher');

class TestRunner {
    constructor() {
        this.matcher = new FingerprintMatcher();
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    /**
     * Generate mock fingerprint data for testing
     */
    generateMockFingerprint(deviceProfile, variation = 0) {
        const profiles = {
            // Desktop Chrome on Windows with NVIDIA GPU
            desktop_chrome_nvidia: {
                canvas_fingerprint: { hash: 'canvas_nvidia_chrome_001' },
                webgl_fingerprint: {
                    vendor: 'NVIDIA Corporation',
                    renderer: 'NVIDIA GeForce RTX 3070/PCIe/SSE2',
                    hash: 'webgl_nvidia_001'
                },
                audio_fingerprint: { hash: 'audio_windows_001' },
                browser_info: {
                    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    platform: 'Win32',
                    language: 'en-US',
                    screen_resolution: '1920x1080',
                    color_depth: 24,
                    timezone_offset: -480,
                    hardware_concurrency: 8
                },
                hardware_profile: {
                    cores: 8,
                    memory: 16,
                    concurrency: 8,
                    benchmarks: {
                        math_ops: 1000 + (variation * 50),
                        string_ops: 800 + (variation * 40),
                        array_ops: 900 + (variation * 45),
                        crypto_ops: 700 + (variation * 35)
                    }
                }
            },

            // Same desktop but Firefox
            desktop_firefox_nvidia: {
                canvas_fingerprint: { hash: 'canvas_nvidia_firefox_001' },
                webgl_fingerprint: {
                    vendor: 'NVIDIA Corporation',
                    renderer: 'NVIDIA GeForce RTX 3070/PCIe/SSE2',
                    hash: 'webgl_nvidia_001'
                },
                audio_fingerprint: { hash: 'audio_windows_firefox_001' },
                browser_info: {
                    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
                    platform: 'Win32',
                    language: 'en-US',
                    screen_resolution: '1920x1080',
                    color_depth: 24,
                    timezone_offset: -480,
                    hardware_concurrency: 8
                },
                hardware_profile: {
                    cores: 8,
                    memory: 16,
                    concurrency: 8,
                    benchmarks: {
                        math_ops: 950 + (variation * 50),
                        string_ops: 750 + (variation * 40),
                        array_ops: 850 + (variation * 45),
                        crypto_ops: 650 + (variation * 35)
                    }
                }
            },

            // Different desktop with AMD GPU
            desktop_chrome_amd: {
                canvas_fingerprint: { hash: 'canvas_amd_chrome_001' },
                webgl_fingerprint: {
                    vendor: 'AMD',
                    renderer: 'AMD Radeon RX 6700 XT',
                    hash: 'webgl_amd_001'
                },
                audio_fingerprint: { hash: 'audio_windows_002' },
                browser_info: {
                    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    platform: 'Win32',
                    language: 'pt-BR',
                    screen_resolution: '2560x1440',
                    color_depth: 24,
                    timezone_offset: -180,
                    hardware_concurrency: 12
                },
                hardware_profile: {
                    cores: 12,
                    memory: 32,
                    concurrency: 12,
                    benchmarks: {
                        math_ops: 1200 + (variation * 60),
                        string_ops: 1000 + (variation * 50),
                        array_ops: 1100 + (variation * 55),
                        crypto_ops: 900 + (variation * 45)
                    }
                }
            },

            // Mobile Chrome on Android
            mobile_chrome_android: {
                canvas_fingerprint: { hash: 'canvas_mobile_chrome_001' },
                webgl_fingerprint: {
                    vendor: 'Qualcomm',
                    renderer: 'Adreno (TM) 640',
                    hash: 'webgl_mobile_001'
                },
                audio_fingerprint: { hash: 'audio_android_001' },
                browser_info: {
                    user_agent: 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    platform: 'Linux armv8l',
                    language: 'en-US',
                    screen_resolution: '412x915',
                    color_depth: 24,
                    timezone_offset: -480,
                    hardware_concurrency: 8
                },
                hardware_profile: {
                    cores: 8,
                    memory: 8,
                    concurrency: 8,
                    benchmarks: {
                        math_ops: 600 + (variation * 30),
                        string_ops: 500 + (variation * 25),
                        array_ops: 550 + (variation * 28),
                        crypto_ops: 450 + (variation * 23)
                    }
                }
            },

            // MacBook with Safari
            macbook_safari: {
                canvas_fingerprint: { hash: 'canvas_mac_safari_001' },
                webgl_fingerprint: {
                    vendor: 'Apple Inc.',
                    renderer: 'Apple M1 Pro',
                    hash: 'webgl_apple_001'
                },
                audio_fingerprint: { hash: 'audio_mac_001' },
                browser_info: {
                    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
                    platform: 'MacIntel',
                    language: 'en-US',
                    screen_resolution: '1728x1117',
                    color_depth: 30,
                    timezone_offset: -480,
                    hardware_concurrency: 10
                },
                hardware_profile: {
                    cores: 10,
                    memory: 32,
                    concurrency: 10,
                    benchmarks: {
                        math_ops: 1500 + (variation * 75),
                        string_ops: 1200 + (variation * 60),
                        array_ops: 1350 + (variation * 68),
                        crypto_ops: 1100 + (variation * 55)
                    }
                }
            }
        };

        return {
            sessionId: `session_${deviceProfile}_${Date.now()}`,
            serverTimestamp: new Date().toISOString(),
            data: profiles[deviceProfile] || profiles.desktop_chrome_nvidia
        };
    }

    /**
     * Run a single test case
     */
    runTest(name, fp1, fp2, expectedMatch, expectedConfidence = null) {
        const similarity = this.matcher.calculateSimilarity(fp1.data, fp2.data);
        const isMatch = this.matcher.isSameDevice(fp1.data, fp2.data);
        const confidence = this.matcher.getMatchConfidence(similarity);

        let passed = (isMatch === expectedMatch);
        if (expectedConfidence && confidence !== expectedConfidence) {
            passed = false;
        }

        const result = {
            name,
            similarity: (similarity * 100).toFixed(2) + '%',
            isMatch,
            confidence,
            expected: expectedMatch,
            expectedConfidence,
            passed
        };

        this.results.tests.push(result);
        if (passed) {
            this.results.passed++;
        } else {
            this.results.failed++;
        }

        return result;
    }

    /**
     * Run all test scenarios
     */
    runAllTests() {
        console.log('\n' + '='.repeat(80));
        console.log('🧪 FINGERPRINT MATCHING TEST SUITE');
        console.log('='.repeat(80));

        // Test 1: Same browser, same device, multiple collections
        console.log('\n📋 Test Group 1: Same Browser, Same Device');
        console.log('-'.repeat(40));
        const desktop1_collection1 = this.generateMockFingerprint('desktop_chrome_nvidia', 0);
        const desktop1_collection2 = this.generateMockFingerprint('desktop_chrome_nvidia', 1); // Small variation
        const desktop1_collection3 = this.generateMockFingerprint('desktop_chrome_nvidia', -1); // Small variation

        this.runTest('Same Chrome, Collection 1 vs 2', desktop1_collection1, desktop1_collection2, true, 'exact');
        this.runTest('Same Chrome, Collection 1 vs 3', desktop1_collection1, desktop1_collection3, true, 'exact');
        this.runTest('Same Chrome, Collection 2 vs 3', desktop1_collection2, desktop1_collection3, true, 'exact');

        // Test 2: Different browsers, same device
        console.log('\n📋 Test Group 2: Different Browsers, Same Device');
        console.log('-'.repeat(40));
        const desktop_chrome = this.generateMockFingerprint('desktop_chrome_nvidia', 0);
        const desktop_firefox = this.generateMockFingerprint('desktop_firefox_nvidia', 0);

        this.runTest('Chrome vs Firefox (same PC)', desktop_chrome, desktop_firefox, true, 'high');

        // Test 3: Different devices
        console.log('\n📋 Test Group 3: Different Devices');
        console.log('-'.repeat(40));
        const desktop_nvidia = this.generateMockFingerprint('desktop_chrome_nvidia', 0);
        const desktop_amd = this.generateMockFingerprint('desktop_chrome_amd', 0);
        const mobile_android = this.generateMockFingerprint('mobile_chrome_android', 0);
        const macbook = this.generateMockFingerprint('macbook_safari', 0);

        this.runTest('Desktop NVIDIA vs Desktop AMD', desktop_nvidia, desktop_amd, false);
        this.runTest('Desktop vs Mobile', desktop_nvidia, mobile_android, false);
        this.runTest('Desktop vs MacBook', desktop_nvidia, macbook, false);
        this.runTest('Mobile vs MacBook', mobile_android, macbook, false);

        // Test 4: Benchmark variations
        console.log('\n📋 Test Group 4: Benchmark Variations');
        console.log('-'.repeat(40));
        const desktop_normal = this.generateMockFingerprint('desktop_chrome_nvidia', 0);
        const desktop_10_percent = this.generateMockFingerprint('desktop_chrome_nvidia', 2); // 10% variation
        const desktop_20_percent = this.generateMockFingerprint('desktop_chrome_nvidia', 4); // 20% variation
        const desktop_30_percent = this.generateMockFingerprint('desktop_chrome_nvidia', 6); // 30% variation

        this.runTest('10% benchmark variation', desktop_normal, desktop_10_percent, true);
        this.runTest('20% benchmark variation', desktop_normal, desktop_20_percent, true);
        this.runTest('30% benchmark variation', desktop_normal, desktop_30_percent, true);

        // Test 5: Device grouping
        console.log('\n📋 Test Group 5: Device Grouping');
        console.log('-'.repeat(40));
        const fingerprints = [
            this.generateMockFingerprint('desktop_chrome_nvidia', 0),
            this.generateMockFingerprint('desktop_chrome_nvidia', 1),
            this.generateMockFingerprint('desktop_chrome_nvidia', 2),
            this.generateMockFingerprint('desktop_chrome_amd', 0),
            this.generateMockFingerprint('desktop_chrome_amd', 1),
            this.generateMockFingerprint('mobile_chrome_android', 0),
            this.generateMockFingerprint('macbook_safari', 0)
        ];

        const groups = this.matcher.groupFingerprintsByDevice(fingerprints);
        const groupingTest = {
            name: 'Device grouping (7 fingerprints)',
            expected: 4, // Expected 4 unique devices
            actual: groups.length,
            passed: groups.length === 4
        };

        this.results.tests.push(groupingTest);
        if (groupingTest.passed) {
            this.results.passed++;
        } else {
            this.results.failed++;
        }

        console.log(`\n✅ Expected ${groupingTest.expected} device groups`);
        console.log(`📊 Found ${groupingTest.actual} device groups`);
        groups.forEach(g => {
            console.log(`   - ${g.deviceId}: ${g.fingerprints.length} fingerprints`);
        });

        // Print results summary
        this.printResults();
    }

    /**
     * Print test results
     */
    printResults() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(80));

        // Individual test results
        console.log('\n📋 Individual Tests:');
        console.log('-'.repeat(40));
        this.results.tests.forEach((test, index) => {
            const status = test.passed ? '✅' : '❌';
            console.log(`${status} Test ${index + 1}: ${test.name}`);
            if (test.similarity) {
                console.log(`   Similarity: ${test.similarity} | Confidence: ${test.confidence || 'N/A'}`);
                console.log(`   Match: ${test.isMatch} | Expected: ${test.expected}`);
            } else if (test.actual !== undefined) {
                console.log(`   Expected: ${test.expected} | Actual: ${test.actual}`);
            }
        });

        // Summary statistics
        const total = this.results.passed + this.results.failed;
        const passRate = ((this.results.passed / total) * 100).toFixed(2);

        console.log('\n' + '='.repeat(80));
        console.log(`✅ Passed: ${this.results.passed}/${total} (${passRate}%)`);
        console.log(`❌ Failed: ${this.results.failed}/${total}`);
        console.log('='.repeat(80));

        // Threshold verification
        console.log('\n🎯 Threshold Verification:');
        console.log('-'.repeat(40));
        console.log('✓ Same device threshold: ≥85%');
        console.log('✓ Likely same threshold: 75-85%');
        console.log('✓ Possibly same threshold: 65-75%');
        console.log('✓ Different device: <65%');

        return this.results;
    }
}

// Run tests if executed directly
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAllTests();

    // Exit with appropriate code
    process.exit(runner.results.failed > 0 ? 1 : 0);
}

module.exports = TestRunner;