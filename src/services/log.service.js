const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const LOG_DIR = process.env.NODE_ENV === 'production' ? '/tmp/data' : path.join(__dirname, '../../data');
const LOG_FILE = path.join(LOG_DIR, 'fingerprints.log');

if (!fsSync.existsSync(LOG_DIR)) {
    fsSync.mkdirSync(LOG_DIR, { recursive: true });
}

const readLogs = async () => {
    try {
        if (!fsSync.existsSync(LOG_FILE)) {
            return [];
        }
        const content = await fs.readFile(LOG_FILE, 'utf-8');
        return content.trim().split('\n').filter(line => line).map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        }).filter(entry => entry);
    } catch (error) {
        console.error('Error reading logs:', error);
        return [];
    }
};

const appendLog = async (logEntry) => {
    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(LOG_FILE, logLine);
};

const resetLogs = async () => {
    if (fsSync.existsSync(LOG_FILE)) {
        await fs.unlink(LOG_FILE);
        console.log('Log file deleted');
    }

    await fs.writeFile(LOG_FILE, '');
    console.log('New log file created');
};

const getLogFilePath = () => LOG_FILE;

module.exports = {
    readLogs,
    appendLog,
    resetLogs,
    getLogFilePath
};