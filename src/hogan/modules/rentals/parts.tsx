/* NICE1 rentals: shared pieces (booking calendar, dispatch checklist, confirm and inspection panels). */

import { useState, type ReactNode } from "react";
import * as D from "../../data";
import { completeInspection, completeRentalStep, dispatchRental, openRecord, returnRental, useHogan } from "../../store";
import { Badge, Btn, I, Icon, Progress, Row, Seg, SelectBox, Timeline, label, type Tone } from "../../ui";
import { TODAY, addDays, date, dayDate, daysBetween, eur, rel } from "../../fmt";
import {
  ASSET_TONE, BOOKING_TONE, CUSTOMER_KINDS, PACKAGES, PRICE_WEEK, approveExt, assetOf, basePrice, confirmEnquiry, customerKind, declineExt, freeUnits,
  logEnquiry, markDelivered, priceFor, setDelivery, weeksOf, type CustomerKind, type Pkg,
} from "./lib";

const box = { display: "flex", flexDirection: "column" as const, gap: 10, padding: 12, borderRadius: "var(--r-sm,11px)", background: "var(--surface-faint)", border: "1px solid var(--border)", animation: "fadeUp .22s var(--ease) both" };

/* ── Booking calendar (Gantt by unit) ───────────────────────────────────── */

const RANGE_START = "2026-11-01";
const RANGE_END = "2026-12-31";
const SPAN = daysBetween(RANGE_START, RANGE_END) + 1;
const MONDAYS: string[] = [];
for (let d = "2026-11-02"; d <= RANGE_END; d = addDays(d, 7)) MONDAYS.push(d);
const pct = (d: string) => (Math.max(0, Math.min(SPAN, daysBetween(RANGE_START, d))) / SPAN) * 100;

const BAR: Record<D.BookingStatus, { bg: string; line: string; ink: string; dashed?: boolean }> = {
  Completed: { bg: "var(--surface-2)", line: "var(--border-strong)", ink: "var(--dim)" },
  "On hire": { bg: "var(--accent-soft)", line: "var(--accent-line)", ink: "var(--ink)" },
  Dispatched: { bg: "var(--accent-soft)", line: "var(--accent)", ink: "var(--ink)" },
  Reserved: { bg: "var(--warn-soft)", line: "var(--warn)", ink: "var(--ink)" },
  Returned: { bg: "var(--surface-2)", line: "var(--warn)", ink: "var(--body)" },
  Enquiry: { bg: "transparent", line: "var(--warn)", ink: "var(--body)", dashed: true },
};

export function BookingCalendar() {
  const s = useHogan();
  const units = s.assets.slice().sort((a, b) => a.id.localeCompare(b.id));
  const enquiries = s.bookings.filter(b => b.status === "Enquiry");
  const rows: { key: string; label: ReactNode; sub: ReactNode; bookings: D.RentalBooking[]; onLabel?: () => void }[] = [
    ...units.map(a => ({ key: a.id, label: a.id, sub: <Badge tone={ASSET_TONE[a.status]} style={{ height: 17, fontSize: 10, padding: "0 6px" }}>{a.status}</Badge>, bookings: s.bookings.filter(b => b.asset === a.id), onLabel: () => openRecord("rental", a.id) })),
    { key: "enq", label: "Enquiries", sub: <span style={{ fontSize: 10.5, color: "var(--faint)" }}>no unit yet</span>, bookings: enquiries },
  ];
  const today = pct(TODAY) + (100 / SPAN) / 2;
  return (
    <div style={{ overflowX: "auto", minWidth: 0 }}>
      <div style={{ minWidth: 760 }}>
        <div style={{ display: "grid", gridTemplateColumns: "112px minmax(0,1fr)", alignItems: "end", marginBottom: 6 }}>
          <span style={{ ...label, fontSize: 9 }}>Unit</span>
          <div style={{ position: "relative", height: 30 }}>
            <span style={{ position: "absolute", left: 0, top: 0, ...label, fontSize: 9, color: "var(--dim)" }}>November</span>
            <span style={{ position: "absolute", left: pct("2026-12-01") + "%", top: 0, ...label, fontSize: 9, color: "var(--dim)" }}>December</span>
            {MONDAYS.map(m => <span key={m} style={{ position: "absolute", left: pct(m) + "%", bottom: 0, fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", transform: "translateX(-1px)" }}>{Number(m.slice(8))}</span>)}
          </div>
        </div>
        <div style={{ position: "relative" }}>
          {rows.map(r => {
            const shown = r.bookings.filter(b => b.end >= RANGE_START && b.start <= RANGE_END).sort((x, y) => x.start.localeCompare(y.start));
            const laneEnd: string[] = [];
            const lane: Record<string, number> = {};
            shown.forEach(b => { let i = laneEnd.findIndex(e => b.start >= e); if (i < 0) { i = laneEnd.length; laneEnd.push(b.end); } else laneEnd[i] = b.end; lane[b.id] = i; });
            const h = Math.max(1, laneEnd.length) * 30 + 8;
            return (
            <div key={r.key} style={{ display: "grid", gridTemplateColumns: "112px minmax(0,1fr)", alignItems: "center", borderTop: "1px solid var(--border)", minHeight: 38 }}>
              <button onClick={r.onLabel} disabled={!r.onLabel} className={r.onLabel ? "ix3" : undefined}
                style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, border: 0, background: "none", padding: "5px 0", cursor: r.onLabel ? "pointer" : "default", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: 12, textAlign: "left" }}>
                {r.label}{r.sub}
              </button>
              <div style={{ position: "relative", height: h }}>
                {MONDAYS.map(m => <span key={m} style={{ position: "absolute", left: pct(m) + "%", top: 0, bottom: 0, width: 1, background: "var(--border)" }} />)}
                {shown.map(b => {
                  const st = BAR[b.status];
                  const left = pct(b.start), right = pct(b.end);
                  const ext = b.extension?.state === "Requested";
                  return (
                    <span key={b.id}>
                      <button onClick={() => openRecord("booking", b.id)} title={b.id + " · " + b.customer + " · " + b.pkg + " · " + date(b.start, false) + " to " + date(b.end, false) + " · " + b.status}
                        className="ixx" style={{ position: "absolute", top: 5 + lane[b.id] * 30, height: 24, left: left + "%", width: Math.max(1.6, right - left) + "%", borderRadius: 7, background: st.bg, border: "1px " + (st.dashed ? "dashed " : "solid ") + st.line,
                          color: st.ink, fontSize: 10.5, fontFamily: "var(--mono)", padding: "0 6px", textAlign: "left", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer" }}>
                        {b.id}{right - left > 9 ? " · " + customerKind(b).replace("Enquiry via ", "") : ""}
                      </button>
                      {ext && <span title={"Extension requested: +" + b.extension!.weeks + " week"} style={{ position: "absolute", top: 5 + lane[b.id] * 30, height: 24, left: right + "%", width: pct(addDays(b.end, 7 * b.extension!.weeks)) - right + "%", borderRadius: 7, border: "1px dashed var(--warn)", background: "transparent", color: "var(--warn)", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>+1 wk?</span>}
                    </span>
                  );
                })}
              </div>
            </div>
            );
          })}
          <span title={"Today, " + dayDate(TODAY)} style={{ position: "absolute", top: -4, bottom: 0, left: "calc(112px + (100% - 112px) * " + today / 100 + ")", width: 2, background: "var(--bad)", borderRadius: 2, opacity: 0.8, pointerEvents: "none" }} />
        </div>
        <Row gap={14} wrap style={{ marginTop: 10, fontSize: 11.5, color: "var(--dim)" }}>
          {(["On hire", "Reserved", "Enquiry", "Completed"] as D.BookingStatus[]).map(k => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 16, height: 10, borderRadius: 3, background: BAR[k].bg, border: "1px " + (BAR[k].dashed ? "dashed " : "solid ") + BAR[k].line }} />{k}
            </span>
          ))}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 2, height: 12, background: "var(--bad)" }} />Today</span>
          <span>Click a bar for the booking, a unit for its history.</span>
        </Row>
      </div>
    </div>
  );
}

/* ── Dispatch checklist ─────────────────────────────────────────────────── */

export function DispatchChecklist({ b, compact }: { b: D.RentalBooking; compact?: boolean }) {
  const steps = b.steps || [];
  const done = steps.filter(x => x.done).length;
  const ready = steps.length > 0 && done === steps.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Row gap={8}>
        <span style={{ ...label, flex: 1 }}>Dispatch steps · {done} of {steps.length}</span>
        <div style={{ width: 90 }}><Progress value={done} max={Math.max(1, steps.length)} h={5} tone={ready ? "ok" : "accent"} /></div>
      </Row>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {steps.map((st, i) => (
          <button key={st.k} onClick={() => completeRentalStep(b.id, i)} className="ix11"
            style={{ display: "flex", alignItems: "center", gap: 9, padding: compact ? "5px 6px" : "7px 8px", margin: "0 -6px", border: 0, background: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", color: st.done ? "var(--dim)" : "var(--ink)", fontSize: 12.5 }}>
            <span style={{ width: 18, height: 18, flex: "none", borderRadius: 6, border: "1.5px solid " + (st.done ? "var(--ok)" : "var(--border-strong)"), background: st.done ? "var(--ok)" : "transparent", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {st.done && <Icon d={I.check} size={11} stroke={3} />}
            </span>
            <span style={{ textDecorationLine: st.done ? "line-through" : "none", textDecorationColor: "var(--faint)" }}>{st.k}</span>
          </button>
        ))}
      </div>
      <Row gap={8} wrap>
        <Btn kind="primary" size="sm" icon={I.truck} disabled={!ready} onClick={() => dispatchRental(b.id)} title={ready ? "Dispatch the unit" : "Complete every step first"}>Dispatch {b.asset}</Btn>
        {!ready && <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{steps.length - done} step{steps.length - done === 1 ? "" : "s"} left before dispatch. Click a step to tick it.</span>}
      </Row>
    </div>
  );
}

/* ── Confirm an enquiry: package, length, delivery, unit ────────────────── */

export function ConfirmPanel({ b, onDone }: { b: D.RentalBooking; onDone?: () => void }) {
  const s = useHogan();
  const [pkg, setPkg] = useState<Pkg>(b.pkg);
  const [weeks, setWeeks] = useState(weeksOf(b));
  const [delivery, setDel] = useState(b.delivery === "To confirm" ? "Courier" : b.delivery);
  const end = addDays(b.start, weeks * 7);
  const free = freeUnits(b.start, end, s, b.id);
  const [unit, setUnit] = useState(free[0]?.id || "");
  const chosen = free.find(u => u.id === unit) ? unit : free[0]?.id || "";
  const nextBack = s.bookings.filter(x => (x.status === "On hire" || x.status === "Dispatched") && x.asset).sort((x, y) => x.end.localeCompare(y.end))[0];
  return (
    <div style={box}>
      <span style={label}>Confirm {b.id} · {b.customer}</span>
      <Row gap={8} wrap>
        <Seg<Pkg> size="sm" value={pkg} onChange={setPkg} items={PACKAGES.map(p => [p, p + " · " + eur(basePrice(p))] as [Pkg, string])} />
        <SelectBox title="Length" value={String(weeks)} onChange={v => setWeeks(Number(v))} options={[2, 3, 4, 5, 6].map(n => [String(n), n + " weeks" + (n > 2 ? " (+" + eur((n - 2) * PRICE_WEEK) + ")" : "")] as [string, string])} />
        <SelectBox title="Delivery" value={delivery} onChange={setDel} options={[["Courier", "Courier"], ["Collected from Dún Laoghaire", "Collected from Dún Laoghaire"], ["Delivered by Hogan van run", "Hogan van run"]]} />
      </Row>
      <div style={{ fontSize: 12.5, color: "var(--body)" }}>
        {dayDate(b.start)} to {dayDate(end)} · <b style={{ color: "var(--ink)" }}>{eur(priceFor(pkg, weeks))}</b> at the published rate (reference only, not a guaranteed rate).
      </div>
      {free.length ? (
        <Row gap={8} wrap>
          <span style={{ ...label }}>Unit</span>
          <Seg<string> size="sm" value={chosen} onChange={setUnit} items={free.map(u => [u.id, u.id + " · cleaned " + date(u.cleaned, false)] as [string, string])} />
        </Row>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--warn)" }}>No unit is free for these dates yet.{nextBack ? " " + nextBack.asset + " is due back " + date(nextBack.end, false) + " (" + nextBack.id + "): return and inspect it to free a unit." : ""}</div>
      )}
      <Row gap={8} wrap>
        <Btn kind="primary" size="sm" icon={I.check} disabled={!chosen} onClick={() => { confirmEnquiry(b.id, chosen, pkg, weeks, delivery); onDone?.(); }}>Reserve {chosen || "a unit"}</Btn>
        {onDone && <Btn kind="ghost" size="sm" onClick={onDone}>Cancel</Btn>}
      </Row>
    </div>
  );
}

/* ── Log an enquiry taken by phone or email ─────────────────────────────── */

export function EnquiryForm({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<CustomerKind>("Private customer");
  const [pkg, setPkg] = useState<Pkg>("System + therapy wrap");
  const [start, setStart] = useState(addDays(TODAY, 6));
  const [weeks, setWeeks] = useState(2);
  const [referral, setReferral] = useState("");
  const starts = [3, 4, 5, 6, 7, 10, 12, 14].map(n => addDays(TODAY, n));
  return (
    <div style={box}>
      <span style={label}>Log an enquiry taken by phone or email</span>
      <Row gap={8} wrap>
        <SelectBox<CustomerKind> title="Customer type" value={kind} onChange={setKind} options={CUSTOMER_KINDS.map(k => [k, k] as [CustomerKind, string])} />
        <Seg<Pkg> size="sm" value={pkg} onChange={setPkg} items={PACKAGES.map(p => [p, p] as [Pkg, string])} />
        <SelectBox title="Start" value={start} onChange={setStart} options={starts.map(d => [d, "From " + dayDate(d)] as [string, string])} />
        <SelectBox title="Length" value={String(weeks)} onChange={v => setWeeks(Number(v))} options={[2, 3, 4].map(n => [String(n), n + " weeks"] as [string, string])} />
        <SelectBox title="Referred by" value={referral} onChange={setReferral} options={[["", "No referral"], ...D.ACCOUNTS.filter(a => a.consignment || a.type.includes("Physio")).map(a => ["Referred by " + a.name, "Referred by " + a.name] as [string, string])]} style={{ maxWidth: 260 }} />
      </Row>
      <div style={{ fontSize: 12, color: "var(--dim)" }}>Customer recorded as an anonymised reference only. No names, addresses or health details are stored in Pulse. Quote at the published rate: {eur(priceFor(pkg, weeks))}.</div>
      <Row gap={8}>
        <Btn kind="primary" size="sm" icon={I.plus} onClick={() => { logEnquiry({ kind, pkg, start, weeks, delivery: "To confirm", referral: referral || undefined }); onDone(); }}>Log enquiry</Btn>
        <Btn kind="ghost" size="sm" onClick={onDone}>Cancel</Btn>
      </Row>
    </div>
  );
}

/* ── Cleaning and inspection ────────────────────────────────────────────── */

const CHECKS = ["Cleaned and disinfected", "Cooling unit and pump tested", "Battery and charger checked", "Therapy wrap and hoses inspected", "Unit sealed in clean bag"];

export function InspectionPanel({ asset }: { asset: D.RentalAsset }) {
  const s = useHogan();
  const [ticks, setTicks] = useState<boolean[]>(CHECKS.map(() => false));
  const all = ticks.every(Boolean);
  const back = s.bookings.find(b => b.asset === asset.id && b.status === "Returned");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {back && <div style={{ fontSize: 12, color: "var(--dim)" }}>Back from <button className="ix3" onClick={() => openRecord("booking", back.id)} style={{ border: 0, background: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>{back.id}</button> · {customerKind(back)}</div>}
      {CHECKS.map((c, i) => (
        <button key={c} onClick={() => setTicks(ticks.map((t, j) => (j === i ? !t : t)))} className="ix11"
          style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 6px", margin: "0 -6px", border: 0, background: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", color: ticks[i] ? "var(--dim)" : "var(--ink)", fontSize: 12.5 }}>
          <span style={{ width: 18, height: 18, flex: "none", borderRadius: 6, border: "1.5px solid " + (ticks[i] ? "var(--ok)" : "var(--border-strong)"), background: ticks[i] ? "var(--ok)" : "transparent", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {ticks[i] && <Icon d={I.check} size={11} stroke={3} />}
          </span>
          {c}
        </button>
      ))}
      <Row gap={8} wrap style={{ marginTop: 4 }}>
        <Btn kind="primary" size="sm" icon={I.shield} disabled={!all} onClick={() => completeInspection(asset.id)}>Pass inspection</Btn>
        {!all && <Btn kind="ghost" size="sm" onClick={() => setTicks(CHECKS.map(() => true))}>Tick all</Btn>}
        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>{all ? asset.id + " goes back to available." : ticks.filter(Boolean).length + " of " + CHECKS.length + " checks done"}</span>
      </Row>
    </div>
  );
}

/* ── Return and extension controls for a live hire ──────────────────────── */

export function HireActions({ b, size = "sm" }: { b: D.RentalBooking; size?: "sm" | "md" }) {
  const ext = b.extension?.state === "Requested";
  return (
    <Row gap={6} wrap>
      {b.status === "Dispatched" && <Btn kind="primary" size={size} icon={I.check} onClick={() => markDelivered(b.id)}>Confirm delivered</Btn>}
      {ext && <Btn kind="primary" size={size} icon={I.check} onClick={() => approveExt(b.id)}>Approve +{b.extension!.weeks} week ({eur(b.extension!.fee)})</Btn>}
      {ext && <Btn kind="danger" size={size} icon={I.x} onClick={() => declineExt(b.id)}>Decline</Btn>}
      {(b.status === "On hire" || b.status === "Dispatched") && <Btn size={size} icon={I.refresh} onClick={() => returnRental(b.id)}>Mark returned</Btn>}
    </Row>
  );
}

export function DeliveryPicker({ b }: { b: D.RentalBooking }) {
  const opts: [string, string][] = [["Courier", "Courier"], ["Collected from Dún Laoghaire", "Collected from Dún Laoghaire"], ["Delivered by Hogan van run", "Hogan van run"]];
  if (!opts.some(o => o[0] === b.delivery)) opts.unshift([b.delivery, b.delivery]);
  return <SelectBox title="Delivery" value={b.delivery} onChange={v => setDelivery(b.id, v)} options={opts} style={{ height: 30, fontSize: 12 }} />;
}

/* ── Status helpers and the rentals activity feed ───────────────────────── */

export function BookingStatus({ b }: { b: D.RentalBooking }) {
  const prep = b.status === "Reserved" && (b.steps || []).some(x => !x.done);
  return <Badge tone={BOOKING_TONE[b.status] as Tone}>{prep ? "Reserved · preparing dispatch" : b.status}</Badge>;
}

export function RentalFeed({ filter, max = 10 }: { filter?: (e: D.HEvent) => boolean; max?: number }) {
  const s = useHogan();
  const items = s.events.filter(e => (e.refType === "booking" || e.refType === "rental" || e.title.includes("RN-0") || e.title.includes("N1-0")) && (!filter || filter(e)))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, max);
  if (!items.length) return <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No rental activity recorded yet.</div>;
  return (
    <Timeline dense items={items.map(e => ({
      when: (e.date === TODAY ? "Today" : rel(e.date)) + " " + e.time + " · " + e.actor, title: e.title, sub: e.note, tone: (e.stream === "ai" ? "accent" : e.status === "awaiting" ? "warn" : "ok") as Tone,
      onClick: e.ref && (e.refType === "booking" || e.refType === "rental") ? () => openRecord(e.refType!, e.ref!) : undefined,
    }))} />
  );
}

export const unitLabel = (id: string | undefined, s: { assets: D.RentalAsset[] }) => {
  const a = id ? s.assets.find(x => x.id === id) : undefined;
  return a ? "NICE1 unit " + a.id : "No unit yet";
};
export { assetOf };
