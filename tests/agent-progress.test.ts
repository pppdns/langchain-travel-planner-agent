import { describe, expect, it } from "vitest";
import { agentProgressLabel } from "@/src/features/workspace/conversation/agent-progress";

describe("agent progress labels", () => {
  it("starts with thinking when the graph is quiet", () => {
    expect(agentProgressLabel([], null, 0)).toBe("Thinking");
  });

  it("maps discover beats and weather evidence", () => {
    expect(agentProgressLabel([], "discover_destinations", 1)).toBe("Checking weather");
    expect(
      agentProgressLabel(
        [{ type: "evidence", items: [{ id: "w1", title: "Faro weather", sourceType: "synthetic" }] }],
        "discover_destinations",
        0,
      ),
    ).toBe("Loading weather forecast");
  });
});
