type LedgerEntry = {
  tripId: string;
  cents: number;
  kind: "reserve" | "settle" | "release";
  day: string;
};

const ledger: LedgerEntry[] = [];

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

export function reservedToday(): number {
  return ledger
    .filter((entry) => entry.day === utcDay())
    .reduce((sum, entry) => {
      if (entry.kind === "reserve") return sum + entry.cents;
      if (entry.kind === "release") return sum - entry.cents;
      return sum;
    }, 0);
}

export function reserveSpend(tripId: string, cents: number): boolean {
  const ceiling = Number(process.env.DAILY_BUDGET_CENTS ?? 1000);
  if (reservedToday() + cents > ceiling) {
    return false;
  }
  ledger.push({ tripId, cents, kind: "reserve", day: utcDay() });
  return true;
}

export function settleSpend(tripId: string, cents: number) {
  ledger.push({ tripId, cents, kind: "settle", day: utcDay() });
}

export function releaseSpend(tripId: string, cents: number) {
  ledger.push({ tripId, cents, kind: "release", day: utcDay() });
}

export function budgetExhausted(): boolean {
  const ceiling = Number(process.env.DAILY_BUDGET_CENTS ?? 1000);
  return reservedToday() >= ceiling;
}

export function budgetDegraded(): boolean {
  const ceiling = Number(process.env.DAILY_BUDGET_CENTS ?? 1000);
  return reservedToday() >= ceiling * 0.8;
}
