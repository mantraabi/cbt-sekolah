// middleware/auditLog.js
// Audit log sederhana — catat aksi penting admin ke file + console

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const getLogStream = () => {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return fs.createWriteStream(
        path.join(LOG_DIR, `audit-${date}.log`),
        { flags: 'a' } // append
    );
};

const auditLog = (action) => {
    return (req, res, next) => {
        // Simpan original json method
        const originalJson = res.json.bind(res);

        res.json = function (body) {
            // Hanya log jika request berhasil (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const entry = {
                    timestamp: new Date().toISOString(),
                    user: req.user?.userId || 'anonymous',
                    role: req.user?.role || '-',
                    action: action,
                    method: req.method,
                    path: req.originalUrl,
                    ip: req.ip || req.connection?.remoteAddress,
                    body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
                };

                const logLine = JSON.stringify(entry);
                
                // Console (untuk PM2 logs)
                console.log(`[AUDIT] ${action} by user#${entry.user} (${entry.role})`);

                // File (untuk review nanti)
                try {
                    const stream = getLogStream();
                    stream.write(logLine + '\n');
                    stream.end();
                } catch (e) {
                    console.error('[AUDIT] Gagal tulis log:', e.message);
                }
            }

            return originalJson(body);
        };

        next();
    };
};

// Hapus data sensitif dari log
const sanitizeBody = (body) => {
    if (!body) return undefined;
    const clean = { ...body };
    delete clean.password;
    delete clean.newPassword;
    delete clean.currentPassword;
    delete clean.token;
    return clean;
};

module.exports = auditLog;
