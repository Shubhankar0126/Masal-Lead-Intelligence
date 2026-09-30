# Masal Lead Intelligence

**AI doesn't just tell the salesperson who matters. It tells them what to do next, why, and gives them the exact words to act.**

An AI-powered command center for real-estate salespeople drowning in inbound leads. It reads every inquiry, scores it transparently, flags the objections hiding inside it, and hands the salesperson a ready-to-send opening line, all grounded in that one lead's actual context, never a generic chatbot.

Built for the Masal AI FDE Assignment (Round 2).

---

## The problem

A real-estate sales team gets hundreds of leads a day. Most tools stop at "here's a form and a list." A salesperson still has to re-read every message, guess who's serious, and figure out what to say, one lead at a time, under time pressure. The gap isn't information, it's **judgment at scale**: which lead to call first, why, and what to say when they pick up.

---

## Key features

| Feature | What it does |
|---|---|
| **Lead intake** | Name, location, requirement, budget, timeline, free-text customer message, with a one-click demo lead loader and voice dictation |
| **AI analysis** | Summary, intent, key requirements, objections, recommended action, and a ready-to-send response. One real model call, JSON-structured |
| **Transparent scoring** | Hot / Warm / Cold from a fixed, inspectable formula, never a black-box number |
| **Lead-grounded copilot** | Follow-up chat answers *only* from that lead's profile, message, and analysis, labeled "Grounded in: profile + message + AI analysis" |
| **Voice input and playback** | Dictate a customer message by speaking instead of typing, and listen to the AI's suggested opening or response before a call |
| **Multilingual voice** | Dictation and playback both work in English, Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada, and Bengali |
| **Action Queue** | Auto-sorted "what needs my attention today" view across all saved leads |
| **Activity timeline & status management** | New to Contacted to Qualified to Follow-up to Converted / Lost, logged automatically |

## ⭐ Signature features

**Next Best Move.** Instead of "contact this lead," the AI commits to one concrete action (*Call now*, *Send WhatsApp follow-up*, *Ask one qualification question*...), states *why* in plain language, gives the *exact* next step ("Call within 15 minutes"), and drafts a suggested opening line the salesperson can copy, regenerate, or listen to out loud. This is the difference between an AI feature and an AI *workflow tool*.

**Objection Radar.** Surfaces friction the customer didn't state outright: budget sensitivity, timing uncertainty, comparison shopping, and more. Each one carries a confidence score, a short quote from the actual customer message as evidence, and a recommended response strategy, so the AI's reasoning is inspectable, not just asserted.

**Voice-enabled workflow.** A salesperson's day doesn't happen only at a keyboard. Before a call, they can hit "Listen" and hear the AI's suggested opening line read aloud to rehearse tone, in the language they'll actually speak on the call. While taking notes during or right after a conversation, they can hit "Dictate" and speak the customer's message instead of typing it. Both use the browser's native speech APIs, so there's no extra cost, no extra API key, and no separate voice backend to host.

---

## Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐        ┌────────────┐
│   app/page.tsx           │  POST  │  app/api/ai/route.ts      │  POST  │   Groq     │
│   (client component)     │ ─────► │  (server route)            │ ─────► │  API       │
│   UI + localStorage state│        │  key stays server-side     │        │            │
└─────────────────────────┘        └──────────────────────────┘        └────────────┘
```

- **Frontend**: a single client component (`app/page.tsx`) renders the lead list, intake form, analysis cards, and copilot chat, and persists lead state to `localStorage`. No database needed for a free-tier deployment. It also calls the browser's built-in `SpeechRecognition` and `speechSynthesis` APIs directly, so voice runs entirely client-side.
- **Backend**: one Next.js API route (`app/api/ai/route.ts`), deployed as a Vercel serverless function. No separate backend host required.
- **AI**: the route is the only place the API key is ever read or used. The frontend never sees it.

## Tech stack

- **Next.js 16** (App Router, TypeScript). Frontend and API route in one deployable unit
- **React 18**
- Plain CSS (no framework). Dark, high-contrast, card-based UI
- **Groq API** (`openai/gpt-oss-120b`) for AI analysis and chat
- Browser **Web Speech API** (`SpeechRecognition` and `speechSynthesis`) for dictation and playback
- `localStorage` for persistence

## AI model / API and how it's called

**Provider:** [Groq](https://console.groq.com). Free tier, OpenAI-compatible endpoint, no billing required.
**Model:** `openai/gpt-oss-120b`
**Endpoint:** `POST https://api.groq.com/openai/v1/chat/completions`, called only from `app/api/ai/route.ts`.

Two modes, both real model calls, nothing hardcoded:

- **`analyze`**: sends the lead profile and customer message with a system prompt that instructs the model to act as a real-estate sales intelligence assistant, plus a strict JSON schema (`response_format: json_object`). The model rates six dimensions (urgency, budget clarity, requirement specificity, intent strength, engagement, objection severity) from 0 to 10; everything else (summary, intent, objections, next move, suggested response) is generated as structured text. The response is parsed and defensively coerced (missing arrays default to `[]`, etc.) so a slightly malformed reply doesn't crash the UI. It surfaces a clear "Retry" error instead.
- **`chat`**: sends the same lead profile, customer message, and the *stored* analysis as system context, plus the last 8 turns of conversation. This is what keeps the copilot answering from one lead's world instead of behaving like a general chatbot.

## Prompt strategy

The system prompt does three things deliberately:
1. **Constrains to evidence**: "use ONLY facts in the lead data/message. Never invent customer facts."
2. **Separates explicit vs. inferred**: the model is told to distinguish what the customer said from what it's guessing, which is what makes Objection Radar's "evidence" field trustworthy rather than decorative.
3. **Keeps output salesperson-shaped**: concise, no chain-of-thought, structured JSON only, so the UI can render it directly without an extra parsing/cleanup layer.

## Scoring approach

The model never outputs a score directly. It only rates six dimensions 0 to 10. **The server computes the score** with a fixed, auditable formula:

```
score = (urgency × .25 + intent × .25 + budget × .2 + specificity × .15 + engagement × .15) × 10 − objections × 2
```

Hot is 65 and above, Warm is 40 and above, otherwise Cold. The "Why this score?" panel shows every dimension as a bar plus the formula itself. A salesperson should never have to trust a number they can't inspect.

## Voice feature details

Two independent controls, both backed by the browser's native Web Speech API rather than a paid voice API:

- **Dictate** (in the lead intake form): starts `SpeechRecognition`, transcribes speech in the selected language, and appends it to the customer message field. Useful when a salesperson is on a call or wants to log a message faster than typing it.
- **Listen** (next to the suggested opening and suggested response, on any analyzed lead): reads the text aloud with `speechSynthesis`, so a salesperson can rehearse tone before calling, hands-free.

A language selector (English, Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada, Bengali) sits next to both controls and drives the `lang` passed to both APIs. Dictation works out of the box in any supported language since recognition runs through the browser vendor's speech service. Playback quality depends on the voice packs installed on the user's device; if a language's voice isn't installed locally, the browser falls back to a default voice and the app surfaces a message telling the user which language is missing.

Both features degrade gracefully: on a browser without `SpeechRecognition` support (for example Firefox), clicking Dictate shows a clear message asking the user to switch to Chrome or Edge, instead of failing silently.

---

## Local setup

```bash
git clone <your-repo-url>
cd masal
npm install
cp .env.example .env.local   # add your GROQ_API_KEY, free at console.groq.com
npm run dev
```

Open `http://localhost:3000`, click **Explore Demo**, then **Analyze** on any lead. Use Chrome or Edge to test the voice features.

## Environment variables

| Variable | Where | Notes |
|---|---|---|
| `GROQ_API_KEY` | `.env.local` (local) / Vercel → Settings → Environment Variables (production) | Never committed. `.env.local` is gitignored; the key is only ever read server-side in `app/api/ai/route.ts` |

## Deployment

1. Push to a public GitHub repo.
2. Import the repo in [Vercel](https://vercel.com). It auto-detects Next.js, no config needed.
3. Add `GROQ_API_KEY` under Project → Settings → Environment Variables before the first deploy.
4. Deploy. Frontend and API route ship together as one Vercel deployment. No separate backend host required.

---

## Product decisions

**Why this priority model.** A single opaque "AI score" erodes trust the first time a salesperson disagrees with it. Splitting the score into six named, 0 to 10 rated dimensions with a fixed formula means a disagreement becomes a conversation ("the AI weighted urgency high, but I know this buyer is flaky") rather than a black box to either blindly follow or ignore.

**Why Next Best Move.** The assignment's real test is whether the AI is "a real product component rather than a demo gimmick." A list of six analysis fields is still just information. Next Best Move forces the AI to commit to one action and a usable opening line, the artifact a salesperson actually needs mid-workflow, not a summary they have to re-translate into action themselves.

**Why Objection Radar.** Objections are usually implicit. "65L is already stretching us" is a budget objection the customer never labeled as one. Surfacing it with a quoted evidence snippet and a confidence score makes the AI's inference checkable, which matters more in a sales tool than in a generic chatbot: a wrong objection call costs a deal.

**Why lead memory and grounded chat.** A generic chatbot bolted onto a CRM is a common but weak pattern. Every question requires re-explaining the lead. Grounding every chat turn in that lead's stored profile, message, and analysis (and labeling it as such in the UI) is what makes the copilot feel like part of the workflow instead of a separate tool.

**Why voice.** The assignment's context is an AI voice product, demoed live to non-technical buyers. A salesperson's workflow already happens partly on the phone, not just on screen. Dictation and playback meet that reality directly: speaking a customer's message in during or after a call instead of typing it, and hearing the AI's suggested opening before dialing, in whatever language the call will actually happen in. Using the browser's built-in speech APIs instead of a paid voice service kept this inside the assignment's free-tier constraint while still being a genuine, testable feature rather than a mockup.

**Why Groq and `openai/gpt-oss-120b`.** Free tier with no billing setup, an OpenAI-compatible API (easy to swap providers later, which this project has already done twice during development), and native JSON-object mode for reliable structured output. A good fit for a fast, iterative build under the assignment's free-tier constraint.

---

## Known limitations

- No auth or real database. Leads persist in the browser's `localStorage`, so data doesn't sync across devices.
- Demo leads have no cached analysis; every "Analyze" is a live model call, so results (and occasional model unavailability) are genuine, not staged.
- Minimal schema validation on the AI response (defensive coercion, not a full schema library like Zod).
- Voice dictation depends on browser support (Chrome and Edge; not Firefox) and playback quality depends on voice packs installed on the user's device.
- No automated tests.
- Single-user design. No concept of multiple salespeople or team-level views.

## AI usage disclosure

Claude was used for the initial scaffold, prompt design, the scoring formula, the voice feature, and iterative debugging (including diagnosing and migrating through several AI-provider issues during development). Groq (`openai/gpt-oss-120b`) powers the live product. Every analysis and chat reply shown in the demo is a real model call.
