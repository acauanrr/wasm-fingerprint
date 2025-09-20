-- Browser Fingerprinting Database Schema
-- SQLite database for storing fingerprint data

-- Main fingerprints table
CREATE TABLE IF NOT EXISTS fingerprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint_id TEXT NOT NULL UNIQUE,
    session_id TEXT NOT NULL,
    fingerprint_hash TEXT NOT NULL,
    client_timestamp INTEGER NOT NULL,
    server_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Browser information table
CREATE TABLE IF NOT EXISTS browser_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint_id TEXT NOT NULL,
    user_agent TEXT,
    language TEXT,
    platform TEXT,
    hardware_concurrency INTEGER,
    device_memory REAL,
    screen_width INTEGER,
    screen_height INTEGER,
    screen_resolution TEXT,
    color_depth INTEGER,
    timezone_offset INTEGER,
    plugins_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fingerprint_id) REFERENCES fingerprints(fingerprint_id) ON DELETE CASCADE
);

-- Canvas fingerprint table
CREATE TABLE IF NOT EXISTS canvas_fingerprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint_id TEXT NOT NULL,
    hash TEXT NOT NULL,
    data_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fingerprint_id) REFERENCES fingerprints(fingerprint_id) ON DELETE CASCADE
);

-- WebGL fingerprint table
CREATE TABLE IF NOT EXISTS webgl_fingerprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint_id TEXT NOT NULL,
    hash TEXT NOT NULL,
    vendor TEXT,
    renderer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fingerprint_id) REFERENCES fingerprints(fingerprint_id) ON DELETE CASCADE
);

-- Audio fingerprint table
CREATE TABLE IF NOT EXISTS audio_fingerprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint_id TEXT NOT NULL,
    hash TEXT NOT NULL,
    sample_rate INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fingerprint_id) REFERENCES fingerprints(fingerprint_id) ON DELETE CASCADE
);

-- Hardware profile table
CREATE TABLE IF NOT EXISTS hardware_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint_id TEXT NOT NULL,
    cores INTEGER,
    memory REAL,
    concurrency INTEGER,
    cpu_benchmark REAL,
    memory_benchmark REAL,
    crypto_benchmark REAL,
    instruction_timing TEXT, -- JSON array
    port_contention_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fingerprint_id) REFERENCES fingerprints(fingerprint_id) ON DELETE CASCADE
);

-- Hardware benchmarks table
CREATE TABLE IF NOT EXISTS hardware_benchmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint_id TEXT NOT NULL,
    math_ops REAL,
    string_ops REAL,
    array_ops REAL,
    crypto_ops REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fingerprint_id) REFERENCES fingerprints(fingerprint_id) ON DELETE CASCADE
);

-- Session metadata table
CREATE TABLE IF NOT EXISTS session_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    referer TEXT,
    accept_language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fingerprint_id) REFERENCES fingerprints(fingerprint_id) ON DELETE CASCADE
);

-- Statistics table for analytics
CREATE TABLE IF NOT EXISTS statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_sessions INTEGER DEFAULT 0,
    unique_fingerprints INTEGER DEFAULT 0,
    first_seen DATETIME,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    entropy REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions tracking table
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    fingerprint_id TEXT NOT NULL,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    visit_count INTEGER DEFAULT 1,
    FOREIGN KEY (fingerprint_id) REFERENCES fingerprints(fingerprint_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_fingerprints_session ON fingerprints(session_id);
CREATE INDEX IF NOT EXISTS idx_fingerprints_timestamp ON fingerprints(server_timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint ON sessions(fingerprint_id);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_fingerprints_updated_at
    AFTER UPDATE ON fingerprints
BEGIN
    UPDATE fingerprints SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_statistics_updated_at
    AFTER UPDATE ON statistics
BEGIN
    UPDATE statistics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Initial statistics record
INSERT OR IGNORE INTO statistics (id, total_sessions, unique_fingerprints, first_seen)
VALUES (1, 0, 0, CURRENT_TIMESTAMP);