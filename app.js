const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const routes = require('./src/routes');
const { securityHeaders, createRateLimiter } = require('./src/middleware/security.middleware');

const app = express();
const PORT = config.server.port;

app.use(securityHeaders);

app.use(cors(config.security.cors));
app.use(bodyParser.json({ limit: '10mb' }));

if (config.security.rateLimit.enabled) {
    app.use('/api/', createRateLimiter());
}

app.use(express.static('public'));
app.use('/wasm', express.static('wasm-fingerprint/pkg'));
app.use('/wasm-fingerprint', express.static('wasm-fingerprint'));

app.use('/', routes);

app.listen(PORT, config.server.host, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Fingerprint Server Started (Organized Version)`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Environment: ${config.server.nodeEnv}`);
    console.log(`Server: http://${config.server.host}:${PORT}`);
    console.log(`\nFeatures Enabled:`);
    Object.entries(config.features).forEach(([feature, enabled]) => {
        console.log(`  ${enabled ? '✅' : '❌'} ${feature}`);
    });
    console.log(`${'='.repeat(60)}\n`);
});

module.exports = app;