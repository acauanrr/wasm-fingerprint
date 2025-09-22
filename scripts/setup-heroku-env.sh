#!/bin/bash

# Script to set up Heroku environment variables for production
# Usage: ./scripts/setup-heroku-env.sh

echo "========================================="
echo "Heroku Production Environment Setup"
echo "========================================="

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "Error: Heroku CLI is not installed"
    echo "Install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Generate secure random credentials
generate_secure_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

generate_secure_token() {
    openssl rand -hex 32
}

echo ""
echo "Generating secure admin credentials..."
SECURE_USERNAME="admin_$(date +%Y%m)"
SECURE_PASSWORD=$(generate_secure_password)
SECURE_TOKEN=$(generate_secure_token)

echo ""
echo "Generated Credentials:"
echo "----------------------"
echo "Username: $SECURE_USERNAME"
echo "Password: $SECURE_PASSWORD"
echo "Token: $SECURE_TOKEN"
echo ""
echo "IMPORTANT: Save these credentials in a secure location!"
echo ""

read -p "Do you want to set these credentials on Heroku? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting environment variables on Heroku..."

    # Core settings
    heroku config:set NODE_ENV=production
    heroku config:set HOST=0.0.0.0

    # Admin credentials
    heroku config:set ADMIN_USERNAME="$SECURE_USERNAME"
    heroku config:set ADMIN_PASSWORD="$SECURE_PASSWORD"
    heroku config:set ADMIN_TOKEN="$SECURE_TOKEN"

    # Features
    heroku config:set ENABLE_CANVAS=true
    heroku config:set ENABLE_WEBGL=true
    heroku config:set ENABLE_AUDIO=true
    heroku config:set ENABLE_HARDWARE_BENCHMARKS=true
    heroku config:set ENABLE_PORT_CONTENTION=true
    heroku config:set ENABLE_ANALYTICS=true

    # Security
    heroku config:set CORS_ORIGIN="*"
    heroku config:set CORS_CREDENTIALS=true
    heroku config:set ENABLE_COOP_COEP=true
    heroku config:set ENABLE_RATE_LIMIT=true
    heroku config:set RATE_LIMIT_WINDOW_MS=60000
    heroku config:set RATE_LIMIT_MAX_REQUESTS=100

    # Performance
    heroku config:set API_TIMEOUT=30000
    heroku config:set BENCHMARK_CPU_ITERATIONS=1000000
    heroku config:set BENCHMARK_MEMORY_SIZE_MB=1
    heroku config:set BENCHMARK_CRYPTO_ITERATIONS=10000
    heroku config:set BENCHMARK_TIMEOUT_MS=5000

    # Storage
    heroku config:set DATA_DIR="/app/data"
    heroku config:set LOG_FILE="fingerprints.log"
    heroku config:set STATS_FILE="stats.json"
    heroku config:set MAX_LOG_SIZE_MB=100
    heroku config:set MAX_FINGERPRINT_AGE_DAYS=30

    # Logging
    heroku config:set LOG_LEVEL=info
    heroku config:set LOG_FORMAT=json
    heroku config:set ENABLE_CONSOLE_LOG=true

    echo ""
    echo "✅ Environment variables set successfully!"
    echo ""
    echo "To verify configuration, run:"
    echo "  heroku config"
    echo ""
    echo "To access your admin panel after deployment:"
    echo "  URL: https://your-app-name.herokuapp.com/admin"
    echo "  Username: $SECURE_USERNAME"
    echo "  Password: $SECURE_PASSWORD"
    echo ""
else
    echo "Setup cancelled. You can manually set the variables using:"
    echo ""
    echo "heroku config:set ADMIN_USERNAME=\"$SECURE_USERNAME\""
    echo "heroku config:set ADMIN_PASSWORD=\"$SECURE_PASSWORD\""
    echo "heroku config:set ADMIN_TOKEN=\"$SECURE_TOKEN\""
    echo ""
fi

echo "========================================="
echo "Setup Complete"
echo "=========================================">