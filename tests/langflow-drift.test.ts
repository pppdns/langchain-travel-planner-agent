import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GRAPH_NODE_IDS } from "@/src/ai/graph/spec";

describe("langflow artifact", () => {
  it("keeps node IDs aligned with the production graph", () => {
    const artifact = JSON.parse(readFileSync("langflow/route-state.json", "utf8")) as {
      runtime: boolean;
      nodes: Array<{ id: string }>;
    };
    expect(artifact.runtime).toBe(false);
    expect(artifact.nodes.map((node) => node.id)).toEqual([...GRAPH_NODE_IDS]);
  });
});
