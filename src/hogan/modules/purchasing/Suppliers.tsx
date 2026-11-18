/* Purchasing · Suppliers: the agencies Hogan distributes for, with the three
   key global partners up top. Real brand names are marked; every figure is
   fictional demo data. */

import * as D from "../../data";
import { eur, eurK, plural } from "../../fmt";
import { Donut, HBars, Legend } from "../../charts";
import { nav, openRecord, reorderRecs, useHogan } from "../../store";
import { Badge, Btn, Card, I, Notice, Page, PageHeader, Progress, Row, Table, type Col } from "../../ui";
import { MiniStat, Stack, Two } from "../orders/kit";
import { openBills, poLateDays, poOpen, poOutstandingValue } from "./common";

export function RealBadge({ x }: { x: D.Supplier }) {
  return x.fictional ? <Badge>Fictional</Badge> : <Badge tone="accent" title={x.note}>Real name</Badge>;
}

export default function Suppliers() {
  const s = useHogan();
  const all = D.SUPPLIERS.slice().sort((a, b) => b.ytdSpend - a.ytdSpend);
  const key = all.filter(x => x.tier === "Key global partner");
  const agencies = all.filter(x => x.tier === "Agency");
  const total = all.reduce((a, x) => a + x.ytdSpend, 0);
  const keySpend = key.reduce((a, x) => a + x.ytdSpend, 0);
  const real = all.filter(x => !x.fictional);
  const recs = reorderRecs(s);
  const openPos = (id: string) => s.pos.filter(p => p.supplier === id && poOpen(p));

  const cols: Col<D.Supplier>[] = [
    { key: "name", label: "Supplier", w: "minmax(190px,1.6fr)", sort: x => x.name, render: x => <Two a={x.name} b={x.country + " · " + x.agreement} /> },
    { key: "real", label: "Name", w: "100px", sort: x => (x.fictional ? 1 : 0), render: x => <RealBadge x={x} /> },
    { key: "cat", label: "Categories", w: "minmax(170px,1.4fr)", render: x => <span style={{ fontSize: 12, color: "var(--dim)" }}>{x.categories}</span> },
    { key: "lead", label: "Lead time", w: "84px", align: "right", sort: x => x.leadDays, render: x => x.leadDays + " days" },
    { key: "ot", label: "On time", w: "118px", sort: x => x.onTime, render: x => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Progress value={x.onTime} max={100} h={5} tone={x.onTime >= 93 ? "ok" : x.onTime >= 89 ? "warn" : "bad"} style={{ flex: 1 }} />
        <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{x.onTime}%</span>
      </div>
    ) },
    { key: "spend", label: "YTD spend", w: "112px", align: "right", sort: x => x.ytdSpend, render: x => <span style={{ color: "var(--ink)" }}>{eur(x.ytdSpend)}</span> },
    { key: "pos", label: "Open POs", w: "86px", align: "right", sort: x => openPos(x.id).length, render: x => { const o = openPos(x.id); return o.length ? <span>{o.length}{o.some(p => poLateDays(p) > 0) && <span style={{ color: "var(--bad)" }}> · late</span>}</span> : <span style={{ color: "var(--faint)" }}>0</span>; } },
    { key: "bills", label: "Open bills", w: "92px", align: "right", sort: x => openBills(x.id, s).reduce((a, b) => a + b.amount, 0), render: x => { const b = openBills(x.id, s); return b.length ? eur(b.reduce((a, y) => a + y.amount, 0)) : <span style={{ color: "var(--faint)" }}>None</span>; } },
  ];

  return (
    <Page>
      <Stack>
        <PageHeader eyebrow="Purchasing" title="Suppliers"
          sub={all.length + " supplier agencies, " + key.length + " of them key global partners: " + key.map(x => x.name).join(", ") + ". " + Math.round((keySpend / total) * 100) + "% of spend this year goes to those " + key.length + "."} />

        <Notice tone="info" title="Which names are real">
          {real.map(x => x.name.split(" ")[0]).join(", ").replace(/, ([^,]*)$/, " and $1")} are real names; every order, price, stock and spend figure shown for them is fictional. The other {all.length - real.length} supplier names are invented for the demo.
        </Notice>

        <div className="hk-three">
          {key.map(x => {
            const o = openPos(x.id);
            const b = openBills(x.id, s);
            const r = recs.filter(rr => rr.supplier.id === x.id);
            const products = D.PRODUCTS.filter(p => p.supplier === x.id).length;
            return (
              <Card key={x.id} onClick={() => openRecord("supplier", x.id)}
                title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{x.name}<RealBadge x={x} /></span>}
                sub={x.country + " · " + x.categories}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.7px", fontVariantNumeric: "tabular-nums" }}>{eur(x.ytdSpend)}</span>
                  <span style={{ fontSize: 12, color: "var(--dim)" }}>spend this year · {Math.round((x.ytdSpend / total) * 100)}% of total</span>
                </div>
                <Progress value={x.ytdSpend} max={all[0].ytdSpend} h={5} style={{ marginTop: 8 }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginTop: 14 }}>
                  <MiniStat k="Lead time" v={x.leadDays + " days"} />
                  <MiniStat k="On time" v={x.onTime + "%"} tone={x.onTime >= 93 ? "ok" : "warn"} />
                  <MiniStat k="Products" v={products} />
                  <MiniStat k="Open POs" v={o.length} sub={o.length ? eur(o.reduce((a, p) => a + poOutstandingValue(p), 0)) + " to come" : "none"} tone={o.some(p => poLateDays(p) > 0) ? "bad" : undefined} />
                  <MiniStat k="Open bills" v={b.length} sub={b.length ? eur(b.reduce((a, y) => a + y.amount, 0)) : "none"} />
                  <MiniStat k="Terms" v={x.terms} />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12 }}>Agreement: {x.agreement}</div>
                <Row gap={6} wrap style={{ marginTop: 12 }}>
                  <Btn size="sm" kind="secondary" onClick={() => openRecord("supplier", x.id)}>Profile</Btn>
                  {r.length > 0 && <Btn size="sm" kind="accent" icon={I.refresh} onClick={() => nav("Purchasing", "reorder")}>{plural(r.length, "line")} to reorder</Btn>}
                  {o.some(p => poLateDays(p) > 0) && <Badge tone="bad">{o.filter(p => poLateDays(p) > 0).map(p => p.id).join(", ")} late</Badge>}
                </Row>
              </Card>
            );
          })}
        </div>

        <Card title="Agencies" sub={agencies.length + " agencies · " + eur(total - keySpend) + " spend this year"} flush>
          <Table cols={cols} rows={agencies} rowKey={x => x.id} onRow={x => openRecord("supplier", x.id)} dense minWidth={980} initialSort={{ key: "spend", dir: -1 }} />
        </Card>

        <div className="hk-two">
          <Card title="Spend concentration" sub="Year to date, fictional">
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <Donut size={132} thickness={15} data={[{ label: "Key global partners", value: keySpend, color: "var(--accent)" }, { label: "Agencies", value: total - keySpend, color: "var(--info,#7FB8C9)" }]}
                center={<><div style={{ fontSize: 15, fontWeight: 600 }}>{eurK(total)}</div><div style={{ fontSize: 10.5, color: "var(--dim)" }}>YTD</div></>} />
              <div style={{ flex: 1, minWidth: 150 }}>
                <Legend style={{ flexDirection: "column", gap: 8 }} items={[{ label: "Key global partners · " + eurK(keySpend), color: "var(--accent)" }, { label: "Agencies · " + eurK(total - keySpend), color: "var(--info,#7FB8C9)" }]} />
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10, lineHeight: 1.5 }}>Largest single supplier: {all[0].name}, {Math.round((all[0].ytdSpend / total) * 100)}% of spend.</div>
              </div>
            </div>
          </Card>
          <Card title="Reliability" sub="On-time delivery, lowest first">
            <HBars fmt={n => n + "%"} barH={6} max={100} onRow={i => openRecord("supplier", all.slice().sort((a, b) => a.onTime - b.onTime)[i].id)}
              data={all.slice().sort((a, b) => a.onTime - b.onTime).slice(0, 6).map(x => ({ label: x.name, value: x.onTime, sub: x.leadDays + "d lead", color: x.onTime >= 93 ? "var(--ok)" : x.onTime >= 89 ? "var(--warn)" : "var(--bad)" }))} />
          </Card>
        </div>
      </Stack>
    </Page>
  );
}

