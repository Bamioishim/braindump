# Brain Dump → Done — implementation plan

## Scope
Build a responsive productivity app that turns unstructured thoughts into a prioritized, actionable plan. The first release centers the core transformation loop: brain dump → extraction → organized tasks → realistic plan → focus → progress. It includes a judge-friendly sample flow without registration, durable browser persistence, and graceful fallback behavior when a hosted AI response is unavailable.

## Implementation approach
- React + TypeScript frontend with Wouter routing and reusable UI primitives from the starter.
- A single app shell with responsive sidebar/navigation and view state for Today, Brain Dump, My Tasks, Focus and History.
- Task extraction implemented as a deterministic local parser for the demo and fallback, designed around the same structured task model that can be sent to the managed LLM service later without changing the UI contract.
- Local persistence via localStorage for drafts, tasks, plans, focus state and history so the demo survives refresh; the server/database scaffold remains enabled for future account-backed sync.
- Plan generation uses deadlines, priority, duration, available time and dependencies to create compact time blocks and a next action.
- Focus mode uses a pause/resume countdown and completion/defer actions; progress is derived from task state rather than hardcoded.
- `public/manus-routes.json` declares the top-level route set.

## Design system
- **Design Movement:** optimistic editorial learning-product UI inspired by the supplied screenshot: pale sage canvas, warm white paper panel, near-black typography, citrus-peach CTAs, compact utility navigation, and friendly data cards.
- **Core Principles:** calm before clever; show one next action; use contrast to create hierarchy; make progress feel tangible.
- **Color Philosophy:** sage frames the experience like a quiet study room; ivory surfaces feel paper-like; near-black keeps the interface grounded; peach provides brief moments of momentum; forest green signals completion and trust.
- **Layout Paradigm:** an airy editorial canvas around a focused paper workspace, with a persistent left rail on desktop and a bottom action rail on mobile.
- **Signature Elements:** crown-and-check wordmark; small peach “brain spark” badge; thin green progress line; miniature “today’s plan” cards with soft sage fills.
- **Interaction Philosophy:** actions are direct and forgiving; load a sample in one click, edit extracted tasks inline, and always keep a clear recovery path.
- **Animation:** restrained slide/fade for extraction results, soft progress transitions, reduced-motion fallback, and no decorative motion that competes with the next action.
- **Typography System:** Inter for interface text, labels and body copy; DM Serif Display for hero/section headlines and the word “next” in key moments; compact uppercase metadata in Inter with tracking.
- **Brand Essence:** a calm thinking partner that turns mental clutter into a doable next step. Personality: warm, capable, grounding.
- **Brand Voice:** encouraging and specific. Examples: “Let’s make the first step small.” / “Your day is lighter when the next thing is clear.”
- **Wordmark & Logo:** a tiny crown over a checkmark, paired with a two-line wordmark that makes the “Done” state visually feel like a destination.
- **Signature Brand Color:** #234B3B deep forest green.

## Project structure
- `client/src/pages/Home.tsx`: app shell, navigation, dashboard and task interactions.
- `client/src/index.css`: design tokens, responsive layout, typography and component styling.
- `public/manus-routes.json`: route declaration.
- `server/`: starter Express/tRPC server retained for managed runtime and future AI/database APIs.
- `drizzle/`: starter schema/migrations retained for future cross-device persistence.

## Delivery
Run TypeScript checks and production build, start the Preview server on port 3000, verify the route manifest and key interactions, then commit the working tree to the canonical main branch.
