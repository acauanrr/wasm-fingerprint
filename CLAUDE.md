# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an advanced browser fingerprinting system using WebAssembly, implementing two complementary approaches:
- Proposta A: Traditional API-based fingerprinting (Canvas, WebGL, Audio)
- Proposta B: Hardware microbenchmarks for low-level device identification

## Commands

### Build the WebAssembly module
```bash
export PATH="$HOME/.cargo/bin:$PATH"
cd wasm-fingerprint && wasm-pack build --target web --out-dir pkg
```

### Run the server
```bash
npm start
```

### Full build and run
```bash
npm run dev
```

## Architecture

### Core Components
- **wasm-fingerprint/**: Rust/WebAssembly module for fingerprint collection
  - Canvas, WebGL, and Audio fingerprinting implementations
  - Hardware benchmarking module for CPU/memory profiling
  - Main orchestrator in `lib.rs`

- **server.js**: Express server handling fingerprint data
  - Receives and stores fingerprints
  - Provides comparison and statistics endpoints

- **public/index.html**: Demo page with visualization

### Key Technical Decisions
- WebAssembly chosen for performance and detection evasion
- Rust for memory safety in low-level operations
- SHA-256 hashing for fingerprint generation
- Microbenchmarks measure instruction-level timing variations

## Important Implementation Details

- The WebGL module handles missing extensions gracefully with `.flatten()` pattern
- Audio fingerprinting uses OfflineAudioContext for consistency
- Hardware benchmarks prevent compiler optimization with result validation
- Canvas fingerprinting uses complex scenes with unicode characters for uniqueness

## Common Tasks

### Adding new fingerprinting vectors
1. Create new module in `wasm-fingerprint/src/`
2. Add module declaration in `lib.rs`
3. Integrate collection in `FingerprintCollector::collect_fingerprint()`
4. Update data structures if needed

### Testing fingerprint collection
1. Build the WASM module
2. Start the server
3. Open browser console to see detailed logs
4. Check server logs for received fingerprints