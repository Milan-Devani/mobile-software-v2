// Mobotech mobile care Server - Supabase Connected
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { initDb } from './db/db.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import partsRoutes from './routes/partsRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  env.CLIENT_URL,
  env.APP_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in development
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploaded static files
app.use('/uploads', express.static(UPLOADS_DIR));

// Rate limiting on API routes
app.use('/api', apiRateLimiter);

// Root endpoint (prevents 404 if external cron service or uptime monitor pings base URL)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Mobotech Mobile Care API',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

// Root Health check (for external cron services, uptime monitors, and Render health checks)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mobile Repair Management System API is healthy.',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/backups', backupRoutes);

// Catch-all for undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found.`, 404, 'NOT_FOUND'));
});

// Centralized error handler
app.use(errorHandler);

// Initialize DB and start server
const startServer = async () => {
  try {
    await initDb();
    const server = app.listen(env.PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 REPAIR SYSTEM SERVER RUNNING ON PORT ${env.PORT}`);
      console.log(`   API Endpoint: ${env.API_URL}/api`);
      console.log(`   Client URL:   ${env.CLIENT_URL}`);
      console.log(`====================================================`);
    });

    // Auto-connect Baileys WhatsApp session if saved auth credentials exist
    try {
      const { initBaileys } = await import('./services/baileysService.js');
      initBaileys(false).catch((err) => console.warn('Background Baileys auto-start warning:', err.message));
    } catch (_) {}

    // Self-Keep-Alive Engine: Pings external URL every 9 minutes to prevent Render idle sleep
    const selfUrl = process.env.RENDER_EXTERNAL_URL || (env.API_URL && !env.API_URL.includes('localhost') ? env.API_URL : null);
    if (selfUrl) {
      console.log(`📡 Auto-keep-alive worker initialized for ${selfUrl}/health (every 9m)`);
      setInterval(async () => {
        try {
          const pingTarget = `${selfUrl.replace(/\/+$/, '')}/health`;
          const res = await fetch(pingTarget, { signal: AbortSignal.timeout(30000) });
          if (res.ok) {
            console.log(`[Keep-Alive] 🟢 Backend pinged itself successfully at ${new Date().toISOString()}`);
          }
        } catch (pingErr) {
          console.warn(`[Keep-Alive] ⚠️ Background ping note: ${pingErr.message}`);
        }
      }, 9 * 60 * 1000); // 9 minutes interval (safely below Render 15-minute shutdown)
    }

    return server;
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

export default app;

