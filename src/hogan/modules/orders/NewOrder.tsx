/* Orders · New Order: a basic order in four steps on one screen.
   1 find the customer, 2 add products by search or scan, 3 check stock and
   lot (FEFO), 4 confirm. The draft lives in UI state so it survives tab hops. */

import { useState, type ReactNode } from "react";
import * as D from "../../data";
import { TODAY, addDays, date, dayDate, eur, plural, weekday } from "../../fmt";
import type { Gs1 } from "../../gs1";
import { buildGs1 } from "../../gs1";
import { ScanPanel } from "../../scan";
import { createOrder, fefoLot, nav, openRecord, orderById, patch, productStock, useHogan, useUi, type HState } from "../../store";
import { Avatar, Badge, Btn, Card, Empty, I, Icon, KV, Notice, Page, PageHeader, RecLink, Row, SearchBox, Seg, Steps, TextInput, label, match, type Tone } from "../../ui";
import { MiniStat, Stack, Stepper, Two } from "./kit";
import { incoming, orderMargin } from "./common";

type DLine = { sku: string; qty: number; lot?: string };
type Draft = { account: string; lines: DLine[]; poRef: string; required: string };
const KEY = "orders.draft";
const EMPTY: Draft = { account: "", lines: [], poRef: "", required: "" };

function upd(fn: (d: Draft) => Draft) {
  patch(s => ({ ui: { ...s.ui, [KEY]: fn((s.ui[KEY] as Draft | undefined) || EMPTY) } }));
}
function addLine(sku: string, lot?: string) {
  upd(d => {
    const ex = d.lines.find(l => l.sku === sku);
    return ex ? { ...d, lines: d.lines.map(l => (l.sku === sku ? { ...l, qty: l.qty + 1, lot: lot || l.lot } : l)) } : { ...d, lines: [...d.lines, { sku, qty: 1, lot }] };
  });
}

function workingDays(n: number): string[] {
  const out: string[] = [];
  let d = TODAY;
  while (out.length < n) {
    const w = weekday(d);
    if (w !== "Sat" && w !== "Sun") out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

type LineCheck = { tone: Tone; label: string; note: string; available: number; lot?: D.StockLine; short: number };
function checkLine(l: DLine, s: HState, acc?: D.Account): LineCheck {
  const p = D.productBySku(l.sku)!;
  const available = productStock(l.sku, s).available;
  const lot = l.lot ? s.stock.find(x => x.sku === l.sku && x.lot === l.lot && x.loc === "DLM" && x.qty > 0) : fefoLot(l.sku, s);
  const site = acc?.locId ? s.stock.filter(x => x.sku === l.sku && x.loc === acc.locId).reduce((a, x) => a + x.qty, 0) : 0;
  const siteNote = site ? " Also " + site + " on consignment at " + (D.locById(acc!.locId!)?.short || "") + "." : "";
  if (l.qty > available) {
    const inc = incoming(l.sku, s)[0];
    return { tone: "bad", label: available ? "Short by " + (l.qty - available) : "Out of stock", available, lot, short: l.qty - available,
      note: (available ? "Only " + available + " free in the main stockroom." : "None free in the main stockroom.") + (inc ? " " + inc.qty + " due on " + inc.po.id + ", " + date(inc.po.expected, false) + "." : " Nothing on order yet.") + siteNote };
  }
  if (p.tracking === "serial") {
    const n = s.stock.filter(x => x.sku === l.sku && x.loc === "DLM" && x.qty > 0 && x.serial).length;
    return { tone: "info", label: "Serial at picking", note: n + " serialised units on the shelf. The serial is captured when Sharon scans it." + siteNote, available, lot, short: 0 };
  }
  if (lot?.expiry && lot.expiry < addDays(TODAY, 180)) return { tone: "warn", label: "Short-dated lot", note: "FEFO lot " + lot.lot + " expires " + date(lot.expiry) + ". Check the customer accepts it." + siteNote, available, lot, short: 0 };
  return { tone: "ok", label: l.lot ? "Scanned lot" : "In stock", note: (l.lot ? "Lot " : "FEFO lot ") + (lot?.lot || "to allocate") + (lot?.expiry ? ", expires " + date(lot.expiry) : "") + "." + siteNote, available, lot, short: 0 };
}

function StepTitle({ n, done, children }: { n: number; done?: boolean; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 650,
        background: done ? "var(--accent)" : "var(--accent-soft)", color: done ? "var(--on-accent)" : "var(--accent)" }}>
        {done ? <Icon d={I.check} size={12} stroke={2.6} /> : n}
      </span>
      {children}
    </span>
  );
}

export default function NewOrder() {
  const s = useHogan();
  const [d] = useUi<Draft>(KEY, EMPTY);
  const [done, setDone] = useUi<string>("orders.lastCreated", "");
  const [aq, setAq] = useState("");
  const [pq, setPq] = useState("");
  const days = workingDays(4);
  const required = d.required || days[1];
  const acc = d.account ? D.accountById(d.account) : undefined;

  /* Step 1: customers. Recent first when nothing is typed. */
  const accounts = aq ? D.ACCOUNTS.filter(a => match(aq, a.name, a.region, a.type, a.id)).slice(0, 7)
    : D.ACCOUNTS.slice().sort((a, b) => (a.lastOrder < b.lastOrder ? 1 : -1)).slice(0, 7);

  /* Step 2: products. This customer's usual lines when nothing is typed. */
  const freq: Record<string, number> = {};
  s.orders.filter(o => !acc || o.account === acc.id).forEach(o => o.lines.forEach(l => { freq[l.sku] = (freq[l.sku] || 0) + 1; }));
  const usual = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).filter(sku => !d.lines.some(l => l.sku === sku)).slice(0, 6);
  const products = pq ? D.PRODUCTS.filter(p => match(pq, p.sku, p.name, D.catById(p.cat)?.short)).slice(0, 8) : usual.map(sku => D.productBySku(sku)!).filter(Boolean);

  const checks = d.lines.map(l => ({ l, c: checkLine(l, s, acc) }));
  const shortN = checks.filter(x => x.c.short > 0).length;
  const priced = d.lines.map(l => ({ ...l, price: D.productBySku(l.sku)?.unitPrice || 0 }));
  const m = orderMargin({ lines: priced });
  const units = d.lines.reduce((a, l) => a + l.qty, 0);
  const ready = !!acc && d.lines.length > 0 && shortN === 0;

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const steps = [
    { label: "Customer", done: !!acc, active: !acc },
    { label: "Products", done: d.lines.length > 0, active: !!acc && !d.lines.length },
    { label: "Stock and lot", done: d.lines.length > 0 && shortN === 0, active: d.lines.length > 0 && shortN > 0 },
    { label: "Confirm", done: false, active: ready },
  ];

  const onScan = (g: Gs1): string | void => {
    const p = D.productBySku(g.sku || "");
    if (!p) return "Unknown product code.";
    if (g.expiry && g.expiry < TODAY) return "Expired lot " + (g.lot || "") + " (" + date(g.expiry) + "): not added.";
    let lot: string | undefined;
    if (g.lot && p.tracking === "lot") {
      const held = s.stock.find(x => x.sku === p.sku && x.lot === g.lot && x.loc === "DLM");
      if (held?.status === "Quarantine") return "Lot " + g.lot + " is quarantined: not added.";
      if (held && held.qty > 0) lot = g.lot;
    }
    addLine(p.sku, lot);
  };
  const simulate = () => {
    const sku = usual[0] || ["HH-AC-301", "HH-SM-111", "HH-AR-001"].find(x => !d.lines.some(l => l.sku === x)) || "HH-AC-302";
    const p = D.productBySku(sku)!;
    const f = fefoLot(sku);
    return buildGs1({ gtin: p.gtin, expiry: f?.expiry, lot: f?.lot, serial: f?.serial });
  };

  const confirm = () => {
    if (!acc) return;
    const id = createOrder({ account: acc.id, required, poRef: d.poRef.trim() || undefined, by: "SO",
      lines: d.lines.map(l => ({ sku: l.sku, qty: l.qty, lot: D.productBySku(l.sku)?.tracking === "lot" ? l.lot || fefoLot(l.sku)?.lot : undefined })) });
    setDone(id);
    upd(() => EMPTY);
    setAq(""); setPq("");
  };
  const created = done ? orderById(done, s) : undefined;

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Orders" title="New order"
          sub="Customer, products, stock and lot check, confirm. One screen, and the stock check happens while you type, not after."
          right={<Badge tone="accent" style={{ height: 26, padding: "0 12px", fontSize: 12 }}>4 steps · 1 screen</Badge>} />

        <Row gap={12} wrap justify="space-between">
          <Steps steps={steps} onPick={i => go(["no-step1", "no-step2", "no-step3", "no-step4"][i])} />
          <span style={{ fontSize: 12, color: "var(--dim)" }}>A basic order takes five or six steps in the current ERP. Pulse sits on top of it; it does not replace it.</span>
        </Row>

        <div className="hk-split">
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            {/* 1 · Customer */}
            <Card id="no-step1" title={<StepTitle n={1} done={!!acc}>Find the hospital or customer</StepTitle>}
              right={acc ? <Btn size="sm" kind="ghost" onClick={() => { upd(x => ({ ...x, account: "" })); setAq(""); }}>Change</Btn> : undefined}>
              {!acc ? (
                <>
                  <SearchBox value={aq} onChange={setAq} placeholder="Search 20 accounts by name, county or type" autoFocus style={{ width: "100%" }} />
                  <div style={{ ...label, fontSize: 9, margin: "12px 2px 4px" }}>{aq ? accounts.length + " matches" : "Recent customers"}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(250px,100%),1fr))", gap: 6 }}>
                    {accounts.map(a => (
                      <button key={a.id} className="ixa" onClick={() => { upd(x => ({ ...x, account: a.id })); setDone(""); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", textAlign: "left", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,11px)", cursor: "pointer", color: "var(--ink)", minWidth: 0 }}>
                        <Avatar id={a.owner} size={24} />
                        <Two a={a.name} b={a.type + " · " + a.region + (a.consignment ? " · consignment" : "")} />
                      </button>
                    ))}
                    {!accounts.length && <span style={{ fontSize: 12.5, color: "var(--dim)", padding: 6 }}>No account matches "{aq}".</span>}
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon d={I.hospital} size={18} /></span>
                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}><RecLink type="account" id={acc.id} style={{ color: "var(--ink)" }}>{acc.name}</RecLink></div>
                      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{acc.type} · {acc.region} · terms {acc.terms} · last order {date(acc.lastOrder, false)}{acc.consignment ? " · consignment at " + (D.locById(acc.locId || "")?.short || "") : ""}</div>
                    </div>
                    <Badge>{acc.contacts[0]?.name}, {acc.contacts[0]?.role}</Badge>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: 12 }}>
                    <div>
                      <div style={{ ...label, fontSize: 9, marginBottom: 6 }}>Hospital PO reference</div>
                      <TextInput value={d.poRef} onChange={v => upd(x => ({ ...x, poRef: v }))} placeholder="Optional, e.g. HPO-80310" style={{ width: "100%" }} />
                    </div>
                    <div>
                      <div style={{ ...label, fontSize: 9, marginBottom: 6 }}>Required by</div>
                      <Seg size="sm" value={required} onChange={v => upd(x => ({ ...x, required: v }))}
                        items={days.map((x, i) => [x, i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayDate(x)] as [string, string])} />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* 2 · Products */}
            <Card id="no-step2" title={<StepTitle n={2} done={d.lines.length > 0}>Add products by search or scan</StepTitle>}
              sub={acc ? "Showing " + acc.name + "'s usual lines until you search." : "Showing popular lines across all customers until you search."}>
              <div className="hk-two">
                <div style={{ minWidth: 0 }}>
                  <SearchBox value={pq} onChange={setPq} placeholder="SKU or product name" style={{ width: "100%" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
                    {products.map(p => {
                      const av = productStock(p.sku, s).available;
                      const inDraft = d.lines.find(l => l.sku === p.sku);
                      return (
                        <div key={p.sku} className="ix11" onClick={() => addLine(p.sku)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: "var(--r-sm,10px)", cursor: "pointer", minWidth: 0 }}>
                          <Two a={<><span style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontSize: 12 }}>{p.sku}</span> {p.name}</>} b={eur(p.unitPrice) + " · " + (av ? av + " free" : "none free") + (p.tracking === "serial" ? " · serialised" : "")} />
                          <span style={{ marginLeft: "auto", flex: "none" }}>
                            {inDraft ? <Badge tone="accent">× {inDraft.qty}</Badge> : <Badge tone={av ? "ok" : "bad"}>{av ? "Add" : "Out"}</Badge>}
                          </span>
                        </div>
                      );
                    })}
                    {!products.length && <span style={{ fontSize: 12.5, color: "var(--dim)", padding: 8 }}>{pq ? "No product matches." : "Search, or scan a label."}</span>}
                  </div>
                </div>
                <ScanPanel key={"scan-" + done} compact onScan={onScan} simulate={simulate} placeholder="Scan a GS1 label or type an HH- code"
                  hint="A scanned lot is kept on the line. Expired or quarantined lots are refused." />
              </div>
            </Card>

            {/* 3 · Stock and lot */}
            <Card id="no-step3" flush title={<StepTitle n={3} done={d.lines.length > 0 && shortN === 0}>Validate stock and lot</StepTitle>}
              sub={d.lines.length ? plural(d.lines.length, "line") + " checked against free main-stockroom stock and the FEFO lot" + (shortN ? ". " + plural(shortN, "line") + " short." : ". All available.") : undefined}>
              {!d.lines.length ? <Empty title="No products yet" sub="Add products in step 2. Each one is checked against free stock, the first-expiry lot and open purchase orders." icon={I.box} />
                : checks.map(({ l, c }) => {
                  const p = D.productBySku(l.sku)!;
                  return (
                    <div key={l.sku} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                        <Two a={<><RecLink type="product" id={p.sku} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{p.sku}</RecLink> {p.name}</>} b={eur(p.unitPrice) + " each · " + c.available + " free"} />
                      </div>
                      <Stepper value={l.qty} min={1} onChange={v => upd(x => ({ ...x, lines: x.lines.map(y => (y.sku === l.sku ? { ...y, qty: v } : y)) }))} />
                      <div style={{ flex: "2 1 240px", minWidth: 0, display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <Badge tone={c.tone}>{c.label}</Badge>
                        <span style={{ fontSize: 11.5, color: c.tone === "bad" ? "var(--bad)" : "var(--dim)", lineHeight: 1.45 }}>{c.note}</span>
                      </div>
                      <Row gap={4}>
                        {c.short > 0 && c.available > 0 && <Btn size="sm" kind="secondary" onClick={() => upd(x => ({ ...x, lines: x.lines.map(y => (y.sku === l.sku ? { ...y, qty: c.available } : y)) }))}>Use {c.available}</Btn>}
                        <Btn size="sm" kind="ghost" icon={I.x} title="Remove line" onClick={() => upd(x => ({ ...x, lines: x.lines.filter(y => y.sku !== l.sku) }))} />
                      </Row>
                    </div>
                  );
                })}
            </Card>
          </div>

          {/* 4 · Confirm */}
          <div className="hk-sticky" id="no-step4" style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            {created && !d.account && !d.lines.length ? (
              <Card tone="ok" title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon d={I.check} size={16} color="var(--ok)" />{created.id} confirmed</span>}
                sub={D.accountById(created.account)?.name + " · " + plural(created.lines.length, "line") + " · " + eur(D.orderValue(created))}>
                <KV cols={2} items={[["Status", created.status], ["Required", date(created.required, false)], ["Hospital PO", created.poRef], ["Pick task", "Sharon O'Mongain"]]} />
                <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5, marginTop: 12 }}>Stock is reserved and the order is in Sharon's pick queue. Lots were allocated first-expiry-first, or as scanned.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                  <Btn kind="primary" icon={I.scan} full onClick={() => nav("Orders", "picking", { "orders.pick": created.id })}>Pick and scan {created.id}</Btn>
                  <Row gap={8}>
                    <Btn kind="secondary" style={{ flex: 1 }} onClick={() => openRecord("order", created.id)}>Open order</Btn>
                    <Btn kind="secondary" style={{ flex: 1 }} icon={I.plus} onClick={() => setDone("")}>Another order</Btn>
                  </Row>
                </div>
              </Card>
            ) : (
              <Card title={<StepTitle n={4}>Confirm</StepTitle>} sub={acc ? acc.name : "No customer yet"}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {priced.map(l => (
                    <div key={l.sku} style={{ display: "flex", gap: 8, fontSize: 12.5, alignItems: "baseline" }}>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--dim)", fontSize: 11.5, flex: "none" }}>{l.sku}</span>
                      <span style={{ flex: 1, minWidth: 0, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>× {l.qty}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{eur(l.qty * l.price)}</span>
                    </div>
                  ))}
                  {!priced.length && <span style={{ fontSize: 12.5, color: "var(--faint)" }}>Lines appear here as you add them.</span>}
                </div>
                <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
                  <MiniStat k="Units" v={units} />
                  <MiniStat k="Value ex VAT" v={eur(m.value)} />
                  <MiniStat k="Est. margin" v={m.value ? m.pct.toFixed(1) + "%" : "n/a"} tone={m.value && m.pct < 30 ? "warn" : undefined} />
                </div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>
                  {acc ? <>Required {required === TODAY ? "today" : dayDate(required)}{d.poRef ? " · PO " + d.poRef : " · hospital PO to follow"}</> : "Choose a customer to start."}
                </div>
                {shortN > 0 && <Notice tone="bad" style={{ marginTop: 12 }}>{plural(shortN, "line")} short. Reduce the quantity or remove the line before confirming.</Notice>}
                <Btn kind="primary" size="lg" full icon={I.check} disabled={!ready} onClick={confirm} style={{ marginTop: 14 }}>
                  {ready ? "Confirm order · " + eur(m.value) : !acc ? "Choose a customer" : !d.lines.length ? "Add products" : "Fix short lines"}
                </Btn>
                <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 9, lineHeight: 1.5 }}>Confirming reserves the stock and puts a pick task on Sharon's list.</div>
                {(acc || d.lines.length > 0) && <Btn kind="ghost" size="sm" onClick={() => { upd(() => EMPTY); setAq(""); setPq(""); }} style={{ marginTop: 6 }}>Clear draft</Btn>}
              </Card>
            )}
            <Notice tone="info" title="ERP write-back not connected">Orders confirmed here stay in Pulse for the demo. Sending them to the ERP needs an integration that is not yet verified.</Notice>
            <div style={{ padding: "0 4px", fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5 }}>Prices are the demo list prices for each SKU. VAT is added on the invoice.</div>
          </div>
        </div>
      </Stack>
    </Page>
  );
}
