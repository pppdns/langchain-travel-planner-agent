import { describe, expect, it } from "vitest";
import { GOLDEN_DISCOVERY_EVENTS, GOLDEN_DISCOVERY_RESUME_EVENTS } from "@/src/ai/replay/golden-discovery";
import { buildAgentProcess, processHeadline } from "@/src/features/workspace/conversation/agent-process";

describe("agent process path", () => {
  it("walks the discovery graph and keeps evidence titles as notes", () => {
    const process = buildAgentProcess(GOLDEN_DISCOVERY_EVENTS);
    expect(process.steps.map((step) => step.label)).toEqual([
      "Scope",
      "Gather",
      "Supervisor",
      "Discover",
      "Decide",
    ]);
    expect(process.steps.at(-1)?.status).toBe("waiting");
    expect(process.steps.at(-1)?.caption).toBe("Waiting for a destination choice");
    expect(process.steps.find((step) => step.node === "discover_destinations")?.notes[0]).toContain("Algarve");
  });

  it("walks the resume pass as its own path", () => {
    const process = buildAgentProcess(GOLDEN_DISCOVERY_RESUME_EVENTS);
    expect(process.steps.map((step) => step.label)).toEqual([
      "Decide",
      "Research",
      "Plan",
      "Review",
      "Present",
    ]);
    expect(process.steps.every((step) => step.status === "done")).toBe(true);
    expect(process.steps.find((step) => step.node === "research_local")?.notes[0]).toContain("Ria Formosa");
  });

  it("pairs the node label with the live beat", () => {
    expect(processHeadline("Discover", "Searching destination knowledge")).toBe(
      "Discover · Searching destination knowledge",
    );
  });
});
