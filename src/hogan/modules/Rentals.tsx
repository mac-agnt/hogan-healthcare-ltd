/* Rentals module: NICE1 cold-compression unit hire. Overview, Bookings, Rental Assets,
   Dispatch & Returns, Rental Revenue. Registers the booking and unit drawer views. */

import { registerRecordView } from "../store";
import Overview from "./rentals/Overview";
import Bookings from "./rentals/Bookings";
import Assets from "./rentals/Assets";
import Dispatch from "./rentals/Dispatch";
import Revenue from "./rentals/Revenue";
import { BookingRecord, RentalRecord } from "./rentals/records";

registerRecordView("booking", BookingRecord, "Rental booking");
registerRecordView("rental", RentalRecord, "NICE1 unit");

export default function Rentals({ tab }: { tab: string }) {
  switch (tab) {
    case "bookings": return <Bookings />;
    case "assets": return <Assets />;
    case "dispatch": return <Dispatch />;
    case "revenue": return <Revenue />;
    default: return <Overview />;
  }
}
