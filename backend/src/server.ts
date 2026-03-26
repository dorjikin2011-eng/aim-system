// backend/src/server.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
dotenv.config();

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

// DB utilities
import dbUtils from './models/db';

const app = express();

/* -------------------- Initialize DB -------------------- */

(async () => {
  try {
    await dbUtils.createTables();
    console.log('✅ Tables initialized');

    await dbUtils.initializeDatabase(); // includes default/seeding data
    console.log('✅ Default data initialized');
  } catch (err) {
    console.error('❌ DB initialization failed:', err);
    // Don't exit on error in development, but do in production
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Production database initialization failed. Exiting...');
      process.exit(1);
    }
  }
})();

/* -------------------- Security Headers -------------------- */
app.use(
  helmet({
    contentSecurityPolicy: false, // avoids blocking Vite frontend
  })
);

/* -------------------- CORS -------------------- */
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',');

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow curl/Postman
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error(`CORS blocked: ${origin}`), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

/* -------------------- Parsers -------------------- */
app.use(cookieParser());
app.use(express.json());

/* -------------------- Session -------------------- */
// Use different session stores based on environment
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  // Production: Use PostgreSQL session store
  const pgSession = require('connect-pg-simple')(session);
  const { Pool } = require('pg');
  
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  app.use(
    session({
      name: 'aims.sid',
      secret: process.env.SESSION_SECRET || 'dev-secret-aim-system-2026',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      },
      store: new pgSession({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: true
      })
    })
  );
} else {
  // Development: Use SQLite session store
  const SQLiteStore = require('connect-sqlite3')(session);
  
  app.use(
    session({
      name: 'aims.sid',
      secret: process.env.SESSION_SECRET || 'dev-secret-aim-system-2026',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      },
      store: new SQLiteStore({
        db: 'sessions.db',
        dir: './',
      }),
    })
  );
}

/* -------------------- Attach session user -------------------- */
app.use(attachSessionUser);

/* -------------------- Debug Logger -------------------- */
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍', req.method, req.path);
  }
  next();
});

/* -------------------- Routes -------------------- */
// Public
app.use('/api/auth', authRoutes);
app.use('/api/auth/reset', resetPasswordRoutes);
app.get('/api/system-config', getSystemConfig);
app.get('/api/health', (_req, res) => res.json({ status: 'OK' }));

// Auth middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

// Protected routes
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/admin/agencies', authMiddleware, adminAgencyRoutes);
app.use('/api/admin/users', authMiddleware, adminUserRoutes);
app.use('/api/admin/logs', authMiddleware, adminLogRoutes);
app.use('/api/admin/config', authMiddleware, adminConfigRoutes);
app.use('/api/form-templates', authMiddleware, formTemplatesRouter);
app.use('/api/indicator-config', authMiddleware, indicatorConfigRouter);
app.use('/api/admin/focal-nominations', authMiddleware, focalNominationRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/reports/export', authMiddleware, reportExportRoutes);
app.use('/api/agency/data', authMiddleware, agencyDataRoutes);
app.get('/api/agencies/:id', authMiddleware, getAgencyById);
app.use('/api/admin/assignments', authMiddleware, assignmentRoutes);
app.use('/api/assessments', authMiddleware, assessmentRoutes);
app.use('/api/evidence', authMiddleware, evidenceRoutes);
app.use('/api/prevention', authMiddleware, dashboardRoutes);
app.use('/api/focal', authMiddleware, focalRoutes);
app.use('/api/hoa', authMiddleware, hoaRoutes);
app.use('/api/commission', authMiddleware, commissionDashboardRoutes);
app.use('/api/director', authMiddleware, directorDashboardRoutes);
app.use('/api/maturity', authMiddleware, maturityRoutes);
app.use('/api/agency/assigned-officer', assignedOfficerRoutes);
app.use('/api/agency', authMiddleware, agencyRoutes);

/* -------------------- Test Route -------------------- */
app.post('/api/auth/reset/test-forgot-password', (req, res) => {
  res.json({
    success: true,
    message: 'Test route working. Email would be sent to: ' + req.body.email,
  });
});

/* -------------------- Simple Route -------------------- */
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'AIMS Backend API is running 🚀',
  });
});

/* -------------------- 404 Handler -------------------- */
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

/* -------------------- Error Handling -------------------- */
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database mode: ${process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite'}`);
});

export default app;