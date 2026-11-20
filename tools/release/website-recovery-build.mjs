import {spawn} from 'node:child_process';
import {createWriteStream,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const log=createWriteStream('artifacts/recovery-20261103/native-build.log');
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'build'],{cwd:process.cwd(),env:process.env,windowsHide:true,stdio:['ignore','pipe','pipe']});
child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
child.on('exit',(code,signal)=>{log.end();writeFileSync('artifacts/recovery-20261103/native-build-result.json',JSON.stringify({exitCode:code,signal,finishedAt:new Date().toISOString()},null,2));console.log(`Native Next build exit: ${code}`);process.exitCode=code??1;});
