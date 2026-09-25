import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const config = 'dist/server/wrangler.json';
if (!existsSync(config)) {
  throw new Error('Run npm run build before npm run deploy.');
}
const built = JSON.parse(readFileSync(config, 'utf8'));
if (built.d1_databases?.some(db => db.database_id === '00000000-0000-4000-8000-000000000000')) {
  throw new Error('Build contains a local placeholder database. Rebuild with the production configuration.');
}
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
function run(args) {
  const result = spawnSync(process.execPath, [wrangler, ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Wrangler provisions named D1/R2 resources if they do not exist. Never supply
// placeholder account identifiers or publish secrets from the local .env.
run(['deploy', '--config', config]);
run(['d1', 'migrations', 'apply', 'yifei-cai-study', '--remote', '--config', 'wrangler.jsonc']);
