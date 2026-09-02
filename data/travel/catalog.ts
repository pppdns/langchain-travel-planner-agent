export type DestinationTraits = {
  beach: boolean;
  city: boolean;
  family: boolean;
  food: boolean;
  culture: boolean;
  nature: boolean;
  warm: boolean;
  walkable: boolean;
  budgetFriendly: boolean;
  shortTransfers: boolean;
  nightlife: boolean;
};

export const PLATE_MOTIFS = ["coast", "harbor", "grid", "island", "river", "hills"] as const;
export type PlateMotif = (typeof PLATE_MOTIFS)[number];

export type DestinationRecord = {
  slug: string;
  name: string;
  country: string;
  region: string;
  summary: string;
  traits: DestinationTraits;
  plate: { motif: PlateMotif };
};

export type KnowledgeDoc = {
  id: string;
  destinationSlug: string;
  title: string;
  category: string;
  body: string;
  sourceType: "synthetic";
};

const traits = (partial: Partial<DestinationTraits>): DestinationTraits => ({
  beach: false,
  city: false,
  family: false,
  food: false,
  culture: false,
  nature: false,
  warm: false,
  walkable: false,
  budgetFriendly: false,
  shortTransfers: false,
  nightlife: false,
  ...partial,
});

const PLATE_MOTIF_BY_SLUG: Record<string, PlateMotif> = {
  faro: "coast",
  valencia: "harbor",
  nice: "harbor",
  barcelona: "grid",
  lisbon: "hills",
  porto: "river",
  seville: "grid",
  malaga: "harbor",
  palma: "island",
  split: "harbor",
  dubrovnik: "coast",
  athens: "hills",
  chania: "harbor",
  santorini: "island",
  rome: "grid",
  florence: "hills",
  venice: "island",
  amsterdam: "river",
  copenhagen: "harbor",
  edinburgh: "hills",
  dublin: "grid",
  prague: "river",
  budapest: "river",
  vienna: "grid",
  krakow: "grid",
  madeira: "hills",
};

function motifFromTraits(traits: DestinationTraits): PlateMotif {
  if (traits.beach && traits.city) return "harbor";
  if (traits.beach) return "coast";
  if (traits.nature) return "hills";
  if (traits.city) return "grid";
  return "hills";
}

const DESTINATION_SEEDS: Omit<DestinationRecord, "plate">[] = [
  {
    slug: "faro",
    name: "Faro / Algarve",
    country: "Portugal",
    region: "Southern Europe",
    summary: "Warm Atlantic beaches, compact towns, and short family transfers.",
    traits: traits({ beach: true, family: true, warm: true, shortTransfers: true, walkable: true }),
  },
  {
    slug: "valencia",
    name: "Valencia",
    country: "Spain",
    region: "Southern Europe",
    summary: "A walkable city with a real beach and strong food culture.",
    traits: traits({ beach: true, city: true, family: true, food: true, warm: true, walkable: true }),
  },
  {
    slug: "nice",
    name: "Nice",
    country: "France",
    region: "Southern Europe",
    summary: "Promenade walking and hotel density, cooler swimming than Iberia.",
    traits: traits({ beach: true, city: true, walkable: true, food: true }),
  },
  {
    slug: "barcelona",
    name: "Barcelona",
    country: "Spain",
    region: "Southern Europe",
    summary: "Neighborhood grids, food streets, and a working beach at the edge of the city.",
    traits: traits({ city: true, food: true, culture: true, beach: true, walkable: true, nightlife: true }),
  },
  {
    slug: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    region: "Southern Europe",
    summary: "Hills, trams, and a food-first city break with nearby coast.",
    traits: traits({ city: true, food: true, culture: true, budgetFriendly: true, walkable: true }),
  },
  {
    slug: "porto",
    name: "Porto",
    country: "Portugal",
    region: "Southern Europe",
    summary: "Riverfront walks, compact historic core, and excellent casual dining.",
    traits: traits({ city: true, food: true, culture: true, budgetFriendly: true, walkable: true }),
  },
  {
    slug: "seville",
    name: "Seville",
    country: "Spain",
    region: "Southern Europe",
    summary: "A dense historic city with courtyards, tapas, and intense summer heat.",
    traits: traits({ city: true, food: true, culture: true, warm: true, walkable: true }),
  },
  {
    slug: "malaga",
    name: "Málaga",
    country: "Spain",
    region: "Southern Europe",
    summary: "Andalusian city beach with an easy airport and family-scale old town.",
    traits: traits({ beach: true, city: true, family: true, warm: true, shortTransfers: true }),
  },
  {
    slug: "palma",
    name: "Palma",
    country: "Spain",
    region: "Balearics",
    summary: "Island city with cathedral walks and nearby calas.",
    traits: traits({ beach: true, city: true, family: true, warm: true }),
  },
  {
    slug: "split",
    name: "Split",
    country: "Croatia",
    region: "Adriatic",
    summary: "Palace-town living with island ferries and a working waterfront.",
    traits: traits({ beach: true, city: true, culture: true, warm: true, walkable: true }),
  },
  {
    slug: "dubrovnik",
    name: "Dubrovnik",
    country: "Croatia",
    region: "Adriatic",
    summary: "Walled old town with extraordinary views and peak-season crowds.",
    traits: traits({ beach: true, culture: true, warm: true, walkable: true }),
  },
  {
    slug: "athens",
    name: "Athens",
    country: "Greece",
    region: "Eastern Mediterranean",
    summary: "Layered ancient city with neighborhood food and a nearby coast.",
    traits: traits({ city: true, culture: true, food: true, warm: true, budgetFriendly: true }),
  },
  {
    slug: "chania",
    name: "Chania",
    country: "Greece",
    region: "Crete",
    summary: "Venetian harbor, west-Crete beaches, and a gentler family pace.",
    traits: traits({ beach: true, family: true, food: true, warm: true, shortTransfers: true }),
  },
  {
    slug: "santorini",
    name: "Santorini",
    country: "Greece",
    region: "Cyclades",
    summary: "Caldera views and premium prices. Better for couples than young families.",
    traits: traits({ beach: true, warm: true, culture: true }),
  },
  {
    slug: "rome",
    name: "Rome",
    country: "Italy",
    region: "Southern Europe",
    summary: "A walking city of layers, if you keep the daily radius small.",
    traits: traits({ city: true, culture: true, food: true, walkable: true }),
  },
  {
    slug: "florence",
    name: "Florence",
    country: "Italy",
    region: "Southern Europe",
    summary: "Compact Renaissance core, best at an unhurried two-museum pace.",
    traits: traits({ city: true, culture: true, food: true, walkable: true }),
  },
  {
    slug: "venice",
    name: "Venice",
    country: "Italy",
    region: "Southern Europe",
    summary: "Car-free islands with extraordinary mornings and heavy midday crowds.",
    traits: traits({ city: true, culture: true, walkable: true }),
  },
  {
    slug: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    region: "Northern Europe",
    summary: "Canal grid, bikes, and museums that reward an unhurried plan.",
    traits: traits({ city: true, culture: true, walkable: true, family: true }),
  },
  {
    slug: "copenhagen",
    name: "Copenhagen",
    country: "Denmark",
    region: "Northern Europe",
    summary: "Design-forward city with harbor swimming and excellent public space.",
    traits: traits({ city: true, food: true, walkable: true, family: true }),
  },
  {
    slug: "edinburgh",
    name: "Edinburgh",
    country: "United Kingdom",
    region: "Northern Europe",
    summary: "A walkable old town with weather you should plan around, not against.",
    traits: traits({ city: true, culture: true, walkable: true }),
  },
  {
    slug: "dublin",
    name: "Dublin",
    country: "Ireland",
    region: "Northern Europe",
    summary: "Compact literary city with easy day-trip radius if you avoid the car.",
    traits: traits({ city: true, culture: true, food: true, walkable: true }),
  },
  {
    slug: "prague",
    name: "Prague",
    country: "Czechia",
    region: "Central Europe",
    summary: "A high-culture city break that still fits a tight budget.",
    traits: traits({ city: true, culture: true, budgetFriendly: true, walkable: true }),
  },
  {
    slug: "budapest",
    name: "Budapest",
    country: "Hungary",
    region: "Central Europe",
    summary: "Thermal baths, river views, and a strong value for a four-night city stay.",
    traits: traits({ city: true, culture: true, budgetFriendly: true, walkable: true }),
  },
  {
    slug: "vienna",
    name: "Vienna",
    country: "Austria",
    region: "Central Europe",
    summary: " Palaces, cafes, and a calm city grid that suits a slower couple trip.",
    traits: traits({ city: true, culture: true, food: true, walkable: true }),
  },
  {
    slug: "krakow",
    name: "Kraków",
    country: "Poland",
    region: "Central Europe",
    summary: "A compact old town and strong value, with day trips that stay optional.",
    traits: traits({ city: true, culture: true, budgetFriendly: true, walkable: true }),
  },
  {
    slug: "madeira",
    name: "Madeira",
    country: "Portugal",
    region: "Atlantic Islands",
    summary: "Mild cliffs and levada walks more than a classic sandy beach trip.",
    traits: traits({ nature: true, warm: true, food: true }),
  },
];

export const DESTINATIONS: DestinationRecord[] = DESTINATION_SEEDS.map((seed) => ({
  ...seed,
  plate: { motif: PLATE_MOTIF_BY_SLUG[seed.slug] ?? motifFromTraits(seed.traits) },
}));

export function plateMotifFor(slug: string, fallbackTraits?: DestinationTraits): PlateMotif {
  if (PLATE_MOTIF_BY_SLUG[slug]) return PLATE_MOTIF_BY_SLUG[slug];
  if (fallbackTraits) return motifFromTraits(fallbackTraits);
  return getDestination(slug)?.plate.motif ?? "grid";
}

const topics = [
  "neighborhoods",
  "food",
  "family",
  "beach",
  "pace",
  "transfers",
  "budget",
  "weather",
  "evenings",
] as const;

function docFor(destination: DestinationRecord, topic: (typeof topics)[number]): KnowledgeDoc {
  const { slug, name } = destination;
  const bodyByTopic: Record<(typeof topics)[number], string> = {
    neighborhoods: `${name} rewards a small daily radius. Stay near the compact historic or waterfront core and treat farther neighborhoods as one chosen excursion, not a daily commute.`,
    food: `Eat locally and early. In ${name}, the strongest meals are usually in residential streets rather than the first square you see. Keep one reservation, leave the rest flexible.`,
    family: destination.traits.family
      ? `${name} works for families when you keep walking days short, schedule shade, and pick one beach or park anchor per day.`
      : `${name} can work with children if you slow the pace, but it is not the most natural family-first fit in this catalog.`,
    beach: destination.traits.beach
      ? `The coast around ${name} is usable for a half-day swim or promenade. Pack shade and treat the beach as an anchor, not an all-day obligation.`
      : `${name} is not a classic beach destination. If swimming matters, choose a coastal alternative or add a single day trip.`,
    pace: `An unhurried plan in ${name} means two meaningful stops and one long meal. A packed plan adds a third stop and usually a taxi.`,
    transfers: destination.traits.shortTransfers
      ? `Airport-to-stay transfers in ${name} stay short when you sleep in the core. Avoid split stays.`
      : `Give ${name} a real arrival buffer. The city is walkable once you are in, but the first transfer can steal a half day.`,
    budget: destination.traits.budgetFriendly
      ? `${name} still fits a careful city-break budget if you stay in mid-range rooms and spend on food instead of cars.`
      : `${name} gets expensive quickly in peak months. Hold the room budget first, then decide on paid viewpoints.`,
    weather: destination.traits.warm
      ? `Expect heat in high summer. Plan outdoor walking before 11 and after 17, and keep one indoor backup.`
      : `Weather in ${name} is changeable. Keep a museum or cafe backup on every outdoor day.`,
    evenings: `Evenings in ${name} work best as a neighborhood loop: one drink, one meal, a short walk back. Skip late cross-town travel.`,
  };

  return {
    id: `${slug}-${topic}`,
    destinationSlug: slug,
    title: `${name} ${topic}`,
    category: topic,
    body: bodyByTopic[topic],
    sourceType: "synthetic",
  };
}

export const KNOWLEDGE_DOCS: KnowledgeDoc[] = DESTINATIONS.flatMap((destination) =>
  topics.map((topic) => docFor(destination, topic)),
);

export function getDestination(slug: string): DestinationRecord | undefined {
  return DESTINATIONS.find((item) => item.slug === slug);
}
