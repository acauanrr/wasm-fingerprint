# Browser Fingerprinting with WebAssembly

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Heroku-430098?style=for-the-badge&logo=heroku)](https://wasm-fingerprint-78aae8be269e.herokuapp.com/)

A high-performance browser fingerprinting system built with WebAssembly and Rust, featuring advanced hardware benchmarking and intelligent session matching.

## Overview

This system collects device and browser characteristics using two complementary approaches:
- **Traditional APIs**: Canvas, WebGL, and Audio fingerprinting
- **Hardware Benchmarks**: CPU microbenchmarks and instruction-level profiling
- **Intelligent Matching**: Tolerance-based comparison algorithm for accurate session recognition

## Quick Start

### Prerequisites
- Node.js 14+
- Rust 1.70+ with wasm-pack
- Git

### Installation

1. **Clone and install dependencies**:
```bash
git clone https://github.com/acauanrr/wasm-fingerprint.git
cd wasm-fingerprint
npm install
```

2. **Setup Rust environment** (if needed):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

3. **Build WebAssembly module**:
```bash
npm run build:wasm
```

4. **Start the server**:
```bash
npm start
```

5. **Open browser**: http://localhost:3000

## Key Features

### Fingerprinting Vectors
- **Canvas**: Unicode text, gradients, Bézier curves with SHA-256 hashing
- **WebGL**: GPU vendor/renderer detection, shader precision, extensions
- **Audio**: OfflineAudioContext with DynamicsCompressor processing
- **Hardware**: CPU/memory benchmarks, instruction timing profiles
- **Port Contention**: Microarchitecture detection via instruction-level parallelism

### Intelligent Session Matching
- **Problem**: Hardware benchmark variations cause false negatives
- **Solution**: 15% tolerance algorithm for performance metrics
- **Accuracy**: >90% session recognition with <5% false positives

### Production-Ready
- **Database**: SQLite with 8 normalized tables
- **Backup**: Dual storage (SQLite + JSON Lines)
- **Deploy**: One-command Heroku deployment
- **Monitoring**: Health checks and analytics endpoints

## API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/fingerprint` | Submit fingerprint data |
| `POST` | `/api/compare-fingerprints` | Intelligent session comparison |
| `GET` | `/api/stats` | Database statistics |
| `GET` | `/api/analytics` | Advanced analytics with entropy |
| `GET` | `/health` | Server and database status |

### Fingerprint Submission
```javascript
POST /api/fingerprint
Content-Type: application/json

{
  "sessionId": "unique-session-id",
  "canvas_hash": "sha256-hash",
  "webgl_hash": "sha256-hash",
  "audio_hash": "sha256-hash",
  "hardware_profile": {
    "cpu_benchmark": 123.45,
    "memory_benchmark": 67.89,
    "crypto_benchmark": 45.67
  },
  "browser_attributes": {
    "user_agent": "Mozilla/5.0...",
    "hardware_concurrency": 8,
    "screen_resolution": "1920x1080"
  }
}
```

### Intelligent Comparison
```javascript
POST /api/compare-fingerprints
Content-Type: application/json

{
  "fingerprint1": { /* fingerprint data */ },
  "fingerprint2": { /* fingerprint data */ }
}

// Response
{
  "success": true,
  "isMatch": true,
  "confidence": 92.5,
  "details": {
    "canvas": { "match": true, "score": 1.0 },
    "hardware": {
      "math_operations": { "match": true, "score": 0.87 }
    }
  }
}
```

## Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Core
NODE_ENV=development
PORT=3000
HOST=localhost

# Features
ENABLE_CANVAS=true
ENABLE_WEBGL=true
ENABLE_AUDIO=true
ENABLE_HARDWARE_BENCHMARKS=true

# Database
DB_TYPE=sqlite
DATA_DIR=./data
```

### Available Scripts
```bash
npm run build:wasm    # Build WebAssembly module
npm start             # Start development server
npm run dev           # Build + start
npm run deploy:heroku # Deploy to Heroku
npm run clean         # Clean generated files
```

## Architecture

### WebAssembly Module (`wasm-fingerprint/`)
- **Canvas**: Complex rendering with Unicode and gradients
- **WebGL**: Vendor detection and shader precision testing
- **Audio**: High-precision audio context fingerprinting
- **Hardware**: CPU/memory benchmarks and timing analysis
- **Port Contention**: Instruction parallelism detection

### Server (`server.js`)
- **Express**: REST API with SQLite persistence
- **Database**: 8-table normalized schema with ACID transactions
- **Analytics**: Real-time entropy calculation and statistics
- **Backup**: Automatic dual storage for reliability

### Database Schema
```
fingerprints (main)
├── browser_info
├── canvas_fingerprints
├── webgl_fingerprints
├── audio_fingerprints
├── hardware_profiles
├── hardware_benchmarks
└── session_metadata
```

## Deployment

### Heroku (Recommended)
```bash
# Automated deployment
npm run deploy:heroku

# Manual deployment
heroku config:set NODE_ENV=production HOST=0.0.0.0
git push heroku main
```

### Environment Variables for Production
```bash
NODE_ENV=production
HOST=0.0.0.0
ENABLE_CANVAS=true
ENABLE_WEBGL=true
ENABLE_AUDIO=true
ENABLE_HARDWARE_BENCHMARKS=true
CORS_ORIGIN=*
```

### Pre-built WASM Strategy
- WASM files included in repository for Heroku compatibility
- No wasm-pack dependency in production builds
- Automatic fallback to pre-built modules

## Performance Metrics

### System Performance
- **WASM Size**: ~150KB (optimized)
- **Collection Time**: 500-1500ms (complete fingerprint)
- **Uniqueness Rate**: >95% in preliminary tests
- **Browser Support**: Chrome 90+, Firefox 89+, Safari 14.1+

### Database Performance
- **Insertion**: ~5-10ms per fingerprint
- **Query by ID**: ~1-2ms
- **Statistics**: ~10-50ms
- **Entropy Calculation**: ~100-500ms (10k+ records)

### Session Recognition
- **Accuracy**: >90% with tolerance algorithm
- **False Positives**: <5%
- **False Negatives**: <5%

## Security & Privacy

### Research Purpose
This project is designed for academic research to understand and improve web privacy and security.

### Ethical Considerations
- **Educational Use**: Research and demonstration only
- **Transparency**: Open source implementation
- **Privacy**: No permanent data storage by default
- **Compliance**: Respect local privacy laws

## Troubleshooting

### Common Issues

**WASM compilation errors:**
```bash
rustup update
rustup target add wasm32-unknown-unknown
export PATH="$HOME/.cargo/bin:$PATH"
```

**Port 3000 in use:**
```bash
lsof -i :3000
pkill -f node
```

**SQLite database issues:**
```bash
rm -f database/fingerprints.db
npm start  # Will recreate schema
```

## License

MIT License - Academic research project

## Contributing

Contributions welcome! Please open an issue or pull request for:
- New fingerprinting vectors
- Performance optimizations
- Bug fixes
- Documentation improvements