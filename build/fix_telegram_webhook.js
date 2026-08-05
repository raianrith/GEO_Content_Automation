const API_KEY = process.env.N8N_API_KEY;
const BASE = 'https://raianrith.app.n8n.cloud/api/v1';
const WF2 = 'SAN5w1j3C739zuXU';

(async () => {
  const res = await fetch(`${BASE}/workflows/${WF2}`, {
    headers: { 'X-N8N-API-KEY': API_KEY },
  });
  const json = await res.json();
  const wf = json.data ?? json;

  const tg = wf.nodes.find((n) => n.id === 'tg_trigger');
  tg.name = 'TelegramTrigger';

  // Update connections key
  if (wf.connections['Telegram Trigger']) {
    wf.connections.TelegramTrigger = wf.connections['Telegram Trigger'];
    delete wf.connections['Telegram Trigger'];
  }

  const upd = await fetch(`${BASE}/workflows/${WF2}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings,
    }),
  });
  console.log('rename', upd.status);

  // deactivate + activate to re-register webhook
  await fetch(`${BASE}/workflows/${WF2}/deactivate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': API_KEY },
  });
  await new Promise((r) => setTimeout(r, 2000));
  const act = await fetch(`${BASE}/workflows/${WF2}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': API_KEY },
  });
  console.log('reactivate', act.status);
})();
