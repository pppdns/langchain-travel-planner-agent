import type { PublicEvent } from "@/src/ai/stream/public-events";

export type StreamFrame = {
  text?: string;
  event?: PublicEvent;
  done?: boolean;
};

export function encodeFrame(frame: StreamFrame): string {
  return `${JSON.stringify(frame)}\n`;
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
      if (params.text) {
        const words = params.text.split(/(\s+)/);
        for (const word of words) {
          controller.enqueue(encoder.encode(encodeFrame({ text: word })));
        }
      }
      controller.enqueue(encoder.encode(encodeFrame({ done: true })));
      controller.close();
    },
  });
}
