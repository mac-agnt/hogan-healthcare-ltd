/* Formatting helpers shared by every Hogan Healthcare OS screen. */

export const TODAY = "2026-11-19"; // Demo reference date: Thursday 19 November 2026

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/** €12,345 (no decimals unless asked). */
export function eur(n: number, decimals = 0): string {
  const neg = n < 0;
  const s = Math.abs(n).toLocaleString("en-IE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (neg ? "−€" : "€") + s;
}

/** €12.3k / €1.24m for tight spaces. */
export function eurK(n: number): string {
  const a = Math.abs(n), neg = n < 0 ? "−" : "";
  if (a >= 1_000_000) return neg + "€" + (a / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "m";
  if (a >= 10_000) return neg + "€" + Math.round(a / 1000) + "k";
  if (a >= 1000) return neg + "€" + (a / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return neg + "€" + Math.round(a);
}

export function num(n: number): string {
  return n.toLocaleString("en-IE");
}

export function pct(n: number, decimals = 1): string {
  return n.toFixed(decimals) + "%";
}

function parse(d: string): Date {
  const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd));
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}

/** Days since the given date, measured from the demo date. */
export function daysAgo(d: string): number {
  return daysBetween(d, TODAY);
}

/** Days until the given date, measured from the demo date (negative = past). */
export function daysUntil(d: string): number {
  return daysBetween(TODAY, d);
}

export function addDays(d: string, n: number): string {
  const t = parse(d);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/** 19 Nov 2026 */
export function date(d: string, withYear = true): string {
  if (!d) return "n/a";
  const t = parse(d);
  return t.getUTCDate() + " " + MONTHS[t.getUTCMonth()] + (withYear ? " " + t.getUTCFullYear() : "");
}

/** Thu 19 Nov */
export function dayDate(d: string): string {
  const t = parse(d);
  return DAYS[t.getUTCDay()] + " " + t.getUTCDate() + " " + MONTHS[t.getUTCMonth()];
}

/** Thursday 19 November */
export function longDate(d: string, withYear = false): string {
  const t = parse(d);
  return DAYS_LONG[t.getUTCDay()] + " " + t.getUTCDate() + " " + MONTHS_LONG[t.getUTCMonth()] + (withYear ? " " + t.getUTCFullYear() : "");
}

export function weekday(d: string): string {
  return DAYS[parse(d).getUTCDay()];
}

export function monthYear(d: string): string {
  const t = parse(d);
  return MONTHS_LONG[t.getUTCMonth()] + " " + t.getUTCFullYear();
}

/** "Today", "Yesterday", "3 days ago", "in 4 days". */
export function rel(d: string): string {
  const n = daysAgo(d);
  if (n === 0) return "Today";
  if (n === 1) return "Yesterday";
  if (n === -1) return "Tomorrow";
  if (n > 1) return n + " days ago";
  return "in " + -n + " days";
}

/** The current wall-clock time as HH:MM, used to stamp demo actions. */
export function nowTime(): string {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

export function plural(n: number, one: string, many?: string): string {
  return n + " " + (n === 1 ? one : many || one + "s");
}
