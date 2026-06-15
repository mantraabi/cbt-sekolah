// middleware/errorTracker.js
// Error tracking sederhana — tanpa Sentry/eksternal
// Track error counts & log ke file terstruktur

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// In-memory error counter (reset saat restart)
const errorCounts = {
    total: 0,
    byRoute: {},
    lastError: null,
    lastErrorTime: null,
};

// Tulis error ke file
const writeErrorLog = (err, req) => {
    const date = new Date().toISOString().split('T')[0];
    const entry = {
        timestamp: new Date().toISOString(),
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        method: req?.method,
        path: req?.originalUrl,
        statusCode: err.statusCode || 500,
        user: req?.user?.userId,
    };

    try {
        const logFile = path.join(LOG_DIR, `error-${date}.log`);
        fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
    } catch (e) {
        console.error('[ERROR TRACKER] Gagal tulis log:', e.message);
    }
};

// Express error handler middleware
const errorHandler = (err, req, res, next) => {
    // Update counter
    errorCounts.total++;
    const route = req?.originalUrl?.split('?')[0] || 'unknown';
    errorCounts.byRoute[route] = (errorCounts.byRoute[route] || 0) + 1;
    errorCounts.lastError = err.message;
    errorCounts.lastErrorTime = new Date().toISOString();

    // Log ke console
    console.error(`[ERROR] ${req?.method} ${req?.originalUrl}: ${err.message}`);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    // Log ke file
    writeErrorLog(err, req);

    // Response ke client (jangan leak detail)
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        msg: statusCode === 500 ? 'Terjadi kesalahan pada server.' : err.message,
    });
};

// Expose stats untuk health endpoint
const getErrorStats = () => ({ ...errorCounts });

module.exports = { errorHandler, getErrorStats };
