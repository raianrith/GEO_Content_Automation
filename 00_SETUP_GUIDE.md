# Instagram Reel Pipeline — Setup Guide

Faceless geography reels: Supabase topic queue → Claude script → ElevenLabs
voiceover → Mapbox map frames → Creatomate render → Telegram approval →
Instagram publish → nightly performance pull.

Estimated setup time: 3–5 hours, most of it Meta's app setup.
Running cost: ~$40–65/month (Creatomate $41 Growth or $17 Starter,
ElevenLabs $5, Mapbox free tier, Claude API pennies per script).

---

## 1. Accounts you need

| Service | What for | Plan |
|---|---|---|
| n8n | Orchestrator | Self-host (free) or Cloud from ~$24/mo |
| Supabase | Topic queue, reel log, performance data | Free tier is plenty |
| Anthropic API | Script writing | Pay-as-you-go |
| ElevenLabs | Voiceover | Starter $5/mo |
| Mapbox | Satellite map frames | Free tier (50k static requests/mo) |
| Creatomate | Video rendering | Starter $17/mo (~30 reels) or Growth $41 |
| Telegram | Approval gate | Free — create a bot via @BotFather |
| Meta / Instagram | Publishing | Free — requires Business/Creator account |

## 2. Supabase (10 min)

1. Pick or create a project. **Recommendation: create a fresh free project** —
   keep this personal project out of work infrastructure.
2. SQL Editor → run `01_supabase_schema.sql`. This creates `reel_topics`,
   `reels`, `reel_performance`, the `reel_leaderboard` view, and seeds 10 topics.
3. Storage → New bucket → name it `reels-assets` → **make it Public**
   (Creatomate and Instagram must fetch your files by URL).
4. Settings → API → copy the **service_role** key and your **project ref**
   (the subdomain in your project URL).

## 3. Telegram bot (5 min)

1. Message @BotFather → `/newbot` → copy the **bot token**.
2. Message your new bot once (any text), then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and copy your
   **chat id** from the response.

## 4. Meta / Instagram (the long one, 1–2 hours)

1. Convert your Instagram account to **Business** (or Creator) in the IG app.
2. Create a Facebook Page and link the IG account to it
   (IG app → Settings → Business tools → Connect a Page).
3. Go to developers.facebook.com → Create App → type **Business**.
4. Add the **Instagram Graph API** product.
5. Graph API Explorer → generate a User Access Token with scopes:
   `instagram_basic, instagram_content_publish, instagram_manage_insights,
   pages_show_list, pages_read_engagement`.
6. Exchange it for a **long-lived token** (60 days):
   `GET https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN`
7. Get your **IG User ID**:
   `GET /me/accounts` → take the Page id → `GET /{page-id}?fields=instagram_business_account`
8. While the app is in **Development mode** it can only publish to accounts
   with a role on the app — that's you, and that's fine. You do NOT need App
   Review for a personal account you own.

⚠️ The long-lived token expires every 60 days. Set a calendar reminder, or
later we can add a tiny n8n workflow that auto-refreshes it.

## 5. Creatomate (15 min)

1. Templates → New → Blank, 1080×1920.
2. Open the JSON source editor → paste the contents of
   `06_creatomate_template.json` (remove the `_readme` key) → Save.
3. Copy the **template ID** and your **API key** (Project Settings).
4. Render one test from their UI to sanity-check fonts and caption styling.

## 6. ElevenLabs (5 min)

1. Pick ONE voice in the Voice Library — a clear, mid-paced narrator.
   Never change it; voice consistency is part of the account's identity.
2. Copy the **voice ID** and your **API key**.

## 7. Import the workflows (20 min)

For each of the three JSON files: n8n → Workflows → Import from File.

Then find-and-replace these placeholders across all three (a text editor
before import is fastest):

| Placeholder | Where to get it |
|---|---|
| `YOUR_PROJECT_REF` | Supabase project URL subdomain |
| `YOUR_SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `YOUR_ANTHROPIC_API_KEY` | console.anthropic.com |
| `YOUR_ELEVENLABS_API_KEY` / `YOUR_VOICE_ID` | ElevenLabs |
| `YOUR_MAPBOX_PUBLIC_TOKEN` | Mapbox account → Tokens (in the Code node) |
| `YOUR_CREATOMATE_API_KEY` / `YOUR_CREATOMATE_TEMPLATE_ID` | Creatomate |
| `YOUR_TELEGRAM_BOT_TOKEN` / `YOUR_TELEGRAM_CHAT_ID` | Step 3 |
| `YOUR_IG_USER_ID` / `YOUR_META_LONG_LIVED_ACCESS_TOKEN` | Step 4 |

Workflow 2 also needs a native **Telegram credential** on its trigger node
(paste the bot token there) so n8n registers the webhook for button presses.

Security note: pasting keys inline works, but n8n stores them in plain sight.
Once it runs, migrate them to n8n Credentials (Header Auth) or environment
variables — especially the Supabase service_role key, which bypasses RLS.

## 8. First run

1. Activate Workflow 2 (the approval listener) FIRST.
2. Open Workflow 1 → "Execute Workflow" manually. Watch it walk the nodes.
3. Expect ~3–5 minutes end to end (render is the slow part).
4. Video arrives in Telegram → hit Approve → check your IG profile.

Known first-run snags, in order of likelihood:
- **Creatomate render fails on fonts** → the template uses Archivo Black and
  Montserrat; if unavailable, pick replacements in their editor.
- **IG container stuck IN_PROGRESS** → usually a video spec issue; Creatomate's
  default MP4 (H.264/AAC) is compliant, but if it loops >5 times, pull the
  container's `status` field with `fields=status_code,status` for the error.
- **ElevenLabs audio longer than 32s** → tighten the word budget in the
  script prompt, or stretch scene durations in the template.
- **Expression errors after import** → n8n version differences occasionally
  rename IF-node fields; open the node, re-select the condition, save.

Paste any node error back into Claude and iterate.

## 9. Operating rhythm

- Keep 15–30 topics queued (batch-generate with Claude weekly).
- Post daily. Judge nothing before 60 days / 60 posts.
- Weekly: pull `select * from reel_leaderboard;` and ask Claude to compare
  hooks of the top vs. bottom 5 by send_rate_pct (shares+saves / reach),
  then fold the lessons back into the script prompt's hook formulas.
- Trending audio caveat: API-published reels use your own audio only. If a
  reel concept would benefit from trending audio, download the MP4 from the
  Telegram message and post manually through the app instead of approving.

## 10. Deliberately deferred (add later)

- Auto-sync scene durations to actual voiceover length (probe the MP3 length,
  pass per-scene durations to Creatomate as modifications).
- Meta token auto-refresh workflow.
- A weekly "analyst" workflow that has Claude read reel_leaderboard and
  propose prompt edits automatically.
- Cross-posting the same MP4 to TikTok and YouTube Shorts (Upload-Post or
  Blotato make this a two-node addition).
