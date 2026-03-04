import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, 'db-config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));
const { host, port, database, username, password, ssl } = config.postgresql;

const sqlPath = process.argv[2] || join(__dirname, 'create-accounts-table.sql');
const sql = readFileSync(sqlPath, 'utf-8');

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
  await client.query(sql);
  console.log('✅ SQL script executed successfully.');
} catch (err) {
  console.error('❌ Execution failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
