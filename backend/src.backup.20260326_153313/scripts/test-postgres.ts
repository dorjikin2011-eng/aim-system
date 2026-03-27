import 'dotenv/config'; // Load .env automatically
import { Client } from 'pg';

async function testPostgres() {
  const dbUrl = process.env.DATABASE_URL;

  console.log('DB URL:', dbUrl);

  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('render.com') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('📡 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ PostgreSQL connected successfully');
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('❌ PostgreSQL connection failed:', err.message);
    } else {
      console.error('❌ PostgreSQL connection failed:', err);
    }
  } finally {
    await client.end();
  }
}

testPostgres();