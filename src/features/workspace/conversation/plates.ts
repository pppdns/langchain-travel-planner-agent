import { getDestination } from "@/data/travel/catalog";

function formatHemisphere(value: number, positive: "N" | "E", negative: "S" | "W") {
  const hemisphere = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(2)}°${hemisphere}`;
}

export function plateCoords(slug: string) {
  const destination = getDestination(slug);
  if (!destination) return undefined;
  return `${formatHemisphere(destination.latitude, "N", "S")} ${formatHemisphere(destination.longitude, "E", "W")}`;
}

export function plateClimate(slug: string) {
  const destination = getDestination(slug);
  if (!destination) return "Mild";
  if (destination.traits.warm) return "Warm";
  if (destination.traits.beach) return "Coast";
  return "Mild";
}
