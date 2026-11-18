/* The Simulated Traceability Drill. Used on Inventory · Traceability and on
   Compliance · UDI & Lot Trace. It answers "where is every unit of this lot,
   who used it, and who would we call" from the live movement history.
   Exercise only: no recall exists, and nothing is quarantined or sent. */

import { useMemo, type ReactNode } from "react";
import * as D from "../../data";
import { TODAY, addDays, nowTime } from "../../fmt";
import { addTask, getState, openRecord, runTraceDrill, toast, useHogan, useUi } from "../../store";
import { Avatar, Badge, Btn, Card, Grid, I, Icon, Kpi, Notice, RecLink, Row, SelectBox, label } from "../../ui";
import { Ref, SimRibbon, dd } from "./bits";
import { drillFor, lotKey, lotsOf, whereName } from "./model";

export type DrillRun = { sku: string; lot: string; date: string; time: string; by: string; units: number; locs: number; moves: number };
export const DRILL_RUNS_KEY = "inventory.drillRuns";

export function TraceDrill({ uiKey, id }: { uiKey: string; id?: string }) {
  const s = useHogan();
  const [sel, setSel] = useUi<{ sku: string; lot: string }>(uiKey, { sku: "HH-OR-204", lot: "L2603-204A" });
  const [runs, setRuns] = useUi<DrillRun[]>(DRILL_RUNS_KEY, []);
  const lots = useMemo(() => lotsOf(s, sel.sku), [s, sel.sku]);
  const d = useMemo(() => drillFor(s, sel.sku, sel.lot), [s, sel.sku, sel.lot]);
  const run = runs.find(r => r.sku === sel.sku && r.lot === sel.lot);

  const go = () => {
    const res = drillFor(getState(), sel.sku, sel.lot);
    runTraceDrill(sel.sku, sel.lot, "GH");
    setRuns([{ sku: sel.sku, lot: sel.lot, date: TODAY, time: nowTime(), by: "GH", units: res.heldUnits, locs: res.heldLocs.length, moves: res.moves.length },
      ...runs.filter(r => !(r.sku === sel.sku && r.lot === sel.lot))].slice(0, 10));
    toast("Simulated drill logged for " + sel.sku + " lot " + sel.lot + ". Exercise only, no recall exists.", "info");
  };
  const followUp = () => {
    const key = lotKey(sel.sku, sel.lot);
    const open = getState().tasks.find(t => t.related?.id === key && t.status !== "Done");
    if (open) { toast("Follow-up already open: " + open.id + " for John Culkin.", "info"); return; }
    const tid = addTask({ title: "Review simulated drill: " + sel.sku + " lot " + sel.lot, owner: "JC", due: addDays(TODAY, 2), priority: "Medium", dept: "Compliance",
      related: { type: "lot", id: key, label: sel.sku + " · lot " + sel.lot }, status: "Not started", createdBy: "GH",
      note: "Exercise only. Confirm the drill found every unit (" + d.heldUnits + " located, " + d.consumedUnits + " used) and note any gaps in SOP-QA-11." });
    toast("Task " + tid + " assigned to John Culkin. Drill exercise only.", "ok");
  };

  const contacts = contactList(d);

  return (
    <Card id={id} style={{ border: "1px dashed var(--warn-soft)" }}
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>Simulated Traceability Drill <SimRibbon>Exercise only</SimRibbon></span>}
      sub="Pick a lot and run the drill: Pulse finds every unit, every hospital that used one, and everyone who would be contacted."
      right={<Btn kind="primary" icon={I.target} onClick={go}>{run ? "Run again" : "Run drill"}</Btn>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Notice tone="warn" title="Exercise only. No recall exists.">
          This is a practice run on fictional demo data. Nothing is quarantined, recalled or sent, and Pulse holds hospital usage by date and site only, never patient details.
        </Notice>

        <Row wrap gap={10}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: "2 1 240px", minWidth: 0 }}>
            <span style={{ ...label, fontSize: 9 }}>Product</span>
            <SelectBox value={sel.sku} style={{ width: "100%" }}
              onChange={v => setSel({ sku: v, lot: lotsOf(getState(), v)[0] || "" })}
              options={D.PRODUCTS.map(p => [p.sku, p.sku + " · " + p.name] as [string, string])} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 160px", minWidth: 0 }}>
            <span style={{ ...label, fontSize: 9 }}>Lot</span>
            <SelectBox value={sel.lot} style={{ width: "100%" }} onChange={v => setSel({ ...sel, lot: v })} options={lots.map(l => [l, l] as [string, string])} />
          </label>
        </Row>

        {!run ? (
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", padding: "14px 16px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--warn-soft)", color: "var(--warn)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon d={I.target} size={18} /></span>
            <div style={{ flex: "1 1 260px", fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>
              Ready to trace <b style={{ color: "var(--ink)" }}>{d.p?.name}</b>, lot <span style={{ fontFamily: "var(--mono)", color: "var(--ink)" }}>{sel.lot}</span>: {d.moves.length} recorded movements across supplier, main stockroom and hospital sites.
              The run is logged in the audit history as an exercise.
            </div>
            <Btn kind="primary" icon={I.target} onClick={go}>Run drill</Btn>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp .35s var(--ease) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12.5, color: "var(--dim)" }}>
              <Avatar id={run.by} size={22} />
              <span>Run by <b style={{ color: "var(--ink)", fontWeight: 600 }}>{D.staffById(run.by)?.name}</b> at {run.time} {run.date === TODAY ? "today" : dd(run.date)} · compiled from {d.moves.length} movements in under a second</span>
              <span style={{ flex: 1 }} />
              <Badge tone="warn">Simulated</Badge>
            </div>

            <Grid min={128} gap={10}>
              <Kpi label="Units located now" value={d.heldUnits} sub={d.heldLocs.length + " location" + (d.heldLocs.length === 1 ? "" : "s")} tone="accent" />
              <Kpi label="Used in procedures" value={d.consumedUnits} sub="No patient data held" />
              <Kpi label="Dispatched" value={d.dispatchedUnits} sub={d.customers.length + " customer" + (d.customers.length === 1 ? "" : "s")} />
              <Kpi label="Received" value={d.received} sub={"From " + (d.sup?.name || "supplier")} />
              <Kpi label="Movements" value={d.moves.length} sub="Every one traceable" />
              <Kpi label="Organisations" value={2 + d.sites.length + d.customers.filter(c => !d.sites.some(x => x.name === c)).length} sub="Would be involved" />
            </Grid>

            <Grid min={300} gap={12}>
              <Block title="Where the units are now" sub="In a real recall each holder would quarantine these. Not done in a drill.">
                {d.held.length ? d.held.map(l => (
                  <Line key={l.id} left={<RecLink type="location" id={l.loc}>{whereName(l.loc, true)}</RecLink>}
                    mid={D.locById(l.loc)?.kind === "consignment" ? "Consignment, Hogan-owned" : "Main stockroom"}
                    right={<b style={{ fontWeight: 600 }}>{l.qty}</b>} tag={l.status !== "Available" ? <Badge tone="info">{l.status}</Badge> : undefined} />
                )) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No units of this lot are held anywhere now. Every unit has been used or dispatched.</div>}
              </Block>
              <Block title="Usage and dispatches" sub="By date and site only. No patient data is held in Pulse.">
                {d.consumed.concat(d.dispatched).length ? d.consumed.concat(d.dispatched).map(m => (
                  <Line key={m.id} left={<span>{dd(m.date)}</span>} mid={(m.type === "Consumption" ? "Used at " + whereName(m.from) : "Dispatched to " + m.to)}
                    right={<span>{m.qty} · <Ref id={m.ref} /></span>} onClick={() => openRecord("movement", m.id)} />
                )) : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No units of this lot have been used or dispatched.</div>}
              </Block>
            </Grid>

            <div>
              <div style={{ ...label, marginBottom: 8 }}>Responsible organisations</div>
              <Grid min={210} gap={10}>
                <Org kind="Manufacturer" name={d.sup?.name || "Supplier"} body={"Leads any field safety corrective action and decides scope. " + (d.sup?.country || "")} onClick={d.sup ? () => openRecord("supplier", d.sup!.id) : undefined} />
                <Org kind="Distributor" name="Hogan Healthcare Ltd" body="Traces units, quarantines stock it holds, contacts customers and cooperates with the manufacturer and the HPRA." />
                {d.sites.map(site => {
                  const held = d.held.filter(l => l.loc === site.id).reduce((a, l) => a + l.qty, 0);
                  const used = d.consumed.filter(m => m.from === site.id).reduce((a, m) => a + m.qty, 0);
                  return <Org key={site.id} kind="Hospital (fictional)" name={site.name} body={"Holds " + held + ", used " + used + ". Checks its shelf and theatre records."} onClick={() => openRecord("location", site.id)} />;
                })}
                {d.customers.filter(c => !d.sites.some(x => x.name === c)).map(c => (
                  <Org key={c} kind="Customer (fictional)" name={c} body="Received units by direct delivery. Checks its own stock." />
                ))}
              </Grid>
            </div>

            <div>
              <div style={{ ...label, marginBottom: 8 }}>Who would be contacted</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {contacts.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 6px", borderBottom: i < contacts.length - 1 ? "1px solid var(--border)" : undefined }}>
                    {c.staff ? <Avatar id={c.staff} size={24} /> : <span style={{ width: 24, height: 24, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)", flex: "none" }}><Icon d={c.icon || I.user} size={12} /></span>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--ink)" }}>{c.who}</div>
                      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{c.why}</div>
                    </div>
                    {c.order && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>{c.order}</span>}
                  </div>
                ))}
              </div>
            </div>

            <Row wrap gap={8}>
              <Btn icon={I.user} onClick={followUp}>Assign review to John Culkin</Btn>
              <Btn kind="ghost" icon={I.external} onClick={() => openRecord("lot", lotKey(sel.sku, sel.lot))}>Open lot record</Btn>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, color: "var(--faint)" }}>Exercise only. No recall exists. Procedure reference: SOP-QA-11 (demo).</span>
            </Row>
          </div>
        )}

        {runs.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...label, fontSize: 9 }}>Drills run today</span>
            {runs.map(r => (
              <button key={r.sku + r.lot} onClick={() => setSel({ sku: r.sku, lot: r.lot })} className="ixa"
                style={{ height: 24, padding: "0 10px", borderRadius: 999, background: r.sku === sel.sku && r.lot === sel.lot ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (r.sku === sel.sku && r.lot === sel.lot ? "var(--accent-line)" : "var(--border)"), color: "var(--body)", fontSize: 11, cursor: "pointer" }}>
                {r.time} · {r.sku} · {r.lot} · {r.units} located
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function Block({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2, marginBottom: 8 }}>{sub}</div>}
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

function Line({ left, mid, right, tag, onClick }: { left: ReactNode; mid: ReactNode; right: ReactNode; tag?: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={onClick ? "ix11" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", borderTop: "1px solid var(--border)", fontSize: 12.5, cursor: onClick ? "pointer" : undefined, flexWrap: "wrap" }}>
      <span style={{ minWidth: 0 }}>{left}</span>
      <span style={{ flex: 1, minWidth: 120, color: "var(--dim)", fontSize: 12 }}>{mid}</span>
      {tag}
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{right}</span>
    </div>
  );
}

function Org({ kind, name, body, onClick }: { kind: string; name: string; body: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={onClick ? "ixx" : undefined}
      style={{ padding: "12px 13px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", cursor: onClick ? "pointer" : undefined, minWidth: 0, transition: "transform .2s var(--ease)" }}>
      <div style={{ ...label, fontSize: 9 }}>{kind}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 5, lineHeight: 1.3 }}>{name}</div>
      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 5, lineHeight: 1.45 }}>{body}</div>
    </div>
  );
}

type Contact = { who: string; why: string; staff?: string; icon?: string; order?: string };

function contactList(d: ReturnType<typeof drillFor>): Contact[] {
  const out: Contact[] = [];
  out.push({ who: (d.sup?.name || "Manufacturer") + " · quality and vigilance contact", why: "Confirm the lot, expiry and scope. The manufacturer decides whether any field action is needed.", icon: I.box, order: "1" });
  out.push({ who: "John Culkin · Operations Director, Hogan", why: "Drill lead. Locates Hogan-held units and would quarantine them in a real event.", staff: "JC", order: "2" });
  d.sites.forEach(site => {
    const acc = D.accountForLoc(site.id);
    const c = acc?.contacts[0];
    const owner = acc ? D.staffById(acc.owner) : undefined;
    out.push({ who: (c ? c.name + " · " + c.role + ", " : "") + site.name, why: "Check the consignment shelf and theatre usage records." + (owner ? " Contacted through " + owner.name + ", account owner." : ""), staff: owner?.id, order: String(out.length + 1) });
  });
  d.customers.filter(cn => !d.sites.some(x => x.name === cn)).forEach(cn => {
    const acc = D.ACCOUNTS.find(a => a.name === cn);
    const c = acc?.contacts[0];
    out.push({ who: (c ? c.name + " · " + c.role + ", " : "") + cn, why: "Check stock delivered on the listed orders.", staff: acc?.owner, order: String(out.length + 1) });
  });
  out.push({ who: "Graham Hogan · Managing Director", why: "Signs off any customer communication before it goes out.", staff: "GH", order: String(out.length + 1) });
  out.push({ who: "HPRA (Health Products Regulatory Authority)", why: "Irish competent authority. In a real field safety corrective action the manufacturer leads and Hogan cooperates. Not contacted in a drill.", icon: I.shield, order: "Info" });
  return out;
}
