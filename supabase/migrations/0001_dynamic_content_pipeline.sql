-- =============================================================================
-- KidVenture — Dynamic Content Pipeline  (migration 0001)
-- Tables: educational_stories, math_problem_templates, logic_patterns
-- Read path used by BOTH web (Vercel API route) and APK (direct Supabase client).
-- Writes are restricted to the service_role (used by lib/generateContent.ts on the
-- server) — the kids' app only ever reads, so the anon key is read-only by RLS.
-- =============================================================================

-- Shared enums ----------------------------------------------------------------
do $$ begin
  create type learning_mode as enum ('junior', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_lang as enum ('en', 'hi', 'kn', 'ta');  -- matches the 4 reading langs
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_source as enum ('authored', 'generated');
exception when duplicate_object then null; end $$;

-- updated_at helper -----------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =============================================================================
-- 1. educational_stories  — Reading Island (6-phase loop)
-- =============================================================================
create table if not exists educational_stories (
  id                     uuid primary key default gen_random_uuid(),
  title                  text not null,
  language               content_lang not null default 'en',
  mode                   learning_mode not null default 'advanced',
  skill_level            int  not null default 1 check (skill_level between 1 and 20),
  body                   text not null,                 -- Phase 1: TTS reads this
  mind_map_prompt        text,                          -- Phase 2: GuidedTracer prompt
  comprehension_question text,                          -- Phase 3: spoken question
  answer_keywords        text[] not null default '{}',  -- loose match for voice answer
  theme_tags             text[] not null default '{}',  -- e.g. {badminton, swimming}
  source                 content_source not null default 'authored',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- =============================================================================
-- 2. math_problem_templates  — Olympiad / IGCSE word problems
--    Templates carry placeholders + variable ranges so the same row procedurally
--    expands into many concrete problems on the client (or in generateContent.ts).
-- =============================================================================
create table if not exists math_problem_templates (
  id            uuid primary key default gen_random_uuid(),
  topic         text not null,                          -- 'multiplication' | 'olympiad' | ...
  mode          learning_mode not null default 'advanced',
  skill_level   int  not null default 1 check (skill_level between 1 and 20),
  template      text not null,                          -- "If {name} hits {a} shuttles in {b} games..."
  variables     jsonb not null default '{}'::jsonb,     -- {"a":{"min":2,"max":9},"b":{"min":2,"max":5}}
  answer_formula text not null,                         -- "a*b"  (evaluated server/client side, sandboxed)
  theme_tags    text[] not null default '{}',
  source        content_source not null default 'authored',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- 3. logic_patterns  — sequences, Bharatanatyam rhythm, olympiad patterns
-- =============================================================================
create table if not exists logic_patterns (
  id            uuid primary key default gen_random_uuid(),
  pattern_type  text not null,                          -- 'sequence' | 'rhythm' | 'olympiad'
  mode          learning_mode not null default 'advanced',
  skill_level   int  not null default 1 check (skill_level between 1 and 20),
  sequence      jsonb not null,                         -- e.g. [2,4,6,8,"?"]
  answer        jsonb not null,                         -- e.g. 10
  distractors   jsonb not null default '[]'::jsonb,     -- e.g. [9,11,12]
  theme_tags    text[] not null default '{}',
  source        content_source not null default 'authored',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes — primary query path is (mode, skill_level) windowed by ceiling ------
create index if not exists idx_stories_mode_skill on educational_stories (mode, skill_level);
create index if not exists idx_stories_lang        on educational_stories (language);
create index if not exists idx_math_mode_skill     on math_problem_templates (mode, skill_level);
create index if not exists idx_logic_mode_skill    on logic_patterns (mode, skill_level);
-- GIN on tags for theme-aware fetch (badminton/swimming personalisation)
create index if not exists idx_stories_tags on educational_stories using gin (theme_tags);
create index if not exists idx_math_tags    on math_problem_templates using gin (theme_tags);
create index if not exists idx_logic_tags   on logic_patterns using gin (theme_tags);

-- updated_at triggers ---------------------------------------------------------
create trigger trg_stories_updated before update on educational_stories
  for each row execute function set_updated_at();
create trigger trg_math_updated    before update on math_problem_templates
  for each row execute function set_updated_at();
create trigger trg_logic_updated   before update on logic_patterns
  for each row execute function set_updated_at();

-- =============================================================================
-- Row Level Security:  anon = read-only, writes = service_role only
-- =============================================================================
alter table educational_stories     enable row level security;
alter table math_problem_templates  enable row level security;
alter table logic_patterns          enable row level security;

create policy "public read stories" on educational_stories
  for select to anon, authenticated using (true);
create policy "public read math" on math_problem_templates
  for select to anon, authenticated using (true);
create policy "public read logic" on logic_patterns
  for select to anon, authenticated using (true);

-- No insert/update/delete policies for anon ⇒ writes only via service_role key,
-- which bypasses RLS and is used exclusively by the server (generateContent.ts).
