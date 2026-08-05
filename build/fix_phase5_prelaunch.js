const API_KEY = process.env.N8N_API_KEY;
const BASE = 'https://raianrith.app.n8n.cloud/api/v1';

const reelRow = '(Array.isArray($json) ? $json[0] : $json)';

async function patchWorkflow2() {
  const id = 'SAN5w1j3C739zuXU';
  const res = await fetch(`${BASE}/workflows/${id}`, {
    headers: { 'X-N8N-API-KEY': API_KEY },
  });
  const json = await res.json();
  const wf = json.data ?? json;

  for (const node of wf.nodes) {
    if (node.name === 'Supabase: Get Reel') {
      node.parameters.url =
        "=https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reels?id=eq.{{ $('Parse Decision').item.json.reel_id }}&limit=1";
    }
    if (node.name === 'IG: Create Media Container') {
      node.parameters.jsonBody = `={{ JSON.stringify({
  media_type: 'REELS',
  video_url: ${reelRow}.video_url,
  caption: ${reelRow}.caption,
  share_to_feed: true
}) }}`;
    }
    if (node.name === 'Supabase: Mark Published') {
      node.parameters.url =
        "=https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reels?id=eq.{{ $('Parse Decision').item.json.reel_id }}";
    }
    if (node.name === 'Supabase: Mark Rejected + Requeue Topic') {
      node.parameters.url =
        "=https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reels?id=eq.{{ $('Parse Decision').item.json.reel_id }}";
    }
    if (node.name === 'Supabase: Requeue Topic') {
      node.parameters.url = `=https://fahosgalmjfxpijzjplf.supabase.co/rest/v1/reel_topics?id=eq.{{ ${reelRow}.topic_id }}`;
    }

    // Fix any stale node references
    const s = JSON.stringify(node.parameters ?? {});
    if (s.includes('Parse Callback Data')) {
      node.parameters = JSON.parse(
        s.replaceAll('Parse Callback Data', 'Parse Decision')
      );
    }
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
  console.log('WF2', upd.status, (await upd.json()).message || 'ok');
}

async function patchWorkflow1() {
  const id = '4cK2Hn2fCLNUpFM9';
  const res = await fetch(`${BASE}/workflows/${id}`, {
    headers: { 'X-N8N-API-KEY': API_KEY },
  });
  const json = await res.json();
  const wf = json.data ?? json;

  const tg = wf.nodes.find((n) => n.name === 'Telegram: Send for Approval');
  if (tg) {
    tg.parameters.file = `={{ ${reelRow}.video_url }}`;
    tg.parameters.replyMarkup.inlineKeyboard[0].rows[0].buttons[0].additionalFields.callback_data =
      `={{ 'approve:' + ${reelRow}.id }}`;
    tg.parameters.replyMarkup.inlineKeyboard[0].rows[0].buttons[1].additionalFields.callback_data =
      `={{ 'reject:' + ${reelRow}.id }}`;
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
  console.log('WF1', upd.status, (await upd.json()).message || 'ok');
}

(async () => {
  if (!API_KEY) {
    console.error('Set N8N_API_KEY');
    process.exit(1);
  }
  await patchWorkflow2();
  await patchWorkflow1();
})();
