import type { LanguageModelUsage } from "ai";
import type { LivePresentation } from "@/src/ai/models/live";
import { streamLivePresentation } from "@/src/ai/models/live";
import { sanitizePublicEvent, type PublicEvent } from "@/src/ai/stream/public-events";

export type StreamFrame = {
  text?: string;
  event?: PublicEvent;
  done?: boolean;
};

export function encodeFrame(frame: StreamFrame): string {
  return `${JSON.stringify(frame)}\n`;
}

function enqueueWords(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, text: string) {
  if (!text) return;
  for (const word of text.split(/(\s+)/)) {
    controller.enqueue(encoder.encode(encodeFrame({ text: word })));
  }
}

export function createEventStream(params: {
  text: string;
  events: PublicEvent[];
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of params.events) {
        controller.enqueue(encoder.encode(encodeFrame({ event })));
      }
      enqueueWords(controller, encoder, params.text);
      controller.enqueue(encoder.encode(encodeFrame({ done: true })));
      controller.close();
    },
  });
}

export async function createAssistantStream(params: {
  text: string;
  events: PublicEvent[];
  live?: LivePresentation | null;
  onText?: (text: string) => void | Promise<void>;
}): Promise<ReadableStream<Uint8Array>> {
  if (!params.live) {
    return createEventStream({ text: params.text, events: params.events });
  }

  try {
    const streamed = streamLivePresentation(params.live);
    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        for (const event of params.events) {
          controller.enqueue(encoder.encode(encodeFrame({ event })));
        }
        let assembled = "";
        try {
          for await (const delta of streamed.textStream) {
            assembled += delta;
            controller.enqueue(encoder.encode(encodeFrame({ text: delta })));
          }
          const usage = await streamed.usage;
          controller.enqueue(encoder.encode(encodeFrame({ event: usageEventFrom(usage, params.live?.modelTier) })));
        } catch {
          if (!assembled) {
            enqueueWords(controller, encoder, params.text);
            assembled = params.text;
          }
        }
        if (params.onText) await params.onText(assembled || params.text);
        controller.enqueue(encoder.encode(encodeFrame({ done: true })));
        controller.close();
      },
    });
  } catch {
    return createEventStream({ text: params.text, events: params.events });
  }
}

function usageEventFrom(usage: LanguageModelUsage, modelTier: LivePresentation["modelTier"] = "standard") {
  return sanitizePublicEvent({
    type: "usage",
    modelTier,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    estimatedCents: estimateCents(usage.inputTokens, usage.outputTokens, modelTier),
    retries: 0,
  });
}

function estimateCents(inputTokens = 0, outputTokens = 0, tier: LivePresentation["modelTier"]) {
  const rates = tier === "reasoning" ? [0.8, 4.8] : tier === "standard" ? [0.4, 2.4] : [0.15, 0.9];
  return Number((((inputTokens * rates[0] + outputTokens * rates[1]) / 1_000_000) * 100).toFixed(2));
}
