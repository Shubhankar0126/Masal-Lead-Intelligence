# Masal Lead Intelligence
AI sales copilot: prioritizes inbound real-estate leads and tells the salesperson **what to do next, why, and the exact words to use**.

**Stack:** Next.js 14 (App Router, TS), Gemini `gemini-2.5-flash` via server route `/api/ai`. Leads persist in `localStorage`.

## Features
Lead intake + demo leads · AI analysis (summary, intent, requirements, objections, next action, response) · Transparent score · Lead-grounded chat · **Next Best Move** (signature) · **Objection Radar** (evidence + strategy) · Lead memory & activity timeline · Action queue · Status/priority management.

## How AI is called
`POST /api/ai` (key server-side only). `analyze` uses a system prompt + JSON-only schema (`responseMimeType: application/json`); output is parsed and coerced defensively. `chat` sends the lead profile, message and stored analysis as system context, so answers are grounded in one lead.

## Scoring
The model rates six dimensions 0–10; **the server computes the score**: `(urgency×.25 + intent×.25 + budget×.2 + specificity×.15 + engagement×.15)×10 − objections×2`. Hot ≥65, Warm ≥40, else Cold. Shown under "Why?".

## Run
```
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (free at aistudio.google.com)
npm run dev
```
Deploy: push to GitHub, import in Vercel, set `GEMINI_API_KEY`.

## Limitations
No auth/DB (localStorage). Demo leads have no cached analysis: every analysis is a live model call. Minimal schema validation (no zod), no tests.

## AI usage disclosure
Claude was used for scaffolding, prompt design and code. Gemini powers the product.
