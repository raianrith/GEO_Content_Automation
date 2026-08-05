# GEO Content Automation

Automate content creation and optimization for **Generative Engine Optimization (GEO)** — so your brand shows up in AI answers from ChatGPT, Perplexity, Gemini, and similar generative search engines.

## What is GEO?

Traditional SEO optimizes pages for ranked search results. GEO optimizes content so AI systems cite, summarize, and recommend your brand when people ask questions.

## Status

Early setup. Supabase is wired as the backend for data and auth.

## Project structure

```text
GEO_Content_Automation/
├── README.md
├── requirements.txt
├── .env.example
├── src/
│   └── supabase_client.py   # Supabase client helpers
├── scripts/
│   └── test_supabase_connection.py
├── prompts/                 # GEO writing and rewrite prompts (planned)
├── data/                    # Sample inputs and fixtures (planned)
└── outputs/                 # Generated drafts (local / gitignored)
```

## Setup

### 1. Install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Connect Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select (or create) a project.
2. Go to **Project Settings → API**.
3. Copy values into a local `.env` file:

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
# Optional, server-side only:
SUPABASE_SERVICE_ROLE_KEY=
```

### 3. Test the connection

```bash
python scripts/test_supabase_connection.py
```

A successful run prints JSON with `"ok": true` and `Supabase connection OK`.

## Using the client in code

```python
from src.supabase_client import get_supabase_client

supabase = get_supabase_client()
# Example once tables exist:
# rows = supabase.table("contents").select("*").limit(10).execute()
```

For trusted server jobs that need elevated access:

```python
supabase = get_supabase_client(use_service_role=True)
```

Never commit `.env` or expose the service role key in client-side code.

## Contributing

1. Create a feature branch from `main`
2. Make focused changes
3. Open a pull request with a short description of what changed and why

## License

License TBD.
