/* Records → Explorer: follow any record to everything it touches.
   Hospital → stock → product → lot → movement → transfer or order → invoice. */

import { useState } from "react";
import * as S from "../store";
import { ENTITY_TYPES, node, relations, type Ref } from "../related";
import { Badge, Btn, Card, I, Icon, Notice, Page, PageHeader, SearchBox, label, match } from "../ui";

const KIND: Record<string, string> = {
  account: "Account", location: "Location", product: "Product", lot: "Lot", order: "Sales order", transfer: "Transfer", movement: "Movement",
  po: "Purchase order", supplier: "Supplier", invoice: "Invoice", bill: "Supplier bill", opp: "Opportunity", staff: "Employee", rental: "Rental device",
  booking: "Rental booking", grn: "Goods receipt", task: "Task", doc: "Document", loanset: "Loan set",
};

const HARBOUR_TRAIL: Ref[] = [{ type: "account", id: "A-HAR" }];

export default function Explorer() {
  const s = S.useHogan();
  const [path, setPath] = S.useUi<Ref[]>("explorer.path", HARBOUR_TRAIL);
  const [type, setType] = S.useUi<string>("explorer.type", "account");
  const [q, setQ] = useState("");
  const focus = path[path.length - 1];
  const fnode = node(focus.type, focus.id, s);
  const groups = relations(focus, s);
  const ent = ENTITY_TYPES.find(e => e.type === type) || ENTITY_TYPES[0];
  const list = ent.list(s).map(r => node(r.type, r.id, s)).filter(n => match(q, n.title, n.sub, n.id));
  const go = (r: Ref) => setPath(path.concat([r]).slice(-9));

  return (
    <Page>
      <PageHeader eyebrow="Records" title="Explorer" sub="Pick any record and follow it to everything it touches. Every link is a real relationship in the demo data, the same one the ontology draws."
        right={<Btn kind="secondary" icon={I.route} onClick={() => { setType("account"); setPath(HARBOUR_TRAIL); }}>Start from Harbour</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(170px,210px) minmax(220px,300px) minmax(0,1fr)", gap: 14, alignItems: "start" }} className="hh-explorer">
        <Card flush style={{ position: "sticky", top: 0 }}>
          <div style={{ ...label, padding: "14px 16px 8px" }}>Entities</div>
          <div style={{ display: "flex", flexDirection: "column", padding: "0 8px 10px" }}>
            {ENTITY_TYPES.map(e => (
              <button key={e.type} onClick={() => { setType(e.type); setQ(""); }} className={type === e.type ? undefined : "ix11"}
                style={{ display: "flex", alignItems: "center", gap: 8, height: 34, padding: "0 10px", border: 0, borderRadius: 10, cursor: "pointer", textAlign: "left", fontSize: 13,
                  background: type === e.type ? "var(--accent-soft)" : "none", color: type === e.type ? "var(--ink)" : "var(--body)" }}>
                <span style={{ flex: 1 }}>{e.label}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)" }}>{e.list(s).length}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card flush>
          <div style={{ padding: "12px 12px 8px" }}><SearchBox value={q} onChange={setQ} placeholder={"Search " + ent.label.toLowerCase()} style={{ minWidth: 0 }} /></div>
          <div style={{ maxHeight: 620, overflowY: "auto", padding: "0 6px 8px" }}>
            {list.map(n => {
              const on = focus.type === n.type && focus.id === n.id;
              return (
                <button key={n.type + n.id} onClick={() => setPath([{ type: n.type, id: n.id }])} className={on ? undefined : "ix11"}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: 0, borderRadius: 10, cursor: "pointer", background: on ? "var(--accent-faint)" : "none", boxShadow: on ? "inset 2px 0 0 var(--accent)" : undefined }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</div>
                  {n.sub && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}</div>}
                </button>
              );
            })}
            {list.length === 0 && <div style={{ padding: 16, fontSize: 12.5, color: "var(--dim)" }}>No matches.</div>}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minHeight: 30 }}>
            {path.map((r, i) => {
              const n = node(r.type, r.id, s);
              const last = i === path.length - 1;
              return (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <Icon d={I.chevron} size={11} color="var(--faint)" />}
                  <button onClick={() => setPath(path.slice(0, i + 1))} className={last ? undefined : "ixa"}
                    style={{ height: 28, padding: "0 11px", borderRadius: 999, cursor: "pointer", fontSize: 12, maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      background: last ? "var(--accent-soft)" : "var(--surface-2)", border: "1px solid " + (last ? "var(--accent-line)" : "var(--border)"), color: last ? "var(--ink)" : "var(--body)" }}>
                    <span style={{ color: "var(--faint)", marginRight: 5 }}>{KIND[r.type] || r.type}</span>{n.title.split(" · ")[0]}
                  </button>
                </span>
              );
            })}
          </div>

          <Card>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={label}>{KIND[focus.type] || focus.type}</span>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.4px", marginTop: 6 }}>{fnode.title}</div>
                {fnode.sub && <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 4 }}>{fnode.sub}</div>}
              </div>
              {fnode.known && <Btn kind="primary" icon={I.external} onClick={() => S.openRecord(focus.type, focus.id)}>Open full record</Btn>}
            </div>
            {!fnode.known && <Notice tone="info" style={{ marginTop: 12 }}>This reference comes from history imported from the current ERP. In the demo only the story records carry full detail.</Notice>}
          </Card>

          {groups.length === 0 ? (
            <Card><div style={{ fontSize: 13, color: "var(--dim)" }}>Nothing further connected to this record in the demo data.</div></Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", gap: 12 }}>
              {groups.map(gr => (
                <Card key={gr.label} title={gr.label} right={<Badge>{gr.items.length}</Badge>} pad={16}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 300, overflowY: "auto", margin: "0 -6px" }}>
                    {gr.items.map(n => (
                      <button key={n.type + n.id} onClick={() => go({ type: n.type, id: n.id })} className="ix11"
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "7px 8px", border: 0, borderRadius: 10, background: "none", cursor: "pointer" }}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 12.5, color: n.known ? "var(--ink)" : "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</span>
                          {n.sub && <span style={{ display: "block", fontSize: 11, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}</span>}
                        </span>
                        <Icon d={I.chevron} size={12} color="var(--faint)" />
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
