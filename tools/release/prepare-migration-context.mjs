// Prepare isolated migration history locally. This performs no network or database operations.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const environment = process.argv[2];
const targets = { staging: 'agpyhygpfmppjkxwcpac', production: 'kecgtsfibkypjuaxqbjx' };
if (!Object.hasOwn(targets, environment)) throw new Error('Usage: node tools/release/prepare-migration-context.mjs staging|production');
const destination = fs.mkdtempSync(path.join(os.tmpdir(), `cyber-v1-${environment}-`));
const directory = path.join(destination, 'supabase');
fs.mkdirSync(path.join(directory, 'migrations'), { recursive: true });
fs.copyFileSync('supabase/config.toml', path.join(directory, 'config.toml'));
const versions = new Set();
for (const source of ['supabase/migrations', `supabase/history/${environment}`]) {
  for (const filename of fs.readdirSync(source).filter(name => name.endsWith('.sql')).sort()) {
    const version = filename.split('_')[0];
    if (versions.has(version)) throw new Error(`Duplicate migration version: ${version}`);
    versions.add(version);
    fs.copyFileSync(path.join(source, filename), path.join(directory, 'migrations', filename));
  }
}
console.log(JSON.stringify({ environment, targetProject: targets[environment], workdir: destination, migrationCount: versions.size, linked: false, databaseChanged: false }, null, 2));
