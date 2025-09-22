# Admin Setup - Fingerprint System (JSON-Based)

## Overview
This fingerprinting system uses a simplified JSON log-based storage approach for collecting and managing browser fingerprints.

## Admin Dashboard Access

### Production (Heroku)
```
https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin?token=a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730
```

### Local Development
```
http://localhost:3000/admin?token=a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730
```

## Authentication Methods

The admin panel supports three authentication methods:

### 1. URL Token (Recommended for browser access)
Append `?token=YOUR_TOKEN` to the admin URL

### 2. Basic Authentication
Username: `admin`
Password: `SecureAdmin2025Prod`

### 3. Bearer Token (For API/curl access)
```bash
curl -H "Authorization: Bearer a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730" \
     https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin
```

## Data Storage

The system uses JSON log files for persistence:
- **Production**: `/tmp/data/fingerprints.log` (temporary - resets with dyno restarts)
- **Development**: `./data/fingerprints.log` (permanent)

## Admin Dashboard Features

1. **Real-time Statistics**
   - Total fingerprints collected
   - Unique fingerprints count
   - Total sessions
   - Returning users
   - Recent activity (last 24h)

2. **Data Management**
   - Download logs as JSON
   - Reset all data (with confirmation)
   - View recent fingerprints

## API Endpoints

| Endpoint | Description | Method | Authentication |
|----------|-------------|--------|----------------|
| `/admin` | Visual Dashboard | GET | Any method |
| `/admin/logs/download` | Download JSON logs | GET | Any method |
| `/admin/reset` | Clear all data | POST | Any method |
| `/api/stats` | Get statistics | GET | None |
| `/api/fingerprint` | Submit fingerprint | POST | None |
| `/health` | System health check | GET | None |

## Environment Variables

Set these in production (Heroku):

```bash
# Set credentials
heroku config:set ADMIN_USERNAME=admin
heroku config:set ADMIN_PASSWORD=SecureAdmin2025Prod
heroku config:set ADMIN_TOKEN=a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730
heroku config:set NODE_ENV=production

# Verify configuration
heroku config
```

## Usage Examples

### Download JSON Logs
```bash
# Using curl with token
curl "https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/logs/download?token=a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730" \
  -o fingerprints_backup.json

# Using basic auth
curl -u admin:SecureAdmin2025Prod \
  https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/logs/download \
  -o fingerprints_backup.json
```

### Reset Data
```bash
curl -X POST \
  -H "Authorization: Bearer a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730" \
  https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/reset
```

### View Statistics
```bash
curl https://wasm-fingerprint-78aae8be269e.herokuapp.com/api/stats | python3 -m json.tool
```

## Monitoring

```bash
# View real-time logs
heroku logs --tail --app wasm-fingerprint

# Check system health
curl https://wasm-fingerprint-78aae8be269e.herokuapp.com/health | python3 -m json.tool

# Monitor admin access
heroku logs --tail --app wasm-fingerprint | grep admin
```

## Data Analysis

After downloading the JSON logs:

```bash
# Pretty print with jq
cat fingerprints_backup.json | jq '.'

# Count total entries
cat fingerprints_backup.json | jq 'length'

# Extract unique fingerprints
cat fingerprints_backup.json | jq -r '.[].id' | sort -u | wc -l

# Filter by date (example: last 24h)
cat fingerprints_backup.json | jq '.[] | select(.serverTimestamp > "2025-01-19")'
```

## Heroku Deployment Notes

### Limitations
- Data stored in `/tmp` is ephemeral (resets every ~24h with dyno cycling)
- Ideal for testing and demonstrations
- For permanent storage, run locally or use a VPS

### Backup Strategy
Since data is temporary on Heroku, implement regular backups:

```bash
#!/bin/bash
# backup.sh - Run locally as a cron job
while true; do
    timestamp=$(date +%Y%m%d_%H%M%S)
    curl -s "https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/logs/download?token=a6472f239769e3c11e8552b19de3398d8992ae82ce69e8d0314299b9e013a730" \
         -o "backup_${timestamp}.json"
    echo "Backup saved: backup_${timestamp}.json"
    sleep 3600 # Wait 1 hour
done
```

## Security Best Practices

1. **Use Strong Credentials**
   - Change default passwords immediately
   - Use generated tokens (32+ bytes)

2. **Rotate Credentials Regularly**
   ```bash
   heroku config:set ADMIN_TOKEN=$(openssl rand -hex 32)
   ```

3. **Always Use HTTPS**
   - Never send credentials over HTTP
   - All production endpoints use HTTPS

4. **Monitor Access**
   - Check logs regularly for unauthorized attempts
   - Set up alerts for admin access

## Troubleshooting

### 401 Unauthorized
- Verify environment variables: `heroku config`
- Check for special characters in passwords
- Ensure no spaces in tokens

### Empty Statistics
- Check if log file exists: `heroku run ls -la /tmp/data/`
- Verify fingerprints are being submitted
- Check server logs for errors

### Data Not Persisting
- Remember: Heroku's filesystem is ephemeral
- Data resets with dyno restarts (~24h)
- Implement regular backups for important data

## Important Notes

⚠️ **Never commit credentials to Git**
- Use environment variables only
- Keep `.env` file in `.gitignore`

🔄 **Data Persistence**
- Heroku Free/Eco dynos reset storage daily
- Use external storage for production data
- Regular backups are essential

📊 **For Production Use**
- Consider using a database addon (Postgres, MongoDB)
- Or deploy to a VPS with persistent storage
- Current setup is ideal for demos and testing