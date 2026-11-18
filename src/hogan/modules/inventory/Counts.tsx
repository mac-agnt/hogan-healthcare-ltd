/* Inventory · Stock Counts: cycle-count plan, count sheets and variances. */

import { useState } from "react";
import * as D from "../../data";
import { TODAY, pct, rel } from "../../fmt";
import { log, moveStock, nav, patch, recordCount, toast, useHogan, useUi } from "../../store";
import { Badge, Btn, Card, Empty, Grid, I, Kpi, Notice, Page, PageHeader, RecLink, Row, Seg, Table, TextInput, label, type Col } from "../../ui";
import { Expiry, SkuCell, dd, prettyNote } from "./bits";
import { DLM_ZONES, LAST_DLM_ZONE, countAccuracy, countPlan, verifyDetail, whereName, type PlanRow } from "./model";

const countedToday = (l: D.StockLine) => !!l.note && l.note.startsWith("Count") && l.note.includes(TODAY);
const NEXT_ZONE = DLM_ZONES[(DLM_ZONES.indexOf(LAST_DLM_ZONE) + 1) % DLM_ZONES.length];

export default function Counts() {
  const s = useHogan();
  const plan = countPlan(s);
  const acc = countAccuracy(s);
  const [locId, setLocId] = useUi("inventory.countLoc", "EAS");
  const [zone, setZone] = useUi<D.CatId>("inventory.countZone", NEXT_ZONE);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const verify = s.stock.filter(l => l.status === "Verify");
  const resolved = s.stock.filter(l => l.note && l.note.includes(TODAY) && (l.note.startsWith("Counted") || l.note.startsWith("Variance resolved")));
  const due = plan.filter(r => r.state === "Overdue" || r.state === "Due this week");
  const todayCount = s.stock.filter(countedToday).length;
  const loc = D.locById(locId) || D.LOCATIONS[0];
  const sheet = s.stock.filter(l => l.loc === loc.id && (l.qty > 0 || countedToday(l)) && (loc.id !== "DLM" || D.productBySku(l.sku)?.cat === zone))
    .sort((a, b) => (a.status === "Verify" ? -1 : 0) - (b.status === "Verify" ? -1 : 0) || a.sku.localeCompare(b.sku));
  const untouched = sheet.filter(l => !countedToday(l) && l.status === "Available" && !(inputs[l.id] || "").trim());

  const record = (l: D.StockLine) => {
    const n = Number(inputs[l.id]);
    if (!(inputs[l.id] || "").trim() || !Number.isFinite(n) || n < 0) { toast("Enter the counted quantity for " + l.sku + ".", "warn"); return; }
    recordCount(l.id, n, "JC");
    setInputs(x => { const c = { ...x }; delete c[l.id]; return c; });
  };
  const confirmAll = () => {
    if (!untouched.length) return;
    const ids = new Set(untouched.map(l => l.id));
    patch(st => ({ stock: st.stock.map(l => ids.has(l.id) ? { ...l, note: "Count confirmed " + TODAY + "." } : l) }));
    log({ stream: "people", actor: "John Culkin", title: "Cycle count: " + ids.size + " lines confirmed at " + loc.short, note: "Shelf matches the system for every line. No variance.", status: "completed", ref: loc.id, refType: "location" });
    toast(ids.size + " lines confirmed at " + loc.short + ". No variance.");
  };
  const resolveUsage = (l: D.StockLine, n: number) => {
    const ok = moveStock({ type: "Consumption", sku: l.sku, lot: l.lot, expiry: l.expiry, qty: n, from: l.loc, to: "Used in procedure", by: "JC",
      note: "Usage confirmed with the site after a count variance. No patient data held in Pulse." });
    if (!ok) return;
    patch(st => ({ stock: st.stock.map(x => x.id === l.id ? { ...x, status: "Available", note: "Variance resolved " + TODAY + ": " + n + " recorded as hospital use." } : x) }));
    log({ stream: "people", actor: "John Culkin", title: "Resolved variance: " + l.sku + " at " + whereName(l.loc), note: n + " unit" + (n === 1 ? "" : "s") + " recorded as hospital use. Human decision.", status: "completed", ref: l.sku, refType: "product" });
    toast(l.sku + " at " + whereName(l.loc) + ": " + n + " recorded as used. Line verified.");
  };
  const qxFor = (l: D.StockLine) => s.qx.find(q => q.ref === l.sku && q.status !== "Closed" && q.kind === "Stock");

  const cols: Col<D.StockLine>[] = [
    { key: "p", label: "Product", w: "minmax(170px,1.7fr)", sort: l => l.sku, render: l => <SkuCell p={D.productBySku(l.sku)} /> },
    { key: "lot", label: "Lot / serial", w: "0.95fr", sort: l => l.lot, render: l => <RecLink type="lot" id={l.sku + "|" + l.lot} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{l.serial || l.lot}</RecLink> },
    { key: "exp", label: "Expiry", w: "0.9fr", sort: l => l.expiry || "9999", render: l => <span style={{ fontSize: 12.5 }}><Expiry d={l.expiry} /></span> },
    { key: "sys", label: "System", w: "0.7fr", align: "right", sort: l => l.qty, render: l => <b style={{ fontWeight: 600, color: "var(--ink)" }}>{l.qty}</b> },
    { key: "cnt", label: "Counted", w: "0.8fr", render: l => countedToday(l) ? <Badge tone="ok">Done</Badge> : (
      <TextInput type="number" value={inputs[l.id] ?? ""} placeholder={String(l.qty)} onChange={v => setInputs(x => ({ ...x, [l.id]: v }))} onEnter={() => record(l)} style={{ width: 72, height: 30 }} />) },
    { key: "var", label: "Variance", w: "0.8fr", align: "right", render: l => {
      const v = (inputs[l.id] || "").trim() ? Number(inputs[l.id]) - l.qty : null;
      if (v === null || !Number.isFinite(v)) {
        const rec = countedToday(l) ? Number((l.note || "").match(/variance (-?\d+)/)?.[1] || 0) : null;
        return rec === null ? null : <span style={{ color: rec ? "var(--warn)" : "var(--faint)" }}>{rec > 0 ? "+" + rec : rec}</span>;
      }
      return <span style={{ color: v === 0 ? "var(--ok)" : "var(--warn)", fontWeight: 600 }}>{v > 0 ? "+" + v : v}</span>;
    } },
    { key: "st", label: "Status", w: "0.85fr", render: l => countedToday(l) ? <Badge tone="ok">Counted today</Badge> : l.status === "Verify" ? <Badge tone="info" title={l.note}>Verify</Badge> : l.status === "Quarantine" ? <Badge tone="bad">Quarantine</Badge> : <span style={{ color: "var(--faint)", fontSize: 12 }}>To count</span> },
    { key: "act", label: "", w: "0.7fr", align: "right", render: l => countedToday(l) ? null : <Btn size="sm" kind={(inputs[l.id] || "").trim() ? "primary" : "secondary"} disabled={!(inputs[l.id] || "").trim()} onClick={() => record(l)}>Record</Btn> },
  ];

  return (
    <Page>
      <PageHeader eyebrow="Inventory" title="Stock Counts"
        sub="Consignment shelves are counted on each replenishment visit; the main stockroom one zone a week. Variances stay flagged until a person resolves them."
        right={<Btn icon={I.scan} onClick={() => nav("Inventory", "scanning", { "inventory.scan.mode": "count", "inventory.scan.countLoc": loc.id })}>Count by scanner</Btn>} />

      <Grid min={150} gap={12}>
        <Kpi label="Count accuracy · 30 days" value={pct(acc.pct)} tone={acc.pct >= 98 ? "ok" : "warn"} sub={acc.counted + " lines counted · " + acc.variances + " with a variance"} />
        <Kpi label="Locations due this week" value={due.length} tone={due.some(r => r.state === "Overdue") ? "warn" : undefined}
          sub={due.reduce((a, r) => a + r.lines.length, 0) + " lines · " + due.filter(r => r.state === "Overdue").length + " overdue"} />
        <Kpi label="Open variances" value={verify.length} tone={verify.length ? "warn" : "ok"} sub={verify.length ? verify.map(l => l.sku + " · " + whereName(l.loc)).join(" · ") : "Everything verified"} />
        <Kpi label="Counted today" value={todayCount + resolved.filter(l => !countedToday(l)).length} sub={resolved.length ? resolved.length + " variance" + (resolved.length === 1 ? "" : "s") + " resolved" : "Lines confirmed this session"} />
      </Grid>

      {verify.length > 0 && (
        <Grid min={340} gap={12}>
          {verify.map(l => {
            const v = verifyDetail(l);
            const p = D.productBySku(l.sku);
            const qx = qxFor(l);
            return (
              <Card key={l.id} tone="warn" pad={16}
                title={<span>{whereName(l.loc, true)} · <span style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{l.sku}</span></span>}
                sub={p?.name + " · lot " + l.lot}
                right={<Badge tone="info">Verify</Badge>}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                    <Fig k="On the system" v={l.qty} />
                    {v.kind === "count" && <Fig k="Counted" v={v.counted ?? 0} />}
                    {v.kind === "count" && <Fig k="Variance" v={(v.counted ?? 0) - l.qty} tone="warn" />}
                    {v.kind === "usage" && <Fig k="Reported used" v={v.used ?? 0} />}
                    {v.kind === "usage" && <Fig k="Expected on shelf" v={l.qty - (v.used ?? 0)} />}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>{prettyNote(l.note)}</div>
                  <Row wrap gap={8}>
                    {v.kind === "count" && <Btn size="sm" kind="primary" icon={I.check} onClick={() => recordCount(l.id, v.counted ?? l.qty, "JC")}>Accept count of {v.counted} as John Culkin</Btn>}
                    {v.kind === "count" && <Btn size="sm" icon={I.hospital} onClick={() => resolveUsage(l, l.qty - (v.counted ?? l.qty))}>Record {l.qty - (v.counted ?? l.qty)} as hospital use</Btn>}
                    {v.kind === "usage" && <Btn size="sm" kind="primary" icon={I.hospital} onClick={() => resolveUsage(l, v.used ?? 1)}>Record reported use as John Culkin</Btn>}
                    <Btn size="sm" kind="ghost" icon={I.layers} onClick={() => setLocId(l.loc)}>Count {whereName(l.loc)}</Btn>
                  </Row>
                  {qx && <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Quality exception <RecLink type="qx" id={qx.id} /> stays open until it is closed in Compliance.</div>}
                </div>
              </Card>
            );
          })}
        </Grid>
      )}
      {resolved.length > 0 && (
        <Notice tone="ok" title={resolved.length + " variance" + (resolved.length === 1 ? "" : "s") + " resolved today"}
          right={s.qx.some(q => q.kind === "Stock" && q.status !== "Closed") ? <Btn size="sm" onClick={() => nav("Compliance", "exceptions")}>Close exception in Compliance</Btn> : undefined}>
          {resolved.map(l => l.sku + " at " + whereName(l.loc) + ": " + prettyNote(l.note)).join(" ")}
        </Notice>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
        <Card flush pad={14} style={{ flex: "1 1 300px", minWidth: 0 }} title="Count plan" sub="Next count due per location.">
          <div>
            {plan.map(r => <PlanItem key={r.loc.id} r={r} on={r.loc.id === loc.id} onPick={() => setLocId(r.loc.id)} />)}
          </div>
        </Card>

        <Card flush pad={14} style={{ flex: "2.3 1 560px", minWidth: 0 }}
          title={"Count sheet · " + loc.name}
          sub={(loc.id === "DLM" ? "Zone: " + (D.catById(zone)?.name || "") + ". " : "") + sheet.length + " lines. Enter what is on the shelf; leave a line blank to skip it."}
          right={untouched.length ? <Btn size="sm" icon={I.check} onClick={confirmAll}>Confirm {untouched.length} as matching</Btn> : <Badge tone="ok">Nothing left to count</Badge>}>
          {loc.id === "DLM" && (
            <div style={{ padding: "0 14px 10px" }}>
              <Seg<D.CatId> size="sm" value={zone} onChange={setZone} items={DLM_ZONES.map(c => [c, D.catById(c)?.short || c, s.stock.filter(l => l.loc === "DLM" && l.qty > 0 && D.productBySku(l.sku)?.cat === c).length] as [D.CatId, string, number])} />
            </div>
          )}
          <Table<D.StockLine> cols={cols} rows={sheet} rowKey={l => l.id} dense minWidth={700} maxHeight={520}
            highlight={l => l.status === "Verify"}
            empty={<Empty title="Nothing on this sheet" sub="No stock lines at this location." icon={I.layers} />}
            footer={<span>Recording a count sets the system quantity to what was counted and writes a count-adjustment movement for any variance. Counts are recorded as John Culkin.</span>} />
        </Card>
      </div>
    </Page>
  );
}

function Fig({ k, v, tone }: { k: string; v: number; tone?: "warn" }) {
  return (
    <div>
      <div style={{ ...label, fontSize: 9 }}>{k}</div>
      <div style={{ fontSize: 22, fontWeight: 600, marginTop: 3, color: tone ? "var(--warn)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{v > 0 && tone ? "+" + v : v}</div>
    </div>
  );
}

function PlanItem({ r, on, onPick }: { r: PlanRow; on: boolean; onPick: () => void }) {
  const tone = r.state === "Overdue" ? "bad" : r.state === "Due this week" ? "warn" : r.state === "Counted today" ? "ok" : "neutral";
  return (
    <div onClick={onPick} className={on ? undefined : "ix11"}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: "1px solid var(--border)", cursor: "pointer",
        background: on ? "var(--accent-faint)" : undefined, boxShadow: on ? "inset 2px 0 0 var(--accent)" : undefined }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.loc.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>
          Last {dd(r.last, false)} · {r.loc.id === "DLM" ? "weekly zone" : "monthly"} · {r.lines.length} lines
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <Badge tone={tone}>{r.state}</Badge>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>{r.state === "Counted today" ? "Next " + dd(r.next, false) : "Due " + dd(r.next, false) + " · " + rel(r.next)}</div>
      </div>
    </div>
  );
}
