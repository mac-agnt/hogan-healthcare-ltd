/* Orders · Overview: Sharon's order desk. Every count and value is derived
   from live demo state, so it moves as orders are scanned and dispatched. */

import { useState } from "react";
import * as D from "../../data";
import { TODAY, addDays, date, eur, eurK, plural } from "../../fmt";
import { nav, openOrders, openRecord, orderProgress, useHogan, useUi } from "../../store";
import { Avatar, Badge, Btn, Card, Chip, I, Icon, Kpi, Page, PageHeader, Progress, RecLink, Row, SearchBox, Status, TONE, Table, match, type Col, type Tone } from "../../ui";
import { FlowStrip, ListRow, MiniStat, NarrowLine, Stack, Two } from "./kit";
import { CUTOFF, FLOW, accName, createdOf, daysLate, poRefOf, prodName, requiredLabel, shipped, shortLines } from "./common";

type Act = { key: string; tone: Tone; title: string; sub: string; cta: string; go: () => void };
const RANK: Record<string, number> = { bad: 0, warn: 1, info: 2, accent: 3, neutral: 4, ok: 5 };

export default function Overview() {
  const s = useHogan();
  const [filter, setFilter] = useUi<string>("orders.filter", "");
  const [q, setQ] = useState("");

  const open = openOrders(s);
  const of = (st: D.OrderStatus) => open.filter(o => o.status === st);
  const sum = (list: D.SalesOrder[]) => list.reduce((a, o) => a + D.orderValue(o), 0);
  const openValue = sum(open);
  const waiting = open.filter(o => !shipped(o));
  const dueToday = waiting.filter(o => o.required === TODAY);
  const late = waiting.filter(o => daysLate(o) > 0);
  const oldest = late.reduce((m, o) => Math.max(m, daysLate(o)), 0);
  const sentToday = s.orders.filter(o => o.dispatched === TODAY);

  const stages = ([...FLOW, "Issue"] as D.OrderStatus[]).map(st => ({
    key: st, label: st, count: of(st).length, sub: eurK(sum(of(st))), tone: st === "Issue" ? ("bad" as Tone) : undefined,
  }));

  /* What needs a person today, most urgent first. */
  const acts: Act[] = [];
  of("Issue").forEach(o => acts.push({ key: o.id, tone: "bad", title: o.id + " on hold", sub: accName(o.account) + " · " + (o.issue || "Issue raised"), cta: "Resolve", go: () => openRecord("order", o.id) }));
  of("Picking").filter(o => o.required === TODAY).forEach(o => {
    const p = orderProgress(o);
    acts.push({ key: o.id, tone: o.courier ? "bad" : "warn", title: o.id + ": " + plural(p.total - p.scanned, "line") + " still to scan", sub: accName(o.account) + " · due today" + (o.courier ? " · " + o.courier + ", cut-off " + CUTOFF : ""), cta: "Scan", go: () => nav("Orders", "picking", { "orders.pick": o.id }) });
  });
  const latePicks = of("Picking").filter(o => o.required < TODAY);
  if (latePicks.length) acts.push({ key: "latepick", tone: "warn", title: plural(latePicks.length, "pick") + " past the required date", sub: latePicks.map(o => o.id).join(", "), cta: "Pick queue", go: () => nav("Orders", "picking", { "orders.pick": latePicks[0].id }) });
  const idle = of("Confirmed").filter(o => o.required <= TODAY);
  if (idle.length) acts.push({ key: "idle", tone: "warn", title: plural(idle.length, "confirmed order") + " due, not started", sub: idle.map(o => o.id + " (" + requiredLabel(o).toLowerCase() + ")").join(", "), cta: "Start", go: () => nav("Orders", "picking", { "orders.pick": idle[0].id }) });
  open.forEach(o => shortLines(o, s).forEach(l => acts.push({ key: o.id + l.sku, tone: "bad", title: l.sku + " short for " + o.id, sub: prodName(l.sku) + " · reserved beyond free stock", cta: "Open", go: () => openRecord("order", o.id) })));
  if (of("Packed").length) acts.push({ key: "packed", tone: "warn", title: plural(of("Packed").length, "packed order") + " with no courier booked", sub: of("Packed").map(o => o.id).join(", "), cta: "Book", go: () => nav("Orders", "dispatch") });
  if (of("Awaiting courier").length) acts.push({ key: "collect", tone: "info", title: plural(of("Awaiting courier").length, "order") + " waiting for collection", sub: of("Awaiting courier").map(o => o.id).join(", "), cta: "Board", go: () => nav("Orders", "dispatch") });
  const noPod = of("Dispatched").filter(o => o.dispatched && o.dispatched <= addDays(TODAY, -3)).sort((a, b) => ((a.dispatched || "") < (b.dispatched || "") ? -1 : 1));
  if (noPod.length) acts.push({ key: "pod", tone: "info", title: plural(noPod.length, "dispatched order") + " with no proof of delivery", sub: "Oldest " + noPod[0].id + ", sent " + date(noPod[0].dispatched || TODAY, false) + ". Courier tracking not connected.", cta: "Confirm", go: () => nav("Orders", "dispatch") });
  acts.sort((a, b) => RANK[a.tone] - RANK[b.tone]);

  /* Today's run: everything that should leave on today's courier. */
  const run = open.filter(o => o.status === "Awaiting courier" || o.status === "Packed" || (o.status === "Picking" && o.required <= TODAY))
    .sort((a, b) => ["Awaiting courier", "Packed", "Picking"].indexOf(a.status) - ["Awaiting courier", "Packed", "Picking"].indexOf(b.status) || (a.id < b.id ? -1 : 1));

  const rows = open.filter(o => (!filter || o.status === filter) && match(q, o.id, accName(o.account), o.poRef, o.courier, ...o.lines.map(l => l.sku)));
  const cols: Col<D.SalesOrder>[] = [
    { key: "id", label: "Order", w: "88px", sort: o => o.id, render: o => <span style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontSize: 12.5 }}>{o.id}</span> },
    { key: "acc", label: "Customer", w: "minmax(190px,1.7fr)", sort: o => accName(o.account), render: o => <Two a={accName(o.account)} b={(D.accountById(o.account)?.region || "") + " · " + poRefOf(o)} /> },
    { key: "status", label: "Status", w: "132px", sort: o => (o.status === "Issue" ? 9 : FLOW.indexOf(o.status)), render: o => <Status s={o.status} /> },
    { key: "scan", label: "Scanned", w: "112px", sort: o => orderProgress(o).scanned / Math.max(1, o.lines.length), render: o => {
      const p = orderProgress(o);
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Progress value={p.scanned} max={p.total} tone={p.scanned === p.total ? "ok" : "warn"} h={5} style={{ flex: 1 }} />
          <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "var(--dim)" }}>{p.scanned}/{p.total}</span>
        </div>
      );
    } },
    { key: "value", label: "Value", w: "92px", align: "right", sort: o => D.orderValue(o), render: o => <span style={{ color: "var(--ink)" }}>{eur(D.orderValue(o))}</span> },
    { key: "created", label: "Created", w: "78px", sort: o => createdOf(o), render: o => date(createdOf(o), false) },
    { key: "req", label: "Required", w: "128px", sort: o => (shipped(o) ? "9" : "") + o.required, render: o => (
      shipped(o) ? <span style={{ color: "var(--dim)" }}>Sent {date(o.dispatched || o.required, false)}</span>
        : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{requiredLabel(o)}{daysLate(o) > 0 && <Badge tone="bad" style={{ height: 19, padding: "0 7px", fontSize: 10.5 }}>{daysLate(o)}d late</Badge>}</span>
    ) },
    { key: "courier", label: "Courier", w: "minmax(120px,1fr)", sort: o => o.courier || "", render: o => (o.courier ? <Two a={o.courier} b={o.tracking || (o.status === "Awaiting courier" ? "Awaiting collection" : undefined)} /> : <span style={{ color: "var(--faint)" }}>Not booked</span>) },
    { key: "owner", label: "Owner", w: "68px", align: "center", render: o => <Avatar id={o.owner} size={22} /> },
  ];

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Orders" title="Order desk"
          sub={"Sharon O'Mongain, Sales Administration. " + open.length + " open orders worth " + eur(openValue) + ": what each one is waiting for, and what leaves today."}
          right={<>
            <Btn kind="secondary" icon={I.scan} onClick={() => nav("Orders", "picking")}>Pick queue · {of("Picking").length}</Btn>
            <Btn kind="primary" icon={I.plus} onClick={() => nav("Orders", "new")}>New order</Btn>
          </>} />

        <FlowStrip stages={stages} active={filter} onPick={k => { setFilter(k); document.getElementById("orders-open")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />

        <div className="hk-kpis">
          <Kpi label="Open order value" value={eur(openValue)} sub={open.length + " open orders"} demo />
          <Kpi label="Due today" value={dueToday.length} sub={dueToday.length ? dueToday.map(o => o.id).join(", ") : "Nothing else due today"} tone={dueToday.length ? "warn" : undefined} onClick={() => dueToday[0] && nav("Orders", "picking", { "orders.pick": dueToday[0].id })} />
          <Kpi label="Past required date" value={late.length} sub={late.length ? "Oldest " + plural(oldest, "day") + " over" : "All on time"} tone={late.length ? "bad" : "ok"} onClick={() => { setFilter(""); setQ(""); document.getElementById("orders-open")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
          <Kpi label="Dispatched today" value={sentToday.length} sub={sentToday.length ? sentToday.map(o => o.id).join(", ") : "Courier cut-off " + CUTOFF} tone={sentToday.length ? "ok" : undefined} onClick={() => nav("Orders", "dispatch")} />
        </div>

        <div className="hk-three">
          <Card title="Needs action" sub={acts.length ? plural(acts.length, "item") + ", most urgent first" : "Nothing waiting on the desk"} flush bodyStyle={{ padding: "0 8px 10px" }}>
            <div className="hk-scroll" style={{ maxHeight: 330 }}>
              {acts.map(a => (
                <ListRow key={a.key} onClick={a.go} right={<Btn size="sm" kind={a.tone === "bad" ? "primary" : "secondary"} onClick={a.go}>{a.cta}</Btn>}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <Icon d={a.tone === "bad" ? I.alert : a.tone === "warn" ? I.clock : I.info} size={14} color={TONE[a.tone].fg} />
                    <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.45, paddingLeft: 21 }}>{a.sub}</div>
                </ListRow>
              ))}
            </div>
          </Card>

          <Card title="Today's dispatch run" sub={plural(run.length, "order") + " · " + eur(sum(run)) + " · courier cut-off " + CUTOFF} flush bodyStyle={{ padding: "0 8px 10px" }}
            right={<Btn size="sm" kind="ghost" icon={I.truck} onClick={() => nav("Orders", "dispatch")}>Board</Btn>}>
            <div className="hk-scroll" style={{ maxHeight: 268 }}>
              {run.map(o => {
                const p = orderProgress(o);
                return (
                  <ListRow key={o.id} onClick={() => openRecord("order", o.id)} right={o.status === "Picking"
                    ? <Btn size="sm" kind="accent" icon={I.scan} onClick={() => nav("Orders", "picking", { "orders.pick": o.id })}>{p.scanned}/{p.total}</Btn>
                    : <Status s={o.status} />}>
                    <Two a={<><span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>{o.id}</span> · {accName(o.account)}</>} b={plural(o.lines.length, "line") + " · " + eur(D.orderValue(o)) + (o.courier ? " · " + o.courier : "")} />
                  </ListRow>
                );
              })}
            </div>
            <div style={{ margin: "6px 10px 0", paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--dim)", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span>Dispatched today:</span>
              {sentToday.length ? sentToday.map(o => <RecLink key={o.id} type="order" id={o.id} />) : <span style={{ color: "var(--faint)" }}>none yet</span>}
            </div>
          </Card>

          <Card title="Handling time per order" sub="Admin minutes per order in the current process. Illustrative baseline, not measured by Pulse." right={<Badge>Illustrative</Badge>}>
            <NarrowLine labels={D.WEEKS} series={[{ name: "Minutes per order", values: D.OPS_TRENDS.handlingMins, color: "var(--accent)" }]} height={150} fmt={n => n + " min"} markLast />
            <Row gap={18} wrap style={{ marginTop: 12 }}>
              <MiniStat k="Latest week" v={D.OPS_TRENDS.handlingMins[D.OPS_TRENDS.handlingMins.length - 1] + " min"} />
              <MiniStat k="12-week average" v={(D.OPS_TRENDS.handlingMins.reduce((a, b) => a + b, 0) / D.OPS_TRENDS.handlingMins.length).toFixed(1) + " min"} />
              <MiniStat k="Manual fixes, last week" v={D.OPS_TRENDS.manualCorrections[D.OPS_TRENDS.manualCorrections.length - 1]} />
            </Row>
          </Card>
        </div>

        <div id="orders-open" style={{ scrollMarginTop: 12 }}>
          <Card title="Open orders" sub={rows.length === open.length ? "All " + open.length + " open orders" : rows.length + " of " + open.length + " open orders"} flush
            right={<SearchBox value={q} onChange={setQ} placeholder="Order, customer, SKU, PO" style={{ minWidth: 0, width: 230 }} />}>
            <Row gap={6} wrap style={{ padding: "0 18px 12px" }}>
              <Chip active={!filter} onClick={() => setFilter("")} count={open.length}>All</Chip>
              {([...FLOW, "Issue"] as D.OrderStatus[]).map(st => <Chip key={st} active={filter === st} onClick={() => setFilter(filter === st ? "" : st)} count={of(st).length}>{st}</Chip>)}
            </Row>
            <Table cols={cols} rows={rows} rowKey={o => o.id} onRow={o => openRecord("order", o.id)} minWidth={1000} dense initialSort={{ key: "req", dir: 1 }}
              highlight={o => o.id === "SO-1047" && !shipped(o)}
              footer="Fictional demo orders. The overnight ERP import shown in Activity is illustrative: that connection is not yet verified." />
          </Card>
        </div>
      </Stack>
    </Page>
  );
}
