# Project Structure

## 🏗️ Directory Layout

```
wasm-finger/
├── app.js                      # Main application entry point
├── package.json                # Node.js dependencies and scripts
├── config/                     # Configuration management
│   └── index.js               # Centralized config with env validation
│
├── src/                        # Application source code (MVC pattern)
│   ├── controllers/           # Request handlers
│   │   ├── admin.controller.js
│   │   ├── fingerprint.controller.js
│   │   └── health.controller.js
│   │
│   ├── middleware/            # Express middleware
│   │   ├── auth.middleware.js
│   │   └── security.middleware.js
│   │
│   ├── routes/               # API route definitions
│   │   ├── index.js
│   │   ├── admin.routes.js
│   │   ├── fingerprint.routes.js
│   │   └── health.routes.js
│   │
│   ├── services/             # Business logic layer
│   │   ├── fingerprint.service.js
│   │   └── log.service.js
│   │
│   └── views/               # Server-side templates
│       └── admin.view.js
│
├── public/                   # Static files served to client
│   ├── index.html           # Demo page
│   └── pkg/                 # WebAssembly build output
│
├── wasm-fingerprint/        # Rust/WASM fingerprinting module
│   ├── src/                # Rust source code
│   ├── Cargo.toml          # Rust dependencies
│   └── pkg/                # WASM build artifacts
│
├── data/                    # Runtime data storage
│   └── fingerprints.log    # JSON log file
│
├── scripts/                 # Deployment and utility scripts
│   └── deploy-heroku.sh
│
└── archive/                # Old/deprecated files (not in use)
    ├── old-structure/
    ├── tests/
    └── docs/
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build WebAssembly module
npm run build:wasm

# Start development server
npm run dev

# Or start production server
npm start
```

## 📁 Key Files

- **app.js**: Clean entry point that sets up Express server
- **config/index.js**: Environment configuration with validation
- **fingerprint-matcher.js**: Core fingerprint matching algorithm
- **.env files**: Environment variables (development/production)

## 🏛️ Architecture

The project follows a clean MVC-like pattern:

1. **Routes** → Define API endpoints
2. **Middleware** → Process requests (auth, security)
3. **Controllers** → Handle requests and coordinate response
4. **Services** → Business logic and data operations
5. **Views** → HTML templates for web interfaces

## 🔧 Configuration

All configuration is centralized in `config/index.js` which:
- Loads environment variables
- Provides defaults
- Validates settings on startup

## 📊 Data Flow

1. Client makes request →
2. Middleware processes →
3. Route directs to controller →
4. Controller uses services →
5. Services access data →
6. Response sent to client