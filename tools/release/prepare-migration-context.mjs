// Prepare isolated migration history locally. This performs no network or database operations.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const targets = { staging: 'agpyhygpfmppjkxwcpac', production: 'kecgtsfibkypjuaxqbjx' };

// The hosted integration reads committed migrations without running this helper.
// These identities are already in Production's ledger; their SQL stays archived.
export const productionHistoryAliases = Object.freeze([
  '20260819084252_consent_evidence_freshness_repair.sql',
  '20260819084329_restrict_evidence_trigger_functions.sql',
  '20260902083450_grant_service_role_api_keys_privileges.sql',
  '20260903095127_reconcile_public_api_webhook_event_types.sql',
  '20260904113046_normalize_continuous_trust_alert_contract.sql',
]);

export function productionHistoryMarker(filename) {
  if (!productionHistoryAliases.includes(filename)) throw new Error(`Unknown Production history alias: ${filename}`);
  return [
    '-- Historical Production migration identity only; no executable SQL.',
    '-- Already applied to Production kecgtsfibkypjuaxqbjx; do not replay.',
    `-- Original SQL: supabase/history/production/${filename}`,
    '-- This marker does not reconstruct the archived change on a fresh database.',
    '',
  ].join('\n');
}

function shouldSkipCopiedEntry(name) {
  return name === '.temp' || name === '.env' || name === '.env.local' || name === '.env.production' || name === '.env.development';
}

function copyDirectoryIfExists(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return;
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (shouldSkipCopiedEntry(entry.name)) continue;

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryIfExists(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

export function prepareMigrationContext(environment) {
  if (!Object.hasOwn(targets, environment)) {
    throw new Error('Usage: node tools/release/prepare-migration-context.mjs staging|production');
  }

  const destination = fs.mkdtempSync(path.join(os.tmpdir(), `cyber-v1-${environment}-`));
  const directory = path.join(destination, 'supabase');
  fs.mkdirSync(path.join(directory, 'migrations'), { recursive: true });

  fs.copyFileSync('supabase/config.toml', path.join(directory, 'config.toml'));
  copyDirectoryIfExists('supabase/templates', path.join(directory, 'templates'));

  const versions = new Set();
  for (const source of ['supabase/migrations', `supabase/history/${environment}`]) {
    for (const filename of fs.readdirSync(source).filter(name => name.endsWith('.sql')).sort()) {
      const version = filename.split('_')[0];
      if (source === 'supabase/migrations' && productionHistoryAliases.some(name => name.split('_')[0] === version)) {
        const marker = fs.readFileSync(path.join(source, filename), 'utf8').replaceAll('\r\n', '\n');
        if (marker !== productionHistoryMarker(filename)) throw new Error(`Invalid Production history marker: ${filename}`);
        if (!fs.existsSync(path.join('supabase/history/production', filename))) throw new Error(`Missing Production history archive: ${filename}`);
        // Preserve the original environment-specific context: Production gets
        // its archived originals below; Staging gets only its own archive.
        continue;
      }
      if (versions.has(version)) throw new Error(`Duplicate migration version: ${version}`);
      versions.add(version);
      fs.copyFileSync(path.join(source, filename), path.join(directory, 'migrations', filename));
    }
  }

  return {
    environment,
    targetProject: targets[environment],
    workdir: destination,
    migrationCount: versions.size,
    linked: false,
    databaseChanged: false,
  };
}

const isDirectExecution = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectExecution) {
  console.log(JSON.stringify(prepareMigrationContext(process.argv[2]), null, 2));
}
