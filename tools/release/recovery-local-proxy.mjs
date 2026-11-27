// Local routing only; no request/header/body logging, no externally supplied upstream.
import http from 'node:http';
const routes=[['/auth/v1',9999],['/rest/v1',3001],['/storage/v1',5000]];
http.createServer((request,response)=>{
  const route=routes.find(([prefix])=>request.url===prefix||request.url.startsWith(prefix+'/'));
  if(!route){response.writeHead(404);response.end();return;}
  const [prefix,port]=route;const headers={...request.headers,host:'127.0.0.1:'+port};
  if(!headers.authorization&&headers.apikey)headers.authorization='Bearer '+headers.apikey;
  const upstream=http.request({hostname:'127.0.0.1',port,path:request.url.slice(prefix.length)||'/',method:request.method,headers},remote=>{response.writeHead(remote.statusCode,remote.headers);remote.pipe(response);});
  upstream.on('error',()=>{if(!response.headersSent)response.writeHead(503,{'content-type':'application/json'});response.end('{"error":"local_dependency_unavailable"}');});
  request.pipe(upstream);
}).listen(54321,'127.0.0.1');
