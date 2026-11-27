// Local synthetic API only; this client deliberately rejects hosted providers.
export function treasurySandboxClient(origin) {
  const url = new URL(origin);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/') throw Error('LOCAL_SANDBOX_ONLY');
  const request = async (path, body) => {
    const response = await fetch(url.origin + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
    if (!response.ok) throw Error('SANDBOX_HTTP_' + response.status); return response.json();
  };
  return { authorize: signed => request('/api/authorize', { signed }), commit: (mandateId, signed) => request('/api/commit', { mandateId, signed }), observe: () => request('/api/destination'), evidence: () => request('/api/evidence') };
}
