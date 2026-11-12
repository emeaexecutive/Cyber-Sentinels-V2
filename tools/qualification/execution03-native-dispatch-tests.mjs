// Preserve all PR132 security assertions; change only the explicit isolated local cluster fence.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const original=fs.readFileSync('tests/native-dispatch-postgres.test.mjs','utf8');
const adapted=original.replaceAll('55441','55473').replaceAll("../../tmp/tenente-supplier-local/pgdata","tmp/pg-execution03/data");
if(original===adapted||!adapted.includes("assert.equal(resolve(actual).toLowerCase(),resolve('tmp/pg-execution03/data').toLowerCase()"))throw Error('UNCHANGED_ISOLATION_ASSERTION_REQUIRED');
fs.writeFileSync('tests/native-dispatch-postgres-loop-execution03.test.mjs',adapted);
fs.mkdirSync('artifacts/execution03',{recursive:true});fs.writeFileSync('artifacts/execution03/native-dispatch-test-provenance.json',JSON.stringify({sourcePr:132,sourceSha:'ad4a0e907a48bdb687351672355cddc5e74e2c00',originalSha256:createHash('sha256').update(original).digest('hex'),adaptedSha256:createHash('sha256').update(adapted).digest('hex'),changes:['explicit test-only local port55441→55473','asserted data_directory task-only tmp/pg-execution03/data'],assertionsRemoved:0},null,2)+'\n');
