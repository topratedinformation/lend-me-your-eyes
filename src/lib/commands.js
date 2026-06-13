// Maps a spoken phrase to an assistant intent. Forgiving keyword matching so
// natural speech works ("can you read it all" -> read; "what's this" -> glance).
// Returns { intent, question? }.

const RULES = [
  { intent: 'read',     re: /\b(read (it|this|the page|everything|all)|read aloud|full read|read it all)\b/ },
  { intent: 'summary',  re: /\b(summar|gist|short version|brief|tl;?dr|key points)\b/ },
  { intent: 'menu',     re: /\b(menu|what(?:'s| is) on the menu|food options|dishes)\b/ },
  { intent: 'describe', re: /\b(describe|what(?:'s| is) (around|in front of|near) me|surroundings|the scene|where am i|look around)\b/ },
  { intent: 'identify', re: /\b(what is this|what(?:'s| is) this|identify|what am i holding|what(?:'s| is) in my hand|this product|this label)\b/ },
  { intent: 'glance',   re: /\b(look|what(?:'s| is) (this|that|here)|what am i looking at|take a look|scan)\b/ },
  { intent: 'next',     re: /\b(next|continue|keep (going|reading)|go on)\b/ },
  { intent: 'back',     re: /\b(back|previous|repeat|again|go back)\b/ },
  { intent: 'pause',    re: /\b(pause|stop|wait|quiet|shush|be quiet)\b/ },
  { intent: 'play',     re: /\b(play|resume|start reading|go)\b/ },
  { intent: 'library',  re: /\b(library|my books|shelf|bookshelf|reading list)\b/ },
  { intent: 'resume',   re: /\b(where did i (leave off|stop)|continue my book|last book|resume my book)\b/ },
  { intent: 'help',     re: /\b(help|what can (you|i) (do|say)|options|commands)\b/ }
]

// Phrases that look like a free-form question about the image.
const QUESTION_RE = /\b(what|where|who|how (much|many)|is there|are there|does it|what(?:'s| is) the|price|cost|expiry|date|colour|color)\b/

export function parseCommand(transcript) {
  const t = (transcript || '').toLowerCase().trim()
  if (!t) return { intent: 'none' }
  for (const r of RULES) if (r.re.test(t)) return { intent: r.intent }
  // Anything else that reads like a question -> ask the vision model directly.
  if (QUESTION_RE.test(t)) return { intent: 'question', question: t }
  return { intent: 'unknown', question: t }
}

// Spoken menu of what the user can say, kept short for listening by ear.
export const HELP_TEXT =
  "You can say: look, to see what's in front of you. Read it, for the full text. " +
  "Summarise, for a short version. Describe, for what's around you. Read the menu. " +
  "Or ask a question like, what's the price. You can also say next, back, pause, " +
  "library, or continue my book."
