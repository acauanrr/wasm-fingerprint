# Source Code Structure

This directory contains the organized source code for the WASM Fingerprint application.

## Directory Structure

```
src/
├── controllers/        # Request handlers for each route
│   ├── admin.controller.js       # Admin dashboard operations
│   ├── fingerprint.controller.js # Fingerprint collection & comparison
│   └── health.controller.js      # Health check endpoint
│
├── middleware/         # Express middleware functions
│   ├── auth.middleware.js         # Admin authentication
│   └── security.middleware.js     # Security headers & rate limiting
│
├── routes/            # Route definitions
│   ├── index.js                   # Main router aggregator
│   ├── admin.routes.js            # Admin routes
│   ├── fingerprint.routes.js     # API routes for fingerprinting
│   └── health.routes.js          # Health check route
│
├── services/          # Business logic and data operations
│   ├── fingerprint.service.js    # Fingerprint statistics & processing
│   └── log.service.js            # Log file operations
│
└── views/            # Server-rendered HTML templates
    └── admin.view.js              # Admin dashboard HTML
```

## Key Components

### Controllers
Handle incoming requests and coordinate responses. Each controller focuses on a specific domain.

### Services
Contain business logic and data manipulation. Services are reusable across different controllers.

### Middleware
Process requests before they reach controllers. Handle authentication, security, and other cross-cutting concerns.

### Routes
Define API endpoints and map them to controller methods.

### Views
Server-rendered HTML templates for web interfaces like the admin dashboard.