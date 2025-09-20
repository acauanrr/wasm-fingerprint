# Admin Setup for Production (Heroku)

## Quick Setup

### 1. Generate Secure Credentials
```bash
# Generate a secure random token
openssl rand -hex 32

# Example output:
# a7f2d8b3e9c4f1a6d5e8b9c2f3a4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2
```

### 2. Set Heroku Environment Variables
```bash
# Set secure credentials (replace with your values)
heroku config:set ADMIN_USERNAME=your_secure_username
heroku config:set ADMIN_PASSWORD=your_very_secure_password_here
heroku config:set ADMIN_TOKEN=a7f2d8b3e9c4f1a6d5e8b9c2f3a4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2

# Verify configuration
heroku config
```

### 3. Deploy to Heroku
```bash
# Commit the admin changes
git add .
git commit -m "Add secure admin dashboard"

# Push to Heroku
git push heroku main
```

## Access Admin Dashboard in Production

### Dashboard URL
```
https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin
```

### Authentication Methods

#### Method 1: Basic Authentication (Recommended)
```bash
# Using curl
curl -u YOUR_USERNAME:YOUR_PASSWORD https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin

# In browser: Enter username and password when prompted
```

#### Method 2: Token in URL
```
https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/database/download?token=YOUR_TOKEN
```

#### Method 3: Bearer Token (API)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/database/records
```

## Admin Endpoints

| Endpoint | Description | Method | Authentication |
|----------|-------------|--------|----------------|
| `/admin` | Visual Dashboard | GET | Basic Auth |
| `/admin/database/download` | Download SQLite DB | GET | Any method |
| `/admin/database/records` | View records (JSON) | GET | Any method |
| `/admin/database/query` | Execute SQL queries | POST | Any method |
| `/admin/logs/download` | Download log file | GET | Any method |

## Example Usage

### Download Database from Heroku
```bash
# Using curl with basic auth
curl -u YOUR_USERNAME:YOUR_PASSWORD \
  https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/database/download \
  -o fingerprints_production.db

# Using wget with token
wget "https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/database/download?token=YOUR_TOKEN" \
  -O fingerprints_production.db
```

### Query Database via API
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT COUNT(*) as total FROM fingerprints"}' \
  https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/database/query
```

### View Recent Records
```bash
curl -u YOUR_USERNAME:YOUR_PASSWORD \
  "https://wasm-fingerprint-78aae8be269e.herokuapp.com/admin/database/records?limit=10"
```

## Security Best Practices

1. **Use Strong Credentials**
   - Username: At least 8 characters, avoid common names
   - Password: At least 16 characters, mix of letters, numbers, symbols
   - Token: Use generated random hex (32+ bytes)

2. **Rotate Credentials Regularly**
   ```bash
   # Generate new token monthly
   heroku config:set ADMIN_TOKEN=$(openssl rand -hex 32)
   ```

3. **Monitor Access Logs**
   ```bash
   heroku logs --tail | grep admin
   ```

4. **Restrict IP Access (Optional)**
   - Consider using Heroku Private Spaces or Shield for additional security
   - Add IP whitelist middleware if needed

5. **Use HTTPS Only**
   - All admin endpoints require HTTPS in production
   - Never send credentials over HTTP

## Local SQLite Analysis

After downloading the database:

```bash
# Open with SQLite CLI
sqlite3 fingerprints_production.db

# Example queries
.tables
SELECT COUNT(*) FROM fingerprints;
SELECT * FROM fingerprints ORDER BY server_timestamp DESC LIMIT 10;
.quit

# Or use a GUI tool like:
# - DB Browser for SQLite
# - TablePlus
# - DBeaver
```

## Troubleshooting

### 401 Unauthorized
- Check environment variables: `heroku config`
- Ensure credentials are correctly set
- Verify no spaces in token/password

### Database Download Issues
- Check file permissions on Heroku
- Ensure database exists: `heroku run ls database/`
- Check logs: `heroku logs --tail`

### Query Errors
- Only SELECT queries allowed
- Check SQL syntax
- Verify table/column names

## Important Notes

⚠️ **Never commit credentials to Git**
- Use environment variables only
- Add `.env` to `.gitignore`
- Don't log credentials

🔒 **Production Security**
- Change default credentials immediately
- Use different credentials for each environment
- Enable 2FA on Heroku account
- Regular security audits

📊 **Database Backup**
- Download database regularly
- Keep local backups
- Consider automated backup solution