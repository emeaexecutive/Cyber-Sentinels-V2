import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {compareSchemas,schemaContract} from './schema-equivalence.mjs';
const [mode,leftPath,rightPath]=process.argv.slice(2);
const contractPath='supabase/canonical-schema-contract.json';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if(mode==='--write') {
 if(!leftPath||!rightPath)throw new Error('Writing a contract requires two independently reconstructed/observed catalogs.');
 const left=read(leftPath),right=read(rightPath);
 if(compareSchemas(left,right).result!=='PASS')throw new Error('Schema equivalence has not passed.');
 const a=schemaContract(left),b=schemaContract(right);
 if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('Canonical fingerprints differ despite catalog review.');
 fs.writeFileSync(contractPath,JSON.stringify({...a,querySha256:hash('tools/release/effective-application-schema.sql'),reviewedEquivalencesSha256:hash('tools/release/reviewed-schema-equivalences.json')},null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',contract:contractPath,sections:Object.keys(a.sections).length}));
} else if(mode==='--check') {
 const expected=read(contractPath),actual=schemaContract(read(leftPath));
 const sections=[...new Set([...Object.keys(expected.sections),...Object.keys(actual.sections)])].filter(k=>JSON.stringify(expected.sections[k])!==JSON.stringify(actual.sections[k]));
 const sourceMatches=expected.querySha256===hash('tools/release/effective-application-schema.sql')&&expected.reviewedEquivalencesSha256===hash('tools/release/reviewed-schema-equivalences.json');
 const pass=sourceMatches&&!sections.length;
 console.log(JSON.stringify({result:pass?'PASS':'FAIL',sourceMatches,differingSections:sections}));
 if(!pass)process.exitCode=1;
} else throw new Error('Usage: schema-contract.mjs --write left.json right.json | --check observed.json');
