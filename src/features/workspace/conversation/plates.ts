import { getDestination } from "@/data/travel/catalog";

const COORDS: Record<string, string> = {
  faro: "37.02°N 7.93°W",
  valencia: "39.47°N 0.38°W",
  nice: "43.71°N 7.26°E",
  barcelona: "41.39°N 2.17°E",
  lisbon: "38.72°N 9.14°W",
  porto: "41.15°N 8.61°W",
  seville: "37.39°N 5.98°W",
  malaga: "36.72°N 4.42°W",
  palma: "39.57°N 2.65°E",
  split: "43.51°N 16.44°E",
  dubrovnik: "42.65°N 18.09°E",
  athens: "37.98°N 23.73°E",
  chania: "35.51°N 24.02°E",
  santorini: "36.39°N 25.46°E",
  rome: "41.90°N 12.50°E",
  florence: "43.77°N 11.26°E",
  venice: "45.44°N 12.32°E",
  amsterdam: "52.37°N 4.90°E",
  copenhagen: "55.68°N 12.57°E",
  edinburgh: "55.95°N 3.19°W",
  dublin: "53.35°N 6.26°W",
  prague: "50.08°N 14.44°E",
  budapest: "47.50°N 19.04°E",
  vienna: "48.21°N 16.37°E",
  krakow: "50.06°N 19.94°E",
  madeira: "32.67°N 16.92°W",
};

export function plateCoords(slug: string) {
  return COORDS[slug];
}

export function plateClimate(slug: string) {
  const destination = getDestination(slug);
  if (!destination) return "Mild";
  if (destination.traits.warm) return "Warm";
  if (destination.traits.beach) return "Coast";
  return "Mild";
}
