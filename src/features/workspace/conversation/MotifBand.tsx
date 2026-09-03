import type { PlateMotif } from "@/data/travel/catalog";
import { cn } from "@/src/lib/cn";

export function MotifBand({
  motif,
  className,
}: {
  motif: PlateMotif;
  className?: string;
}) {
  return <span aria-hidden className={cn("motif-band", `motif-${motif}`, className)} />;
}
