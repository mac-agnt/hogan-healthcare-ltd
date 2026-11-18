/* Orders module: Sharon O'Mongain's order desk.
   Tabs: overview · new · picking · dispatch · returns · loansets.
   Registers the drawer views for sales orders, returns and loan sets. */

import { registerRecordView } from "../store";
import { KitStyle } from "./orders/kit";
import Overview from "./orders/Overview";
import NewOrder from "./orders/NewOrder";
import Picking from "./orders/Picking";
import Dispatch from "./orders/Dispatch";
import Returns from "./orders/Returns";
import LoanSets from "./orders/LoanSets";
import { LoanSetRecord, OrderRecord, ReturnRecord } from "./orders/records";

registerRecordView("order", OrderRecord, "Sales order");
registerRecordView("return", ReturnRecord, "Return");
registerRecordView("loanset", LoanSetRecord, "Loan set");

export default function Orders({ tab }: { tab: string }) {
  return (
    <>
      <KitStyle />
      {tab === "new" ? <NewOrder />
        : tab === "picking" ? <Picking />
        : tab === "dispatch" ? <Dispatch />
        : tab === "returns" ? <Returns />
        : tab === "loansets" ? <LoanSets />
        : <Overview />}
    </>
  );
}
