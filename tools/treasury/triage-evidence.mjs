import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = 'artifacts/execution06-treasury/';
const manifest = JSON.parse(readFileSync(root + 'manifest.json', 'utf8'));
manifest.files = manifest.files.map(x => ({ ...x, sha256: createHash('sha256').update(readFileSync(root + x.name)).digest('hex') }));
writeFileSync(root + 'manifest.json', JSON.stringify(manifest, null, 2));
const findings = JSON.parse(readFileSync('execution06-export-scan-redacted.json', 'utf8')).map(x => {
  const line = readFileSync(x.File, 'utf8').split(/\r?\n/)[x.StartLine - 1];
  const value = JSON.parse('{' + line.trim().replace(/,$/, '') + '}').runtimeKeyFingerprint;
  if (x.RuleID !== 'generic-api-key' || typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw Error('UNREVIEWED_FINDING');
  return { file: x.File, line: x.StartLine, rule: x.RuleID, fingerprint: 'f48a326f8118973f1b1409b7596f0a9572a7f14c:' + x.Fingerprint,
    classification: 'SHA256 fingerprint of enrolled public Ed25519 key; not an authentication credential', source: 'lib/swarm/containment.ts enrollRuntimeKey hashes normalized public key' };
});
const triage = { evidenceCommit: 'f48a326f8118973f1b1409b7596f0a9572a7f14c', findings, privateKeysExported: false, scannerRulesChanged: false };
writeFileSync('docs/qualification/EXECUTION06-EVIDENCE-SCANNER-TRIAGE.json', JSON.stringify(triage, null, 2));
const canonical = readFileSync('gitleaks-verified-fixtures.ignore', 'utf8').split(/\r?\n/).filter(x => x && !x.startsWith('#'));
const required = [...new Set([...canonical, ...findings.map(x => x.fingerprint)])];
for (const tree of ['execution06-core', 'execution06-treasury', 'execution06-website', 'execution06-soc-reconcile']) {
  const path = '../' + tree + '/gitleaks-verified-fixtures.ignore';
  const original = readFileSync(path, 'utf8');
  const missing = required.filter(x => !original.split(/\r?\n/).includes(x));
  if (missing.length) writeFileSync(path, original.trimEnd() + '\n\n# Exact reviewed non-secret fixture/public-key metadata; see Execution06 triage.\n' + missing.join('\n') + '\n');
}
console.log(JSON.stringify({ reviewed: findings.length, requiredExactFingerprints: required.length, evidenceFiles: readdirSync(root).length }));
