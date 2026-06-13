# 🎒 KidVenture — Learn & Play

A Khan Academy Kids–inspired learning app for ages 6–10. Reading, Math, Logic and Art modules with a star/sticker reward system, multiple child profiles, a math-puzzle Parent Gate, and a parent progress dashboard.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion · Zustand · Supabase (optional)**.

Works **offline-first**: all data persists in localStorage; Supabase sync is an optional add-on. Sound effects are synthesized in code with the Web Audio API — no audio assets required.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

That's it. No environment variables are required to run the full app.

## Project structure

```
app/
  page.tsx          # Profile selection + creation (launch screen)
  parent/page.tsx   # Parent Gate (math puzzle) + progress dashboard
  dashboard/        # Kids' hub — animated island map
  math/             # Count the Objects game (5 rounds → sticker)
  reading/          # Letter Match drag-and-drop (4 pairs → sticker)
  logic/            # Size Sort smallest→largest (3 puzzles → sticker)
  art/              # Free-draw canvas (finish a drawing → sticker)
  stickers/         # The Suitcase — sticker collection
components/
  ui.tsx            # BigButton, TopBar, ErrorBoundary, ClientGate (loading/redirect)
  RewardOverlay.tsx # Confetti + sticker reveal modal
store/
  useAppStore.ts    # Zustand store: profiles, stars, stickers, settings (persisted)
lib/
  sounds.ts         # Web Audio synth engine (success / retry / tap / fanfare / music)
  supabase.ts       # Optional cloud sync (no-op when env vars absent)
```

## Optional: Supabase cloud sync

1. Create a project at supabase.com → Settings → API → copy URL and anon key.
2. Run this in the SQL editor:

```sql
create table profiles_kids (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table profiles_kids enable row level security;
create policy "anon upsert" on profiles_kids
  for all using (true) with check (true);
```

> ⚠️ The policy above is for PROTOTYPING ONLY — it lets any anon key holder read/write all rows.
> For production, use Supabase Auth and per-user row-level security instead:
>
> ```sql
> -- production schema: rows owned by an authenticated user
> alter table profiles_kids add column owner uuid references auth.users(id) default auth.uid();
> drop policy "anon upsert" on profiles_kids;
> create policy "own rows" on profiles_kids
>   for all using (auth.uid() = owner) with check (auth.uid() = owner);
> ```
> …and sign users in (e.g. supabase.auth.signInAnonymously() per device, or magic-link email
> for cross-device sync) before calling syncProfileToCloud.

3. Copy `.env.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Profiles now upsert to the cloud on every change; localStorage remains the source of truth, so the app still works offline.

## Deploy to Vercel (CI/CD)

```bash
git init && git add -A && git commit -m "KidVenture v1"
# push to GitHub, then:
```
1. vercel.com → New Project → import the repo. `vercel.json` is preconfigured; the Next.js framework is auto-detected.
2. Add the two `NEXT_PUBLIC_SUPABASE_*` env vars in Project → Settings → Environment Variables (skip if not using Supabase).
3. Deploy. Every push to `main` redeploys automatically.

**Netlify alternative:** New site from Git → build command `next build`, publish via the Next.js Runtime plugin (auto-installed). Same env vars.

## Android — Native app via Capacitor (recommended)

The repo now includes a full Capacitor setup (`capacitor.config.ts` + `android/` project).

```bash
# 1. One-time machine setup: install Android Studio (bundles SDK + emulator)
# 2. Build web assets and sync them into the native shell:
npm run build:android        # = BUILD_TARGET=capacitor next build && cap sync android
# 3. Open in Android Studio to run on emulator/device, or:
npm run android:run          # build + launch on a connected device
# 4. Release: Android Studio → Build → Generate Signed Bundle (.aab) → Play Console
```

Notes:
- `BUILD_TARGET=capacitor` switches Next.js to `output: 'export'` (static `out/` dir, which Capacitor bundles into the APK). Plain `npm run build` stays untouched for Vercel.
- `androidScheme: "https"` in `capacitor.config.ts` gives the WebView a secure origin, so localStorage (Zustand persist), the Web Audio API, and the Web Speech API all behave as on the web.
- `lib/sounds.ts` unlocks the AudioContext on the first touch — required by Android WebView autoplay policy.

## Android — PWA alternatives

The app also ships a PWA manifest (`public/manifest.json`). Two lighter paths:

1. **Installable PWA (zero extra work):** open the deployed URL in Chrome on Android → "Add to Home screen". Launcher icons are included (`/public/icon-*.png` and all Android `mipmap-*` densities + adaptive icon).
2. **Play Store (TWA):** wrap the deployed URL with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap):
   ```bash
   npm i -g @bubblewrap/cli
   bubblewrap init --manifest https://YOUR-URL/manifest.json
   bubblewrap build   # produces a signed .aab for the Play Console
   ```

## Voice & narration engines (v6)

- **Narration** (`lib/narrator.ts`): auto-reads module instructions on load, every IGCSE word problem, and spoken corrective explanations on mistakes (e.g. abacus bead hints). Toggle: 🗣️ in the TopBar or Parent Dashboard. Languages: en-US / hi-IN / kn-IN / ta-IN via the device TTS engine.
- **Voice answers** (`lib/voice.ts` + `components/Voice.tsx`): a single `listenOnce()` API backed by **@capacitor-community/speech-recognition on Android** (the Web Speech Recognition API does not exist in Android WebView) and webkitSpeechRecognition on the web. Math accepts spoken numbers ("twelve", homophones like "for"→4); Reading's "Say it with me" validates pronunciation by Levenshtein similarity (threshold 0.65). Mic buttons hide automatically on unsupported platforms (e.g. Firefox).
- **Adaptive difficulty** (`recordAnswer` in the store): per-profile matrix (correctStreak, averageTimePerAnswer, currentSkillCeiling 1–3, rolling 5-answer window). 5-streak → level up + celebratory narration; accuracy <60% over 5 → gentle step down. Drives count ranges, abacus targets (+30s timer at L3), word-problem complexity, sort-set size, pattern pools, and rhythm tempo. Visible in Parent Dashboard.
- **Android permissions**: `RECORD_AUDIO` + the `RecognitionService` query are already in `AndroidManifest.xml`. Android shows the mic permission prompt on first voice use.

## Privacy

`/privacy` serves a plain-language privacy policy (accurate to the current local-only data model). For Play Store Families review, use `https://YOUR-DOMAIN/privacy` as the privacy policy URL. **Update the page before enabling Supabase sync or adding any analytics.**

## Design system

- **Colors:** sky `#4FC3F7`, sun `#FFD54F`, grass `#81C784`, berry `#F06292`, grape `#9575CD`, cream `#FFF8E7`
- **Type:** Fredoka (display) + Quicksand (body), loaded via `next/font`
- **Navigation:** emoji-first, no reading required for children; reduced-motion respected; 64px+ touch targets; visible focus rings
- **Parent Gate:** random multiplication puzzle (3–9 × 3–9), 5-minute unlock window

## Extending the engine

Each game follows the same pattern: local round state → validate → `playSuccess/playRetry` → on completion call `awardStarAndSticker(moduleId)` → `<RewardOverlay/>`. Add a new module by copying any game page and registering an island in `app/dashboard/page.tsx`.
