/* Sales module helpers: derived figures and small module-local actions.
   Everything here reads the shared store so every Sales screen agrees. */

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import * as D from "../../data";
import {
  addActivity, completeActivity, generatePlan, getState, log, moveActivity, openOpps, overdueFollowups,
  patch, toast, updateOpp, type HState,
} from "../../store";
import { TODAY, addDays, date, dayDate, daysAgo, weekday } from "../../fmt";

/* ── Calendar ───────────────────────────────────────────────────────────── */

export const THIS_WEEK = D.DEMO.weekStart;      // Mon 16 Nov
export const NEXT_WEEK = D.DEMO.nextWeekStart;  // Mon 23 Nov
export const weekDays = (start: string) => [0, 1, 2, 3, 4].map(i => addDays(start, i));
export const THIS_WEEK_DAYS = weekDays(THIS_WEEK);
export const THIS_SUNDAY = addDays(THIS_WEEK, 6);

export function isWorkingDay(d: string) { const w = weekday(d); return w !== "Sat" && w !== "Sun"; }
export function workingDaysFrom(start: string, n: number): string[] {
  const out: string[] = [];
  let d = start;
  while (out.length < n) { if (isWorkingDay(d)) out.push(d); d = addDays(d, 1); }
  return out;
}
/** Today plus the next six working days: the choices offered when scheduling. */
export const SCHEDULE_DAYS = workingDaysFrom(TODAY, 7);
export const dayLabel = (d: string) => (d === TODAY ? "Today" : d === addDays(TODAY, 1) ? "Tomorrow" : dayDate(d));

const pad = (n: number) => String(n).padStart(2, "0");
export const mins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const fmtMins = (m: number) => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
export const TIME_OPTIONS: string[] = [];
for (let m = 8 * 60; m <= 18 * 60; m += 30) TIME_OPTIONS.push(fmtMins(m));

export const byWhen = (a: { date: string; time: string }, b: { date: string; time: string }) => (a.date + a.time).localeCompare(b.date + b.time);

/** First time on a day that sits at least an hour from the rep's other plans (and after anything already done today). */
export function freeSlot(rep: string, date: string, s: HState = getState(), extra: { date: string; time: string }[] = []): string {
  const busy = s.activities.filter(a => a.rep === rep && a.date === date).map(a => mins(a.time))
    .concat(s.proposals.filter(p => p.rep === rep && p.date === date).map(p => mins(p.time)))
    .concat(extra.filter(x => x.date === date).map(x => mins(x.time)));
  let from = 9 * 60;
  if (date === TODAY) {
    const done = s.activities.filter(a => a.rep === rep && a.date === date && a.status === "Done").map(a => mins(a.time));
    if (done.length) from = Math.max(from, Math.max(...done) + 60);
  }
  for (let m = from; m <= 17 * 60; m += 30) if (busy.every(b => Math.abs(b - m) >= 60)) return fmtMins(m);
  for (let m = from; m <= 17 * 60 + 30; m += 30) if (busy.every(b => b !== m)) return fmtMins(m);
  return "17:30";
}

/* ── People ─────────────────────────────────────────────────────────────── */

export const SELLER_IDS: D.StaffId[] = D.SELLERS;
export const firstName = (id: string) => D.staffById(id)?.first || id;
export const fullName = (id: string) => D.staffById(id)?.name || id;
export const SELLER_OPTIONS: [D.StaffId, string][] = SELLER_IDS.map(id => [id, fullName(id) + (D.staffById(id)?.fictional ? " (fictional)" : "")]);

/* ── Activities ─────────────────────────────────────────────────────────── */

export const IN_PERSON: D.ActType[] = ["Visit", "Meeting", "Demo", "Clinical support"];
export const ACT_TYPES: D.ActType[] = ["Visit", "Call", "Meeting", "Follow-up", "Demo", "Clinical support", "Admin"];
const SEED_ACTS = new Map(D.SALES_ACTIVITIES.map(a => [a.id, a]));

export function weekActs(rep: string, start: string, s: HState) {
  const days = weekDays(start);
  return s.activities.filter(a => a.rep === rep && days.includes(a.date));
}

/** Add an activity to someone's plan and say so. Returns the new id. */
export function planActivity(a: Omit<D.SalesActivity, "id">, quiet = false): string {
  const id = addActivity(a);
  if (!quiet) toast("Added to " + firstName(a.rep) + "'s plan: " + dayLabel(a.date) + " at " + a.time + ".");
  return id;
}

/** Move an activity; a missed commitment that is rebooked becomes planned again. */
export function rescheduleActivity(id: string, date: string, time: string) {
  const a = getState().activities.find(x => x.id === id);
  if (!a) return;
  moveActivity(id, date, time);
  if (a.status === "Missed") patch(s => ({ activities: s.activities.map(x => x.id === id ? { ...x, status: "Planned" } : x) }));
  log({ stream: "people", actor: fullName(a.rep), title: (a.status === "Missed" ? "Rebooked: " : "Moved: ") + a.title, note: dayDate(a.date) + " " + a.time + " → " + dayDate(date) + " " + time, status: "completed", ref: a.opp || a.account, refType: a.opp ? "opp" : "account" });
  toast((a.status === "Missed" ? "Rebooked for " : "Moved to ") + dayLabel(date) + " at " + time + ".");
}

export function dropActivity(id: string) {
  const a = getState().activities.find(x => x.id === id);
  if (!a) return;
  patch(s => ({ activities: s.activities.filter(x => x.id !== id) }));
  log({ stream: "people", actor: "Graham Hogan", title: "Removed from " + firstName(a.rep) + "'s plan: " + a.title, note: dayDate(a.date) + " " + a.time, status: "completed", ref: a.opp || a.account, refType: a.opp ? "opp" : "account" });
  toast("Removed from " + firstName(a.rep) + "'s plan.");
}

/** Sales Agent suggestion edits before approval (amend, then approve). */
export function amendProposal(id: string, date: string, time: string) {
  patch(s => ({ proposals: s.proposals.map(p => p.id === id ? { ...p, date, time } : p) }));
}
export function dismissAll(rep: string) {
  const n = getState().proposals.filter(p => p.rep === rep).length;
  patch(s => ({ proposals: s.proposals.filter(p => p.rep !== rep) }));
  toast("Draft discarded: " + n + " suggestion" + (n === 1 ? "" : "s") + " removed. Nothing was added.", "info");
}

/**
 * Ask the Sales Agent for a draft week. The agent only proposes. For the
 * current week the planner keeps suggestions on today or later, and skips any
 * the rep has already planned for the same opportunity that week.
 */
export function draftWeek(rep: string, weekStart: string): { made: number; skipped: number } {
  generatePlan(rep as D.StaffId, weekStart);
  const s = getState();
  const days = weekDays(weekStart);
  const mine = s.proposals.filter(p => p.rep === rep && days.includes(p.date));
  const planned = s.activities.filter(a => a.rep === rep && days.includes(a.date) && a.status !== "Missed" && a.date >= TODAY);
  const dup = mine.filter(p => p.opp && planned.some(a => a.opp === p.opp));
  let keep = mine.filter(p => !dup.includes(p));
  if (weekStart === THIS_WEEK) {
    const open = days.filter(d => d >= TODAY);
    const placed: { date: string; time: string }[] = keep.filter(p => p.date >= TODAY).map(p => ({ date: p.date, time: p.time }));
    const order = keep.filter(p => p.date < TODAY).sort((a, b) => (a.priority === "High" ? 0 : 1) - (b.priority === "High" ? 0 : 1));
    const moved: Record<string, { date: string; time: string }> = {};
    order.forEach((p, i) => {
      const date = open[i % open.length];
      const time = freeSlot(rep, date, { ...s, proposals: s.proposals.filter(x => x.rep !== rep) }, placed);
      placed.push({ date, time });
      moved[p.id] = { date, time };
    });
    keep = keep.map(p => (moved[p.id] ? { ...p, ...moved[p.id] } : p));
  }
  keep = keep.map(p => {
    const o = p.opp ? findOpp(p.opp, s) : undefined;
    return o && /^Next step agreed on /.test(p.title) ? { ...p, title: "Confirm next step: " + o.title } : p;
  });
  patch(st => ({ proposals: st.proposals.filter(p => p.rep !== rep).concat(keep) }));
  if (dup.length) log({ stream: "ai", actor: "Sales Agent", title: "Left " + dup.length + " suggestion" + (dup.length === 1 ? "" : "s") + " out of " + firstName(rep) + "'s draft", note: "Already planned that week: " + dup.map(p => p.title).join("; "), status: "completed" });
  return { made: keep.length, skipped: dup.length };
}

/* ── Opportunities ──────────────────────────────────────────────────────── */

/** The store writes "Next step agreed on YYYY-MM-DD" after a follow-up; show it in plain words. */
export function actionText(a: string): string {
  const m = a.match(/^Next step agreed on (\d{4}-\d{2}-\d{2})$/);
  return m ? "Next step to confirm (followed up " + date(m[1], false) + ")" : a;
}

/** Title for a follow-up activity on an opportunity. */
export const followTitle = (o: D.Opportunity) => "Follow up: " + (/^Next step agreed on /.test(o.nextAction) ? o.title : o.nextAction);

export const STAGE_PROB: Record<D.Stage, number> = { Lead: 10, Qualified: 20, "Product Discussion": 35, "Clinical Evaluation": 50, Quotation: 65, Negotiation: 80, Won: 100, Lost: 0 };
export const OPEN_STAGES = D.STAGES;
export const isOpen = (o: D.Opportunity) => o.stage !== "Won" && o.stage !== "Lost";
export const overdueBy = (o: D.Opportunity) => Math.max(0, daysAgo(o.nextDue));
export const isOverdue = (o: D.Opportunity) => isOpen(o) && o.nextDue < TODAY;
export function findOpp(id: string, s: HState): D.Opportunity | undefined {
  return s.opps.find(o => o.id === id) || D.CLOSED_OPPS.find(o => o.id === id);
}
/** Closed this quarter: the seeded closures plus anything closed in this session. */
export function closedOpps(s: HState): D.Opportunity[] {
  return s.opps.filter(o => !isOpen(o)).concat(D.CLOSED_OPPS);
}
export function winRate(s: HState) {
  const c = closedOpps(s);
  const won = c.filter(o => o.stage === "Won"), lost = c.filter(o => o.stage === "Lost");
  return { won, lost, wonValue: won.reduce((a, o) => a + o.value, 0), lostValue: lost.reduce((a, o) => a + o.value, 0), rate: c.length ? Math.round((won.length / c.length) * 100) : 0 };
}
export const weighted = (list: D.Opportunity[]) => Math.round(list.reduce((a, o) => a + (o.value * STAGE_PROB[o.stage]) / 100, 0));
export function plannedFor(oppId: string, s: HState): D.SalesActivity[] {
  return s.activities.filter(a => a.opp === oppId && a.status === "Planned" && a.date >= TODAY).sort(byWhen);
}
/** Overdue first, then by how long the opportunity has been quiet. */
export function neglected(rep: string | null, s: HState): D.Opportunity[] {
  const quiet = openOpps(s).filter(o => (!rep || o.owner === rep) && (o.nextDue < TODAY || daysAgo(o.lastActivity) >= 14));
  return quiet.sort((a, b) => (Number(b.nextDue < TODAY) - Number(a.nextDue < TODAY)) || b.value * daysAgo(b.lastActivity) - a.value * daysAgo(a.lastActivity));
}

export function setStage(id: string, stage: D.Stage) {
  const o = getState().opps.find(x => x.id === id);
  if (!o || o.stage === stage) return;
  updateOpp(id, { stage, probability: STAGE_PROB[stage], lastActivity: stage === "Won" || stage === "Lost" ? TODAY : o.lastActivity });
  log({ stream: "people", actor: fullName(o.owner), title: id + " moved to " + stage, note: o.title + " · " + (D.accountById(o.account)?.name || "") + " · was " + o.stage, status: "completed", ref: id, refType: "opp" });
  toast(id + (stage === "Won" ? " marked won." : stage === "Lost" ? " marked lost." : " moved to " + stage + "."));
}

export function reassignOpp(id: string, owner: D.StaffId) {
  const o = getState().opps.find(x => x.id === id);
  if (!o || o.owner === owner) return;
  updateOpp(id, { owner });
  log({ stream: "people", actor: "Graham Hogan", title: id + " reassigned to " + fullName(owner), note: o.title + " · was " + fullName(o.owner), status: "completed", ref: id, refType: "opp" });
  toast(o.title + " now owned by " + firstName(owner) + ".");
}

export function setNextStep(id: string, nextAction: string, nextDue: string, quiet = false) {
  updateOpp(id, { nextAction, nextDue });
  if (!quiet) toast("Next step saved: due " + dayDate(nextDue) + ".");
}

/** Log a follow-up as done now: completes today's planned follow-up if there is one, otherwise records it. */
export function logFollowUp(o: D.Opportunity, outcome: string, nextAction: string, nextDue: string) {
  const s = getState();
  const existing = s.activities.find(a => a.opp === o.id && a.status === "Planned" && a.date <= TODAY);
  const id = existing ? existing.id : addActivity({
    rep: o.owner, date: TODAY, time: freeSlot(o.owner, TODAY, s), type: "Follow-up", title: "Follow-up: " + o.title,
    account: o.account, opp: o.id, status: "Planned", priority: isOverdue(o) ? "High" : "Medium", source: "rep", note: outcome || undefined,
  });
  if (existing && outcome) patch(st => ({ activities: st.activities.map(a => a.id === id ? { ...a, note: outcome } : a) }));
  completeActivity(id);
  updateOpp(o.id, { nextAction: nextAction || o.nextAction, nextDue });
}

/* ── Accounts ───────────────────────────────────────────────────────────── */

export const QUIET_DAYS = 14;
/** Last visit from the account record, moved forward by in-person visits completed in Pulse. */
export function lastVisit(accId: string, s: HState): string {
  let d = D.accountById(accId)?.lastVisit || "";
  for (const a of s.activities) {
    if (a.account !== accId || a.status !== "Done" || !IN_PERSON.includes(a.type) || a.date > TODAY) continue;
    if (SEED_ACTS.get(a.id)?.status === "Done") continue;
    if (a.date > d) d = a.date;
  }
  return d;
}
export function quietAccounts(rep: string | null, s: HState): D.Account[] {
  return D.ACCOUNTS.filter(a => (!rep || a.owner === rep) && daysAgo(lastVisit(a.id, s)) >= QUIET_DAYS)
    .sort((a, b) => daysAgo(lastVisit(b.id, s)) - daysAgo(lastVisit(a.id, s)));
}
/** Most recent recorded contact with an opportunity, or with the account if there is no opportunity. */
export function lastContact(a: { account?: string; opp?: string }, s: HState): string {
  if (a.opp) { const o = findOpp(a.opp, s); if (o) return o.lastActivity; }
  if (a.account) {
    const acts = s.activities.filter(x => x.account === a.account && x.status === "Done" && x.date <= TODAY).map(x => x.date);
    return [lastVisit(a.account, s), ...acts].sort().pop() || "";
  }
  return "";
}

/* ── Quotes and customer requests (module UI state) ─────────────────────── */

export type QStatus = D.Quote["status"];
const QKEY = "sales.quoteStatus";
const RKEY = "sales.reqResolved";
export const QUOTE_OPEN: QStatus[] = ["Awaiting response", "Viewed", "Revision requested"];
export function quoteStatus(q: D.Quote, s: HState): QStatus {
  const o = (s.ui[QKEY] || {}) as Record<string, QStatus>;
  return o[q.id] || q.status;
}
export function openQuotes(s: HState, owner?: string) {
  return D.QUOTES.filter(q => QUOTE_OPEN.includes(quoteStatus(q, s)) && (!owner || q.owner === owner)).sort((a, b) => a.sent.localeCompare(b.sent));
}
export function setQuoteStatus(id: string, st: QStatus) {
  const q = D.QUOTES.find(x => x.id === id);
  patch(s => ({ ui: { ...s.ui, [QKEY]: { ...((s.ui[QKEY] || {}) as Record<string, QStatus>), [id]: st } } }));
  if (q) log({ stream: "people", actor: fullName(q.owner), title: id + ": " + st, note: (D.accountById(q.account)?.name || "") + " · response recorded in Pulse", status: "completed", ref: q.opp, refType: "opp" });
  toast(id + " marked " + st.toLowerCase() + ".");
}
export function openRequests(s: HState, owner?: string) {
  const done = (s.ui[RKEY] || {}) as Record<string, string>;
  return D.REQUESTS.filter(r => !done[r.id] && (!owner || r.owner === owner)).sort((a, b) => a.raised.localeCompare(b.raised));
}
export function resolveRequest(id: string) {
  const r = D.REQUESTS.find(x => x.id === id);
  patch(s => ({ ui: { ...s.ui, [RKEY]: { ...((s.ui[RKEY] || {}) as Record<string, string>), [id]: TODAY } } }));
  if (r) log({ stream: "people", actor: fullName(r.owner), title: "Resolved " + id + ": " + r.title, note: D.accountById(r.account)?.name || "", status: "completed", ref: r.account, refType: "account" });
  toast(id + " marked resolved.");
}

/* ── Weekly numbers per rep ─────────────────────────────────────────────── */

export function weekStats(rep: string, s: HState) {
  const acts = weekActs(rep, THIS_WEEK, s);
  const done = acts.filter(a => a.status === "Done");
  const face = done.filter(a => a.account && IN_PERSON.includes(a.type));
  const t = D.WEEKLY_TARGETS[rep] || { visits: 0, followups: 0, quotes: 0, revenue: 0 };
  return {
    acts, done: done.length, missed: acts.filter(a => a.status === "Missed").length, planned: acts.filter(a => a.status === "Planned").length,
    visits: face.length, accountsVisited: new Set(face.map(a => a.account)).size,
    followups: done.filter(a => a.opp).length,
    quotes: D.QUOTES.filter(q => q.owner === rep && THIS_WEEK_DAYS.includes(q.sent)).length,
    revenue: D.WEEK_REVENUE[rep] || 0, target: t,
  };
}

export function repPipeline(rep: string, s: HState) {
  const mine = openOpps(s).filter(o => o.owner === rep);
  return { count: mine.length, value: mine.reduce((a, o) => a + o.value, 0), overdue: overdueFollowups(s).filter(o => o.owner === rep).length };
}

/* ── Layout ─────────────────────────────────────────────────────────────── */

/** Width of a container, so layouts can collapse to one column on phones. */
export function useWidth<T extends HTMLElement = HTMLDivElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(1100);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(entries => { const r = entries[0]?.contentRect; if (r) setW(r.width); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
