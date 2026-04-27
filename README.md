# ProveIt BuildDay POC

ProveIt is a recruiter-first technical assessment demo for the post-LLM hiring era. Instead of asking candidates to produce LeetCode-style answers, this proof of concept tests whether they can review plausible AI-generated code and catch production risks before it ships.

## Demo Story

**One-line pitch:** ProveIt catches the difference between shipping code and understanding code.

**60-second framing:**

Traditional coding assessments are losing signal because LLMs can produce working-looking code. The hiring question has changed. A strong developer is not just someone who can generate code; they can verify it, challenge it, test it, and catch the subtle failures AI leaves behind. ProveIt turns that judgment into a measurable hiring signal.

**Three-minute demo flow:**

1. Open the evaluator dashboard and show Maya Chen's completed AI Slop Review.
2. Point to the ProveIt score, caught/missed issue counts, category breakdown, and deterministic scoring formula.
3. Open the challenge replay to show the AI-generated construction document upload endpoint, candidate comments, and hidden rubric reveal.
4. Click **Generate summary** to produce a recruiter-ready hiring narrative. If no API key is set, the fallback summary keeps the demo moving.
5. Switch to **Try Mode** and add a quick finding on the auth check, file path handling, or success-before-storage bug.

## Included Review Challenges

- **Contractor Safety Document Upload:** AI-generated TypeScript/Express review focused on tenant auth, file handling, and durable writes.
- **API Security Review: VAmPI:** Curated Flask API review inspired by the MIT-licensed VAmPI project.
- **Secure Code Review: Java XML Intake:** Expanded from `.rough/challenge-05`; focuses on XXE, XML parser hardening, error disclosure, and malicious XML tests.
- **Secure Code Review: Go Diagnostics API:** Expanded from `.rough/challenge-17`; focuses on command injection, weak admin controls, process limits, network reconnaissance, and negative tests.

## Why Now

- LLMs can pass many generate-code assessments.
- Teams still need engineers who understand correctness, security, testing, and operational risk.
- Hiring workflows need scenario-based evidence, not just algorithmic output.
- ProveIt is built around realistic engineering judgment: review, debug, test, diagnose, and improve.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Optional `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.5
```

The app still works without an API key. Scoring is deterministic, and summary generation falls back to a local narrative.

## Build Checks

```bash
npm run typecheck
npm run build
```

## Hackathon Scope

This is intentionally a disposable proof of concept:

- No auth
- No database
- No payment flow
- No multi-assessment authoring
- No candidate identity management

The point is to make the essence of ProveIt visible in a short investor, founder, or hiring-manager conversation.


Secure-code-review-challenge: No. 5 - XML Eternal Entity Attack (Java), OS Command injection No. 17 (Go)
