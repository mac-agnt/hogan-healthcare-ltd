/* Inventory · Replenishment (Story A).
   Consignment lines below par get a suggested top-up from the main stockroom
   (FEFO lot). Graham raises the transfer; John Culkin approves it; only then
   does stock move and a traceable movement get written. */

import { useState } from "react";
import * as D from "../../data";
import { TODAY, date, eur } from "../../fmt";
import { approveTransfer, decideApproval, fefoLot, nav, openRecord, productStock, proposeTransfer, rejectTransfer, reorderRecs, toast, useHogan, useUi, type SiteLow } from "../../store";
import { Badge, Btn, Card, Empty, Grid, I, Icon, Kpi, Notice, Page, PageHeader, Person, RecLink, Row, Table, label, type Col } from "../../ui";
import { Stepper, dd } from "./bits";
import { qtyAfter, siteLows, whereName } from "./model";

type Item = { key: string; sku: string; to: D.LocId; low?: SiteLow; tr?: D.Transfer };

export default function Replenish() {
  const s = useHogan();
  const [focus, setFocus] = useUi("inventory.focus", "");
  const low = siteLows(s);

  const items: Item[] = low.map(lo => ({
    key: lo.line.sku + "|" + lo.line.loc, sku: lo.line.sku, to: lo.line.loc, low: lo,
    tr: lo.pending || s.transfers.find(t => t.sku === lo.line.sku && t.to === lo.line.loc && t.created === TODAY && t.status === "Rejected"),
  }));
  for (const t of s.transfers) {
    if (t.created !== TODAY || t.status !== "Completed" || t.to === "DLM") continue;
    if (!items.some(i => i.sku === t.sku && i.to === t.to)) items.push({ key: t.sku + "|" + t.to, sku: t.sku, to: t.to, tr: t });
  }
  const order = (i: Item) => (i.sku === focus ? 0 : 1) * 10 + (i.tr?.status === "Completed" ? 2 : i.tr?.status === "Awaiting approval" ? 0 : 1);
  items.sort((a, b) => order(a) - order(b) || a.sku.localeCompare(b.sku));

  const focusItem = focus ? items.find(i => i.sku === focus) : undefined;
  const pending = s.transfers.filter(t => t.status === "Awaiting approval");
  const doneToday = s.transfers.filter(t => t.status === "Completed" && t.completed === TODAY);
  const open = low.filter(l => !l.pending);
  const recs = reorderRecs(s);
  const hints = items.map(i => recs.find(r => r.product.sku === i.sku)).filter((r): r is NonNullable<typeof r> => !!r)
    .filter((r, i, a) => a.findIndex(x => x.product.sku === r.product.sku) === i);
  const raiseAll = () => {
    if (!open.length) return;
    open.forEach(lo => proposeTransfer({ sku: lo.line.sku, to: lo.line.loc, qty: lo.suggested, by: "GH" }));
  };

  return (
    <Page>
      <PageHeader eyebrow="Inventory" title="Replenishment"
        sub="Consignment lines below their par level, with a suggested top-up from the main stockroom using the first-expiring lot. Nothing moves until John Culkin approves the transfer."
        right={<>
          <Btn icon={I.hospital} onClick={() => nav("Inventory", "hospital")}>Hospital stock</Btn>
          <Btn kind="primary" icon={I.route} disabled={!open.length} onClick={raiseAll}>Raise all suggestions{open.length ? " (" + open.length + ")" : ""}</Btn>
        </>} />

      {focusItem && (
        <Notice tone={focusItem.tr?.status === "Completed" ? "ok" : "info"}
          title={focusItem.tr?.status === "Completed" ? "Done: " + whereName(focusItem.to, true) + " replenished" : "Opened from Home: " + whereName(focusItem.to, true) + " needs replenishment"}
          right={<Btn size="sm" kind="ghost" onClick={() => setFocus("")}>Clear highlight</Btn>}>
          {focusItem.tr?.status === "Completed"
            ? focusItem.tr.id + " was approved and the stock moved. The Home alert has closed."
            : focusItem.tr?.status === "Awaiting approval"
              ? focusItem.tr.id + " is waiting for John Culkin. Approve it below to move the stock."
              : focus + " is highlighted below. Raise the transfer, then approve it as John to see both locations update."}
        </Notice>
      )}

      <Grid min={145} gap={12}>
        <Kpi label="Lines below par" value={low.length} tone={low.length ? "warn" : "ok"} sub={new Set(low.map(l => l.line.loc)).size + " sites · " + low.map(l => whereName(l.line.loc)).join(" · ")} />
        <Kpi label="Units suggested" value={open.reduce((a, l) => a + l.suggested, 0)} sub={open.length + " transfers not yet raised"} />
        <Kpi label="Awaiting John Culkin" value={pending.length} tone={pending.length ? "warn" : undefined} sub={pending.map(t => t.id).join(" · ") || "Nothing waiting"} />
        <Kpi label="Completed today" value={doneToday.length} tone={doneToday.length ? "ok" : undefined} sub={doneToday.map(t => t.id).join(" · ") || "No transfers executed yet"} />
      </Grid>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.length ? items.map(i => <ItemCard key={i.key} i={i} focus={i.sku === focus} />)
          : <Card><Empty title="Every consignment line is at par" sub="Nothing to replenish right now. New suggestions appear here as hospitals report use." /></Card>}
      </div>

      {hints.map(r => {
        const ps = productStock(r.product.sku, s);
        return (
          <Notice key={r.product.sku} tone="warn" icon={I.trend} title={"Main stockroom now below its reorder point for " + r.product.sku}
            right={<Btn size="sm" kind="primary" icon={I.arrow} onClick={() => nav("Purchasing", "reorder")}>Reorder recommendations</Btn>}>
            {r.product.name}: {ps.central} in the main stockroom against a reorder point of {r.min}{r.onOrder ? ", " + r.onOrder + " already on order" : ""}. Purchasing suggests ordering {r.suggested} from {r.supplier.name} ({eur(r.cost)} at cost). Nothing is ordered until someone raises and approves a PO.
          </Notice>
        );
      })}

      <Card flush pad={14} title="Transfer ledger" sub="Every stock transfer raised in Pulse, with who asked and who approved.">
        <Table<D.Transfer> cols={ledgerCols} rows={s.transfers.slice().sort((a, b) => (b.created + b.id).localeCompare(a.created + a.id))} rowKey={t => t.id} dense minWidth={900}
          onRow={t => openRecord("transfer", t.id)} />
      </Card>
    </Page>
  );
}

const ledgerCols: Col<D.Transfer>[] = [
  { key: "id", label: "Transfer", w: "0.8fr", sort: t => t.id, render: t => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>{t.id}</span> },
  { key: "p", label: "Product", w: "1.7fr", sort: t => t.sku, render: t => <span style={{ fontSize: 12.5 }}>{t.qty} × {D.productBySku(t.sku)?.name} <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)" }}>{t.sku}</span></span> },
  { key: "lot", label: "Lot", w: "0.9fr", render: t => <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--dim)" }}>{t.lot || (t.status === "Completed" ? "Not recorded" : "FEFO at approval")}</span> },
  { key: "route", label: "Route", w: "1.3fr", render: t => <span style={{ fontSize: 12.5 }}>{whereName(t.from)} → {whereName(t.to)}</span> },
  { key: "by", label: "Raised by", w: "1fr", render: t => <span style={{ fontSize: 12.5 }}>{t.proposedBy.startsWith("agent") ? "Stock & Traceability Agent" : D.staffById(t.proposedBy)?.name || t.proposedBy}</span> },
  { key: "ap", label: "Approver", w: "0.9fr", render: t => <span style={{ fontSize: 12.5 }}>{D.staffById(t.approver)?.name}</span> },
  { key: "st", label: "Status", w: "0.95fr", sort: t => t.status, render: t => <Badge tone={t.status === "Completed" ? "ok" : t.status === "Rejected" ? "bad" : "warn"}>{t.status}</Badge> },
  { key: "d", label: "Date", w: "0.7fr", sort: t => t.completed || t.created, render: t => <span style={{ fontSize: 12.5 }}>{dd(t.completed || t.created, false)}</span> },
];

/** Before and after for one location: a bar with the incoming or outgoing part shown. */
function Gauge({ name, before, after, par, max }: { name: string; before: number; after: number; par?: number; max: number }) {
  const pctOf = (n: number) => Math.min(100, (n / Math.max(1, max)) * 100);
  const up = after >= before;
  const below = par !== undefined && after < par;
  const baseLow = par !== undefined && Math.min(before, after) < par;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          <span style={{ color: "var(--dim)", fontWeight: 500 }}>{before}</span>
          <span style={{ color: "var(--faint)", margin: "0 6px", fontWeight: 400 }}>→</span>
          <span style={{ color: below ? "var(--warn)" : up ? "var(--accent)" : "var(--ink)" }}>{after}</span>
        </span>
      </div>
      <div style={{ position: "relative", height: 10, borderRadius: 10, background: "var(--track)", marginTop: 7 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pctOf(Math.max(before, after)) + "%", borderRadius: 10, background: up ? "var(--accent-line)" : "var(--surface-2)", border: up ? undefined : "1px dashed var(--border-strong)" }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pctOf(Math.min(before, after)) + "%", borderRadius: 10, background: baseLow ? "var(--warn)" : "var(--accent)" }} />
        {par !== undefined && <div title={"Par level " + par} style={{ position: "absolute", top: -4, bottom: -4, left: "calc(" + pctOf(par) + "% - 1px)", width: 2, borderRadius: 2, background: "var(--ink)", opacity: 0.75 }} />}
      </div>
      <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 5 }}>{par !== undefined ? "Par level " + par + (after >= par ? " · at or above par after" : " · still below par") : up ? "Receives stock" : "Gives " + (before - after) + ", keeps " + after}</div>
    </div>
  );
}

function ItemCard({ i, focus }: { i: Item; focus: boolean }) {
  const s = useHogan();
  const p = D.productBySku(i.sku)!;
  const site = D.locById(i.to)!;
  const ps = productStock(i.sku, s);
  const tr = i.tr;
  const lo = i.low;
  const suggested = lo?.suggested ?? tr?.qty ?? 1;
  const [qty, setQty] = useState(suggested);
  const siteLine = s.stock.filter(l => l.sku === i.sku && l.loc === i.to);
  const par = siteLine.find(l => l.min !== undefined)?.min;
  const siteNow = siteLine.reduce((a, l) => a + l.qty, 0);
  const centralNow = ps.central;
  const src = tr?.lot ? s.stock.find(l => l.sku === i.sku && l.loc === "DLM" && l.lot === tr.lot) || fefoLot(i.sku, s) : fefoLot(i.sku, s);
  const completed = tr?.status === "Completed";
  const awaiting = tr?.status === "Awaiting approval" || tr?.status === "Proposed";
  const rejected = tr?.status === "Rejected";
  const move = completed ? s.movements.find(m => m.ref === tr!.id) : undefined;
  const q = awaiting || completed ? tr!.qty : qty;
  const siteDone = completed && move ? qtyAfter(s, i.sku, i.to, move.id) : siteNow;
  const cenDone = completed && move ? qtyAfter(s, i.sku, tr!.from, move.id) : centralNow;
  const siteBefore = completed ? siteDone - q : siteNow, siteAfter = completed ? siteDone : siteNow + q;
  const cenBefore = completed ? cenDone + q : centralNow, cenAfter = completed ? cenDone : centralNow - q;
  const max = Math.max(siteBefore, siteAfter, cenBefore, cenAfter, par || 0) * 1.15;
  const others = Object.entries(ps.byLoc).filter(([l]) => l !== "DLM" && l !== i.to);
  const approval = tr ? s.approvals.find(a => a.ref.type === "transfer" && a.ref.id === tr.id) : undefined;
  const tone = completed ? "ok" : awaiting ? "accent" : "warn";

  const reject = () => {
    if (!tr) return;
    if (approval && approval.status === "Awaiting") decideApproval(approval.id, false, "JC");
    else { rejectTransfer(tr.id, "JC"); toast(tr.id + " rejected. No stock moved.", "warn"); }
  };

  return (
    <Card pad={0} tone={focus ? "accent" : tone === "warn" ? undefined : tone}
      style={{ boxShadow: focus ? "0 0 0 1px var(--accent-line), var(--accent-glow, none)" : undefined, animation: "fadeUp .35s var(--ease) both" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(270px,100%),1fr))" }}>
        {/* What and where */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, borderRight: "1px solid var(--border)", minWidth: 0 }}>
          <Row gap={8} wrap>
            <Badge tone={completed ? "ok" : awaiting ? "accent" : "warn"}>{completed ? "Replenished" : awaiting ? "Awaiting approval" : "Below par"}</Badge>
            {focus && <Badge tone="info">From Home alert</Badge>}
          </Row>
          <div>
            <RecLink type="product" id={p.sku} style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", textDecorationColor: "var(--border-strong)" }}>{p.name}</RecLink>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>{p.subtitle ? p.subtitle + " · " : ""}<span style={{ fontFamily: "var(--mono)" }}>{p.sku}</span></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <Icon d={I.hospital} size={14} color="var(--accent)" />
            <RecLink type="location" id={site.id}>{site.name}</RecLink>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
            <Mini k="On hand now" v={siteNow} tone={par !== undefined && siteNow < par ? "warn" : undefined} />
            <Mini k="Minimum (par)" v={par ?? "n/a"} />
            <Mini k={completed ? "Transferred" : "Suggested"} v={completed ? tr!.qty : suggested} />
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.5 }}>
            <span style={{ ...label, fontSize: 9, display: "block", marginBottom: 3 }}>Total {ps.total} units</span>
            Main stockroom {centralNow} · {site.short} {siteNow}{others.map(([l, n]) => " · " + whereName(l) + " " + n).join("")}
          </div>
        </div>

        {/* Before and after */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, borderRight: "1px solid var(--border)", minWidth: 0 }}>
          <div style={{ ...label, fontSize: 9.5 }}>{completed ? "Before and after the transfer" : "If approved"}</div>
          <Gauge name="Main stockroom" before={cenBefore} after={cenAfter} max={max} />
          <Gauge name={site.name} before={siteBefore} after={siteAfter} par={par} max={max} />
          <div style={{ fontSize: 12, color: "var(--dim)", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Icon d={I.layers} size={13} color="var(--faint)" style={{ marginTop: 2 }} />
            <span>Source lot <RecLink type="lot" id={i.sku + "|" + (tr?.lot || src?.lot || "")} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{tr?.lot || src?.lot || "none"}</RecLink>
              {src?.expiry ? " · expires " + date(src.expiry) : ""} · first-expiry-first-out{lo ? " · " + lo.centralAvail + " available centrally" : ""}</span>
          </div>
        </div>

        {/* Decision */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, minWidth: 0, background: completed ? "var(--ok-soft)" : awaiting ? "var(--accent-faint)" : undefined }}>
          {completed && tr ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 26, height: 26, borderRadius: 999, background: "var(--ok)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon d={I.check} size={13} stroke={2.6} /></span>
                <span style={{ fontSize: 14, fontWeight: 600 }}><RecLink type="transfer" id={tr.id} /> completed</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
                {tr.qty} × {tr.sku} moved to {site.short}: {site.short} {siteBefore} → {siteAfter}, main stockroom {cenBefore} → {cenAfter}.{siteNow !== siteAfter || centralNow !== cenAfter ? " Since then: " + site.short + " " + siteNow + ", main stockroom " + centralNow + "." : ""}
              </div>
              <Person id={(approval?.decidedBy as string) || tr.approver} sub={"Approved " + (approval?.decidedAt ? approval.decidedAt.slice(11) + " today" : dd(tr.completed))} />
              {move && (
                <button onClick={() => openRecord("movement", move.id)} className="ixz"
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", color: "inherit" }}>
                  <span style={{ ...label, fontSize: 9 }}>New movement</span>
                  <span style={{ display: "block", fontSize: 12.5, marginTop: 4 }}><span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{move.id}</span> · Transfer · {move.qty} × {move.sku}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>Lot {move.lot} · {whereName(move.from)} → {whereName(move.to)} · {move.time}</span>
                </button>
              )}
              <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Home alert closed. Every screen now shows the new quantities.</div>
            </>
          ) : awaiting && tr ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600 }}><RecLink type="transfer" id={tr.id} /> raised · {tr.qty} units</div>
              <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>Requested by {D.staffById(tr.proposedBy)?.name || "Graham Hogan"}. Waiting for approval. Stock has not moved.</div>
              <Person id="JC" sub="Approver · Operations Director" />
              <Row gap={8} wrap>
                <Btn kind="primary" icon={I.check} onClick={() => approveTransfer(tr.id, "JC")}>Approve as John Culkin</Btn>
                <Btn kind="danger" icon={I.x} onClick={reject}>Reject</Btn>
              </Row>
              <div style={{ fontSize: 11.5, color: "var(--faint)" }}>Approving moves {tr.qty} from the main stockroom to {site.short} and writes a traceable movement. {approval ? "Approval " + approval.id + " is also in Work · Approvals." : ""}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Top up {site.short}</div>
              {rejected && tr && <div style={{ fontSize: 12, color: "var(--bad)" }}><RecLink type="transfer" id={tr.id} /> was rejected. No stock moved. You can raise a new request.</div>}
              <Row gap={12} wrap>
                <span style={{ ...label, fontSize: 9 }}>Units</span>
                <Stepper value={qty} onChange={setQty} min={1} max={Math.max(1, lo?.centralAvail ?? 1)} />
              </Row>
              <Btn kind="primary" icon={I.route} disabled={!lo || lo.centralAvail < 1} onClick={() => proposeTransfer({ sku: i.sku, to: i.to, qty, by: "GH" })}>Create transfer</Btn>
              <div style={{ fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5 }}>Raises a request for John Culkin as Graham Hogan. Stock does not move until he approves.</div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function Mini({ k, v, tone }: { k: string; v: number | string; tone?: "warn" }) {
  return (
    <div style={{ padding: "8px 10px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <div style={{ ...label, fontSize: 8.5, lineHeight: 1.3 }}>{k}</div>
      <div style={{ fontSize: 17, fontWeight: 600, marginTop: 3, color: tone ? "var(--warn)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{v}</div>
    </div>
  );
}
