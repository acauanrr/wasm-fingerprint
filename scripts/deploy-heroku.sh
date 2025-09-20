#!/bin/bash

# Heroku Deployment Script
# This script configures all environment variables for Heroku deployment

echo "🚀 Configuring Heroku Environment Variables..."

# Read environment variables from .env.production and set them on Heroku
# Filter out comments and empty lines
ENV_VARS=$(grep -v '^#' .env.production | grep -v '^$' | tr '\n' ' ')

if [ -z "$ENV_VARS" ]; then
    echo "❌ No environment variables found in .env.production"
    exit 1
fi

echo "📋 Setting the following variables:"
grep -v '^#' .env.production | grep -v '^$' | while read line; do
    echo "  • $line"
done

echo ""
echo "⚡ Executing: heroku config:set $ENV_VARS"
heroku config:set $ENV_VARS

if [ $? -eq 0 ]; then
    echo "✅ Environment variables configured successfully!"
    echo ""
    echo "🔄 Deploying to Heroku..."
    git push heroku main

    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        echo ""
        echo "🌐 Your app is available at:"
        heroku apps:info --shell | grep web_url | cut -d= -f2
        echo ""
        echo "📊 Health check:"
        heroku apps:info --shell | grep web_url | cut -d= -f2 | sed 's/$/health/' | xargs curl -s | jq '.status' 2>/dev/null || echo "Health endpoint not responding"
    else
        echo "❌ Deployment failed!"
        exit 1
    fi
else
    echo "❌ Failed to set environment variables!"
    exit 1
fi