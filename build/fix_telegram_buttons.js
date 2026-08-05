const API_KEY = process.env.N8N_API_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BASE = 'https://raianrith.app.n8n.cloud/api/v1';
const WF1 = '4cK2Hn2fCLNUpFM9';

const JSON_BODY = `={{ (() => {
  const reel = Array.isArray($json) ? $json[0] : $json;
  const d = $('Parse Script + Build Map URLs').item.json;
  return JSON.stringify({
    chat_id: '${CHAT_ID}',
    video: reel.video_url,
    caption: '🎬 ' + d.topic + '\\n\\nHOOK: ' + d.hook + '\\n\\nCAPTION:\\n' + d.caption,
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Approve & Publish', callback_data: 'approve:' + reel.id },
        { text: '❌ Reject', callback_data: 'reject:' + reel.id }
      ]]
    }
  });
})() }}`;

(async () => {
  const res = await fetch(`${BASE}/workflows/${WF1}`, {
    headers: { 'X-N8N-API-KEY': API_KEY },
  });
  const json = await res.json();
  const wf = json.data ?? json;

  const idx = wf.nodes.findIndex((n) => n.name === 'Telegram: Send for Approval');
  const old = wf.nodes[idx];
  wf.nodes[idx] = {
    id: old.id,
    name: 'Telegram: Send for Approval',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: old.position,
    parameters: {
      method: 'POST',
      url: `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`,
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: JSON_BODY,
      options: {},
    },
  };

  const upd = await fetch(`${BASE}/workflows/${WF1}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings,
    }),
  });
  console.log('WF1 telegram fix', upd.status, (await upd.json()).message || 'ok');

  // Add buttons to the message already sent (reel id 1, message_id 3)
  const patch = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      message_id: 3,
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Approve & Publish', callback_data: 'approve:1' },
          { text: '❌ Reject', callback_data: 'reject:1' },
        ]],
      },
    }),
  });
  const patchJson = await patch.json();
  console.log('editMessageReplyMarkup', patchJson.ok ? 'ok' : patchJson);
})();
