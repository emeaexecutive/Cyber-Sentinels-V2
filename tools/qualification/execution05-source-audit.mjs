import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20_000_000 }).trim();
const read = (sha, file) => git('show', `${sha}:${file}`);
const website = '9b58683a63ce71b7f6d48936dfd71f90f52b15c3';
const enforcement = 'c6f84ebefd901725440f602288016c741d004b2c';
const snapshot = JSON.parse(readFileSync('docs/qualification/EXECUTION05-PR-SNAPSHOT.json', 'utf8'));
const checks = snapshot.checks.filter(x => x.status === 'fulfilled').map(x => x.value);
const files = new Map(checks.map(c => [c.number, new Set(c.files.structuredContent.filenames)]));
const overlap = [];
for (const [a, af] of files) for (const [b, bf] of files) {
  if (a < b) {
    const shared = [...af].filter(f => bf.has(f));
    if (shared.length) overlap.push({ a, b, shared });
  }
}
const source = read(website, 'lib/i18n/public-locales.ts');
const mappings = Object.fromEntries([...source.split('const publishedSpanishPages:')[1].split('};')[0].matchAll(/"([^"]+)": "([^"]+)"/g)].map(m => [m[1], m[2]]));
const pages = git('ls-tree', '-r', '--name-only', website, 'app').split('\n').filter(f => /(^|\/)page\.tsx$/.test(f));
const notices = new Set(['/regulatory', '/media-centre', '/our-people', '/careers', '/accessibility', '/privacy', '/terms', '/cookies', '/legal', '/modern-slavery', '/security']);
const rows = pages.filter(f => !f.startsWith('app/es/')).map(file => {
  const route = file.replace(/^app/, '').replace(/\/page\.tsx$/, '') || '/';
  return { file, route, spanishRoute: mappings[route] ?? null, status: notices.has(route) ? 'NOTICE_ONLY_APPROVAL_REQUIRED' : mappings[route] ? 'PUBLIC_SOURCE_PRESENT_RUNTIME_NOT_RETESTED' : 'NO_REGISTERED_SPANISH_EQUIVALENT' };
});
const output = { observedAt: snapshot.observedAt, enforcement, website, method: 'Git committed source inventory. No semantic translation or browser completion claim. Route groups/dynamic templates are source paths, not enumerated reachable URLs.', overlap, pages: rows };
mkdirSync('docs/qualification', { recursive: true });
writeFileSync('docs/qualification/EXECUTION05-SOURCE-INVENTORY.json', JSON.stringify(output, null, 2) + '\n');
writeFileSync('docs/qualification/EXECUTION05-EN-ES-COMPLETION.md', `# Execution05 English/Spanish completion\n\nStatus: INCOMPLETE / NO-GO for complete product localization. Website source ${website}; enforcement source ${enforcement}. Fresh committed-source inventory only; authenticated/unauthenticated desktop/mobile journeys have not been rerun in Execution05. Public mapping coverage is not semantic translation completion. Eleven notices require approved underlying source content. Account, protected registry/graph/SOC/SWARM/evidence/Replay/billing/API-key screens, validation, notifications and emails need full corpus review. Consent translation and positive persistence remain unqualified. URL/query/hash preservation exists in the website candidate; fresh-visit preference persistence and accessible interaction need qualification.\n\n| Source template / screen | Route template | Registered Spanish equivalent | Status |\n|---|---|---|---|\n${rows.map(r => `| ${r.file} | ${r.route} | ${r.spanishRoute ?? 'NONE'} | ${r.status} |`).join('\n')}\n`);
console.log(JSON.stringify({ pages: rows.length, mappings: Object.keys(mappings).length, notices: notices.size, overlappingPairs: overlap.length }));
