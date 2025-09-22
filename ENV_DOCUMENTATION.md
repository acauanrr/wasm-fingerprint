# Environment Variables Documentation

## 🔧 Configuration Guide

This document describes all environment variables used in the WASM Fingerprint application.

## Development (.env)

```bash
# Basic Setup
NODE_ENV=development        # Environment mode
PORT=3000                   # Server port
HOST=localhost              # Server host

# Admin Access (⚠️ Change in production!)
ADMIN_USERNAME=admin        # Admin login username
ADMIN_PASSWORD=admin123     # Admin login password
ADMIN_TOKEN=dev-token...    # Admin API token
```

## Production (.env.production)

### 🚨 CRITICAL - Admin Credentials

**MUST be set before deploying to production!**

```bash
# Generate secure values:
ADMIN_USERNAME=admin_202409           # Example: admin_YYYYMM
ADMIN_PASSWORD=$(openssl rand -base64 32)  # Generate 32-char password
ADMIN_TOKEN=$(openssl rand -hex 32)        # Generate 64-char hex token
```

### Quick Setup Script

```bash
# Use the automated script:
./scripts/setup-heroku-env.sh
```

### Manual Heroku Setup

```bash
# Set individual variables:
heroku config:set ADMIN_USERNAME="your_secure_username"
heroku config:set ADMIN_PASSWORD="your_very_secure_password"
heroku config:set ADMIN_TOKEN="your_secure_token_here"
```

## 📋 Complete Variable Reference

### Core Settings
| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `NODE_ENV` | Environment mode | `development` | `production` |
| `PORT` | Server port | `3000` | Auto (Heroku) |
| `HOST` | Server host | `localhost` | `0.0.0.0` |

### Admin Authentication
| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `ADMIN_USERNAME` | Admin username | `admin` | **REQUIRED** |
| `ADMIN_PASSWORD` | Admin password | `admin123` | **REQUIRED** |
| `ADMIN_TOKEN` | API token | `dev-token...` | **REQUIRED** |

### Security
| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_COOP_COEP` | Enable COOP/COEP headers | `true` |
| `CORS_ORIGIN` | CORS allowed origins | `*` |
| `CORS_CREDENTIALS` | Allow credentials in CORS | `true` |
| `ENABLE_RATE_LIMIT` | Enable rate limiting | `false` (dev) / `true` (prod) |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### Features
| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_CANVAS` | Canvas fingerprinting | `true` |
| `ENABLE_WEBGL` | WebGL fingerprinting | `true` |
| `ENABLE_AUDIO` | Audio fingerprinting | `true` |
| `ENABLE_HARDWARE_BENCHMARKS` | Hardware benchmarks | `true` |
| `ENABLE_PORT_CONTENTION` | Port contention detection | `true` |
| `ENABLE_ANALYTICS` | Analytics features | `true` |

### Performance
| Variable | Description | Default |
|----------|-------------|---------|
| `API_TIMEOUT` | API timeout (ms) | `30000` |
| `BENCHMARK_CPU_ITERATIONS` | CPU benchmark iterations | `1000000` |
| `BENCHMARK_MEMORY_SIZE_MB` | Memory test size (MB) | `1` |
| `BENCHMARK_CRYPTO_ITERATIONS` | Crypto iterations | `10000` |
| `BENCHMARK_TIMEOUT_MS` | Benchmark timeout | `5000` |

### Storage
| Variable | Description | Default |
|----------|-------------|---------|
| `DATA_DIR` | Data directory | `./data` (dev) / `/app/data` (prod) |
| `LOG_FILE` | Log filename | `fingerprints.log` |
| `STATS_FILE` | Stats filename | `stats.json` |
| `MAX_LOG_SIZE_MB` | Max log size | `100` |
| `MAX_FINGERPRINT_AGE_DAYS` | Data retention | `30` |

### Logging
| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Log level | `info` |
| `LOG_FORMAT` | Log format | `json` |
| `ENABLE_CONSOLE_LOG` | Console logging | `true` |

## 🚀 Deployment Checklist

### Before Deploying to Production:

- [ ] Generate secure admin credentials
- [ ] Set `ADMIN_USERNAME` on Heroku
- [ ] Set `ADMIN_PASSWORD` on Heroku
- [ ] Set `ADMIN_TOKEN` on Heroku
- [ ] Enable rate limiting (`ENABLE_RATE_LIMIT=true`)
- [ ] Review CORS settings
- [ ] Test login with new credentials
- [ ] Save credentials in password manager

### Verify Configuration:

```bash
# Check all Heroku configs:
heroku config

# Test admin credentials:
curl -u username:password https://your-app.herokuapp.com/admin/verify
```

## 🔐 Security Best Practices

1. **Never commit credentials** to version control
2. **Use strong passwords** (min 20 chars, mixed case, numbers, symbols)
3. **Rotate credentials** regularly (every 90 days)
4. **Use different credentials** for each environment
5. **Enable rate limiting** in production
6. **Monitor access logs** regularly

## 📝 Notes

- Development uses `.env` file (gitignored)
- Production uses Heroku environment variables
- Admin session cookies expire after 24 hours
- All sensitive data is stored in memory (not persisted)