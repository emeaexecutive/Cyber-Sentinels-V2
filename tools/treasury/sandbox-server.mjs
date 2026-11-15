import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { treasuryFixture } from '../../tests/fixtures/treasury.mjs';
import { createFileSwarmPersistence } from '../../lib/swarm/file-persistence.ts';
import { exportTreasuryEvidence } from '../../lib/treasury/evidence.ts';
import { financialSignals } from '../../lib/treasury/intelligence.ts';

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Trust Operations — Treasury Sandbox</title><style>body{font:16px system-ui;background:#101923;color:#edf5fa;max-width:1100px;margin:40px auto;padding:0 24px}header{display:flex;align-items:center;justify-content:space-between}h1{font-size:32px}small,p{color:#b6c6d3}select,a{color:inherit;background:#203141;padding:8px;border:1px solid #526676;border-radius:5px}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{text-align:left;padding:12px;border-bottom:1px solid #354556;overflow-wrap:anywhere}code{font-size:12px} .ALLOW{color:#6fe0b7}.REVIEW{color:#ffdb8c}.DENY{color:#ff99a0}@media(max-width:600px){body{margin:20px auto}h1{font-size:24px}td,th{padding:8px;font-size:12px}header{align-items:start}}</style><header><div><small>CYBER SENTINELS · TENENTE</small><h1 id="heading"></h1></div><label><span id="languageLabel"></span> <select id="locale" aria-label="Language"><option value="en">EN</option><option value="es">ES</option></select></label></header><p id="boundary"></p><p id="summary" role="status"></p><a id="download" href="/api/evidence" download="treasury-evidence.json"></a><table><thead><tr><th id="decisionLabel"></th><th id="requestLabel"></th><th id="reasonLabel"></th></tr></thead><tbody id="events"></tbody></table><h2 id="effectsLabel"></h2><pre id="effects" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre><script>const copy={en:{heading:'Trust Operations — Treasury Sandbox',boundary:'LOCAL SYNTHETIC SANDBOX. No live funds, provider, blockchain or hosted qualification. Identity enrollment and human sessions use declared test fixtures.',download:'Download signed evidence',decisionLabel:'Decision',requestLabel:'Request',reasonLabel:'Reasons',effectsLabel:'Observed synthetic destination ledger',languageLabel:'Language',summary:'Committed synthetic effects: '},es:{heading:'Operaciones de confianza — Tesorería de pruebas',boundary:'ENTORNO LOCAL SINTÉTICO. Sin fondos reales, proveedor, cadena de bloques ni homologación alojada. La identidad y las sesiones humanas utilizan datos de prueba declarados.',download:'Descargar evidencias firmadas',decisionLabel:'Decisión',requestLabel:'Solicitud',reasonLabel:'Motivos',effectsLabel:'Registro observado del destino sintético',languageLabel:'Idioma',summary:'Efectos sintéticos confirmados: '}};const locale=document.getElementById('locale');locale.value=localStorage.getItem('treasuryLocale')==='es'?'es':'en';let data;function render(){const c=copy[locale.value];document.documentElement.lang=locale.value;for(const id of ['heading','boundary','download','decisionLabel','requestLabel','reasonLabel','effectsLabel','languageLabel'])document.getElementById(id).textContent=c[id];if(!data)return;document.getElementById('summary').textContent=c.summary+data.effects.length;document.getElementById('effects').textContent=JSON.stringify(data.effects,null,2);const rows=data.events.filter(e=>/^FINANCIAL_(ALLOW|REVIEW|DENY)$/.test(e.kind)).reverse();const body=document.getElementById('events');body.replaceChildren();for(const e of rows){const tr=document.createElement('tr');for(const value of [e.details.decision,e.subjectId,(e.details.reasons||[]).join(', ')||'—']){const td=document.createElement('td');td.textContent=value;td.className=e.details.decision;tr.append(td);}body.append(tr);}}locale.onchange=()=>{localStorage.setItem('treasuryLocale',locale.value);render();};async function refresh(){try{data=await(await fetch('/api/status')).json();render();}catch{document.getElementById('summary').textContent='UNAVAILABLE';}}render();refresh();setInterval(refresh,2000);</script></html>`;

export async function startTreasurySandbox() {
  await mkdir('tmp', { recursive: true });
  const directory = await mkdtemp('tmp/treasury-http-');
  const h = await treasuryFixture({ persistence: createFileSwarmPersistence(directory) });
  const server = createServer(async (req, res) => {
    const json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(body)); };
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method === 'GET' && url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(html); return; }
      if (req.method === 'GET' && ['/api/status', '/api/destination', '/api/evidence'].includes(url.pathname)) {
        const { effects, ...replay } = await h.treasury.snapshot(h.tenant);
        const bundle = exportTreasuryEvidence(h.tenant, replay.events, effects, 'sandbox:receipt:v1', h.receiptKeys.privateKey);
        json(200, url.pathname === '/api/evidence' ? bundle : url.pathname === '/api/destination' ? effects : { ...replay, effects, signals: financialSignals(replay.events, h.tenant), synthetic: true }); return;
      }
      if (req.method !== 'POST' || !['/api/authorize', '/api/commit'].includes(url.pathname)) { json(404, { error: 'NOT_FOUND' }); return; }
      if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) { json(403, { error: 'ORIGIN_DENIED' }); return; }
      if (!req.headers['content-type']?.startsWith('application/json')) { json(415, { error: 'JSON_REQUIRED' }); return; }
      let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 16384) { json(413, { error: 'BODY_LIMIT' }); return; } }
      const body = JSON.parse(raw);
      const result = url.pathname === '/api/authorize' ? await h.treasury.authorize(h.tenant, body.signed) : await h.treasury.commit(h.tenant, body.mandateId, body.signed, body.available !== false);
      if (url.searchParams.get('drop') === '1' && result.effectId) { req.socket.destroy(); return; }
      json(200, result);
    } catch { if (!res.headersSent) json(400, { error: 'SANDBOX_REQUEST_DENIED' }); else res.end(); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { h, directory, server, url: 'http://127.0.0.1:' + server.address().port, close: () => new Promise(resolve => server.close(resolve)) };
}

if (process.argv.includes('--serve')) {
  const running = await startTreasurySandbox();
  console.log(JSON.stringify({ url: running.url, directory: running.directory, synthetic: true, liveFunds: false }));
}
