"use client";

/**
 * StoryAndTamil.tsx — Reading Island, Advanced mode
 *
 * 6-Phase Mavericks Learning Approach (MLA) shell for all 4 language tracks.
 *
 * Phase 1 — Listen & Watch      TTS reads the full story aloud
 * Phase 2 — Read Along          Word-by-word highlight during TTS playback
 * Phase 3 — Say It With Me      Vocab mic practice (similarity check)
 * Phase 4 — Comprehension       2 MCQ questions about the story
 * Phase 5 — Stroke Tracing      GuidedTracer for the script's letters
 *                                (Tamil: placeholder until stroke data is authored)
 * Phase 6 — Mind Map            Child voice-summarises; keyword match → sticker
 *
 * Exports
 *   StoryReader         — English tab (unchanged API)
 *   TamilSpeaker        — Tamil tab  (rebuilt as phased flow, same API)
 *   PhasedLanguageReader — Hindi + Kannada tabs (new component, replaces LetterTracer)
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import { useGameStore, type Sticker } from "@/store/useGameStore";
import { speak, stopSpeaking, warmVoices, ttsSupported } from "@/lib/tts";
import { playTap, playSuccess, playRetry } from "@/lib/sounds";
import { BigButton } from "@/components/ui";
import { MicButton } from "@/components/Voice";
import { similarity } from "@/lib/voice";
import { narrate } from "@/lib/narrator";
import { RewardOverlay } from "@/components/RewardOverlay";
import { GuidedTracer } from "@/components/GuidedTracer";
import { hasStrokeData } from "@/lib/strokes";
import { useRouter } from "next/navigation";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */

type MCQ = {
  q: string;
  options: [string, string, string];
  answer: 0 | 1 | 2;
};

type Story = {
  title: string;
  emoji: string;
  /** Full story text — TTS reads this verbatim */
  text: string;
  /** Language of the story for TTS (BCP-47) */
  lang: string;
  /** 5 vocabulary words for Phase 3 */
  practice: string[];
  /** 2 MCQ questions for Phase 4 */
  comprehension: [MCQ, MCQ];
  /**
   * 1–2 letters from STROKE_DATA to trace in Phase 5.
   * Must be Unicode script characters matching keys in lib/strokes.ts.
   * Empty array → show "Tracing coming soon" placeholder.
   */
  traceLetters: string[];
  /**
   * Keywords for Phase 6 voice summary match.
   * Child must say ≥2 of these to pass.
   */
  summaryKeywords: string[];
};

/* ─────────────────────────────────────────────────────────────
   STORY DATA
───────────────────────────────────────────────────────────── */

const ENGLISH_STORIES: Story[] = [
  {
    title: "The Swimming Star",
    emoji: "🏊",
    lang: "en-US",
    text: "Meera loves to swim every morning. She jumps into the cool blue pool and counts her laps. One lap, two laps, three laps! Her coach claps and says, well done, little fish. Meera smiles and dreams of winning a shiny gold medal one day.",
    practice: ["swim", "pool", "coach", "medal", "morning"],
    comprehension: [
      {
        q: "What does Meera count in the pool?",
        options: ["Stars", "Laps", "Fish"],
        answer: 1,
      },
      {
        q: "What does Meera dream of winning?",
        options: ["A trophy", "A gold medal", "A ribbon"],
        answer: 1,
      },
    ],
    traceLetters: ["ग", "क"],   // Hindi — both in STROKE_DATA
    summaryKeywords: ["swim", "pool", "meera", "coach", "medal", "laps"],
  },
  {
    title: "The Brave Shuttle",
    emoji: "🏸",
    lang: "en-US",
    text: "A small white shuttle flew high over the net. Arjun ran fast and swung his racket with all his might. Smash! The shuttle zoomed across the court like a rocket. Everyone cheered for the brave little shuttle and the happy boy who hit it.",
    practice: ["shuttle", "racket", "rocket", "brave", "cheered"],
    comprehension: [
      {
        q: "What did Arjun swing at the shuttle?",
        options: ["A bat", "A racket", "A stick"],
        answer: 1,
      },
      {
        q: "What did the shuttle zoom across?",
        options: ["The road", "The net", "The court"],
        answer: 2,
      },
    ],
    traceLetters: ["अ", "आ"],
    summaryKeywords: ["shuttle", "racket", "arjun", "smash", "court", "cheered"],
  },
  {
    title: "Roller Skate Race",
    emoji: "🛼",
    lang: "en-US",
    text: "Diya put on her red roller skates and her shiny helmet. The park path was long and bumpy, but she did not give up. Round and round she rolled, faster and faster. At the finish line, her friends shouted hip hip hooray!",
    practice: ["skates", "helmet", "bumpy", "faster", "hooray"],
    comprehension: [
      {
        q: "What colour were Diya's roller skates?",
        options: ["Blue", "Red", "Yellow"],
        answer: 1,
      },
      {
        q: "What did Diya's friends shout at the finish line?",
        options: ["Well done", "Hooray", "Bravo"],
        answer: 1,
      },
    ],
    traceLetters: ["इ", "ग"],
    summaryKeywords: ["diya", "skates", "helmet", "park", "faster", "hooray"],
  },
];

const HINDI_STORIES: Story[] = [
  {
    title: "सूरज और बादल",
    emoji: "☀️",
    lang: "hi-IN",
    text: "एक दिन सूरज और बादल में दोस्ती हो गई। सूरज ने कहा, मैं सबको गर्मी देता हूँ। बादल ने कहा, मैं सबको पानी देता हूँ। दोनों ने मिलकर खेतों को हरा-भरा बना दिया। किसान बहुत खुश हो गया।",
    practice: ["सूरज", "बादल", "पानी", "खेत", "किसान"],
    comprehension: [
      {
        q: "सूरज क्या देता है?",
        options: ["पानी", "गर्मी", "हवा"],
        answer: 1,
      },
      {
        q: "किसान क्यों खुश हुआ?",
        options: ["खेत हरे हो गए", "मेला आया", "स्कूल बंद हुआ"],
        answer: 0,
      },
    ],
    traceLetters: ["अ", "क"],
    summaryKeywords: ["सूरज", "बादल", "पानी", "किसान", "खेत", "गर्मी"],
  },
  {
    title: "चतुर कौआ",
    emoji: "🐦",
    lang: "hi-IN",
    text: "गर्मी के दिन थे। एक कौआ बहुत प्यासा था। उसने एक घड़े में थोड़ा पानी देखा। उसने छोटे-छोटे कंकड़ डाले। पानी ऊपर आ गया। कौए ने पानी पिया और उड़ गया।",
    practice: ["कौआ", "घड़ा", "कंकड़", "प्यासा", "पानी"],
    comprehension: [
      {
        q: "कौए ने घड़े में क्या डाला?",
        options: ["रेत", "कंकड़", "पत्थर"],
        answer: 1,
      },
      {
        q: "कंकड़ डालने से क्या हुआ?",
        options: ["घड़ा टूट गया", "पानी ऊपर आ गया", "कौआ डर गया"],
        answer: 1,
      },
    ],
    traceLetters: ["ग", "इ"],
    summaryKeywords: ["कौआ", "घड़ा", "कंकड़", "पानी", "प्यासा", "उड़"],
  },
  {
    title: "मेरी गुड़िया",
    emoji: "🪆",
    lang: "hi-IN",
    text: "रिया के पास एक सुंदर गुड़िया थी। उसके बाल लंबे और कपड़े लाल थे। रिया उसे रोज़ नहलाती और सुलाती थी। एक दिन गुड़िया खो गई। रिया रोने लगी। तभी उसकी माँ ने गुड़िया अलमारी में ढूंढ ली।",
    practice: ["गुड़िया", "लंबे", "अलमारी", "नहलाती", "माँ"],
    comprehension: [
      {
        q: "गुड़िया के कपड़े कैसे थे?",
        options: ["नीले", "लाल", "हरे"],
        answer: 1,
      },
      {
        q: "गुड़िया कहाँ मिली?",
        options: ["बगीचे में", "बिस्तर में", "अलमारी में"],
        answer: 2,
      },
    ],
    traceLetters: ["आ", "ए"],
    summaryKeywords: ["रिया", "गुड़िया", "माँ", "अलमारी", "लाल", "खो"],
  },
];

const KANNADA_STORIES: Story[] = [
  {
    title: "ಆಮೆ ಮತ್ತು ಮೊಲ",
    emoji: "🐢",
    lang: "kn-IN",
    text: "ಒಂದು ಕಾಡಿನಲ್ಲಿ ಆಮೆ ಮತ್ತು ಮೊಲ ಇದ್ದವು. ಮೊಲ ತುಂಬಾ ವೇಗವಾಗಿ ಓಡುತ್ತಿತ್ತು. ಆಮೆ ನಿಧಾನವಾಗಿ ನಡೆಯುತ್ತಿತ್ತು. ಒಂದು ದಿನ ಅವರು ಓಟದ ಸ್ಪರ್ಧೆ ಮಾಡಿದರು. ಮೊಲ ನಿದ್ದೆ ಮಾಡಿತು. ಆಮೆ ಗೆದ್ದಿತು.",
    practice: ["ಆಮೆ", "ಮೊಲ", "ವೇಗ", "ಓಟ", "ಗೆದ್ದಿತು"],
    comprehension: [
      {
        q: "ಓಟದ ಸ್ಪರ್ಧೆಯಲ್ಲಿ ಯಾರು ಗೆದ್ದರು?",
        options: ["ಮೊಲ", "ಆಮೆ", "ಹಕ್ಕಿ"],
        answer: 1,
      },
      {
        q: "ಮೊಲ ಏಕೆ ಸೋತಿತು?",
        options: ["ಅದು ಬಿದ್ದಿತು", "ಅದು ನಿದ್ದೆ ಮಾಡಿತು", "ಅದು ಓಡಿ ಹೋಯಿತು"],
        answer: 1,
      },
    ],
    traceLetters: ["ಅ", "ಕ"],
    summaryKeywords: ["ಆಮೆ", "ಮೊಲ", "ಓಟ", "ನಿದ್ದೆ", "ಗೆದ್ದಿತು", "ಕಾಡು"],
  },
  {
    title: "ಮಳೆ ಬಂತು",
    emoji: "🌧️",
    lang: "kn-IN",
    text: "ಆಕಾಶದಲ್ಲಿ ಕಪ್ಪು ಮೋಡ ಬಂತು. ಮಿಂಚು ಹೊಳೆಯಿತು. ಗುಡುಗು ಶಬ್ದ ಬಂತು. ತಕ್ಷಣ ಮಳೆ ಸುರಿಯಿತು. ಮಕ್ಕಳು ಕಿಟಕಿಯ ಬಳಿ ನಿಂತು ನೋಡಿದರು. ಮಳೆ ನಿಂತ ಮೇಲೆ ಕಾಮನಬಿಲ್ಲು ಮೂಡಿತು.",
    practice: ["ಮಳೆ", "ಮೋಡ", "ಮಿಂಚು", "ಗುಡುಗು", "ಕಾಮನಬಿಲ್ಲು"],
    comprehension: [
      {
        q: "ಮಳೆ ನಿಂತ ಮೇಲೆ ಏನು ಕಾಣಿಸಿತು?",
        options: ["ಸೂರ್ಯ", "ಕಾಮನಬಿಲ್ಲು", "ನಕ್ಷತ್ರ"],
        answer: 1,
      },
      {
        q: "ಮಕ್ಕಳು ಎಲ್ಲಿ ನಿಂತರು?",
        options: ["ಬಾಗಿಲ ಬಳಿ", "ಕಿಟಕಿ ಬಳಿ", "ಮರದ ಕೆಳಗೆ"],
        answer: 1,
      },
    ],
    traceLetters: ["ಆ", "ಗ"],
    summaryKeywords: ["ಮಳೆ", "ಮೋಡ", "ಮಿಂಚು", "ಮಕ್ಕಳು", "ಕಾಮನಬಿಲ್ಲು", "ಕಿಟಕಿ"],
  },
  {
    title: "ಅಕ್ಕಿ ಮತ್ತು ಇರುವೆ",
    emoji: "🐜",
    lang: "kn-IN",
    text: "ಒಂದು ಚಿಕ್ಕ ಇರುವೆ ಅಕ್ಕಿ ಕಾಳು ಹೊತ್ತು ನಡೆಯುತ್ತಿತ್ತು. ದಾರಿಯಲ್ಲಿ ದೊಡ್ಡ ಕಲ್ಲು ಅಡ್ಡ ಬಂತು. ಇರುವೆ ಬಿಡಲಿಲ್ಲ. ಅದು ಪ್ರಯತ್ನಿಸುತ್ತಾ ಮೇಲೇರಿತು. ಮನೆ ತಲುಪಿ ಅಕ್ಕಿ ಇಟ್ಟಿತು. ಸಣ್ಣ ಪ್ರಯತ್ನ ದೊಡ್ಡ ಫಲ ಕೊಡುತ್ತದೆ.",
    practice: ["ಇರುವೆ", "ಅಕ್ಕಿ", "ಕಲ್ಲು", "ಪ್ರಯತ್ನ", "ಮನೆ"],
    comprehension: [
      {
        q: "ಇರುವೆ ಏನು ಹೊತ್ತು ನಡೆಯುತ್ತಿತ್ತು?",
        options: ["ಸಕ್ಕರೆ", "ಅಕ್ಕಿ ಕಾಳು", "ಹಣ್ಣು"],
        answer: 1,
      },
      {
        q: "ಇರುವೆ ಕಲ್ಲು ಕಂಡು ಏನು ಮಾಡಿತು?",
        options: ["ಹಿಂದೆ ಹೋಯಿತು", "ಮೇಲೇರಿತು", "ನಿಂತಿತು"],
        answer: 1,
      },
    ],
    traceLetters: ["ಇ", "ಉ"],
    summaryKeywords: ["ಇರುವೆ", "ಅಕ್ಕಿ", "ಕಲ್ಲು", "ಪ್ರಯತ್ನ", "ಮನೆ", "ಮೇಲೇರಿತು"],
  },
];

const TAMIL_STORIES: Story[] = [
  {
    title: "காக்கை கதை",
    emoji: "🐦",
    lang: "ta-IN",
    text: "ஒரு காக்கைக்கு தாகம் எடுத்தது. அது தண்ணீர் தேடியது. ஒரு குடத்தில் கொஞ்சம் தண்ணீர் இருந்தது. காக்கை சிறிய கற்களை போட்டது. தண்ணீர் மேலே வந்தது. காக்கை தண்ணீர் குடித்தது.",
    practice: ["காக்கை", "தண்ணீர்", "குடம்", "கற்கள்", "தாகம்"],
    comprehension: [
      {
        q: "காக்கை குடத்தில் என்ன போட்டது?",
        options: ["மண்", "கற்கள்", "இலைகள்"],
        answer: 1,
      },
      {
        q: "காக்கைக்கு ஏன் தண்ணீர் வேண்டியது?",
        options: ["பசி எடுத்தது", "தாகம் எடுத்தது", "விளையாட"],
        answer: 1,
      },
    ],
    traceLetters: [],   // Tamil stroke data not yet authored → Phase 5 shows placeholder
    summaryKeywords: ["காக்கை", "தண்ணீர்", "குடம்", "கற்கள்", "தாகம்"],
  },
  {
    title: "முயல் மற்றும் ஆமை",
    emoji: "🐢",
    lang: "ta-IN",
    text: "ஒரு முயல் மற்றும் ஆமை ஓட்டப் பந்தயம் வைத்தன. முயல் வேகமாக ஓடியது. ஆமை மெதுவாக நடந்தது. முயல் தூங்கியது. ஆமை நடந்து வெற்றி பெற்றது. விடாமுயற்சியே வெற்றி.",
    practice: ["முயல்", "ஆமை", "பந்தயம்", "வெற்றி", "விடாமுயற்சி"],
    comprehension: [
      {
        q: "பந்தயத்தில் யார் வெற்றி பெற்றது?",
        options: ["முயல்", "ஆமை", "புலி"],
        answer: 1,
      },
      {
        q: "முயல் ஏன் தோற்றது?",
        options: ["காலில் வலி", "தூங்கியது", "வழி தெரியவில்லை"],
        answer: 1,
      },
    ],
    traceLetters: [],
    summaryKeywords: ["முயல்", "ஆமை", "பந்தயம்", "வெற்றி", "தூங்கியது"],
  },
  {
    title: "மழை நாள்",
    emoji: "🌧️",
    lang: "ta-IN",
    text: "வானில் கருமேகம் வந்தது. மின்னல் தெரிந்தது. இடி முழங்கியது. மழை பெய்தது. குழந்தைகள் ஜன்னல் வழியே பார்த்தனர். மழை நின்றதும் வானவில் தோன்றியது. எல்லோரும் மகிழ்ந்தனர்.",
    practice: ["மழை", "மேகம்", "மின்னல்", "வானவில்", "குழந்தைகள்"],
    comprehension: [
      {
        q: "மழைக்குப் பிறகு என்ன தோன்றியது?",
        options: ["சூரியன்", "வானவில்", "நட்சத்திரம்"],
        answer: 1,
      },
      {
        q: "குழந்தைகள் எங்கிருந்து பார்த்தனர்?",
        options: ["கூரையில்", "ஜன்னல் வழியே", "தெருவில்"],
        answer: 1,
      },
    ],
    traceLetters: [],
    summaryKeywords: ["மழை", "மேகம்", "மின்னல்", "வானவில்", "குழந்தைகள்", "மகிழ்ந்தனர்"],
  },
];

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */

const MATCH_THRESHOLD = 0.65;
const SUMMARY_KEYWORDS_NEEDED = 2;

/* ─────────────────────────────────────────────────────────────
   PHASE PROGRESS BAR
───────────────────────────────────────────────────────────── */

const PHASE_LABELS = ["Listen", "Read", "Speak", "Understand", "Trace", "Retell"];

function PhaseBar({ phase, maxReached }: { phase: number; maxReached: number }) {
  return (
    <div className="flex items-center gap-1 w-full max-w-md mx-auto px-2" role="progressbar"
      aria-valuenow={phase} aria-valuemin={1} aria-valuemax={6}
      aria-label={`Phase ${phase} of 6: ${PHASE_LABELS[phase - 1]}`}>
      {PHASE_LABELS.map((label, i) => {
        const n = i + 1;
        const done = n < phase;
        const active = n === phase;
        const locked = n > maxReached + 1;
        return (
          <div key={label} className="flex flex-col items-center flex-1 gap-0.5">
            <div className={`w-full h-2 rounded-full transition-colors duration-300
              ${done ? "bg-grass" : active ? "bg-sun" : "bg-slate-200"}`} />
            <span className={`font-body text-[10px] leading-tight text-center
              ${active ? "text-slate-700 font-semibold" : done ? "text-grass" : "text-slate-300"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PHASE 3 — SAY IT WITH ME
───────────────────────────────────────────────────────────── */

function Phase3SayItWithMe({
  words,
  lang,
  soundOn,
  onComplete,
}: {
  words: string[];
  lang: string;
  soundOn: boolean;
  onComplete: () => void;
}) {
  const [practiceIdx, setPracticeIdx] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, boolean>>({});

  const passCount = Object.values(results).filter(Boolean).length;
  const allDone = passCount >= 3; // pass 3 of 5 to advance

  const startPractice = (i: number) => {
    playTap(soundOn);
    setPracticeIdx(i);
    speak(words[i], { lang, rate: 0.7 });
  };

  const onVoice = (transcript: string) => {
    if (practiceIdx === null) return;
    const target = words[practiceIdx];
    const best = Math.max(
      ...transcript.split(" | ").map((alt) => similarity(alt, target))
    );
    const ok = best >= MATCH_THRESHOLD;
    setResults((r) => ({ ...r, [practiceIdx]: ok }));
    if (ok) narrate(`Wonderful! You said ${target} beautifully!`);
    else narrate(`Almost! Listen once more. Then try again.`);
    speak(target, { lang, rate: 0.7 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 w-full"
    >
      <p className="font-display text-xl text-slate-700 text-center">
        🎤 Say it with me!
        <span className="font-body text-sm text-slate-400 block mt-0.5">
          Say 3 words to continue ({passCount}/3 done)
        </span>
      </p>

      <div className="flex flex-wrap justify-center gap-2 w-full">
        {words.map((w, i) => (
          <button
            key={w}
            onClick={() => startPractice(i)}
            aria-pressed={practiceIdx === i}
            className={`font-display rounded-2xl px-4 py-2.5 shadow-chunkySm transition min-h-[44px]
              ${results[i] === true
                ? "bg-grass text-white"
                : results[i] === false
                ? "bg-berry/20 text-berry ring-2 ring-berry"
                : practiceIdx === i
                ? "bg-sun scale-105 text-slate-800"
                : "bg-cream text-slate-600"}`}
          >
            {results[i] === true ? "✅ " : results[i] === false ? "🔁 " : "🔊 "}
            {w}
          </button>
        ))}
      </div>

      {practiceIdx !== null && (
        <div className="flex flex-col items-center gap-2">
          <p className="font-body text-slate-500 text-sm">
            Now say: <strong className="text-slate-700">{words[practiceIdx]}</strong>
          </p>
          <MicButton
            lang={lang as any}
            onTranscript={onVoice}
            prompt={`Say: "${words[practiceIdx]}"`}
          />
        </div>
      )}

      {allDone && (
        <BigButton color="bg-grass text-white" onClick={onComplete}>
          Great job! Next → 🧠
        </BigButton>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PHASE 4 — COMPREHENSION MCQ
───────────────────────────────────────────────────────────── */

function Phase4Comprehension({
  questions,
  soundOn,
  onComplete,
}: {
  questions: [MCQ, MCQ];
  soundOn: boolean;
  onComplete: () => void;
}) {
  const [qIdx, setQIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);

  const q = questions[qIdx];

  // Narrate question when it appears
  useEffect(() => {
    narrate(q.q);
  }, [qIdx]);

  const pick = (i: number) => {
    if (chosen !== null) return;
    playTap(soundOn);
    setChosen(i);
    const ok = i === q.answer;
    setCorrect(ok);
    if (ok) {
      playSuccess(soundOn);
      narrate("That's right! Well done!");
      setScore((s) => s + 1);
    } else {
      playRetry(soundOn);
      narrate(`Not quite. The answer is ${q.options[q.answer]}. Let's keep going!`);
    }
  };

  const next = () => {
    if (qIdx + 1 >= questions.length) {
      onComplete();
    } else {
      setQIdx((i) => i + 1);
      setChosen(null);
      setCorrect(null);
    }
  };

  return (
    <motion.div
      key={qIdx}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col items-center gap-5 w-full"
    >
      <div className="bg-white rounded-[2rem] shadow-chunky p-5 w-full">
        <p className="font-display text-lg text-slate-700 text-center leading-snug">
          {q.q}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full">
        {q.options.map((opt, i) => {
          const picked = chosen === i;
          const isRight = i === q.answer;
          let cls = "bg-white text-slate-700";
          if (chosen !== null) {
            if (isRight) cls = "bg-grass text-white";
            else if (picked) cls = "bg-berry text-white";
          }
          return (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.97 }}
              onClick={() => pick(i)}
              disabled={chosen !== null}
              className={`${cls} font-display text-lg rounded-2xl px-5 py-3.5 shadow-chunkySm
                text-center transition min-h-[52px] w-full`}
            >
              {chosen !== null && isRight ? "✅ " : chosen !== null && picked ? "❌ " : ""}
              {opt}
            </motion.button>
          );
        })}
      </div>

      {chosen !== null && (
        <BigButton color="bg-sun" onClick={next}>
          {qIdx + 1 < questions.length ? "Next question →" : "Keep going! ✏️"}
        </BigButton>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PHASE 5 — STROKE TRACING
───────────────────────────────────────────────────────────── */

function Phase5Tracing({
  traceLetters,
  onComplete,
}: {
  traceLetters: string[];
  onComplete: () => void;
}) {
  // Filter to only letters that actually have stroke data
  const available = traceLetters.filter(hasStrokeData);
  const [idx, setIdx] = useState(0);

  // No stroke data available for this language yet
  if (available.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-5 w-full"
      >
        <div className="bg-white rounded-[2rem] shadow-chunky p-8 w-full flex flex-col items-center gap-3">
          <span className="text-5xl">✏️</span>
          <p className="font-display text-xl text-slate-700 text-center">
            Tamil letter tracing is coming soon!
          </p>
          <p className="font-body text-slate-400 text-center text-sm">
            We're drawing the stroke guides for Tamil letters right now.
            You'll be able to trace அ, ஆ, இ and more very soon!
          </p>
        </div>
        <BigButton color="bg-grass text-white" onClick={onComplete}>
          Continue to Mind Map 🗺️
        </BigButton>
      </motion.div>
    );
  }

  const letter = available[idx];

  const handleComplete = () => {
    if (idx + 1 < available.length) {
      setIdx((i) => i + 1);
      narrate(`Great! Now let's try the next letter.`);
    } else {
      onComplete();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 w-full"
    >
      <p className="font-display text-xl text-slate-700 text-center">
        ✏️ Trace the letter{available.length > 1 ? "s" : ""}!
        <span className="font-body text-sm text-slate-400 block mt-0.5">
          Letter {idx + 1} of {available.length}: <strong>{letter}</strong>
        </span>
      </p>
      <GuidedTracer
        key={letter}
        letter={letter}
        onComplete={handleComplete}
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PHASE 6 — MIND MAP (voice summary)
───────────────────────────────────────────────────────────── */

function Phase6MindMap({
  keywords,
  lang,
  soundOn,
  onComplete,
}: {
  keywords: string[];
  lang: string;
  soundOn: boolean;
  onComplete: () => void;
}) {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [passed, setPassed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const prompt = "Tell me what the story was about! Use your own words.";

  useEffect(() => {
    narrate(prompt);
  }, []);

  const onVoice = (text: string) => {
    setTranscript(text);
    setAttempts((a) => a + 1);
    const lower = text.toLowerCase();
    const hits = keywords.filter((kw) =>
      lower.split(/\s+/).some((word) => similarity(word, kw.toLowerCase()) >= 0.7)
    );
    setMatched(hits);
    if (hits.length >= SUMMARY_KEYWORDS_NEEDED) {
      setPassed(true);
      playSuccess(soundOn);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      narrate("Excellent! You remembered the story so well!");
    } else if (attempts < 2) {
      narrate(`Good try! Can you tell me more? What happened in the story?`);
    } else {
      // After 2 failed attempts, let them pass anyway
      setPassed(true);
      narrate("Well done for trying! Let's collect your sticker.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-5 w-full"
    >
      <div className="bg-white rounded-[2rem] shadow-chunky p-5 w-full text-center">
        <p className="font-display text-xl text-slate-700">🗺️ Retell the story!</p>
        <p className="font-body text-slate-400 text-sm mt-1">
          Tap the mic and tell me what happened in the story.
        </p>
      </div>

      {transcript && (
        <div className="bg-sky-50 rounded-2xl p-4 w-full">
          <p className="font-body text-slate-600 text-sm leading-relaxed">
            You said: <em>"{transcript}"</em>
          </p>
          {matched.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {matched.map((kw) => (
                <span key={kw}
                  className="bg-grass text-white font-display text-xs rounded-xl px-2 py-0.5">
                  ✅ {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!passed ? (
        <MicButton
          lang={lang as any}
          onTranscript={onVoice}
          prompt="Tell me the story in your own words"
        />
      ) : (
        <BigButton color="bg-berry text-white" onClick={onComplete}>
          🎁 Collect my sticker!
        </BigButton>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CORE 6-PHASE SHELL
   Used by StoryReader, PhasedLanguageReader, TamilSpeaker
───────────────────────────────────────────────────────────── */

function SixPhaseShell({
  stories,
  storyCategory,
}: {
  stories: Story[];
  storyCategory: "reading";
}) {
  const router = useRouter();
  const { soundOn, awardStarAndSticker } = useGameStore();
  const [storyIdx, setStoryIdx] = useState(0);
  const [phase, setPhase] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [maxReached, setMaxReached] = useState(1);
  const [activeChar, setActiveChar] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [reward, setReward] = useState<Sticker | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  const story = stories[storyIdx];

  /** Pre-compute word char ranges for Phase 2 highlighting */
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

  // Reset to phase 1 when story changes
  useEffect(() => {
    stopSpeaking();
    setPlaying(false);
    setActiveChar(-1);
    setPhase(1);
    setMaxReached(1);
  }, [storyIdx]);

  const goToPhase = useCallback((p: 1 | 2 | 3 | 4 | 5 | 6) => {
    stopSpeaking();
    setPlaying(false);
    setActiveChar(-1);
    setPhase(p);
    setMaxReached((m) => Math.max(m, p));
  }, []);

  /* Phase 1 & 2 — TTS playback */
  const playStory = (withHighlight: boolean) => {
    playTap(soundOn);
    setPlaying(true);
    setActiveChar(withHighlight ? 0 : -1);
    cancelRef.current = speak(story.text, {
      lang: story.lang,
      rate: 0.8,
      onWord: withHighlight ? (i) => setActiveChar(i) : undefined,
      onEnd: () => {
        setPlaying(false);
        setActiveChar(-1);
        // Auto-advance: Phase 1 → 2, Phase 2 → unlock 3 button
        if (phase === 1) goToPhase(2);
      },
    });
  };

  const stopStory = () => {
    cancelRef.current();
    stopSpeaking();
    setPlaying(false);
    setActiveChar(-1);
  };

  /* Story text with highlighting */
  const storyText = (
    <motion.div
      key={story.title + phase}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2rem] shadow-chunky p-5 w-full"
    >
      <p className="font-body text-xl leading-relaxed text-slate-700">
        {words.map((w, i) => {
          const active =
            activeChar >= 0 && activeChar >= w.start && activeChar < w.end;
          return (
            <span key={i}>
              <span className={`rounded-lg px-0.5 transition-colors duration-150
                ${active ? "bg-sun text-slate-900 font-semibold" : ""}`}>
                {w.word}
              </span>{" "}
            </span>
          );
        })}
      </p>
    </motion.div>
  );

  /* Phase 1 — Listen & Watch */
  const renderPhase1 = () => (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="font-display text-xl text-slate-700 text-center">
        👂 Listen to the story first!
      </p>
      {storyText}
      {!ttsSupported() && (
        <p className="font-body text-sm text-slate-400 text-center">
          🔇 Read-aloud isn't available on this device — read together instead!
        </p>
      )}
      <div className="flex gap-3">
        {!playing ? (
          <BigButton color="bg-grass text-white" onClick={() => playStory(false)}>
            ▶️ Read to me
          </BigButton>
        ) : (
          <BigButton color="bg-berry text-white" onClick={stopStory}>
            ⏹️ Stop
          </BigButton>
        )}
        {/* Skip button so child can advance without waiting */}
        {!playing && (
          <BigButton color="bg-slate-100 text-slate-600" onClick={() => goToPhase(2)}>
            Skip →
          </BigButton>
        )}
      </div>
    </div>
  );

  /* Phase 2 — Read Along */
  const renderPhase2 = () => (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="font-display text-xl text-slate-700 text-center">
        📖 Read along — words light up!
      </p>
      {storyText}
      <div className="flex gap-3">
        {!playing ? (
          <BigButton color="bg-grass text-white" onClick={() => playStory(true)}>
            ▶️ Read with me
          </BigButton>
        ) : (
          <BigButton color="bg-berry text-white" onClick={stopStory}>
            ⏹️ Stop
          </BigButton>
        )}
        {!playing && maxReached >= 2 && (
          <BigButton color="bg-sun" onClick={() => goToPhase(3)}>
            Next → 🎤
          </BigButton>
        )}
      </div>
    </div>
  );

  /* Collect sticker at Phase 6 completion */
  const handlePhase6Complete = () => {
    const sticker = awardStarAndSticker(storyCategory);
    setReward(sticker);
  };

  return (
    <section className="flex flex-col items-center gap-4 w-full max-w-xl">
      {/* Story picker */}
      <div className="flex gap-2 flex-wrap justify-center">
        {stories.map((s, i) => (
          <button
            key={s.title}
            onClick={() => { playTap(soundOn); setStoryIdx(i); }}
            aria-pressed={i === storyIdx}
            className={`font-display rounded-2xl px-4 py-2 shadow-chunkySm transition
              ${i === storyIdx ? "bg-berry text-white scale-105" : "bg-white text-slate-600"}`}
          >
            {s.emoji} {s.title}
          </button>
        ))}
      </div>

      {/* Phase progress bar */}
      <PhaseBar phase={phase} maxReached={maxReached} />

      {/* Phase content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          {phase === 1 && renderPhase1()}
          {phase === 2 && renderPhase2()}
          {phase === 3 && (
            <Phase3SayItWithMe
              words={story.practice}
              lang={story.lang}
              soundOn={soundOn}
              onComplete={() => goToPhase(4)}
            />
          )}
          {phase === 4 && (
            <Phase4Comprehension
              questions={story.comprehension}
              soundOn={soundOn}
              onComplete={() => goToPhase(5)}
            />
          )}
          {phase === 5 && (
            <Phase5Tracing
              traceLetters={story.traceLetters}
              onComplete={() => goToPhase(6)}
            />
          )}
          {phase === 6 && (
            <Phase6MindMap
              keywords={story.summaryKeywords}
              lang={story.lang}
              soundOn={soundOn}
              onComplete={handlePhase6Complete}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <RewardOverlay
        sticker={reward}
        onClose={() => router.push("/dashboard")}
        onPlayAgain={() => {
          setReward(null);
          setPhase(1);
          setMaxReached(1);
        }}
      />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC EXPORTS  (unchanged API surface for page.tsx)
───────────────────────────────────────────────────────────── */

/** English tab — 3 English stories, Hindi traceLetters */
export function StoryReader() {
  return <SixPhaseShell stories={ENGLISH_STORIES} storyCategory="reading" />;
}

/**
 * Hindi or Kannada tab.
 * Pass language="hindi" or language="kannada" — matches the existing
 * LetterTracer prop so page.tsx changes are minimal.
 */
export function PhasedLanguageReader({
  language,
}: {
  language: "hindi" | "kannada";
}) {
  const stories = language === "hindi" ? HINDI_STORIES : KANNADA_STORIES;
  return <SixPhaseShell stories={stories} storyCategory="reading" />;
}

/** Tamil tab — Tamil stories, Phase 5 placeholder */
export function TamilSpeaker() {
  return <SixPhaseShell stories={TAMIL_STORIES} storyCategory="reading" />;
}
