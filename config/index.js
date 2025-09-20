/**
 * Centralized Configuration Module
 * Loads and validates environment variables
 */

require('dotenv').config();

// Helper function to parse boolean env vars
const parseBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
};

// Helper function to parse integer env vars
const parseInt = (value, defaultValue) => {
    const parsed = Number.parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
};

// Helper function to get env var with default
const getEnv = (key, defaultValue) => {
    return process.env[key] !== undefined ? process.env[key] : defaultValue;
};

const config = {
    // Server Configuration
    server: {
        nodeEnv: getEnv('NODE_ENV', 'development'),
        port: parseInt(process.env.PORT, 3000),
        host: getEnv('HOST', 'localhost'),
        isProduction: process.env.NODE_ENV === 'production',
        isDevelopment: process.env.NODE_ENV !== 'production',
    },

    // API Configuration
    api: {
        baseUrl: getEnv('API_BASE_URL', 'http://localhost:3000'),
        version: getEnv('API_VERSION', 'v1'),
        timeout: parseInt(process.env.API_TIMEOUT, 30000),
        endpoints: {
            fingerprint: '/api/fingerprint',
            stats: '/api/stats',
            analytics: '/api/analytics',
            compare: '/api/compare',
            health: '/health'
        }
    },

    // Security Configuration
    security: {
        enableCoopCoep: parseBoolean(process.env.ENABLE_COOP_COEP, true),
        cors: {
            origin: getEnv('CORS_ORIGIN', '*'),
            credentials: parseBoolean(process.env.CORS_CREDENTIALS, true),
            methods: ['GET', 'POST', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        },
        rateLimit: {
            enabled: parseBoolean(process.env.ENABLE_RATE_LIMIT, false),
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 60000),
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
        }
    },

    // Data Storage Configuration
    storage: {
        dataDir: getEnv('DATA_DIR', './data'),
        logFile: getEnv('LOG_FILE', 'fingerprints.log'),
        statsFile: getEnv('STATS_FILE', 'stats.json'),
        maxLogSizeMB: parseInt(process.env.MAX_LOG_SIZE_MB, 100),
        maxFingerprintAgeDays: parseInt(process.env.MAX_FINGERPRINT_AGE_DAYS, 30),
    },

    // Logging Configuration
    logging: {
        level: getEnv('LOG_LEVEL', 'info'),
        format: getEnv('LOG_FORMAT', 'json'),
        enableConsole: parseBoolean(process.env.ENABLE_CONSOLE_LOG, true),
        levels: ['error', 'warn', 'info', 'debug', 'trace'],
    },

    // Feature Flags
    features: {
        canvas: parseBoolean(process.env.ENABLE_CANVAS, true),
        webgl: parseBoolean(process.env.ENABLE_WEBGL, true),
        audio: parseBoolean(process.env.ENABLE_AUDIO, true),
        hardwareBenchmarks: parseBoolean(process.env.ENABLE_HARDWARE_BENCHMARKS, true),
        portContention: parseBoolean(process.env.ENABLE_PORT_CONTENTION, true),
        analytics: parseBoolean(process.env.ENABLE_ANALYTICS, true),
    },

    // Benchmark Configuration
    benchmarks: {
        cpuIterations: parseInt(process.env.BENCHMARK_CPU_ITERATIONS, 1000000),
        memorySizeMB: parseInt(process.env.BENCHMARK_MEMORY_SIZE_MB, 1),
        cryptoIterations: parseInt(process.env.BENCHMARK_CRYPTO_ITERATIONS, 10000),
        timeoutMs: parseInt(process.env.BENCHMARK_TIMEOUT_MS, 5000),
    },

    // Database Configuration (for future use)
    database: {
        type: getEnv('DB_TYPE', 'sqlite'),
        host: getEnv('DB_HOST', 'localhost'),
        port: parseInt(process.env.DB_PORT, 5432),
        name: getEnv('DB_NAME', 'fingerprints'),
        user: getEnv('DB_USER', 'admin'),
        password: getEnv('DB_PASSWORD', ''),
        enabled: parseBoolean(process.env.DB_ENABLED, false),
    },

    // Redis Configuration (for future use)
    redis: {
        enabled: parseBoolean(process.env.REDIS_ENABLED, false),
        host: getEnv('REDIS_HOST', 'localhost'),
        port: parseInt(process.env.REDIS_PORT, 6379),
        password: getEnv('REDIS_PASSWORD', ''),
    },

    // External Services
    external: {
        geoipApiKey: getEnv('GEOIP_API_KEY', ''),
        threatIntelApiKey: getEnv('THREAT_INTEL_API_KEY', ''),
    }
};

// Validate configuration
const validateConfig = () => {
    const errors = [];

    // Validate port
    if (config.server.port < 1 || config.server.port > 65535) {
        errors.push(`Invalid port: ${config.server.port}`);
    }

    // Validate log level
    if (!config.logging.levels.includes(config.logging.level)) {
        errors.push(`Invalid log level: ${config.logging.level}`);
    }

    // Validate benchmark settings
    if (config.benchmarks.cpuIterations < 100) {
        errors.push('CPU iterations too low (min: 100)');
    }

    if (config.benchmarks.timeoutMs < 100) {
        errors.push('Benchmark timeout too low (min: 100ms)');
    }

    if (errors.length > 0) {
        console.error('Configuration validation failed:');
        errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
    }
};

// Validate on load
if (process.env.NODE_ENV !== 'test') {
    validateConfig();
}

// Export configuration
module.exports = config;