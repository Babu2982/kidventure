"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore, type Sticker } from "@/store/useGameStore";
import { speak, stopSpeaking, warmVoices, ttsSupported } from "@/lib/tts";
import { playTap } from "@/lib/sounds";
import { BigButton } from "@/components/ui";
import { RewardOverlay } from "@/components/RewardOverlay";
import { useRouter } from "next/navigation";

/* ====================================================================
   English (1st Language): StoryReader — TTS with live word highlighting
   ==================================================================== */

const STORIES = [
  {
    title: "The Swimming Star",
    emoji: "🏊",
    text: "Meera loves to swim every morning. She jumps into the cool blue pool and counts her laps. One lap, two laps, three laps! Her coach claps and says, well done, little fish. Meera smiles and dreams of winning a shiny gold medal one day.",
  },
  {
    title: "The Brave Shuttle",
    emoji: "🏸",
    text: "A small white shuttle flew high over the net. Arjun ran fast and swung his racket with all his might. Smash! The shuttle zoomed across the court like a rocket. Everyone cheered for the brave little shuttle and the happy boy who hit it.",
  },
  {
    title: "Roller Skate Race",
    emoji: "🛼",
    text: "Diya put on her red roller skates and her shiny helmet. The park path was long and bumpy, but she did not give up. Round and round she rolled, faster and faster. At the finish line, her friends shouted hip hip hooray!",
  },
];

export function StoryReader() {
  const router = useRouter();
  const { soundOn, awardStarAndSticker } = useGameStore();
  const [storyIdx, setStoryIdx] = useState(0);
  const [activeChar, setActiveChar] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [reward, setReward] = useState<Sticker | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  const story = STORIES[storyIdx];

  /** Pre-compute each word's [start, end) char range for highlighting. */
  const words = useMemo(() => {
    const out: Array<{ word: string; start: number; end: number }> = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(story.text))) {
      out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
    }
    return out;
  }, [story.text]);

  useEffect(() => {
    warmVoices();
    return () => stopSpeaking();
  }, []);

  const play = () => {
    playTap(soundOn);
    setPlaying(true);
    setFinished(false);
    setActiveChar(0);
    cancelRef.current = speak(story.text, {
      lang: "en-US",
      rate: 0.8,
      onWord: (i) => setActiveChar(i),
      onEnd: () => {
        setPlaying(false);
        setActiveChar(-1);
        setFinished(true);
      },
    });
  };

  const stop = () => {
    cancelRef.current();
    stopSpeaking();
    setPlaying(false);
    setActiveChar(-1);
  };

  const collect = () => setReward(awardStarAndSticker("reading"));

  return (
    <section className="flex flex-col items-center gap-4 w-full max-w-xl">
      {/* story picker */}
      <div className="flex gap-2 flex-wrap justify-center">
        {STORIES.map((s, i) => (
          <button
            key={s.title}
            onClick={() => { stop(); setStoryIdx(i); setFinished(false); playTap(soundOn); }}
            aria-pressed={i === storyIdx}
            className={`font-display rounded-2xl px-4 py-2 shadow-chunkySm transition
              ${i === storyIdx ? "bg-berry text-white scale-105" : "bg-white text-slate-600"}`}
          >
            {s.emoji} {s.title}
          </button>
        ))}
      </div>

      <motion.div
        key={story.title}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-chunky p-6 w-full"
      >
        <p className="font-body text-2xl leading-relaxed text-slate-700">
          {words.map((w, i) => {
            const active =
              activeChar >= 0 && activeChar >= w.start && activeChar < w.end;
            return (
              <span key={i}>
                <span
                  className={`rounded-lg px-0.5 transition-colors duration-150 ${
                    active ? "bg-sun text-slate-900 font-semibold" : ""
                  }`}
                >
                  {w.word}
                </span>{" "}
              </span>
            );
          })}
        </p>
      </motion.div>

      {!ttsSupported() && (
        <p className="font-body text-sm text-slate-400">
          🔇 Read-aloud isn&apos;t available on this device — read together instead!
        </p>
      )}

      <div className="flex gap-3">
        {!playing ? (
          <BigButton color="bg-grass text-white" onClick={play}>
            ▶️ Read to me
          </BigButton>
        ) : (
          <BigButton color="bg-berry text-white" onClick={stop}>
            ⏹️ Stop
          </BigButton>
        )}
        {finished && (
          <BigButton color="bg-sun" onClick={collect}>
            🎁 Collect sticker
          </BigButton>
        )}
      </div>

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={() => { setReward(null); setFinished(false); }}
      />
    </section>
  );
}

/* ====================================================================
   Tamil: vocabulary + folklore lines read aloud on tap
   ==================================================================== */

const TAMIL_ITEMS = [
  { ta: "அம்மா", en: "Mother", emoji: "👩" },
  { ta: "அப்பா", en: "Father", emoji: "👨" },
  { ta: "பூனை", en: "Cat", emoji: "🐱" },
  { ta: "நாய்", en: "Dog", emoji: "🐶" },
  { ta: "பழம்", en: "Fruit", emoji: "🍎" },
  { ta: "தண்ணீர்", en: "Water", emoji: "💧" },
  { ta: "சூரியன்", en: "Sun", emoji: "☀️" },
  { ta: "நிலா", en: "Moon", emoji: "🌙" },
  { ta: "புத்தகம்", en: "Book", emoji: "📖" },
  { ta: "வீடு", en: "House", emoji: "🏠" },
];

const TAMIL_LINES = [
  {
    ta: "காக்கை ஒரு வடை எடுத்தது.",
    en: "The crow took a vada. (from the crow and fox tale)",
    emoji: "🐦",
  },
  {
    ta: "நரி பாட்டு கேட்க ஆசைப்பட்டது.",
    en: "The fox wished to hear a song.",
    emoji: "🦊",
  },
  {
    ta: "முயலும் ஆமையும் ஓட்டப் பந்தயம் வைத்தன.",
    en: "The rabbit and tortoise held a race.",
    emoji: "🐢",
  },
];

export function TamilSpeaker() {
  const soundOn = useGameStore((s) => s.soundOn);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { awardStarAndSticker } = useGameStore();
  const [tapped, setTapped] = useState<Set<string>>(new Set());
  const [reward, setReward] = useState<Sticker | null>(null);
  const router = useRouter();

  useEffect(() => {
    warmVoices();
    return () => stopSpeaking();
  }, []);

  const say = (id: string, text: string) => {
    playTap(soundOn);
    setActiveId(id);
    const next = new Set(tapped).add(id);
    setTapped(next);
    speak(text, { lang: "ta-IN", rate: 0.8, onEnd: () => setActiveId(null) });
    // Explore 6 different items → sticker
    if (next.size === 6 && !reward) {
      setTimeout(() => setReward(awardStarAndSticker("reading")), 800);
    }
  };

  return (
    <section className="flex flex-col items-center gap-5 w-full max-w-xl">
      <p className="font-body text-slate-500 text-center">
        Tap a card to hear it in Tamil! 🔊 ({tapped.size}/6 to earn a sticker)
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
        {TAMIL_ITEMS.map((item) => (
          <motion.button
            key={item.ta}
            whileTap={{ scale: 0.92 }}
            onClick={() => say(item.ta, item.ta)}
            className={`bg-white rounded-[1.5rem] shadow-chunky p-4 flex flex-col items-center gap-1 transition
              ${activeId === item.ta ? "ring-8 ring-sun" : ""}`}
            aria-label={`${item.en} in Tamil`}
          >
            <span className="text-4xl" aria-hidden>{item.emoji}</span>
            <span className="font-display text-2xl text-slate-700">{item.ta}</span>
            <span className="font-body text-sm text-slate-400">{item.en}</span>
          </motion.button>
        ))}
      </div>

      <h3 className="font-display text-xl text-slate-600 mt-2">📜 Story lines</h3>
      <div className="flex flex-col gap-3 w-full">
        {TAMIL_LINES.map((line) => (
          <motion.button
            key={line.ta}
            whileTap={{ scale: 0.97 }}
            onClick={() => say(line.ta, line.ta)}
            className={`bg-white rounded-[1.5rem] shadow-chunkySm p-4 text-left flex items-center gap-3
              ${activeId === line.ta ? "ring-8 ring-sun" : ""}`}
          >
            <span className="text-3xl" aria-hidden>{line.emoji}</span>
            <span>
              <span className="font-display text-lg text-slate-700 block">{line.ta}</span>
              <span className="font-body text-sm text-slate-400">{line.en}</span>
            </span>
          </motion.button>
        ))}
      </div>

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={() => { setReward(null); setTapped(new Set()); }}
      />
    </section>
  );
}
