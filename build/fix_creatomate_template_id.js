const API_KEY = process.env.N8N_API_KEY;
const BASE = 'https://raianrith.app.n8n.cloud/api/v1';
const OLD_ID = '493907b8-aa3b-4750-8ce7-fc1f5c51ba20';
const NEW_ID = '493907b8-ea0b-4750-8ce7-fc1f5c51be20';
const WORKFLOW_IDS = ['WbQ35B2LHgP89BpW', '4cK2Hn2fCLNUpFM9'];

(async () => {
  for (const id of WORKFLOW_IDS) {
    const res = await fetch(`${BASE}/workflows/${id}`, {
      headers: { 'X-N8N-API-KEY': API_KEY },
    });
    const json = await res.json();
    const wf = json.data ?? json;
    let changed = false;

    for (const node of wf.nodes) {
      const body = node.parameters?.jsonBody;
      if (typeof body === 'string' && body.includes(OLD_ID)) {
        node.parameters.jsonBody = body.replaceAll(OLD_ID, NEW_ID);
        changed = true;
      }
    }

    if (!changed) {
      console.log(id, 'no change needed');
      continue;
    }

    const upd = await fetch(`${BASE}/workflows/${id}`, {
      method: 'PUT',
      headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings,
      }),
    });
    console.log(id, upd.status, (await upd.json()).message || 'ok');
  }
})();
