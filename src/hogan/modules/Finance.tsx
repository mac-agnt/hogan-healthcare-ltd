/* Finance module: Margaret's oversight and exception-management layer above the
   accounts (not accounting software). Tabs: overview · ar · ap · recon · profit ·
   forecast. Registers the invoice and bank-line record drawers. */

import { registerRecordView } from "../store";
import Overview from "./finance/Overview";
import Receivables from "./finance/Receivables";
import Payables from "./finance/Payables";
import Recon from "./finance/Recon";
import Profit from "./finance/Profit";
import Forecast from "./finance/Forecast";
import { BankRecord, InvoiceRecord } from "./finance/records";

registerRecordView("invoice", InvoiceRecord, "Invoice");
registerRecordView("bank", BankRecord, "Bank line");

export default function Finance({ tab }: { tab: string }) {
  switch (tab) {
    case "ar": return <Receivables />;
    case "ap": return <Payables />;
    case "recon": return <Recon />;
    case "profit": return <Profit />;
    case "forecast": return <Forecast />;
    default: return <Overview />;
  }
}
