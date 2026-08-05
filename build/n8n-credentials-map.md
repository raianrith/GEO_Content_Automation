# n8n Credential Mapping (Phase 3)

Your n8n Cloud instance does **not** have the Variables feature on the current
plan, so all secrets go into **n8n Credentials** — never pasted into workflow
node parameters or committed to this repo.

Create these credentials in n8n **Settings → Credentials** after filling in
`.env` locally. Names below are suggestions; keep them consistent across workflows.

## Credential inventory

| Credential name | n8n type | Fields | Used by |
|-----------------|----------|--------|---------|
| `Supabase Service Role` | Header Auth | Name: `apikey`, Value: `{SUPABASE_SERVICE_ROLE_KEY}` | All Supabase REST + Storage nodes (also add `Authorization: Bearer …` header via second Header Auth or inline expression referencing same key — see note) |
| `Anthropic API` | Header Auth | Name: `x-api-key`, Value: `{ANTHROPIC_API_KEY}` | Workflow 1 — Claude script node |
| `ElevenLabs API` | Header Auth | Name: `xi-api-key`, Value: `{ELEVENLABS_API_KEY}` | Workflow 1 — TTS node |
| `Creatomate API` | Header Auth | Name: `Authorization`, Value: `Bearer {CREATOMATE_API_KEY}` | Workflow 1 — render + poll nodes |
| `Meta Graph API` | Header Auth | Name: `access_token` as query param* | Workflows 2 & 3 — IG publish + insights |

\* Meta nodes use `access_token` as a **query parameter**, not a header. Wire via
expressions: `={{ $credentials.metaGraphApi.accessToken }}` if using a custom
credential, or a dedicated Header Auth stored for reference and copied into
expressions at import time. Phase 3 will use expression-based wiring, not literals.

| `Reel Bot` | Telegram API | Access Token: `{TELEGRAM_BOT_TOKEN}` | Workflow 2 trigger (webhook for Approve/Reject buttons) |

## Non-secret config (expressions, not credentials)

These are in `.env.example` for your reference. Phase 3 will embed them as n8n
expressions built from credential-adjacent config — they are not API secrets but
should still not be committed in workflow JSON with real values:

| Env var | Where used |
|---------|------------|
| `SUPABASE_PROJECT_REF` | Supabase URLs: `https://{{ref}}.supabase.co/rest/v1/...` |
| `ELEVENLABS_VOICE_ID` | TTS URL path: `/v1/text-to-speech/{voice_id}` |
| `MAPBOX_PUBLIC_TOKEN` | Code node — Mapbox Static Images URLs |
| `CREATOMATE_TEMPLATE_ID` | Creatomate render body `template_id` |
| `TELEGRAM_CHAT_ID` | Workflow 1 sendVideo `chat_id` |
| `IG_USER_ID` | IG Graph API URL paths |

## Supabase dual-header note

Supabase REST requires **both** headers on every request:

```
apikey: {service_role_key}
Authorization: Bearer {service_role_key}
```

n8n Header Auth credential supports one header pair. Options for Phase 3:

1. **Preferred:** Use the credential for `apikey`, add `Authorization` as a
   second manual header on each HTTP Request node with expression
   `=Bearer {{ $credentials.supabaseServiceRole.value }}` (exact expression
   depends on n8n credential reference syntax).
2. **Fallback:** Pre-process in a Set node if expression syntax is awkward on
   your n8n version.

## Telegram: credential vs raw HTTP

| Node | Approach |
|------|----------|
| Workflow 2 **Telegram Trigger** | Native `telegramApi` credential (`Reel Bot`) — required for webhook registration |
| Workflow 1 & 2 **sendVideo / answerCallbackQuery** | HTTP Request nodes — use credential token via expression, **not** `botYOUR_TELEGRAM_BOT_TOKEN` in URL |

## Security checklist

- [ ] `.env` created locally, never committed (`.gitignore` covers it)
- [ ] No `YOUR_*` placeholders left in live n8n workflows after Phase 3
- [ ] Supabase service_role key only in n8n Credentials, not in repo
- [ ] Meta token calendar reminder set (~60 day expiry)
