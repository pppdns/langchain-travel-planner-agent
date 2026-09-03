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
  latitude: number;
  longitude: number;
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
  lyon: "grid",
  marseille: "harbor",
  bordeaux: "river",
  milan: "grid",
  naples: "harbor",
  bologna: "grid",
  berlin: "grid",
  munich: "grid",
  stockholm: "harbor",
  helsinki: "harbor",
  bilbao: "river",
  "san-sebastian": "coast",
  ljubljana: "river",
  tallinn: "harbor",
  bruges: "grid",
  thessaloniki: "harbor",
};

const COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  faro: { latitude: 37.0194, longitude: -7.9322 },
  valencia: { latitude: 39.4699, longitude: -0.3763 },
  nice: { latitude: 43.7102, longitude: 7.262 },
  barcelona: { latitude: 41.3874, longitude: 2.1686 },
  lisbon: { latitude: 38.7223, longitude: -9.1393 },
  porto: { latitude: 41.1579, longitude: -8.6291 },
  seville: { latitude: 37.3891, longitude: -5.9845 },
  malaga: { latitude: 36.7213, longitude: -4.4214 },
  palma: { latitude: 39.5696, longitude: 2.6502 },
  split: { latitude: 43.5081, longitude: 16.4402 },
  dubrovnik: { latitude: 42.6507, longitude: 18.0944 },
  athens: { latitude: 37.9838, longitude: 23.7275 },
  chania: { latitude: 35.5138, longitude: 24.018 },
  santorini: { latitude: 36.3932, longitude: 25.4615 },
  rome: { latitude: 41.9028, longitude: 12.4964 },
  florence: { latitude: 43.7696, longitude: 11.2558 },
  venice: { latitude: 45.4408, longitude: 12.3155 },
  amsterdam: { latitude: 52.3676, longitude: 4.9041 },
  copenhagen: { latitude: 55.6761, longitude: 12.5683 },
  edinburgh: { latitude: 55.9533, longitude: -3.1883 },
  dublin: { latitude: 53.3498, longitude: -6.2603 },
  prague: { latitude: 50.0755, longitude: 14.4378 },
  budapest: { latitude: 47.4979, longitude: 19.0402 },
  vienna: { latitude: 48.2082, longitude: 16.3738 },
  krakow: { latitude: 50.0647, longitude: 19.945 },
  madeira: { latitude: 32.6669, longitude: -16.9241 },
  lyon: { latitude: 45.764, longitude: 4.8357 },
  marseille: { latitude: 43.2965, longitude: 5.3698 },
  bordeaux: { latitude: 44.8378, longitude: -0.5792 },
  milan: { latitude: 45.4642, longitude: 9.19 },
  naples: { latitude: 40.8518, longitude: 14.2681 },
  bologna: { latitude: 44.4949, longitude: 11.3426 },
  berlin: { latitude: 52.52, longitude: 13.405 },
  munich: { latitude: 48.1351, longitude: 11.582 },
  stockholm: { latitude: 59.3293, longitude: 18.0686 },
  helsinki: { latitude: 60.1699, longitude: 24.9384 },
  bilbao: { latitude: 43.263, longitude: -2.935 },
  "san-sebastian": { latitude: 43.3183, longitude: -1.9812 },
  ljubljana: { latitude: 46.0569, longitude: 14.5058 },
  tallinn: { latitude: 59.437, longitude: 24.7536 },
  bruges: { latitude: 51.2093, longitude: 3.2247 },
  thessaloniki: { latitude: 40.6401, longitude: 22.9444 },
};

function motifFromTraits(traits: DestinationTraits): PlateMotif {
  if (traits.beach && traits.city) return "harbor";
  if (traits.beach) return "coast";
  if (traits.nature) return "hills";
  if (traits.city) return "grid";
  return "hills";
}

const DESTINATION_SEEDS: Omit<DestinationRecord, "plate" | "latitude" | "longitude">[] = [
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
  {
    slug: "lyon",
    name: "Lyon",
    country: "France",
    region: "Western Europe",
    summary: "A food-first city at the confluence, better for dinners than beaches.",
    traits: traits({ city: true, food: true, culture: true, walkable: true }),
  },
  {
    slug: "marseille",
    name: "Marseille",
    country: "France",
    region: "Southern Europe",
    summary: "A working port city with calanques nearby and a strong neighborhood food scene.",
    traits: traits({ city: true, food: true, beach: true, walkable: true }),
  },
  {
    slug: "bordeaux",
    name: "Bordeaux",
    country: "France",
    region: "Western Europe",
    summary: "Riverfront stone streets and wine-country day trips that stay optional.",
    traits: traits({ city: true, food: true, culture: true, walkable: true }),
  },
  {
    slug: "milan",
    name: "Milan",
    country: "Italy",
    region: "Southern Europe",
    summary: "A design-and-food city break if you keep the daily radius inside the core.",
    traits: traits({ city: true, food: true, culture: true, walkable: true, nightlife: true }),
  },
  {
    slug: "naples",
    name: "Naples",
    country: "Italy",
    region: "Southern Europe",
    summary: "Intense street food and a compact historic core, with the coast as a chosen day.",
    traits: traits({ city: true, food: true, culture: true, warm: true, budgetFriendly: true }),
  },
  {
    slug: "bologna",
    name: "Bologna",
    country: "Italy",
    region: "Southern Europe",
    summary: "Arcades, markets, and a walkable food city that rewards an unhurried pace.",
    traits: traits({ city: true, food: true, culture: true, walkable: true, budgetFriendly: true }),
  },
  {
    slug: "berlin",
    name: "Berlin",
    country: "Germany",
    region: "Central Europe",
    summary: "Neighborhoods over monuments. Strong value if you pick one side of the city.",
    traits: traits({ city: true, culture: true, nightlife: true, budgetFriendly: true, walkable: true }),
  },
  {
    slug: "munich",
    name: "Munich",
    country: "Germany",
    region: "Central Europe",
    summary: "Parks, museums, and a calm city grid that works as a four-night break.",
    traits: traits({ city: true, culture: true, walkable: true, family: true }),
  },
  {
    slug: "stockholm",
    name: "Stockholm",
    country: "Sweden",
    region: "Northern Europe",
    summary: "Island neighborhoods and harbor walks more than a packed museum circuit.",
    traits: traits({ city: true, nature: true, walkable: true, family: true }),
  },
  {
    slug: "helsinki",
    name: "Helsinki",
    country: "Finland",
    region: "Northern Europe",
    summary: "A compact design city with sauna culture and an easy waterfront loop.",
    traits: traits({ city: true, culture: true, walkable: true }),
  },
  {
    slug: "bilbao",
    name: "Bilbao",
    country: "Spain",
    region: "Northern Spain",
    summary: "River walks, Basque food, and a city scale that stays manageable.",
    traits: traits({ city: true, food: true, culture: true, walkable: true }),
  },
  {
    slug: "san-sebastian",
    name: "San Sebastián",
    country: "Spain",
    region: "Northern Spain",
    summary: "Pintxos and a city beach. Better for food-led couples than young families.",
    traits: traits({ city: true, food: true, beach: true, walkable: true }),
  },
  {
    slug: "ljubljana",
    name: "Ljubljana",
    country: "Slovenia",
    region: "Central Europe",
    summary: "A small river city with optional lake or cave day trips.",
    traits: traits({ city: true, nature: true, culture: true, budgetFriendly: true, walkable: true }),
  },
  {
    slug: "tallinn",
    name: "Tallinn",
    country: "Estonia",
    region: "Northern Europe",
    summary: "A compact old town and a modern harbor district that still fits a tight budget.",
    traits: traits({ city: true, culture: true, budgetFriendly: true, walkable: true }),
  },
  {
    slug: "bruges",
    name: "Bruges",
    country: "Belgium",
    region: "Western Europe",
    summary: "A walkable canal town that works when you leave by late afternoon crowds.",
    traits: traits({ city: true, culture: true, walkable: true }),
  },
  {
    slug: "thessaloniki",
    name: "Thessaloniki",
    country: "Greece",
    region: "Eastern Mediterranean",
    summary: "A food-led waterfront city with a calmer pace than the islands.",
    traits: traits({ city: true, food: true, culture: true, warm: true, budgetFriendly: true }),
  },
];

export const DESTINATIONS: DestinationRecord[] = DESTINATION_SEEDS.map((seed) => {
  const coordinates = COORDINATES[seed.slug];
  if (!coordinates) {
    throw new Error(`Missing coordinates for ${seed.slug}`);
  }
  return {
    ...seed,
    plate: { motif: PLATE_MOTIF_BY_SLUG[seed.slug] ?? motifFromTraits(seed.traits) },
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
});

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
