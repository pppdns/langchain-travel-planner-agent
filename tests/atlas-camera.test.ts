import { describe, expect, it } from "vitest";
import { atlasCamera, atlasEdgeStroke, atlasFocusIds } from "@/src/features/workspace/atlas/atlas-camera";

describe("atlas camera", () => {
  it("frames the active node with its neighbors and the previous step", () => {
    expect(atlasFocusIds("discover_destinations", null, "route_supervisor")).toEqual(
      expect.arrayContaining([
        "discover_destinations",
        "route_supervisor",
        "await_destination_choice",
      ]),
    );
  });

  it("prefers a selected node over the live neighborhood", () => {
    expect(atlasFocusIds("discover_destinations", "present_plan")).toEqual(["present_plan"]);
  });

  it("keeps the preview stroke heavier than the desk chart", () => {
    expect(atlasEdgeStroke("preview", true)).toBeGreaterThan(atlasEdgeStroke("desk", true));
    expect(atlasCamera("preview", true).maxZoom).toBeGreaterThan(atlasCamera("desk", true).maxZoom);
  });
});
