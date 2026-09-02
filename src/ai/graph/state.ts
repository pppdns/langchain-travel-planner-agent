import { z } from "zod";

export const destinationStatusSchema = z.enum(["unknown", "candidates", "known"]);
export const planningStageSchema = z.enum([
  "intake",
  "gathering",
  "discovering",
  "awaiting_destination",
  "researching",
  "planning",
  "awaiting_tradeoff",
  "presenting",
  "complete",
]);
export const tripTypeSchema = z.enum([
  "beach",
  "city",
  "nature",
  "relaxation",
  "family",
  "nightlife",
  "mix",
  "unsure",
]);
export const paceSchema = z.enum(["relaxed", "balanced", "packed"]);
export const fitLabelSchema = z.enum(["strong", "good", "possible"]);
export const interruptTypeSchema = z.enum(["choose_destination", "approve_tradeoff"]);
export const modelTierSchema = z.enum(["fast", "standard", "reasoning", "vision", "embedding"]);

export const travelersSchema = z.object({
  adults: z.number().int().min(1).max(12).default(2),
  children: z.number().int().min(0).max(12).default(0),
  notes: z.string().max(240).optional(),
});

export const dateWindowSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  flexible: z.boolean().default(true),
  durationNights: z.number().int().min(1).max(21).optional(),
});

export const budgetSchema = z.object({
  amount: z.number().min(0).max(100_000).optional(),
  currency: z.string().length(3).default("EUR"),
  flexibility: z.enum(["strict", "flexible"]).default("flexible"),
});

export const evidenceRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceType: z.enum(["synthetic", "wikivoyage", "official", "user"]),
  destinationSlug: z.string().optional(),
  category: z.string().optional(),
});

export const candidateDestinationSchema = z.object({
  slug: z.string(),
  name: z.string(),
  country: z.string(),
  summary: z.string(),
  fit: fitLabelSchema,
  factors: z.array(z.string()).max(6),
  evidence: z.array(evidenceRefSchema).max(6),
});

export const itineraryStopSchema = z.object({
  title: z.string(),
  area: z.string().optional(),
  notes: z.string(),
  pace: paceSchema.optional(),
});

export const itineraryDaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string(),
  area: z.string().optional(),
  stops: z.array(itineraryStopSchema).min(1).max(6),
});

export const itinerarySchema = z.object({
  destinationSlug: z.string(),
  destinationName: z.string(),
  days: z.array(itineraryDaySchema).min(1).max(14),
  constraintsHonored: z.array(z.string()).default([]),
});

export const pendingInterruptSchema = z.object({
  interruptId: z.string(),
  interruptType: interruptTypeSchema,
  title: z.string(),
  prompt: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string().optional(),
      recommended: z.boolean().optional(),
    }),
  ),
});

export const visionObservationSchema = z.object({
  visible: z.array(z.string()),
  atmosphere: z.string().optional(),
  notInferred: z.array(z.string()).default([]),
});

export const tripStateSchema = z.object({
  destinationStatus: destinationStatusSchema.default("unknown"),
  origin: z.string().optional(),
  destinationSlug: z.string().optional(),
  destinationName: z.string().optional(),
  candidateDestinations: z.array(candidateDestinationSchema).default([]),
  tripType: tripTypeSchema.optional(),
  travelers: travelersSchema.default({ adults: 2, children: 0 }),
  dates: dateWindowSchema.default({ flexible: true }),
  budget: budgetSchema.default({ currency: "EUR", flexibility: "flexible" }),
  preferences: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  pace: paceSchema.optional(),
  selectedArea: z.string().optional(),
  itinerary: itinerarySchema.optional(),
  currentPlanningStage: planningStageSchema.default("intake"),
  lastQuestion: z.string().optional(),
  guidedOptions: z.array(z.string()).default([]),
  pendingInterrupt: pendingInterruptSchema.nullable().default(null),
  visionObservations: z.array(visionObservationSchema).default([]),
  offScopeRedirects: z.number().int().min(0).default(0),
  publicSummary: z.string().optional(),
});

export type TripState = z.infer<typeof tripStateSchema>;
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;
export type CandidateDestination = z.infer<typeof candidateDestinationSchema>;
export type Itinerary = z.infer<typeof itinerarySchema>;
export type PendingInterrupt = z.infer<typeof pendingInterruptSchema>;
export type PlanningStage = z.infer<typeof planningStageSchema>;
export type ModelTier = z.infer<typeof modelTierSchema>;

export const emptyTripState = (): TripState => tripStateSchema.parse({});

export const publicTripStateSchema = tripStateSchema.pick({
  destinationStatus: true,
  origin: true,
  destinationSlug: true,
  destinationName: true,
  candidateDestinations: true,
  tripType: true,
  travelers: true,
  dates: true,
  budget: true,
  preferences: true,
  exclusions: true,
  pace: true,
  selectedArea: true,
  itinerary: true,
  currentPlanningStage: true,
  lastQuestion: true,
  guidedOptions: true,
  pendingInterrupt: true,
  visionObservations: true,
  publicSummary: true,
});

export type PublicTripState = z.infer<typeof publicTripStateSchema>;

export function projectPublicTripState(state: TripState): PublicTripState {
  return publicTripStateSchema.parse(state);
}

export function mergeTripState(current: TripState, patch: Partial<TripState>): TripState {
  return tripStateSchema.parse({
    ...current,
    ...patch,
    travelers: { ...current.travelers, ...patch.travelers },
    dates: { ...current.dates, ...patch.dates },
    budget: { ...current.budget, ...patch.budget },
    preferences: patch.preferences ?? current.preferences,
    exclusions: patch.exclusions ?? current.exclusions,
    candidateDestinations: patch.candidateDestinations ?? current.candidateDestinations,
    guidedOptions: patch.guidedOptions ?? current.guidedOptions,
    visionObservations: patch.visionObservations ?? current.visionObservations,
  });
}

export function missingUsefulFields(state: TripState): Array<keyof TripState> {
  const missing: Array<keyof TripState> = [];
  if (!state.tripType) missing.push("tripType");
  if (state.destinationStatus === "unknown" && !state.destinationSlug) {
    missing.push("destinationStatus");
  }
  if (!state.origin) missing.push("origin");
  if (!state.dates.durationNights && !state.dates.start) missing.push("dates");
  if (state.budget.amount === undefined) missing.push("budget");
  if (!state.pace) missing.push("pace");
  return missing;
}
