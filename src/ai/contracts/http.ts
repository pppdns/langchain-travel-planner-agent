import { z } from "zod";
import { publicEventSchema } from "@/src/ai/stream/public-events";
import { publicTripStateSchema } from "@/src/ai/graph/state";

export const starterIdSchema = z.enum([
  "family-beach-europe",
  "barcelona-couple",
  "city-break-budget",
  "family-minimal-driving",
]);

export const runKindSchema = z.enum(["message", "chip", "resume", "starter", "replay"]);

export const createTripRequestSchema = z.object({
  starterId: starterIdSchema.optional(),
});

export const createTripResponseSchema = z.object({
  tripId: z.string().uuid(),
  mode: z.enum(["live", "replay", "fake"]),
  uploadsEnabled: z.boolean().default(true),
});

export const runTripRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("message"),
    text: z.string().min(1).max(2000),
    idempotencyKey: z.string().min(8).max(80),
  }),
  z.object({
    kind: z.literal("chip"),
    field: z.string().min(1).max(64),
    value: z.string().min(1).max(240),
    idempotencyKey: z.string().min(8).max(80),
  }),
  z.object({
    kind: z.literal("starter"),
    starterId: starterIdSchema,
    idempotencyKey: z.string().min(8).max(80),
  }),
  z.object({
    kind: z.literal("resume"),
    interruptId: z.string().min(1),
    value: z.string().min(1).max(240),
    idempotencyKey: z.string().min(8).max(80),
  }),
  z.object({
    kind: z.literal("replay"),
    starterId: starterIdSchema,
  }),
]);

export const tripSnapshotSchema = z.object({
  tripId: z.string().uuid(),
  title: z.string(),
  status: z.enum(["active", "completed", "expired"]),
  mode: z.enum(["live", "replay", "fake"]),
  tripState: publicTripStateSchema,
  pendingInterrupt: publicEventSchema.nullable(),
  events: z.array(publicEventSchema),
});

export type StarterId = z.infer<typeof starterIdSchema>;
export type RunTripRequest = z.infer<typeof runTripRequestSchema>;
export type TripSnapshot = z.infer<typeof tripSnapshotSchema>;

export const STARTER_COPY: Record<StarterId, { label: string; firstQuestionHint: string }> = {
  "family-beach-europe": {
    label: "Warm family beach in Europe",
    firstQuestionHint: "Looking for a coastal family trip in Europe.",
  },
  "barcelona-couple": {
    label: "5 days in Barcelona, unhurried",
    firstQuestionHint: "Planning a relaxed couple trip to Barcelona.",
  },
  "city-break-budget": {
    label: "City break, food and culture, under 1500 EUR",
    firstQuestionHint: "Need a city break with food and culture under 1500 EUR.",
  },
  "family-minimal-driving": {
    label: "Family trip, young child, little driving",
    firstQuestionHint: "Family trip with a young child and minimal driving.",
  },
};
