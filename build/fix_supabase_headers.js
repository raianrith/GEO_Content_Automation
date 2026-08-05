const API_KEY = process.env.N8N_API_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = 'https://raianrith.app.n8n.cloud/api/v1';

const workflowIds = [
  'WbQ35B2LHgP89BpW',
  '4cK2Hn2fCLNUpFM9',
  'SAN5w1j3C739zuXU',
  'CycfmafsJ1bfyO36',
];

function dualHeaders(existing = []) {
  const keep = existing.filter(
    (h) => h.name !== 'apikey' && h.name !== 'Authorization'
  );
  return [
    { name: 'apikey', value: SERVICE_ROLE_KEY },
    { name: 'Authorization', value: `Bearer ${SERVICE_ROLE_KEY}` },
    ...keep,
  ];
}

function patchSupabaseNode(node) {
  const isSupabase =
    node.type === 'n8n-nodes-base.httpRequest' && /Supabase/i.test(node.name || '');
  if (!isSupabase) return false;

  delete node.credentials;
  node.parameters.authentication = 'none';
  delete node.parameters.genericAuthType;

  const name = node.name;
  const headers = node.parameters.headerParameters?.parameters || [];

  if (name === 'Supabase: Next Topic') {
    node.parameters.url =
      'https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reel_topics?status=eq.queued&order=priority.asc,created_at.asc&limit=1';
    node.parameters.method = 'GET';
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = { parameters: dualHeaders(headers) };
  } else if (name === 'Supabase: Mark Topic Generating') {
    node.parameters.url =
      '=https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reel_topics?id=eq.{{ $json.id }}';
    node.parameters.method = 'PATCH';
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = {
      parameters: dualHeaders([
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'return=representation' },
      ]),
    };
  } else if (name === 'Supabase Storage: Upload Audio') {
    node.parameters.url =
      "=https://fahosgalmjfxpijzjplf.supabase.co/storage/v1/object/reels-assets/{{ $('Parse Script + Build Map URLs').item.json.audio_filename }}";
    node.parameters.method = 'POST';
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = {
      parameters: dualHeaders([{ name: 'Content-Type', value: 'audio/mpeg' }]),
    };
  } else if (name === 'Supabase: Save Reel') {
    node.parameters.url =
      'https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reels';
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = { parameters: dualHeaders(headers) };
  } else if (name === 'Supabase: Mark Topic Generated') {
    node.parameters.url =
      "=https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reel_topics?id=eq.{{ $('Parse Script + Build Map URLs').item.json.topic_id }}";
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = { parameters: dualHeaders(headers) };
  } else if (name === 'Supabase: Get Reel') {
    node.parameters.url =
      "=https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reels?id=eq.{{ $('Parse Callback Data').item.json.reel_id }}";
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = { parameters: dualHeaders(headers) };
  } else if (name === 'Supabase: Mark Published') {
    node.parameters.url =
      "=https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reels?id=eq.{{ $('Parse Callback Data').item.json.reel_id }}";
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = { parameters: dualHeaders(headers) };
  } else if (name === 'Supabase: Mark Rejected + Requeue Topic') {
    node.parameters.url =
      "=https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reels?id=eq.{{ $('Parse Callback Data').item.json.reel_id }}";
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = { parameters: dualHeaders(headers) };
  } else if (name === 'Supabase: Requeue Topic') {
    node.parameters.url =
      "=https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reel_topics?id=eq.{{ $('Supabase: Get Reel').item.json.topic_id }}";
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = { parameters: dualHeaders(headers) };
  } else if (name === 'Supabase: Published Reels (30d)') {
    node.parameters.url =
      'https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reels?status=eq.published&published_at=gte.{{ $now.minus({days: 30}).toISO() }}&select=id,ig_media_id,published_at';
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = { parameters: dualHeaders(headers) };
  } else if (name === 'Supabase: Upsert Performance') {
    node.parameters.url =
      'https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reel_performance?on_conflict=reel_id,snapshot_date';
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = { parameters: dualHeaders(headers) };
  } else {
    node.parameters.sendHeaders = true;
    node.parameters.headerParameters = { parameters: dualHeaders(headers) };
  }

  return true;
}

(async () => {
  if (!API_KEY || !SERVICE_ROLE_KEY) {
    console.error('Set N8N_API_KEY and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  for (const id of workflowIds) {
    const res = await fetch(`${BASE}/workflows/${id}`, {
      headers: { 'X-N8N-API-KEY': API_KEY },
    });
    const json = await res.json();
    const wf = json.data ?? json;
    let count = 0;
    for (const node of wf.nodes) if (patchSupabaseNode(node)) count++;

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
    const body = await upd.json();
    console.log(id, 'patched', count, 'nodes', upd.status, body.message || 'ok');
  }
})();
