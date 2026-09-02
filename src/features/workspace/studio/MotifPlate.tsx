import type { JSX } from "react";
import type { PlateMotif } from "@/data/travel/catalog";
import { cn } from "@/src/lib/cn";

function CoastMark() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
      <path d="M0 118 C48 92 86 148 132 120 C176 94 214 86 320 108 V180 H0 Z" fill="var(--map-water)" />
      <path
        d="M0 118 C48 92 86 148 132 120 C176 94 214 86 320 108"
        fill="none"
        stroke="var(--map-line)"
        strokeWidth="1.2"
      />
      <path d="M18 86 C62 70 98 102 148 78 C188 60 236 68 292 52" fill="none" stroke="var(--map-land)" strokeWidth="18" />
      <circle cx="248" cy="58" r="3" fill="var(--accent)" />
    </svg>
  );
}

function HarborMark() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
      <rect x="0" y="108" width="320" height="72" fill="var(--map-water)" />
      <path d="M40 108 V168 M80 108 V156 M120 108 V168" stroke="var(--map-line)" strokeWidth="1.2" />
      <rect x="168" y="46" width="36" height="62" fill="var(--map-land)" />
      <rect x="212" y="28" width="28" height="80" fill="var(--map-land)" />
      <rect x="248" y="54" width="44" height="54" fill="var(--map-land)" />
      <path d="M168 108 H292" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

function GridMark() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <line
          key={`v-${index}`}
          x1={36 + index * 48}
          y1="18"
          x2={36 + index * 48}
          y2="162"
          stroke="var(--map-line)"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: 4 }, (_, index) => (
        <line
          key={`h-${index}`}
          x1="24"
          y1={36 + index * 36}
          x2="296"
          y2={36 + index * 36}
          stroke="var(--map-line)"
          strokeWidth="1"
        />
      ))}
      <rect x="132" y="72" width="48" height="36" fill="var(--map-land)" />
      <path d="M36 108 H276" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

function IslandMark() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
      <rect x="0" y="0" width="320" height="180" fill="var(--map-water)" />
      <ellipse cx="168" cy="94" rx="78" ry="46" fill="var(--map-land)" />
      <ellipse cx="168" cy="90" rx="48" ry="24" fill="color-mix(in oklch, var(--map-land) 70%, var(--elevated))" />
      <circle cx="196" cy="78" r="2.5" fill="var(--accent)" />
    </svg>
  );
}

function RiverMark() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
      <rect x="0" y="0" width="320" height="180" fill="var(--map-land)" opacity="0.55" />
      <path
        d="M0 28 C72 48 86 118 160 98 C220 82 236 150 320 132"
        fill="none"
        stroke="var(--map-water)"
        strokeWidth="22"
      />
      <path
        d="M0 28 C72 48 86 118 160 98 C220 82 236 150 320 132"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function HillsMark() {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
      <path d="M0 180 L48 92 L104 138 L168 54 L236 124 L320 70 V180 Z" fill="var(--map-land)" />
      <path
        d="M48 92 L104 138 L168 54 L236 124 L320 70"
        fill="none"
        stroke="var(--map-line)"
        strokeWidth="1.4"
      />
      <path d="M168 54 L176 78" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

const MARKS: Record<PlateMotif, () => JSX.Element> = {
  coast: CoastMark,
  harbor: HarborMark,
  grid: GridMark,
  island: IslandMark,
  river: RiverMark,
  hills: HillsMark,
};

export function MotifPlate({
  motif,
  className,
}: {
  motif: PlateMotif;
  className?: string;
}) {
  const Mark = MARKS[motif];
  return (
    <div className={cn("overflow-hidden bg-map-water", className)}>
      <Mark />
    </div>
  );
}
