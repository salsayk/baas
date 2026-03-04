import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = JSON.parse(readFileSync(join(__dirname, 'db-config.json'), 'utf-8'));
const { host, port, database, username, password, ssl } = config.postgresql;

const client = new pg.Client({ host, port, database, user: username, password, ssl: ssl ? { rejectUnauthorized: false } : false });

await client.connect();
const r = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'accounts' ORDER BY ordinal_position`);
console.log('accounts table columns:');
r.rows.forEach(row => console.log('  ', row.column_name, '-', row.data_type));
await client.end();
