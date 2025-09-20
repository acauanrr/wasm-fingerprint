const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class FingerprintDatabase {
    constructor(dbPath = './database/fingerprints.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.initPromise = null;
    }

    // Initialize the database connection and schema
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Create database connection
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                    return;
                }

                console.log('Connected to SQLite database:', this.dbPath);

                // Load and execute schema
                const schemaPath = path.join(__dirname, 'schema.sql');
                const schema = fs.readFileSync(schemaPath, 'utf8');

                this.db.exec(schema, (err) => {
                    if (err) {
                        console.error('Error creating schema:', err);
                        reject(err);
                        return;
                    }

                    console.log('Database schema initialized successfully');
                    resolve();
                });
            });
        });

        return this.initPromise;
    }

    // Store a complete fingerprint
    async storeFingerprint(fingerprintData) {
        await this.initialize();

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                try {
                    // Insert main fingerprint record
                    const fingerprintStmt = this.db.prepare(`
                        INSERT INTO fingerprints (
                            fingerprint_id, session_id, fingerprint_hash,
                            client_timestamp
                        ) VALUES (?, ?, ?, ?)
                    `);

                    fingerprintStmt.run([
                        fingerprintData.id,
                        fingerprintData.sessionId,
                        fingerprintData.data.fingerprint_hash,
                        fingerprintData.clientTimestamp
                    ]);
                    fingerprintStmt.finalize();

                    // Insert browser info
                    if (fingerprintData.data.browser_info) {
                        const browserStmt = this.db.prepare(`
                            INSERT INTO browser_info (
                                fingerprint_id, user_agent, language, platform,
                                hardware_concurrency, device_memory, screen_width,
                                screen_height, screen_resolution, color_depth,
                                timezone_offset, plugins_count
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);

                        const bi = fingerprintData.data.browser_info;
                        browserStmt.run([
                            fingerprintData.id,
                            bi.user_agent, bi.language, bi.platform,
                            bi.hardware_concurrency, bi.device_memory, bi.screen_width,
                            bi.screen_height, bi.screen_resolution, bi.color_depth,
                            bi.timezone_offset, bi.plugins_count
                        ]);
                        browserStmt.finalize();
                    }

                    // Insert canvas fingerprint
                    if (fingerprintData.data.canvas_fingerprint) {
                        const canvasStmt = this.db.prepare(`
                            INSERT INTO canvas_fingerprints (
                                fingerprint_id, hash, data_url
                            ) VALUES (?, ?, ?)
                        `);

                        const cf = fingerprintData.data.canvas_fingerprint;
                        canvasStmt.run([fingerprintData.id, cf.hash, cf.data_url]);
                        canvasStmt.finalize();
                    }

                    // Insert WebGL fingerprint
                    if (fingerprintData.data.webgl_fingerprint) {
                        const webglStmt = this.db.prepare(`
                            INSERT INTO webgl_fingerprints (
                                fingerprint_id, hash, vendor, renderer
                            ) VALUES (?, ?, ?, ?)
                        `);

                        const wf = fingerprintData.data.webgl_fingerprint;
                        webglStmt.run([fingerprintData.id, wf.hash, wf.vendor, wf.renderer]);
                        webglStmt.finalize();
                    }

                    // Insert audio fingerprint
                    if (fingerprintData.data.audio_fingerprint) {
                        const audioStmt = this.db.prepare(`
                            INSERT INTO audio_fingerprints (
                                fingerprint_id, hash, sample_rate
                            ) VALUES (?, ?, ?)
                        `);

                        const af = fingerprintData.data.audio_fingerprint;
                        audioStmt.run([fingerprintData.id, af.hash, af.sample_rate]);
                        audioStmt.finalize();
                    }

                    // Insert hardware profile
                    if (fingerprintData.data.hardware_profile) {
                        const hardwareStmt = this.db.prepare(`
                            INSERT INTO hardware_profiles (
                                fingerprint_id, cores, memory, concurrency,
                                cpu_benchmark, memory_benchmark, crypto_benchmark,
                                instruction_timing, port_contention_hash
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);

                        const hp = fingerprintData.data.hardware_profile;
                        hardwareStmt.run([
                            fingerprintData.id,
                            hp.cores, hp.memory, hp.concurrency,
                            hp.cpu_benchmark, hp.memory_benchmark, hp.crypto_benchmark,
                            JSON.stringify(hp.instruction_timing), hp.port_contention_hash
                        ]);
                        hardwareStmt.finalize();

                        // Insert hardware benchmarks if available
                        if (hp.benchmarks) {
                            const benchmarkStmt = this.db.prepare(`
                                INSERT INTO hardware_benchmarks (
                                    fingerprint_id, math_ops, string_ops, array_ops, crypto_ops
                                ) VALUES (?, ?, ?, ?, ?)
                            `);

                            const b = hp.benchmarks;
                            benchmarkStmt.run([
                                fingerprintData.id,
                                b.math_ops, b.string_ops, b.array_ops, b.crypto_ops
                            ]);
                            benchmarkStmt.finalize();
                        }
                    }

                    // Insert session metadata
                    if (fingerprintData.metadata) {
                        const metadataStmt = this.db.prepare(`
                            INSERT INTO session_metadata (
                                fingerprint_id, ip_address, user_agent, referer, accept_language
                            ) VALUES (?, ?, ?, ?, ?)
                        `);

                        const m = fingerprintData.metadata;
                        metadataStmt.run([
                            fingerprintData.id,
                            m.ip, m.userAgent, m.referer, m.acceptLanguage
                        ]);
                        metadataStmt.finalize();
                    }

                    // Update or insert session tracking
                    this.updateSessionTracking(fingerprintData.sessionId, fingerprintData.id);

                    this.db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            reject(err);
                        } else {
                            resolve(fingerprintData.id);
                        }
                    });

                } catch (error) {
                    this.db.run('ROLLBACK');
                    reject(error);
                }
            });
        });
    }

    // Update session tracking
    updateSessionTracking(sessionId, fingerprintId) {
        const updateStmt = this.db.prepare(`
            INSERT INTO sessions (session_id, fingerprint_id, visit_count)
            VALUES (?, ?, 1)
            ON CONFLICT(session_id) DO UPDATE SET
                last_seen = CURRENT_TIMESTAMP,
                visit_count = visit_count + 1
        `);

        updateStmt.run([sessionId, fingerprintId]);
        updateStmt.finalize();
    }

    // Get fingerprint by ID
    async getFingerprint(fingerprintId) {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const query = `
                SELECT
                    f.*,
                    bi.* as browser_info,
                    cf.* as canvas_fingerprint,
                    wf.* as webgl_fingerprint,
                    af.* as audio_fingerprint,
                    hp.* as hardware_profile,
                    hb.* as hardware_benchmarks,
                    sm.* as session_metadata
                FROM fingerprints f
                LEFT JOIN browser_info bi ON f.fingerprint_id = bi.fingerprint_id
                LEFT JOIN canvas_fingerprints cf ON f.fingerprint_id = cf.fingerprint_id
                LEFT JOIN webgl_fingerprints wf ON f.fingerprint_id = wf.fingerprint_id
                LEFT JOIN audio_fingerprints af ON f.fingerprint_id = af.fingerprint_id
                LEFT JOIN hardware_profiles hp ON f.fingerprint_id = hp.fingerprint_id
                LEFT JOIN hardware_benchmarks hb ON f.fingerprint_id = hb.fingerprint_id
                LEFT JOIN session_metadata sm ON f.fingerprint_id = sm.fingerprint_id
                WHERE f.fingerprint_id = ?
            `;

            this.db.get(query, [fingerprintId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Get all records with pagination
    async getAllRecords(limit = 100, offset = 0) {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const query = `
                SELECT
                    f.*,
                    bi.user_agent,
                    bi.platform,
                    bi.language,
                    hw.cores,
                    hw.memory,
                    hw.cpu_benchmark,
                    hw.memory_benchmark
                FROM fingerprints f
                LEFT JOIN browser_info bi ON f.fingerprint_id = bi.fingerprint_id
                LEFT JOIN hardware_benchmarks hw ON f.fingerprint_id = hw.fingerprint_id
                ORDER BY f.server_timestamp DESC
                LIMIT ? OFFSET ?
            `;

            this.db.all(query, [limit, offset], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    // Execute custom query (read-only)
    async executeQuery(query) {
        await this.initialize();

        return new Promise((resolve, reject) => {
            // Ensure query is SELECT only
            const cleanQuery = query.trim();
            if (!cleanQuery.toUpperCase().startsWith('SELECT')) {
                reject(new Error('Only SELECT queries are allowed'));
                return;
            }

            this.db.all(cleanQuery, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    // Get statistics
    async getStatistics() {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const queries = {
                totalFingerprints: 'SELECT COUNT(*) as count FROM fingerprints',
                totalSessions: 'SELECT COUNT(*) as count FROM sessions',
                uniqueFingerprints: 'SELECT COUNT(DISTINCT fingerprint_hash) as count FROM fingerprints',
                recentActivity: `
                    SELECT COUNT(*) as count
                    FROM fingerprints
                    WHERE server_timestamp > datetime('now', '-24 hours')
                `
            };

            const results = {};
            let completed = 0;
            const total = Object.keys(queries).length;

            Object.entries(queries).forEach(([key, query]) => {
                this.db.get(query, (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    results[key] = row.count;
                    completed++;

                    if (completed === total) {
                        resolve(results);
                    }
                });
            });
        });
    }

    // Check if fingerprint exists
    async fingerprintExists(fingerprintHash) {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const query = 'SELECT COUNT(*) as count FROM fingerprints WHERE fingerprint_hash = ?';

            this.db.get(query, [fingerprintHash], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count > 0);
                }
            });
        });
    }

    // Get session count for fingerprint
    async getSessionCount(fingerprintHash) {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(*) as count
                FROM fingerprints
                WHERE fingerprint_hash = ?
            `;

            this.db.get(query, [fingerprintHash], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }

    // Calculate entropy
    async calculateEntropy() {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const query = `
                SELECT
                    fingerprint_hash,
                    COUNT(*) as frequency
                FROM fingerprints
                GROUP BY fingerprint_hash
            `;

            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (rows.length === 0) {
                    resolve(0);
                    return;
                }

                const total = rows.reduce((sum, row) => sum + row.frequency, 0);
                let entropy = 0;

                rows.forEach(row => {
                    const probability = row.frequency / total;
                    if (probability > 0) {
                        entropy -= probability * Math.log2(probability);
                    }
                });

                resolve(entropy);
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }

    // Get recent fingerprints for analytics
    async getRecentFingerprints(limit = 100) {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const query = `
                SELECT
                    fingerprint_id,
                    fingerprint_hash,
                    session_id,
                    server_timestamp
                FROM fingerprints
                ORDER BY server_timestamp DESC
                LIMIT ?
            `;

            this.db.all(query, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}

module.exports = FingerprintDatabase;