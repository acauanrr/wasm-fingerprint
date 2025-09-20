/**
 * Client-side Configuration
 * This file is served to the browser and contains public configuration
 */

// Determine environment and API URL dynamically
const getApiBaseUrl = () => {
    // Check if we're in production
    if (window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1') {
        // Production URL - use same origin
        return window.location.origin;
    }
    // Development URL
    return 'http://localhost:3000';
};

// Client configuration object
window.AppConfig = {
    // API Configuration
    api: {
        baseUrl: getApiBaseUrl(),
        version: 'v1',
        timeout: 30000,
        endpoints: {
            fingerprint: '/api/fingerprint',
            stats: '/api/stats',
            analytics: '/api/analytics',
            compare: '/api/compare',
            health: '/health'
        }
    },

    // Feature flags (can be overridden by server response)
    features: {
        canvas: true,
        webgl: true,
        audio: true,
        hardwareBenchmarks: true,
        portContention: true,
        highPrecisionTimer: true
    },

    // Benchmark settings
    benchmarks: {
        cpuIterations: 1000000,
        memorySize: 1048576, // 1MB
        cryptoIterations: 10000,
        timeout: 5000,
        portContentionIterations: 100000
    },

    // WASM Configuration
    wasm: {
        modulePath: '/wasm-fingerprint/pkg/wasm_fingerprint.js',
        wasmPath: '/wasm-fingerprint/pkg/wasm_fingerprint_bg.wasm',
        retryAttempts: 3,
        retryDelay: 1000
    },

    // UI Configuration
    ui: {
        showDebugInfo: window.location.hostname === 'localhost',
        animationDuration: 300,
        toastDuration: 3000,
        theme: 'dark'
    },

    // Logging Configuration
    logging: {
        enabled: window.location.hostname === 'localhost',
        level: 'info', // 'error', 'warn', 'info', 'debug'
        sendToServer: false
    },

    // Storage Configuration
    storage: {
        prefix: 'wasm_fp_',
        sessionStorageEnabled: true,
        localStorageEnabled: true,
        cacheExpiry: 3600000 // 1 hour in ms
    },

    // Privacy Configuration
    privacy: {
        requestConsent: false,
        anonymizeIP: false,
        excludeFields: []
    }
};

// Helper functions
window.AppConfig.helpers = {
    /**
     * Build full API URL
     */
    buildApiUrl: function(endpoint) {
        return `${window.AppConfig.api.baseUrl}${endpoint}`;
    },

    /**
     * Get feature flag status
     */
    isFeatureEnabled: function(feature) {
        return window.AppConfig.features[feature] !== false;
    },

    /**
     * Custom logger
     */
    log: function(level, message, data) {
        if (!window.AppConfig.logging.enabled) return;

        const levels = ['error', 'warn', 'info', 'debug'];
        const currentLevelIndex = levels.indexOf(window.AppConfig.logging.level);
        const messageLevelIndex = levels.indexOf(level);

        if (messageLevelIndex <= currentLevelIndex) {
            const timestamp = new Date().toISOString();
            const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

            switch(level) {
                case 'error':
                    console.error(prefix, message, data || '');
                    break;
                case 'warn':
                    console.warn(prefix, message, data || '');
                    break;
                case 'info':
                    console.info(prefix, message, data || '');
                    break;
                case 'debug':
                    console.log(prefix, message, data || '');
                    break;
            }

            // Send to server if enabled
            if (window.AppConfig.logging.sendToServer && level === 'error') {
                window.AppConfig.helpers.sendLogToServer(level, message, data);
            }
        }
    },

    /**
     * Send log to server
     */
    sendLogToServer: async function(level, message, data) {
        try {
            await fetch(window.AppConfig.helpers.buildApiUrl('/api/log'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    level,
                    message,
                    data,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href
                })
            });
        } catch (error) {
            // Silently fail to avoid infinite loop
        }
    },

    /**
     * Load configuration from server
     */
    loadServerConfig: async function() {
        try {
            const response = await fetch(
                window.AppConfig.helpers.buildApiUrl('/api/config'),
                { credentials: 'include' }
            );

            if (response.ok) {
                const serverConfig = await response.json();

                // Merge server config with client config
                if (serverConfig.features) {
                    Object.assign(window.AppConfig.features, serverConfig.features);
                }

                if (serverConfig.benchmarks) {
                    Object.assign(window.AppConfig.benchmarks, serverConfig.benchmarks);
                }

                window.AppConfig.helpers.log('info', 'Server configuration loaded', serverConfig);
            }
        } catch (error) {
            window.AppConfig.helpers.log('warn', 'Failed to load server config', error);
        }
    },

    /**
     * Storage helpers
     */
    storage: {
        set: function(key, value, useSession = false) {
            const storage = useSession ? sessionStorage : localStorage;
            const prefixedKey = window.AppConfig.storage.prefix + key;
            const data = {
                value: value,
                timestamp: Date.now()
            };
            storage.setItem(prefixedKey, JSON.stringify(data));
        },

        get: function(key, useSession = false) {
            const storage = useSession ? sessionStorage : localStorage;
            const prefixedKey = window.AppConfig.storage.prefix + key;
            const item = storage.getItem(prefixedKey);

            if (!item) return null;

            try {
                const data = JSON.parse(item);
                const age = Date.now() - data.timestamp;

                if (age > window.AppConfig.storage.cacheExpiry) {
                    storage.removeItem(prefixedKey);
                    return null;
                }

                return data.value;
            } catch (e) {
                return null;
            }
        },

        clear: function() {
            const storages = [localStorage, sessionStorage];
            const prefix = window.AppConfig.storage.prefix;

            storages.forEach(storage => {
                const keys = [];
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    if (key && key.startsWith(prefix)) {
                        keys.push(key);
                    }
                }
                keys.forEach(key => storage.removeItem(key));
            });
        }
    }
};

// Auto-load server config on page load (if needed)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.AppConfig.helpers.loadServerConfig();
    });
} else {
    window.AppConfig.helpers.loadServerConfig();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.AppConfig;
}