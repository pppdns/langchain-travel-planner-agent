import { getDestination } from "@/data/travel/catalog";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent showers",
  95: "Thunderstorm",
};

export type WeatherResult = {
  ok: true;
  summary: string;
  source: "open-meteo" | "fallback";
};

export function fallbackWeather(slug: string): WeatherResult {
  const destination = getDestination(slug);
  return {
    ok: true,
    summary: destination?.traits.warm
      ? "Warm afternoons, plan shade after 11."
      : "Changeable weather, keep an indoor backup.",
    source: "fallback",
  };
}

function describeCode(code: number | undefined): string {
  if (code === undefined) return "Mixed conditions";
  return WMO[code] ?? "Mixed conditions";
}

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

export async function fetchWeatherSummary(
  slug: string,
  options: { live?: boolean; fetchImpl?: typeof fetch } = {},
): Promise<WeatherResult> {
  const fallback = fallbackWeather(slug);
  if (!options.live) return fallback;

  const destination = getDestination(slug);
  if (!destination) return fallback;

  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", String(destination.latitude));
  url.searchParams.set("longitude", String(destination.longitude));
  url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", "auto");

  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(4_000) });
    if (!response.ok) return fallback;
    const data = (await response.json()) as OpenMeteoResponse;
    const current = data.current;
    const daily = data.daily;
    const todayMax = daily?.temperature_2m_max?.[0];
    const todayMin = daily?.temperature_2m_min?.[0];
    const rain = daily?.precipitation_probability_max?.[0];
    const parts = [
      `${destination.name} now: ${describeCode(current?.weather_code)}`,
      current?.temperature_2m !== undefined ? `${Math.round(current.temperature_2m)}C` : undefined,
      todayMin !== undefined && todayMax !== undefined
        ? `today ${Math.round(todayMin)}-${Math.round(todayMax)}C`
        : undefined,
      rain !== undefined ? `${rain}% rain chance` : undefined,
    ].filter(Boolean);
    return {
      ok: true,
      summary: `${parts.join(", ")}. Keep one indoor backup.`,
      source: "open-meteo",
    };
  } catch {
    return fallback;
  }
}
