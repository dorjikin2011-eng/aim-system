// backend/src/models/db.ts - PostgreSQL with backward-compatible helpers
import { Pool } from 'pg';

// Ensure DATABASE_URL is provided
if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is not set in environment variables');
}

console.log('📡 Connecting to PostgreSQL...');

// Create PostgreSQL connection pool for Supabase pooled connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },  // ✅ FIXED: Always rejectUnauthorized false
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});

// Test DB connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    console.log('✅ Database connected:', result.rows[0].now);
    return true;
  } catch (err: any) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
};

// -------------------------------------------------------
// Backward-compatible helpers
// -------------------------------------------------------

export const getDB = () => pool;

export const getAsync = async <T = any>(db: Pool, sql: string, params?: any[]): Promise<T | null> => {
  try {
    const res = await db.query(sql, params);
    return res.rows[0] || null;
  } catch (err: any) {
    console.error('❌ getAsync error:', err.message);
    throw err;
  }
};

export const runAsync = async (db: Pool, sql: string, params?: any[]): Promise<void> => {
  try {
    await db.query(sql, params);
  } catch (err: any) {
    console.error('❌ runAsync error:', err.message);
    throw err;
  }
};

export const allAsync = async <T = any>(db: Pool, sql: string, params?: any[]): Promise<T[]> => {
  try {
    const res = await db.query(sql, params);
    return res.rows;
  } catch (err: any) {
    console.error('❌ allAsync error:', err.message);
    throw err;
  }
};

export const query = async (text: string, params?: any[]) => {
  try {
    const res = await pool.query(text, params);
    return res.rows;
  } catch (err: any) {
    console.error('❌ Query error:', err.message);
    throw err;
  }
};

export const closePool = async () => {
  try {
    await pool.end();
    console.log('🛑 Database pool closed');
  } catch (err: any) {
    console.error('❌ Error closing pool:', err.message);
  }
};

export default pool;