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
import fixRoutes from './routes/fixRoutes';

// Controllers
import { getAgencyById } from './controllers/agencyController';
import { getSystemConfig } from './controllers/configController';

// DB utilities
import dbUtils, { getDB, getAsync, runAsync } from './models/db';
import { Pool } from 'pg';

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
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route works!', time: new Date().toISOString() });
});

// ✅ ADD THIS TEST ROUTE
app.get('/api/test', (_req, res) => {
  res.json({ 
    success: true, 
    message: 'Test route works!',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/fix-template', async (req, res) => {
  try {
    const db = getDB();
    const isPG = db instanceof Pool;
    const bcrypt = require('bcrypt');
    const crypto = require('crypto');
    
    // Create admin user (ensure it's active)
const hashedPassword = await bcrypt.hash('admin123', 10);
await runAsync(db, `
  INSERT INTO users (id, name, email, password_hash, role, is_active)
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (email) DO UPDATE SET 
    password_hash = $4,
    is_active = $6,
    updated_at = CURRENT_TIMESTAMP
`, [
  crypto.randomUUID(),
  'System Administrator',
  'admin@acc.gov',
  hashedPassword,
  'system_admin',
  isPG ? true : 1
]);
    
    // Create form template
    const exists = await getAsync<{ count: number }>(db,
      "SELECT COUNT(*) as count FROM form_templates WHERE id = 'template_aims_assessment_v3'"
    );
    
    if (exists?.count === 0) {
      await runAsync(db, `
        INSERT INTO form_templates (id, name, description, template_type, indicator_ids, sections, version, is_active, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'template_aims_assessment_v3',
        'AIMS Assessment Form (V3)',
        'Standard AIMS assessment form',
        'assessment',
        JSON.stringify(['ind_iccs_v3', 'ind_training_v3', 'ind_ad_v3', 'ind_coc_v3', 'ind_cases_v3']),
        '[]',
        '3.0.0',
        isPG ? true : 1,
        'system',
        'system'
      ]);
    }
    
    res.json({ success: true, message: 'Admin created (admin@acc.gov / admin123) and template ready!' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

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

app.use('/api/fix', fixRoutes);

// TEMPORARY FIX - REMOVE AFTER RUNNING
app.get('/api/fix-template', async (req, res) => {
  try {
    const db = getDB();
    const isPG = db instanceof Pool;
    
    const templateCheck = await getAsync<{ count: number }>(db,
      "SELECT COUNT(*) as count FROM form_templates WHERE id = 'template_aims_assessment_v3'"
    );
    
    if (templateCheck?.count === 0) {
      const sections = JSON.stringify([
        {
          id: 'section_basic',
          title: 'Agency Information',
          fields: [
            { id: 'agency_name', type: 'text', name: 'agency_name', label: 'Agency Name', required: true },
            { id: 'fiscal_year', type: 'text', name: 'fiscal_year', label: 'Fiscal Year', required: true }
          ]
        }
      ]);
      
      await runAsync(db, `
        INSERT INTO form_templates (
          id, name, description, template_type, indicator_ids, sections, version, is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'template_aims_assessment_v3',
        'AIMS Assessment Form (V3)',
        'Standard AIMS assessment form',
        'assessment',
        JSON.stringify(['ind_iccs_v3', 'ind_training_v3', 'ind_ad_v3', 'ind_coc_v3', 'ind_cases_v3']),
        sections,
        '3.0.0',
        isPG ? true : 1,
        'system',
        'system'
      ]);
      res.json({ success: true, message: 'Form template created!' });
    } else {
      res.json({ success: true, message: 'Template already exists' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database mode: ${process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite'}`);
});

export default app;