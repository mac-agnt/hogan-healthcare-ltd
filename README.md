# Hogan Healthcare OS (powered by Pulse)

Frontend demo of **Hogan Healthcare OS**, built on the Pulse v5 Harbour template for Hogan Healthcare Ltd (Graham Hogan, Managing Director).

Everything shown is **fictional demonstration data** with local state only: no backend, no live integrations. Reference date: Thursday 19 November 2026.

Every page, theme and interaction from the design is here. Screens were checked against the original mockup and match pixel for pixel at 1440×900 and 1024×720.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
```

## What's in it

| Area | Where |
| --- | --- |
| Pages: Home (Helios chat), Agents, Dashboard, Work, Records, Activity, Settings | `src/views/pages/` |
| Overlays: ⌘K palette, agent studio, Helios mini chat, work viewer, new record, background gallery | `src/views/overlays/` |
| App frame: sidebar, top bar, notifications | `src/views/AppShell.tsx` |
| State and behaviour | `src/logic/PulseLogic.js` |
| Pulse template data (re-skinned) | `src/logic/data.js` |
| Hogan dataset, live demo state, UI kit | `src/hogan/` (`data.ts`, `store.ts`, `ui.tsx`, `charts.tsx`) |
| Business modules (Sales, Orders, Inventory, Purchasing, Finance, Compliance, Rentals, Dashboard, Work) | `src/hogan/modules/` |
| Agent avatar | `src/components/AgentFace.tsx` |
| Theme tokens (Harbour, light and 11 more), animations | `src/styles/pulse.css` |

## How it fits together

- **`PulseLogic`** holds all state. Its `renderVals()` returns one flat object `v`.
- **Views** are plain React components that render from `v`.
- **`LogicHost`** (`src/runtime/logic.tsx`) mounts the logic and re-renders on `setState`.
- **Backgrounds** live in `src/App.tsx`:
  - `dashboardBackdrop`: the colour of the Dashboard KPI background
  - `kpiBackdropOn`: whether that background shows
  - `recordsBackdrop`: the colour of the Records wash (`""` uses the theme gradient)
- **Customising for a client:** read `CLAUDE.md` first. It lists the layout rules every copy keeps.

## Updating from Claude Design

Export the new version, replace the file in `design/`, then run:

```bash
npm run import-design
```

This regenerates:

- `src/views/`
- `src/styles/pulse.css`
- `src/styles/interactions.css`
- `src/logic/`

`AgentFace` is hand-written and left alone. Commit before running, because it overwrites hand edits to those files.

## Fixed from the mockup

In the mockup, the work viewer's wrapper `<div>` was never closed. As a result, the ⌘K palette, agent studio, new record dialog and background gallery could only appear while the work viewer was open. They now open on their own. The fix is applied in `tools/import-design.mjs`.

## Hogan demo: what to know

- **Shared dataset**: `src/hogan/data.ts`. Stock reconciles (820 main stockroom + 420 across 8 fictional consignment sites = 1,240 units, 132 SKUs); November-to-date P&L reconciles (revenue €165,400, EBITDA €25,700).
- **Live demo state**: `src/hogan/store.ts` holds everything an interaction can change and the six story actions (Harbour transfer, SO-1047 scans, weekly planning, receivables, BILL-2034 review, RN-0208 dispatch).
- **Reset**: Settings → Data management → Reset demo data, or reload the page.
- **Sidebar order**: Home, Agents, Dashboard, Work. The template locks Agents directly under Home (see CLAUDE.md).
- **Branding**: Hogan logo from hoganhealthcare.com; colours are a provisional demo palette (navy #17374D, teal #267985, aqua #4A9DA5), not verified official brand colours.

## 12–15 minute demo flow

1. **Home (0–2 min).** Business health, Needs your attention, the morning briefing. Ask Pulse "Where is HH-OR-204 right now?".
2. **Stock and traceability (2–5 min).** Inventory → Hospital Stock → Harbour. Open HH-OR-204, pick lot L2603-204A, follow the movement timeline to TR-0412 and SO-0996. Replenishment → Create transfer (3 units) → Approve as John Culkin: Harbour 4 → 7, main stockroom 6 → 3, alert closes, movement recorded.
3. **Order processing (5–7 min).** Orders → Picking & Packing → SO-1047 → Simulate scan twice: 3/5 → 5/5, ready for dispatch, event in Activity. Show New Order (4 steps, one screen).
4. **Sales team (7–10 min).** Sales → Weekly Planner: review Mon–Fri, missed commitments, Sales Agent draft, add a Pinewood follow-up to Aileen, then My Day shows it.
5. **Executive and finance (10–12 min).** Dashboard → Executive Overview (P&L bridge reconciles). Finance → Receivables (INV-6128), Purchasing → Exceptions → BILL-2034 → Create review task (no posting).
6. **Agents and future (12–15 min).** Agents page (observations, drafts, evidence). Rentals → RN-0208 → Dispatch. End on Home: the alerts you handled show as done.

Reset between runs: Settings → Data management → Reset demo data.
