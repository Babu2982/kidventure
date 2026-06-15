-- =============================================================================
-- KidVenture — Master Minds flashcards table  (migration 0002)
-- Depends on 0001 (learning_mode / content_source enums + set_updated_at()).
-- =============================================================================
create table if not exists flashcards (
  id          uuid primary key default gen_random_uuid(),
  deck        text not null,                          -- 'multiplication' | 'geography' | 'science'
  mode        learning_mode not null default 'advanced',
  skill_level int  not null default 1 check (skill_level between 1 and 20),
  concept     text not null,                          -- front prompt + default spoken text
  detail      text,                                   -- back / answer
  emoji       text,                                   -- offline visual fallback
  image_url   text,                                   -- optional remote image
  theme_tags  text[] not null default '{}',
  source      content_source not null default 'authored',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_flashcards_mode_skill on flashcards (mode, skill_level);
create index if not exists idx_flashcards_deck       on flashcards (deck);
create index if not exists idx_flashcards_tags       on flashcards using gin (theme_tags);

create trigger trg_flashcards_updated before update on flashcards
  for each row execute function set_updated_at();

alter table flashcards enable row level security;
create policy "public read flashcards" on flashcards
  for select to anon, authenticated using (true);
