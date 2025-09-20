#!/bin/bash

# Build script for WASM fingerprint module

echo "Building WASM module..."

# Set paths
export PATH="$HOME/.cargo/bin:$PATH"
export RUSTUP_HOME="$HOME/.rustup"
export CARGO_HOME="$HOME/.cargo"

# Navigate to wasm-fingerprint directory
cd wasm-fingerprint

# Check if cargo and wasm-pack are available
if ! command -v cargo &> /dev/null; then
    echo "Error: cargo not found. Please install Rust."
    exit 1
fi

if ! command -v wasm-pack &> /dev/null; then
    echo "Error: wasm-pack not found. Installing..."
    cargo install wasm-pack
fi

# Build the WASM module
echo "Compiling to WASM..."
wasm-pack build --target web --out-dir pkg --no-opt

if [ $? -eq 0 ]; then
    echo "✅ WASM build completed successfully!"
    echo "Output files in: wasm-fingerprint/pkg/"
else
    echo "❌ Build failed"
    exit 1
fi