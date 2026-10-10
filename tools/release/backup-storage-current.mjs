// Current-object export only. Does not claim synchronized DB/Storage recovery by itself.
import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';
import{backupStorage,sha256}from'./recovery-storage.mjs';import{storageReadCredential}from'./storage-backup-credentials.mjs';
let config;try{
 config=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
 const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=path.resolve(config.directory);
 if(out===repo||out.toLowerCase().startsWith(repo.toLowerCase()+path.sep))throw new Error('Storage backup must be outside Git');
 const raw=fs.readFileSync(config.inventoryFile),inventory=JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));
 if(inventory.projectRef!==config.projectRef)throw new Error('Inventory project binding mismatch');
 const key=storageReadCredential(config,config.projectRef);
 const manifest=await backupStorage({url:config.url,key,inventory,directory:out});
 manifest.sourceInventorySha256=sha256(raw);manifest.sourceInventoryCapturedAt=inventory.capturedAt??null;manifest.credentialSource=config.useExistingCliSession?'EXISTING_AUTHENTICATED_CLI_MEMORY_ONLY':'SEPARATE_RESTRICTED_CREDENTIAL_FILE';
 const serialized=JSON.stringify(manifest,null,2)+'\n';fs.writeFileSync(path.join(out,'storage-manifest.json'),serialized,{mode:0o600});fs.writeFileSync(path.join(out,'storage-manifest.sha256'),sha256(serialized)+'\n',{mode:0o600});
 console.log(JSON.stringify({status:manifest.status,objects:manifest.objectCount,bytes:manifest.totalBytes,productionMutations:0,credentialPersisted:false}));
}catch(error){console.error(JSON.stringify({status:'BLOCKED',error:error.message,productionMutations:0}));process.exitCode=2;}
