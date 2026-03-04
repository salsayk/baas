import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, 'db-config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));
const { host, port, database, username, password, ssl } = config.postgresql;

const client = new pg.Client({
  host,
  port,
  database,
  user: username,
  password,
  ssl: ssl ? { rejectUnauthorized: false } : false,
});

try {
  await client.connect();
  const res = await client.query('SELECT NOW() as server_time, current_database() as db');
  console.log('✅ Connected successfully!');
  console.log('   Database:', res.rows[0].db);
  console.log('   Server time:', res.rows[0].server_time);
} catch (err) {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
