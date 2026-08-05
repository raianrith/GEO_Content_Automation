-- Reel Pipeline Schema
-- Run this in the Supabase SQL Editor of whichever project you choose.
-- Also create a PUBLIC storage bucket named: reels-assets

-- ============================================================
-- 1. Topic queue
-- ============================================================
create table if not exists reel_topics (
  id bigint generated always as identity primary key,
  topic text not null,                          -- e.g. "Why Bolivia has a navy but no coastline"
  series text,                                  -- e.g. "Borders that make no sense"
  priority int default 100,                     -- lower = sooner
  status text default 'queued',                 -- queued | generating | generated | exhausted
  notes text,                                   -- optional angle/source hints for the script writer
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_reel_topics_queue
  on reel_topics (status, priority, created_at);

-- ============================================================
-- 2. Generated reels
-- ============================================================
create table if not exists reels (
  id bigint generated always as identity primary key,
  topic_id bigint references reel_topics(id),
  hook text,
  script text,                                  -- full voiceover text
  caption text,                                 -- IG caption incl. hashtags
  scenes jsonb,                                 -- scene breakdown from Claude
  audio_url text,                               -- voiceover mp3 in storage
  video_url text,                               -- rendered mp4 from Creatomate
  status text default 'rendering',              -- rendering | pending_approval | approved | rejected | published | failed
  ig_media_id text,                             -- set after publish
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_reels_status on reels (status, created_at);

-- ============================================================
-- 3. Performance (feedback loop) — one row per reel per day
-- ============================================================
create table if not exists reel_performance (
  id bigint generated always as identity primary key,
  reel_id bigint references reels(id),
  ig_media_id text not null,
  snapshot_date date not null default current_date,
  views bigint,
  reach bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  avg_watch_time_ms bigint,
  total_interactions bigint,
  raw jsonb,                                    -- full insights payload
  created_at timestamptz default now(),
  unique (ig_media_id, snapshot_date)
);

-- ============================================================
-- 4. Weekly analysis view for the feedback loop
-- ============================================================
create or replace view reel_leaderboard as
select
  r.id,
  r.hook,
  t.series,
  r.published_at,
  p.views,
  p.reach,
  p.shares,
  p.saves,
  p.avg_watch_time_ms,
  round((p.shares + p.saves)::numeric / nullif(p.reach, 0) * 100, 2) as send_rate_pct
from reels r
join reel_topics t on t.id = r.topic_id
join lateral (
  select * from reel_performance p
  where p.reel_id = r.id
  order by p.snapshot_date desc
  limit 1
) p on true
where r.status = 'published'
order by send_rate_pct desc nulls last;

-- ============================================================
-- 5. Seed the queue with the first 10 topics
-- ============================================================
insert into reel_topics (topic, series, priority) values
('Why there''s a piece of Belgium inside a Dutch town inside Belgium', 'Borders that make no sense', 1),
('The US-Canada border runs through the middle of this library', 'Borders that make no sense', 2),
('Point Roberts: the US town you can only reach through Canada', 'Borders that make no sense', 3),
('Half of Earth''s population lives inside this circle', 'Statistical geography', 4),
('The shortest war in history lasted 38 minutes', 'History''s weirdest chapters', 5),
('Why Bolivia has a navy but no coastline', 'Maps that explain the news', 6),
('The Diomede Islands: 2.4 miles and 21 hours apart', 'Borders that make no sense', 7),
('The Door to Hell: a crater that''s been burning since 1971', 'Geographic freaks of nature', 8),
('Why 90% of Canadians live within 100 miles of the US border', 'Statistical geography', 9),
('Sealand: the WWII platform that declared itself a country', 'Countries that shouldn''t exist', 10);
