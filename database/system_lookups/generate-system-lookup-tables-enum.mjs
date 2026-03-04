import pg from 'pg';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Convert lookup_table_name to a valid PascalCase enum key (e.g. "Account Types" -> AccountTypes) */
function toEnumKey(name) {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
    .replace(/^[0-9]/, (c) => `_${c}`) || 'Unnamed';
}

const configPath = join(__dirname, '..', 'db-config.json');
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
  const res = await client.query(
    'SELECT lookup_table_name FROM system_lookups ORDER BY lookup_table_name'
  );
  const rows = res.rows || [];

  const entries = rows.map((r) => {
    const key = toEnumKey(r.lookup_table_name);
    const value = r.lookup_table_name.replace(/'/g, "\\'");
    return `  ${key}: "${value}",`;
  });

  const content = `/**
 * Enumerator for system lookup tables.
 * Use these keys to correlate a UI component dropdown to a specific system lookup table.
 *
 * Values match \`lookup_table_name\` in the \`system_lookups\` table.
 * Generated from DB. To regenerate: node database/system_lookups/generate-system-lookup-tables-enum.mjs
 *
 * Usage example:
 *   const lookupTableName = SystemLookupTable.AccountType;
 *   const lookups = await fetch(\`/api/system-lookups\`).then(r => r.json());
 *   const table = lookups.find((l: SystemLookup) => l.lookup_table_name === lookupTableName);
 *   const values = await fetch(\`/api/system-lookup-values?lookup_table_id=\${table?.lookup_table_id}\`).then(r => r.json());
 */
export const SystemLookupTable = {
${entries.join('\n')}
} as const;

export type SystemLookupTableKey = keyof typeof SystemLookupTable;

export type SystemLookupTableName = (typeof SystemLookupTable)[SystemLookupTableKey];
`;

  const outPath = join(__dirname, 'system-lookup-tables.ts');
  writeFileSync(outPath, content, 'utf-8');
  console.log('✅ system-lookup-tables.ts generated with', rows.length, 'entries.');
} catch (err) {
  console.error('❌ Failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
