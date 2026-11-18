/* Inventory module: live stock, locations, hospital consignment stock,
   scanning, traceability, counts and replenishment (Story A).
   Registers the product, lot, location, transfer and movement drawers. */

import { registerRecordView } from "../store";
import { INV_CSS } from "./inventory/bits";
import LiveInventory from "./inventory/LiveInventory";
import Locations from "./inventory/Locations";
import HospitalStock from "./inventory/HospitalStock";
import Scanning from "./inventory/Scanning";
import Trace from "./inventory/Trace";
import Counts from "./inventory/Counts";
import Replenish from "./inventory/Replenish";
import { LocationRecord, LotRecord, MovementRecord, ProductRecord, TransferRecord } from "./inventory/records";

registerRecordView("product", ProductRecord, "Product");
registerRecordView("lot", LotRecord, "Lot");
registerRecordView("location", LocationRecord, "Location");
registerRecordView("transfer", TransferRecord, "Transfer");
registerRecordView("movement", MovementRecord, "Movement");

export default function Inventory({ tab }: { tab: string }) {
  const page = (() => {
    switch (tab) {
      case "locations": return <Locations />;
      case "hospital": return <HospitalStock />;
      case "scanning": return <Scanning />;
      case "trace": return <Trace />;
      case "counts": return <Counts />;
      case "replenish": return <Replenish />;
      default: return <LiveInventory />;
    }
  })();
  return (
    <>
      <style>{INV_CSS}</style>
      {page}
    </>
  );
}
