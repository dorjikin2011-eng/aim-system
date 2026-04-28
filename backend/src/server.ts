// backend/src/server.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
dotenv.config();

import { requireRole } from './middleware/auth';

// Middleware
import { attachSessionUser } from './middleware/sessionUser';

// Routes
import authRoutes from './routes/authRoutes';
import resetPasswordRoutes from './routes/resetPasswordRoutes';
import adminRoutes from './routes/adminRoutes';
import adminAgencyRoutes from './routes/adminAgencyRoutes';
import adminUserRoutes from './routes/adminUserRoutes';
import adminLogRoutes from './routes/adminLogRoutes';
import reportRoutes from './routes/reportRoutes';
import reportExportRoutes from './routes/reportExportRoutes';
import adminConfigRoutes from './routes/adminConfigRoutes';
import agencyDataRoutes from './routes/agencyDataRoutes';
import formTemplatesRouter from './routes/formTemplates';
import indicatorConfigRouter from './routes/indicatorConfig';
import configRoutes from './routes/configRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import evidenceRoutes from './routes/evidenceRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import focalRoutes from './routes/focalRoutes';
import hoaRoutes from './routes/hoaRoutes';
import focalNominationRoutes from './routes/focalNominationRoutes';
import commissionDashboardRoutes from './routes/commissionDashboardRoutes';
import directorDashboardRoutes from './routes/directorDashboardRoutes';
import maturityRoutes from './routes/maturity';
import agencyRoutes from './routes/agencyDataRoutes';
import assignedOfficerRoutes from './routes/assignedOfficerRoutes';

// Controllers
import { getAgencyById } from './controllers/agencyController';
import { getSystemConfig } from './controllers/configController';

// ✅ PostgreSQL DB
import { pool, query, testConnection, closePool } from './models/db';

const app = express();

app.set('trust proxy', 1);

/* -------------------- TEST DB CONNECTION -------------------- */
let dbConnected = false;

// Test connection without blocking server startup
testConnection()
  .then(connected => {
    dbConnected = connected;
    if (connected) {
      console.log('✅ Database is ready for operations');
    } else {
      console.warn('⚠️ Database connection failed - some features may not work');
    }
  })
  .catch(err => {
    console.error('❌ Database connection error details:', err);
    console.error('❌ Error message:', err?.message);
    console.error('❌ Error stack:', err?.stack);
    dbConnected = false;
  });

/* -------------------- Security -------------------- */
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

/* -------------------- CORS -------------------- */
const allowedOrigins = (process.env.FRONTEND_URL || 'https://frontend-alpha-nine-65.vercel.app')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

// Development fallback
if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
  console.log('🔓 CORS: Using development origins:', allowedOrigins);
}

// Production safety: Log warning if no origins configured
if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ CORS WARNING: No FRONTEND_URL set in production. All requests will be blocked!');
  console.warn('⚠️ Set FRONTEND_URL in Vercel Backend → Settings → Environment Variables');
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no Origin header (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Allow if in whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Log and block in production
      if (process.env.NODE_ENV === 'production') {
        console.warn(`🚫 CORS blocked in production: ${origin}`);
        return callback(new Error(`CORS blocked: ${origin}`), false);
      }
      
      // In development: allow unknown origins with warning (for testing)
      console.warn(`⚠️ CORS: Allowing unlisted origin in dev: ${origin}`);
      return callback(null, true);
    },
    credentials: true, // ✅ Required for session cookies
  })
);

/* -------------------- Parsers -------------------- */
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* -------------------- SESSION (PostgreSQL ONLY) -------------------- */
const pgSession = require('connect-pg-simple')(session);

app.use(
  session({
    name: 'aims.sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-aim-system-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // ✅ Secure required for sameSite: 'none'
      secure: process.env.NODE_ENV === 'production',
      // ✅ 'none' allows cross-origin fetch requests to send cookies
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined,
      maxAge: 24 * 60 * 60 * 1000,
    },
    store: new pgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
      errorLog: (err: Error) => {
        console.error('Session store error:', err);
      },
    }),
  })
);

// TEST ENDPOINT - Check if session is persisting
app.get('/api/test-session', (req, res) => {
  console.log('🧪 Test session endpoint called');
  console.log('Session ID:', req.sessionID);
  console.log('Session user:', (req.session as any)?.user);
  
  res.json({ 
    sessionID: req.sessionID,
    hasUser: !!(req.session as any)?.user,
    user: (req.session as any)?.user || null,
    cookie: req.session?.cookie
  });
});

/* -------------------- Attach session user -------------------- */
app.use(attachSessionUser);

/* -------------------- Request Logging (only in development) -------------------- */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`🔍 ${req.method} ${req.path}`);
    next();
  });
}

/* -------------------- Routes -------------------- */

// Public
app.use('/api/auth', authRoutes);
app.use('/api/auth/reset', resetPasswordRoutes);
app.get('/api/system-config', getSystemConfig);

app.get('/api/health', async (_req, res) => {
  let dbStatus = false;
  let dbError = null;
  try {
    const result = await pool.query('SELECT NOW() as now');
    dbStatus = true;
  } catch (err: any) {
    dbError = err.message;
  }
  res.json({ 
    status: 'OK', 
    database: dbStatus,
    databaseError: dbError,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV
  });
});

// Simple test
app.get('/api/test', (_req, res) => {
  res.json({ message: 'Test route works!', time: new Date().toISOString() });
});

/* -------------------- FIXED TEMPLATE ENDPOINT -------------------- */
app.post('/api/fix-template', async (_req, res) => {
  try {
    const bcrypt = require('bcrypt');
    const crypto = require('crypto');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Upsert admin user
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET 
         password_hash = EXCLUDED.password_hash,
         is_active = true,
         updated_at = CURRENT_TIMESTAMP`,
      [
        crypto.randomUUID(),
        'System Administrator',
        'admin@acc.gov',
        hashedPassword,
        'system_admin',
        true,
      ]
    );

    // Check template
    const templateRows = await query(
      `SELECT COUNT(*) FROM form_templates WHERE id = 'template_aims_assessment_v3'`
    );

    const count = Number(templateRows[0]?.count || 0);

    if (count === 0) {
      await query(
        `INSERT INTO form_templates 
        (id, name, description, template_type, indicator_ids, sections, version, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          'template_aims_assessment_v3',
          'AIMS Assessment Form (V3)',
          'Standard AIMS assessment form',
          'assessment',
          JSON.stringify([
            'ind_iccs_v3',
            'ind_training_v3',
            'ind_ad_v3',
            'ind_coc_v3',
            'ind_cases_v3',
          ]),
          JSON.stringify([]),
          '3.0.0',
          true,
        ]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Fix template error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/* -------------------- Auth Middleware -------------------- */
const authMiddleware = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

/* -------------------- DEBUG ENDPOINT -------------------- */
app.get('/api/debug-auth', (req, res) => {
  const sessionUser = (req.session as any)?.user;
  const reqUser = (req as any).user;
  
  res.json({
    authenticated: !!reqUser,
    sessionExists: !!req.session,
    sessionUser: sessionUser ? {
      email: sessionUser.email,
      role: sessionUser.role
    } : null,
    reqUser: reqUser ? {
      email: reqUser.email,
      role: reqUser.role
    } : null,
    sessionID: req.sessionID
  });
});

/* -------------------- DEBUG ROUTES -------------------- */
app.get('/api/debug-routes', (req, res) => {
  const routes: string[] = [];
  
  // Helper to extract routes from app
  const extractRoutes = (stack: any, basePath: string = '') => {
    stack.forEach((layer: any) => {
      if (layer.route) {
        // Route registered directly on app
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        routes.push(`${methods} ${basePath}${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle.stack) {
        // Router middleware
        const routerPath = layer.regexp.source
          .replace('\\/?(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\^/g, '')
          .replace(/\?/g, '');
        extractRoutes(layer.handle.stack, basePath + routerPath);
      }
    });
  };
  
  extractRoutes(app._router.stack);
  
  // Filter to show only relevant routes
  const relevantRoutes = routes.filter(r => 
    r.includes('/prevention') || 
    r.includes('/debug') ||
    r.includes('/dashboard')
  );
  
  res.json({
    totalRoutes: routes.length,
    relevantRoutes: relevantRoutes
  });
});

/* -------------------- Protected Routes -------------------- */
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/admin/agencies', authMiddleware, adminAgencyRoutes);
app.use('/api/admin/users', authMiddleware, adminUserRoutes);
app.use('/api/admin/logs', authMiddleware, adminLogRoutes);
app.use('/api/admin/config', authMiddleware, adminConfigRoutes);
app.use('/api/form-templates', authMiddleware, formTemplatesRouter);
app.use('/api/indicator-config', authMiddleware, indicatorConfigRouter);
app.use('/api/config', authMiddleware, configRoutes);
app.use('/api/admin/focal-nominations', authMiddleware, focalNominationRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/reports/export', authMiddleware, reportExportRoutes);
app.use('/api/agency/data', authMiddleware, agencyDataRoutes);
app.get('/api/agencies/:id', authMiddleware, getAgencyById);
app.use('/api/admin/assignments', authMiddleware, assignmentRoutes);
app.use('/api/assessments', authMiddleware, assessmentRoutes);
app.use('/api/evidence', authMiddleware, evidenceRoutes);
app.use('/api/prevention', authMiddleware, requireRole(['prevention_officer', 'system_admin', 'commissioner', 'director']), dashboardRoutes);
app.use('/api/focal', authMiddleware, focalRoutes);
app.use('/api/hoa', authMiddleware, hoaRoutes);
app.use('/api/commission', authMiddleware, commissionDashboardRoutes);
app.use('/api/director', authMiddleware, directorDashboardRoutes);
app.use('/api/maturity', authMiddleware, maturityRoutes);
app.use('/api/agency/assigned-officer', assignedOfficerRoutes);
app.use('/api/agency', authMiddleware, agencyRoutes);

/* -------------------- Root -------------------- */
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'AIMS Backend API is running 🚀',
    environment: process.env.NODE_ENV || 'development',
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

/* -------------------- 404 Handler -------------------- */
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `Route ${req.originalUrl} not found` 
  });
});

/* -------------------- Global Error Handler -------------------- */
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(500).json({ 
    success: false, 
    error: message 
  });
});

/* -------------------- Graceful Shutdown -------------------- */
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
  
  try {
    await closePool();
    console.log('✅ Database pool closed');
  } catch (err) {
    console.error('❌ Error closing database pool:', err);
  }
  
  console.log('👋 Graceful shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 3000;

// Only listen when NOT in Vercel serverless environment
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📊 Database: PostgreSQL (Supabase)`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n✨ AIMS Backend API is ready!`);
  });
  
  // Handle graceful shutdown for local development
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Export the Express app for Vercel serverless functions
export default app;