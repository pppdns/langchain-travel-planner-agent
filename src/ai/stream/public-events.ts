import { z } from "zod";
import { GRAPH_NODE_IDS, type GraphNodeId } from "@/src/ai/graph/spec";
import {
  evidenceRefSchema,
  fitLabelSchema,
  interruptTypeSchema,
  modelTierSchema,
  publicTripStateSchema,
} from "@/src/ai/graph/state";

export const graphPhaseSchema = z.enum(["queued", "start", "end", "error", "waiting"]);

export const publicGraphEventSchema = z.object({
  type: z.literal("graph"),
  node: z.enum(GRAPH_NODE_IDS),
  phase: graphPhaseSchema,
  caption: z.string(),
});

export const publicTripStateEventSchema = z.object({
  type: z.literal("trip-state"),
  patch: publicTripStateSchema.partial(),
});

export const publicInterruptEventSchema = z.object({
  type: z.literal("interrupt"),
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
      fit: fitLabelSchema.optional(),
    }),
  ),
});

export const publicEvidenceEventSchema = z.object({
  type: z.literal("evidence"),
  items: z.array(evidenceRefSchema),
});

export const publicUsageEventSchema = z.object({
  type: z.literal("usage"),
  modelTier: modelTierSchema,
  latencyMs: z.number().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  estimatedCents: z.number().optional(),
  retries: z.number().int().min(0).default(0),
});

export const publicErrorEventSchema = z.object({
  type: z.literal("error"),
  code: z.enum([
    "off_scope",
    "budget",
    "bot",
    "tool_failure",
    "timeout",
    "rate_limited",
    "run_blocked",
    "unavailable",
  ]),
  message: z.string(),
  recoverable: z.boolean(),
});

export const publicEventSchema = z.discriminatedUnion("type", [
  publicGraphEventSchema,
  publicTripStateEventSchema,
  publicInterruptEventSchema,
  publicEvidenceEventSchema,
  publicUsageEventSchema,
  publicErrorEventSchema,
]);

export type PublicEvent = z.infer<typeof publicEventSchema>;
export type PublicGraphEvent = z.infer<typeof publicGraphEventSchema>;

const SECRET_PATTERN = /(sk-|bearer\s+|api[_-]?key|-----begin)/i;

export function sanitizePublicEvent(event: PublicEvent): PublicEvent {
  const serialized = JSON.stringify(event);
  if (SECRET_PATTERN.test(serialized)) {
    throw new Error("Refusing to emit a public event that looks like a secret");
  }
  return publicEventSchema.parse(event);
}

export function graphEvent(
  node: GraphNodeId,
  phase: z.infer<typeof graphPhaseSchema>,
  caption: string,
): PublicGraphEvent {
  return publicGraphEventSchema.parse({ type: "graph", node, phase, caption });
}
