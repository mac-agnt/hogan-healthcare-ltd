/* Purchasing module: procurement joined to inventory and finance.
   Tabs: overview · pos · receiving · suppliers · reorder · exceptions.
   Registers the drawer views for POs, goods received notes, bills and suppliers. */

import { registerRecordView } from "../store";
import { KitStyle } from "./orders/kit";
import Overview from "./purchasing/Overview";
import POs from "./purchasing/POs";
import Receiving from "./purchasing/Receiving";
import Suppliers from "./purchasing/Suppliers";
import Reorder from "./purchasing/Reorder";
import Exceptions from "./purchasing/Exceptions";
import { BillRecord, GRNRecord, PORecord, SupplierRecord } from "./purchasing/records";

registerRecordView("po", PORecord, "Purchase order");
registerRecordView("grn", GRNRecord, "Goods received");
registerRecordView("bill", BillRecord, "Supplier bill");
registerRecordView("supplier", SupplierRecord, "Supplier");

export default function Purchasing({ tab }: { tab: string }) {
  return (
    <>
      <KitStyle />
      {tab === "pos" ? <POs />
        : tab === "receiving" ? <Receiving />
        : tab === "suppliers" ? <Suppliers />
        : tab === "reorder" ? <Reorder />
        : tab === "exceptions" ? <Exceptions />
        : <Overview />}
    </>
  );
}
