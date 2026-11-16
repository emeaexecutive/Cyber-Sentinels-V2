// Preserve all nine PR134 scenarios and the exact PR135 helper dependency.
// Only explicit local cluster isolation coordinates are adapted.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const original=fs.readFileSync('tests/watchtower-river-postgres.test.mjs','utf8');
const adapted=original.replaceAll('55441','55473').replaceAll('../../tmp/tenente-supplier-local/pgdata','tmp/pg-execution03/data');
if(original===adapted||!adapted.includes("resolve('tmp/pg-execution03/data').toLowerCase()"))throw Error('EXPLICIT_LOCAL_DATA_DIRECTORY_FENCE_REQUIRED');
fs.writeFileSync('tests/watchtower-river-postgres-loop-execution03.test.mjs',adapted);
const expected=execFileSync('git',['show','202117ae82a48a7f8d536c29d5d700e8fbf11c70:lib/swarm/watchtower-signals.ts']);
const current=fs.readFileSync('lib/swarm/watchtower-signals.ts'),hash=data=>createHash('sha256').update(data).digest('hex'),lf=data=>data.toString('utf8').replaceAll('\r\n','\n');
if(hash(lf(expected))!==hash(lf(current)))throw Error('CURRENT_WARNING_SOURCE_DIFFERS_FROM_PINNED_135');
fs.mkdirSync('artifacts/execution03',{recursive:true});fs.writeFileSync('artifacts/execution03/river-test-provenance.json',JSON.stringify({sourcePr:134,sourceSha:'25f82561435be959e4b14b61873fb454cc1aa51a',originalSha256:hash(original),adaptedSha256:hash(adapted),warningSourceSha:'202117ae82a48a7f8d536c29d5d700e8fbf11c70',warningSourceRawSha256:hash(current),warningSourceLfSha256:hash(lf(current)),warningSourceGitBlobLfSha256:hash(lf(expected)),normalization:'CRLF→LF only; Windows checkout bytes differ solely in line endings',helper:'Original unmodified helper; requires exact clean PR135 checkout through WATCHTOWER_SIGNAL_SOURCE',changes:['explicit local port55441→55473','asserted data_directory task-only tmp/pg-execution03/data'],assertionsRemoved:0},null,2)+'\n');
