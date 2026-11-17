import { tripGraph } from "../src/ai/graph/compile";
import { tripStateSchema, type TripState } from "../src/ai/graph/state";

/** Full (non-public) trip state for a thread on the shared in-memory checkpointer. */
export async function getTripState(threadId: string): Promise<TripState> {
  const snapshot = await tripGraph.getState({ configurable: { thread_id: threadId } });
  return tripStateSchema.parse(snapshot.values?.trip ?? {});
}
