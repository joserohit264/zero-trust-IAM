/**
 * IAM System - Main Server Entry Point
 * Express.js server with all security middleware and route configuration
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const logRoutes = require('./routes/logs');
const profileRoutes = require('./routes/profile');

// Import middleware
const { apiLimiter } = require('./middleware/rateLimiter');
const { auditLogger } = require('./middleware/auditLogger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ====================
// Security Middleware
// ====================

// Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            scriptSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ====================
// Parsing Middleware
// ====================

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ====================
// Rate Limiting
// ====================

app.use('/api', apiLimiter);

// ====================
// Audit Logging
// ====================

app.use(auditLogger);

// ====================
// Trust Proxy (for accurate IP addresses)
// ====================

app.set('trust proxy', 1);

// ====================
// Health Check
// ====================

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'IAM System is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ====================
// API Routes
// ====================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/profile', profileRoutes);

// ====================
// 404 Handler
// ====================

app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// ====================
// Global Error Handler
// ====================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(err.status || 500).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// ====================
// Start Server
// ====================

const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔐 IAM System Server Started                           ║
║                                                           ║
║   📍 URL: http://localhost:${PORT}                         ║
║   📝 API: http://localhost:${PORT}/api                     ║
║   🏥 Health: http://localhost:${PORT}/api/health           ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// ====================
// Graceful Shutdown
// ====================

const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Forcing shutdown...');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
