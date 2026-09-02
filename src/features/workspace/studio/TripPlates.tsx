import type { PublicTripState } from "@/src/ai/graph/state";
import {
  budgetPlateValue,
  datesPlateValue,
  destinationPlateValue,
  travelersPlateValue,
} from "@/src/features/workspace/studio/trip-copy";

function Plate({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[8px] border border-border bg-elevated px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{label}</p>
      <p className="mt-1 truncate text-sm text-text">{value}</p>
    </div>
  );
}

export function TripPlates({ tripState }: { tripState: PublicTripState }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Plate label="Destination" value={destinationPlateValue(tripState)} />
      <Plate label="Dates" value={datesPlateValue(tripState)} />
      <Plate label="Travelers" value={travelersPlateValue(tripState)} />
      <Plate label="Budget" value={budgetPlateValue(tripState)} />
    </div>
  );
}
