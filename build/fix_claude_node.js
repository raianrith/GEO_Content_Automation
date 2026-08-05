const API_KEY = process.env.N8N_API_KEY;
const BASE = 'https://raianrith.app.n8n.cloud/api/v1';
const WORKFLOW_IDS = ['WbQ35B2LHgP89BpW', '4cK2Hn2fCLNUpFM9'];

const SYSTEM_PROMPT = `You are the head writer for a viral Instagram reels account about geography and history oddities. The format: faceless voiceover over animated satellite maps. Audience: curious 18-40 year olds scrolling at speed. You have 1.5 seconds to stop the scroll.

RULES:
- Total voiceover: 60-90 words. Never more.
- EXACTLY 4 scenes.
- Scene 1 is the hook: a concrete, surprising claim in the first sentence (a number, a contradiction, or an impossible-sounding fact). Never open with "Did you know", a question, or context-setting.
- One idea per reel.
- Scene 4 delivers the payoff plus ONE line that provokes shares or comments. No "follow for more".
- Every fact must be real. If unsure of a number, use "more than" or "nearly" rather than inventing precision.
- Write for the ear: short sentences, contractions, no subclauses. Vary sentence length.
- overlay_text: max 6 words per scene.
- Map coordinates must be the real location. zoom 2-4 continental, 5-8 country, 9-13 local. Change zoom by at least 3 levels across the reel.

HOOK FORMULAS (rotate): impossible fact / big number small thing / contradiction / stakes reveal.

OUTPUT: ONLY a valid JSON object, no preamble, no markdown fences:
{"hook": "...", "script": "...", "caption": "1-2 punchy lines + 5 hashtags", "scenes": [{"n":1, "voiceover":"...", "overlay_text":"...", "map":{"lat":0.0, "lng":0.0, "zoom":5, "style":"satellite-streets-v12"}}]}`;

const BUILD_CLAUDE_CODE = `const topic = $('Supabase: Next Topic').first().json;

const payload = {
  model: 'claude-sonnet-4-6',
  max_tokens: 1500,
  system: ${JSON.stringify(SYSTEM_PROMPT)},
  messages: [{
    role: 'user',
    content: 'Topic: ' + topic.topic + '\\nSeries: ' + (topic.series || 'none') + '\\nAngle notes: ' + (topic.notes || 'none') + '\\n\\nWrite the reel.'
  }]
};

return [{ json: payload }];`;

function patchWorkflow(wf) {
  const nodes = wf.nodes;
  const claudeIdx = nodes.findIndex((n) => n.name === 'Claude: Write Script');
  if (claudeIdx === -1) return { changed: false, reason: 'no claude node' };

  const hasBuilder = nodes.some((n) => n.name === 'Build Claude Payload');
  if (!hasBuilder) {
    const markNode = nodes.find((n) => n.name === 'Supabase: Mark Topic Generating');
    const claudeNode = nodes[claudeIdx];
    nodes.push({
      id: 'build_claude_payload',
      name: 'Build Claude Payload',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [
        Math.round((markNode.position[0] + claudeNode.position[0]) / 2),
        claudeNode.position[1],
      ],
      parameters: {
        mode: 'runOnceForAllItems',
        jsCode: BUILD_CLAUDE_CODE,
      },
    });

    wf.connections['Supabase: Mark Topic Generating'] = {
      main: [[{ node: 'Build Claude Payload', type: 'main', index: 0 }]],
    };
    wf.connections['Build Claude Payload'] = {
      main: [[{ node: 'Claude: Write Script', type: 'main', index: 0 }]],
    };
  }

  const claude = nodes.find((n) => n.name === 'Claude: Write Script');
  claude.parameters.jsonBody = '={{ JSON.stringify($json) }}';

  return { changed: true };
}

(async () => {
  if (!API_KEY) {
    console.error('Set N8N_API_KEY');
    process.exit(1);
  }

  for (const id of WORKFLOW_IDS) {
    const res = await fetch(`${BASE}/workflows/${id}`, {
      headers: { 'X-N8N-API-KEY': API_KEY },
    });
    const json = await res.json();
    const wf = json.data ?? json;
    const result = patchWorkflow(wf);

    if (!result.changed) {
      console.log(id, result.reason);
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
    const body = await upd.json();
    console.log(id, upd.status, body.message || 'ok');
  }
})();
