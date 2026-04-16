import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type HourPoint = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  heatIndex: number;
  uvIndex: number;
  humidity: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  wind: number;
  aqi: number;
  risk: number;
};

type DayOutlook = {
  date: string;
  maxTemp: number;
  minTemp: number;
  rainChance: number;
  sunrise: string;
  sunset: string;
  weatherCode: number;
  moonPhase: string;
  moonIllumination: number;
};

type CityOption = {
  name: string;
  country: string;
  countryCode?: string;
  admin1?: string;
  timezone?: string;
  latitude: number;
  longitude: number;
};

type ComparisonBrief = {
  label: string;
  averageRisk: number;
  peakRisk: number;
  highExposureHours: number;
  peakHeatIndex: number;
};

type AutocompleteGeoResult = {
  name?: string;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  population?: number;
};

type SimulationBrief = {
  projectedAverageRisk: number;
  reduction: number;
  noGoHours: number;
};

type CurrentWeatherSnapshot = {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  wind: number;
  aqi: number;
  time: string;
  isDay: boolean;
};

type MetNoHour = {
  timeMs: number;
  temperature?: number;
  humidity?: number;
  wind?: number;
  precipitation?: number;
  weatherCode?: number;
};

type IndiaAqiOverride = {
  aqi: number;
  sourceLabel: string;
};

type RiskLevel = "Low" | "Moderate" | "High" | "Critical";

type MoonPhaseInfo = {
  phase: string;
  illumination: number;
};

type TiltIndicator = {
  axisTilt: number;
  solarDeclination: number;
  localEffect: number;
  hemisphere: "Northern" | "Southern";
  seasonLabel: string;
};

type WeatherNewsItem = {
  title: string;
  category: string;
  daysAgo: number;
  distanceKm: number;
};

type ActionPlanIndexEntry = {
  category: string;
  score: number;
  level: RiskLevel;
  rationale: string;
};

type LunarCycleMetrics = {
  ageDays: number;
  cyclePercent: number;
  nextNewMoonMs: number;
  nextFullMoonMs: number;
};

type AstronomyInsights = {
  dayLengthMs: number;
  nightLengthMs: number;
  solarNoonMs: number;
  maxSolarElevationDeg: number;
  stargazingStartMs: number;
  stargazingEndMs: number;
};

type RadarLayer = "temperature" | "rain" | "wind" | "cloud";

type RadarGridNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  latitude: number;
  longitude: number;
};

type RadarPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  temperature: number;
  precipitation: number;
  wind: number;
  cloudCover: number;
  risk: number;
};

type RadarFrame = {
  time: string;
  points: RadarPoint[];
  coverage: number;
};

type RadarSeries = {
  times: string[];
  temperature: number[];
  precipitation: number[];
  wind: number[];
  cloudCover: number[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasSeriesData(values: unknown): values is number[] {
  return Array.isArray(values) && values.length > 0 && values.every((item) => typeof item === "number");
}

function calculateHeatIndexC(tempC: number, humidity: number): number {
  const tempF = (tempC * 9) / 5 + 32;

  if (tempF < 80) {
    return tempC;
  }

  const hiF =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * humidity -
    0.22475541 * tempF * humidity -
    0.00683783 * tempF * tempF -
    0.05481717 * humidity * humidity +
    0.00122874 * tempF * tempF * humidity +
    0.00085282 * tempF * humidity * humidity -
    0.00000199 * tempF * tempF * humidity * humidity;

  return ((hiF - 32) * 5) / 9;
}

function getForecastPrecision(points: HourPoint[]): number {
  if (!points.length) return 0;
  const completePoints = points.filter(
    (point) =>
      Number.isFinite(point.temperature) &&
      Number.isFinite(point.apparentTemperature) &&
      Number.isFinite(point.heatIndex) &&
      Number.isFinite(point.uvIndex) &&
      Number.isFinite(point.aqi) &&
      Number.isFinite(point.risk),
  ).length;

  const coverage = (completePoints / points.length) * 100;
  return Math.round(clamp(84 + coverage * 0.16, 85, 99));
}

function getHighExposureHours(points: HourPoint[]): number {
  return points.filter((point) => point.risk >= 65).length;
}

function parseComparisonCities(value: string, baseCity: string): string[] {
  const base = baseCity.trim().toLowerCase();
  const unique = new Set<string>();

  value
    .split(",")
    .map((cityName) => cityName.trim())
    .filter(Boolean)
    .forEach((cityName) => {
      if (cityName.toLowerCase() !== base) {
        unique.add(cityName);
      }
    });

  return Array.from(unique).slice(0, 4);
}

function getWeatherLabel(code: number): string {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Mixed conditions";
}

function getMoonPhaseEmoji(phase: string): string {
  const value = phase.toLowerCase();
  if (value.includes("new")) return "🌑";
  if (value.includes("waxing crescent")) return "🌒";
  if (value.includes("first") || value.includes("quarter")) return "🌓";
  if (value.includes("waxing gibbous")) return "🌔";
  if (value.includes("full")) return "🌕";
  if (value.includes("waning gibbous")) return "🌖";
  if (value.includes("last") || value.includes("third")) return "🌗";
  if (value.includes("waning crescent")) return "🌘";
  return "🌙";
}

function getFallbackMoonPhaseInfo(timestampMs: number): MoonPhaseInfo {
  const synodicMonth = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const daysSince = (timestampMs - knownNewMoon) / 86400000;
  const normalized = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const phaseIndex = Math.floor(((normalized / synodicMonth) * 8 + 0.5) % 8);
  const names = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
  ];
  const illumination = clamp((1 - Math.cos((2 * Math.PI * normalized) / synodicMonth)) / 2, 0, 1);

  return {
    phase: names[phaseIndex] ?? "Moon Phase",
    illumination,
  };
}

function getNextFullMoonTimestamp(fromTimestampMs: number): number {
  const synodicMonth = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const daysSince = (fromTimestampMs - knownNewMoon) / 86400000;
  const age = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const fullMoonAge = synodicMonth / 2;
  const daysUntil = (fullMoonAge - age + synodicMonth) % synodicMonth;
  const adjustedDaysUntil = daysUntil < 0.08 ? 0 : daysUntil;

  return fromTimestampMs + adjustedDaysUntil * 86400000;
}

function getLunarCycleMetrics(fromTimestampMs: number): LunarCycleMetrics {
  const synodicMonth = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const daysSince = (fromTimestampMs - knownNewMoon) / 86400000;
  const age = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const cyclePercent = clamp((age / synodicMonth) * 100, 0, 100);
  const daysToNextNewMoon = (synodicMonth - age) % synodicMonth;
  const daysToNextFullMoon = (synodicMonth / 2 - age + synodicMonth) % synodicMonth;

  return {
    ageDays: age,
    cyclePercent,
    nextNewMoonMs: fromTimestampMs + daysToNextNewMoon * 86400000,
    nextFullMoonMs: fromTimestampMs + daysToNextFullMoon * 86400000,
  };
}

function formatDurationLabel(durationMs: number): string {
  const safe = Math.max(0, durationMs);
  const totalMinutes = Math.round(safe / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function buildAstronomyInsights(
  latitude: number,
  sunriseIso: string,
  sunsetIso: string,
  nextSunriseIso?: string,
): AstronomyInsights | null {
  const sunriseMs = new Date(sunriseIso).getTime();
  const sunsetMs = new Date(sunsetIso).getTime();
  const nextSunriseMs = nextSunriseIso ? new Date(nextSunriseIso).getTime() : Number.NaN;

  if (![sunriseMs, sunsetMs].every((value) => Number.isFinite(value)) || sunsetMs <= sunriseMs) {
    return null;
  }

  const dayLengthMs = sunsetMs - sunriseMs;
  const fallbackNightMs = Math.max(0, 24 * 60 * 60 * 1000 - dayLengthMs);
  const nightLengthMs = Number.isFinite(nextSunriseMs) && nextSunriseMs > sunsetMs ? nextSunriseMs - sunsetMs : fallbackNightMs;
  const solarNoonMs = sunriseMs + dayLengthMs / 2;
  const tilt = getTiltIndicator(latitude, new Date(solarNoonMs).toISOString());
  const maxSolarElevationDeg = clamp(90 - Math.abs(latitude - tilt.solarDeclination), 0, 90);
  const stargazingStartMs = sunsetMs + 90 * 60 * 1000;
  const stargazingEndMs = Number.isFinite(nextSunriseMs) && nextSunriseMs > stargazingStartMs
    ? Math.max(stargazingStartMs, nextSunriseMs - 90 * 60 * 1000)
    : stargazingStartMs + 4 * 60 * 60 * 1000;

  return {
    dayLengthMs,
    nightLengthMs,
    solarNoonMs,
    maxSolarElevationDeg,
    stargazingStartMs,
    stargazingEndMs,
  };
}

function formatDateTimeInZone(timestampMs: number, timezone?: string): string {
  const date = new Date(timestampMs);
  if (!Number.isFinite(date.getTime())) return "N/A";

  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };

  try {
    return new Intl.DateTimeFormat([], {
      ...options,
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat([], options).format(date);
  }
}

async function fetchMoonPhaseInfo(unixTimestampSeconds: number): Promise<MoonPhaseInfo> {
  const fallback = getFallbackMoonPhaseInfo(unixTimestampSeconds * 1000);
  try {
    const response = await fetch(`https://api.farmsense.net/v1/moonphases/?d=${unixTimestampSeconds}`);
    if (!response.ok) {
      return fallback;
    }
    const payload: unknown = await response.json();
    const first = Array.isArray(payload) ? payload[0] : payload;
    if (!first || typeof first !== "object") {
      return fallback;
    }

    const phase = (first as { Phase?: unknown }).Phase;
    const illumination = (first as { Illumination?: unknown }).Illumination;
    return {
      phase: typeof phase === "string" && phase.trim() ? phase : fallback.phase,
      illumination:
        typeof illumination === "number" && Number.isFinite(illumination)
          ? clamp(illumination, 0, 1)
          : fallback.illumination,
    };
  } catch {
    return fallback;
  }
}

function getSunCycleSummary(
  currentTime: string,
  sunrise: string,
  sunset: string,
  nextSunrise?: string,
): { label: string; percent: number } {
  const currentMs = new Date(currentTime).getTime();
  const sunriseMs = new Date(sunrise).getTime();
  const sunsetMs = new Date(sunset).getTime();
  const nextSunriseMs = nextSunrise ? new Date(nextSunrise).getTime() : Number.NaN;

  if (![currentMs, sunriseMs, sunsetMs].every((value) => Number.isFinite(value))) {
    return { label: "Sun cycle unavailable", percent: 0 };
  }

  if (currentMs >= sunriseMs && currentMs <= sunsetMs) {
    const daylightProgress = ((currentMs - sunriseMs) / Math.max(1, sunsetMs - sunriseMs)) * 100;
    return { label: "Sun path (daylight)", percent: clamp(daylightProgress, 0, 100) };
  }

  if (Number.isFinite(nextSunriseMs) && nextSunriseMs > sunsetMs && currentMs >= sunsetMs && currentMs <= nextSunriseMs) {
    const nightProgress = ((currentMs - sunsetMs) / Math.max(1, nextSunriseMs - sunsetMs)) * 100;
    return { label: "Moon path (night)", percent: clamp(nightProgress, 0, 100) };
  }

  return { label: "Earth rotation cycle", percent: 0 };
}

function getOrbitPosition(percent: number, isDay: boolean): { x: number; y: number } {
  const progress = clamp(percent, 0, 100) / 100;
  const radius = 40;
  const center = 50;

  if (isDay) {
    const angle = Math.PI - progress * Math.PI;
    return {
      x: center + radius * Math.cos(angle),
      y: center - radius * Math.sin(angle),
    };
  }

  const angle = progress * Math.PI;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

function getOppositeOrbitPosition(percent: number, isDay: boolean): { x: number; y: number } {
  const progress = clamp(percent, 0, 100);
  if (isDay) {
    // During daytime the moon appears on the opposite side of the Earth path.
    return getOrbitPosition(progress, false);
  }
  // At night the opposite sun position is the reversed daylight arc.
  return getOrbitPosition(100 - progress, true);
}

function getCircularOrbitPosition(percent: number, radius: number, centerX: number, centerY: number): { x: number; y: number } {
  const angle = ((clamp(percent, 0, 100) / 100) * Math.PI * 2) - Math.PI / 2;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function getSeasonByHemisphere(hemisphere: "Northern" | "Southern", dayOfYear: number): string {
  const north = dayOfYear >= 80 && dayOfYear < 172
    ? "Spring"
    : dayOfYear >= 172 && dayOfYear < 266
      ? "Summer"
      : dayOfYear >= 266 && dayOfYear < 355
        ? "Autumn"
        : "Winter";

  if (hemisphere === "Northern") return north;
  return north === "Summer" ? "Winter" : north === "Winter" ? "Summer" : north;
}

function getTiltIndicator(latitude: number, dateTimeIso: string): TiltIndicator {
  const date = new Date(dateTimeIso);
  const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
  const dayOfYear = getDayOfYear(safeDate);
  const axisTilt = 23.44;
  const solarDeclination = axisTilt * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
  const localEffect = solarDeclination * Math.cos((Math.abs(latitude) * Math.PI) / 180);
  const hemisphere: "Northern" | "Southern" = latitude >= 0 ? "Northern" : "Southern";

  return {
    axisTilt,
    solarDeclination,
    localEffect,
    hemisphere,
    seasonLabel: getSeasonByHemisphere(hemisphere, dayOfYear),
  };
}

function mapMetSymbolToWeatherCode(symbolCode: string): number {
  const symbol = symbolCode.toLowerCase();
  if (symbol.includes("thunder")) return 95;
  if (symbol.includes("heavyrain")) return 65;
  if (symbol.includes("rain") || symbol.includes("drizzle") || symbol.includes("sleet")) return 63;
  if (symbol.includes("heavysnow")) return 75;
  if (symbol.includes("snow")) return 73;
  if (symbol.includes("fog")) return 45;
  if (symbol.includes("partlycloudy") || symbol.includes("fair")) return 2;
  if (symbol.includes("cloudy")) return 3;
  if (symbol.includes("clearsky")) return 0;
  return 2;
}

function findNearestMetHour(targetMs: number, metHours: MetNoHour[], maxGapMs = 90 * 60 * 1000): MetNoHour | null {
  if (!Number.isFinite(targetMs) || metHours.length === 0) return null;

  let nearest: MetNoHour | null = null;
  let smallestGap = Number.POSITIVE_INFINITY;
  for (let i = 0; i < metHours.length; i += 1) {
    const gap = Math.abs(metHours[i].timeMs - targetMs);
    if (gap < smallestGap) {
      smallestGap = gap;
      nearest = metHours[i];
    }
  }

  if (!nearest || smallestGap > maxGapMs) return null;
  return nearest;
}

function getNearestAqiFromTimeline(
  targetMs: number,
  timeline: Array<{ timeMs: number; aqi: number }>,
  fallback = 40,
): number {
  if (!Number.isFinite(targetMs) || timeline.length === 0) return fallback;
  let nearest = timeline[0];
  let smallestGap = Math.abs(timeline[0].timeMs - targetMs);
  for (let i = 1; i < timeline.length; i += 1) {
    const gap = Math.abs(timeline[i].timeMs - targetMs);
    if (gap < smallestGap) {
      smallestGap = gap;
      nearest = timeline[i];
    }
  }
  return nearest.aqi;
}

function isIndiaLocation(location: CityOption): boolean {
  const code = (location.countryCode ?? "").toUpperCase();
  if (code === "IN") return true;
  return location.country.trim().toLowerCase() === "india";
}

async function fetchIndiaAqiOverride(location: CityOption): Promise<IndiaAqiOverride | null> {
  if (!isIndiaLocation(location)) return null;

  try {
    const response = await fetch(`https://api.waqi.info/feed/geo:${location.latitude};${location.longitude}/?token=demo`);
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;

    const status = (payload as { status?: unknown }).status;
    if (status !== "ok") return null;

    const data = (payload as { data?: unknown }).data;
    if (!data || typeof data !== "object") return null;

    const aqi = (data as { aqi?: unknown }).aqi;
    if (typeof aqi !== "number" || !Number.isFinite(aqi)) return null;

    const attributions = (data as { attributions?: unknown }).attributions;
    const attributionNames = Array.isArray(attributions)
      ? attributions
          .map((item) => (item && typeof item === "object" ? (item as { name?: unknown }).name : undefined))
          .filter((name): name is string => typeof name === "string")
          .map((name) => name.toLowerCase())
      : [];

    const hasCpcb = attributionNames.some((name) => name.includes("cpcb"));
    const hasSafar = attributionNames.some((name) => name.includes("safar"));
    const sourceLabel = hasCpcb
      ? "WAQI India station (CPCB attribution)"
      : hasSafar
        ? "WAQI India station (SAFAR attribution)"
        : "WAQI India station";

    return {
      aqi: clamp(aqi, 0, 500),
      sourceLabel,
    };
  } catch {
    return null;
  }
}

async function fetchMetNoHours(location: CityOption): Promise<MetNoHour[]> {
  const response = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${location.latitude.toFixed(4)}&lon=${location.longitude.toFixed(4)}`,
  );
  if (!response.ok) {
    throw new Error("MET Norway unavailable");
  }

  const payload = await response.json();
  const timeSeries = payload?.properties?.timeseries;
  if (!Array.isArray(timeSeries)) {
    throw new Error("MET Norway malformed response");
  }

  const hours: MetNoHour[] = [];
  timeSeries.forEach((entry: { time?: string; data?: Record<string, unknown> }) => {
    const timeValue = typeof entry.time === "string" ? entry.time : "";
    const timeMs = new Date(timeValue).getTime();
    if (!Number.isFinite(timeMs)) return;

    const data = entry.data ?? {};
    const instant = (data.instant as { details?: Record<string, number> } | undefined)?.details ?? {};
    const nextHour = data.next_1_hours as
      | { details?: { precipitation_amount?: number }; summary?: { symbol_code?: string } }
      | undefined;

    const symbolCode = typeof nextHour?.summary?.symbol_code === "string" ? nextHour.summary.symbol_code : undefined;
    hours.push({
      timeMs,
      temperature: typeof instant.air_temperature === "number" ? instant.air_temperature : undefined,
      humidity: typeof instant.relative_humidity === "number" ? instant.relative_humidity : undefined,
      wind: typeof instant.wind_speed === "number" ? instant.wind_speed * 3.6 : undefined,
      precipitation:
        typeof nextHour?.details?.precipitation_amount === "number" ? nextHour.details.precipitation_amount : undefined,
      weatherCode: symbolCode ? mapMetSymbolToWeatherCode(symbolCode) : undefined,
    });
  });

  return hours;
}

function getWeatherIconUrl(code: number): string {
  // Free weather icon CDN mapping for visual weather states in UI.
  if (code === 0) return "https://openweathermap.org/img/wn/01d@2x.png";
  if ([1, 2].includes(code)) return "https://openweathermap.org/img/wn/02d@2x.png";
  if (code === 3) return "https://openweathermap.org/img/wn/03d@2x.png";
  if ([45, 48].includes(code)) return "https://openweathermap.org/img/wn/50d@2x.png";
  if ([51, 53, 55, 56, 57].includes(code)) return "https://openweathermap.org/img/wn/09d@2x.png";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "https://openweathermap.org/img/wn/10d@2x.png";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "https://openweathermap.org/img/wn/13d@2x.png";
  if ([95, 96, 99].includes(code)) return "https://openweathermap.org/img/wn/11d@2x.png";
  return "https://openweathermap.org/img/wn/04d@2x.png";
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 35) return "Moderate";
  return "Low";
}

function formatHour(time: string): string {
  return new Date(time).toLocaleTimeString([], { hour: "numeric" });
}

function formatDateLabel(value: string, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "N/A";
  return date.toLocaleDateString([], options);
}

function formatTimeLabel(value: string, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "N/A";
  return date.toLocaleTimeString([], options);
}

function getRadarLayerName(layer: RadarLayer): string {
  if (layer === "temperature") return "Temperature";
  if (layer === "rain") return "Rain";
  if (layer === "wind") return "Wind";
  return "Cloud";
}

function getRadarLayerUnit(layer: RadarLayer): string {
  if (layer === "temperature") return "C";
  if (layer === "rain") return "mm";
  if (layer === "wind") return "km/h";
  return "%";
}

function formatRadarValue(value: number, layer: RadarLayer): string {
  if (!Number.isFinite(value)) return "--";
  if (layer === "rain") return value.toFixed(1);
  return Math.round(value).toString();
}

function getRadarLayerContext(layer: RadarLayer): { low: number; mid: number; high: number; helper: string } {
  if (layer === "temperature") {
    return {
      low: 20,
      mid: 30,
      high: 40,
      helper: "Higher values indicate stronger heat exposure.",
    };
  }
  if (layer === "rain") {
    return {
      low: 0,
      mid: 4,
      high: 10,
      helper: "Values represent hourly precipitation intensity.",
    };
  }
  if (layer === "wind") {
    return {
      low: 10,
      mid: 24,
      high: 38,
      helper: "Higher speeds can disrupt field operations.",
    };
  }

  return {
    low: 20,
    mid: 55,
    high: 90,
    helper: "Cloud cover indicates sky blockage in percent.",
  };
}

function getRadarLayerEmbedOverlay(layer: RadarLayer): string {
  if (layer === "temperature") return "temp";
  if (layer === "rain") return "rain";
  if (layer === "wind") return "wind";
  return "clouds";
}

function getRadarPointValue(point: RadarPoint, layer: RadarLayer): number {
  if (layer === "temperature") return point.temperature;
  if (layer === "rain") return point.precipitation;
  if (layer === "wind") return point.wind;
  return point.cloudCover;
}

function getRadarPointColor(layer: RadarLayer, value: number): string {
  if (layer === "temperature") {
    if (value >= 40) return "rgba(220, 38, 38, 0.9)";
    if (value >= 35) return "rgba(249, 115, 22, 0.88)";
    if (value >= 30) return "rgba(251, 191, 36, 0.84)";
    return "rgba(56, 189, 248, 0.8)";
  }
  if (layer === "rain") {
    if (value >= 8) return "rgba(14, 116, 144, 0.92)";
    if (value >= 4) return "rgba(2, 132, 199, 0.88)";
    if (value >= 1) return "rgba(56, 189, 248, 0.84)";
    return "rgba(148, 163, 184, 0.45)";
  }
  if (layer === "wind") {
    if (value >= 35) return "rgba(168, 85, 247, 0.9)";
    if (value >= 25) return "rgba(99, 102, 241, 0.86)";
    if (value >= 15) return "rgba(14, 165, 233, 0.82)";
    return "rgba(100, 116, 139, 0.5)";
  }
  if (value >= 85) return "rgba(148, 163, 184, 0.9)";
  if (value >= 60) return "rgba(148, 163, 184, 0.78)";
  if (value >= 35) return "rgba(148, 163, 184, 0.62)";
  return "rgba(30, 41, 59, 0.55)";
}

function buildRadarWindyUrl(location: CityOption, layer: RadarLayer): string {
  const overlay = getRadarLayerEmbedOverlay(layer);
  const lat = location.latitude.toFixed(3);
  const lon = location.longitude.toFixed(3);
  return `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=450&zoom=5&level=surface&overlay=${overlay}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=true&metricWind=km/h&metricTemp=C&radarRange=-1`;
}

function getColorAlpha(color: string, alpha: number): string {
  return color.replace(/rgba\(([^)]+),[^)]+\)/, `rgba($1, ${alpha.toFixed(2)})`);
}

function buildRadarGradientField(frame: RadarFrame | null, layer: RadarLayer): string {
  if (!frame?.points.length) {
    return "radial-gradient(circle at 20% 25%, rgba(34, 211, 238, 0.2) 0%, rgba(15, 23, 42, 0) 30%), radial-gradient(circle at 76% 72%, rgba(251, 146, 60, 0.18) 0%, rgba(15, 23, 42, 0) 34%)";
  }

  const gradients = frame.points.map((point) => {
    const value = getRadarPointValue(point, layer);
    const color = getRadarPointColor(layer, value);
    const spread = 18 + clamp(value, 0, 40) * 0.5;
    return `radial-gradient(circle at ${point.x}% ${point.y}%, ${getColorAlpha(color, 0.34)} 0%, ${getColorAlpha(color, 0.17)} ${Math.round(
      spread,
    )}%, rgba(2, 6, 23, 0) ${Math.round(spread + 26)}%)`;
  });

  gradients.push("linear-gradient(170deg, rgba(8,47,73,0.72) 0%, rgba(15,23,42,0.84) 46%, rgba(2,6,23,0.95) 100%)");
  return gradients.join(",");
}

function buildRadarGrid(location: CityOption): RadarGridNode[] {
  const kmStep = 90;
  const latStep = kmStep / 111;
  const lonStep = kmStep / (111 * Math.max(0.3, Math.cos((location.latitude * Math.PI) / 180)));

  const layout = [
    { id: "nww", label: "NWW", x: 10, y: 16, dx: -2, dy: -2 },
    { id: "nw", label: "NW", x: 25, y: 14, dx: -1, dy: -2 },
    { id: "nn", label: "N", x: 50, y: 12, dx: 0, dy: -2 },
    { id: "ne", label: "NE", x: 75, y: 14, dx: 1, dy: -2 },
    { id: "nee", label: "NEE", x: 90, y: 16, dx: 2, dy: -2 },
    { id: "ww", label: "WW", x: 8, y: 50, dx: -2, dy: 0 },
    { id: "w", label: "W", x: 24, y: 50, dx: -1, dy: 0 },
    { id: "c", label: location.name, x: 50, y: 50, dx: 0, dy: 0 },
    { id: "e", label: "E", x: 76, y: 50, dx: 1, dy: 0 },
    { id: "ee", label: "EE", x: 92, y: 50, dx: 2, dy: 0 },
    { id: "sww", label: "SWW", x: 10, y: 84, dx: -2, dy: 2 },
    { id: "sw", label: "SW", x: 25, y: 86, dx: -1, dy: 2 },
    { id: "ss", label: "S", x: 50, y: 88, dx: 0, dy: 2 },
    { id: "se", label: "SE", x: 75, y: 86, dx: 1, dy: 2 },
    { id: "see", label: "SEE", x: 90, y: 84, dx: 2, dy: 2 },
    { id: "nnw", label: "NNW", x: 36, y: 24, dx: -1, dy: -1 },
    { id: "nne", label: "NNE", x: 64, y: 24, dx: 1, dy: -1 },
    { id: "ssw", label: "SSW", x: 36, y: 76, dx: -1, dy: 1 },
    { id: "sse", label: "SSE", x: 64, y: 76, dx: 1, dy: 1 },
    { id: "midw", label: "MW", x: 36, y: 50, dx: -0.5, dy: 0 },
    { id: "mide", label: "ME", x: 64, y: 50, dx: 0.5, dy: 0 },
  ];

  return layout.map((item) => ({
    id: item.id,
    label: item.label,
    x: item.x,
    y: item.y,
    latitude: location.latitude + item.dy * latStep,
    longitude: location.longitude + item.dx * lonStep,
  }));
}

async function fetchRadarSeries(node: RadarGridNode): Promise<RadarSeries> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${node.latitude}&longitude=${node.longitude}&hourly=temperature_2m,precipitation,wind_speed_10m,cloud_cover&timezone=auto&forecast_hours=30&past_hours=2`,
  );
  if (!response.ok) {
    throw new Error("Radar source unavailable");
  }

  const payload = await response.json();
  const times: string[] = payload?.hourly?.time ?? [];
  const temperature: number[] = payload?.hourly?.temperature_2m ?? [];
  const precipitation: number[] = payload?.hourly?.precipitation ?? [];
  const wind: number[] = payload?.hourly?.wind_speed_10m ?? [];
  const cloudCover: number[] = payload?.hourly?.cloud_cover ?? [];

  const valid =
    Array.isArray(times) &&
    times.length > 0 &&
    [temperature, precipitation, wind, cloudCover].every((arr) => Array.isArray(arr) && arr.length >= times.length);

  if (!valid) {
    throw new Error("Radar source returned malformed hourly data.");
  }

  return { times, temperature, precipitation, wind, cloudCover };
}

function findNearestTimeIndex(times: string[], targetMs: number): number {
  let closestIndex = -1;
  let closestGap = Number.POSITIVE_INFINITY;
  for (let i = 0; i < times.length; i += 1) {
    const timeMs = new Date(times[i]).getTime();
    if (!Number.isFinite(timeMs)) continue;
    const gap = Math.abs(timeMs - targetMs);
    if (gap < closestGap) {
      closestGap = gap;
      closestIndex = i;
    }
  }
  return closestIndex;
}

async function fetchRadarFrames(location: CityOption): Promise<{ frames: RadarFrame[]; confidence: number }> {
  const nodes = buildRadarGrid(location);
  const settled = await Promise.allSettled(nodes.map((node) => fetchRadarSeries(node)));

  const successful: Array<{ node: RadarGridNode; series: RadarSeries }> = [];
  settled.forEach((item, index) => {
    if (item.status === "fulfilled") {
      successful.push({ node: nodes[index], series: item.value });
    }
  });

  const centerSeries = successful.find((item) => item.node.id === "c")?.series;
  if (!centerSeries) {
    throw new Error("Radar center data is unavailable for this city.");
  }

  const nowMs = Date.now() - 30 * 60 * 1000;
  const candidateIndexes = centerSeries.times
    .map((time, index) => ({ index, timeMs: new Date(time).getTime() }))
    .filter((entry) => Number.isFinite(entry.timeMs) && entry.timeMs >= nowMs)
    .map((entry) => entry.index)
    .slice(0, 18);

  if (!candidateIndexes.length) {
    throw new Error("Radar timeline is unavailable for this city right now.");
  }

  const frames: RadarFrame[] = candidateIndexes.map((timeIndex) => {
    const frameTime = centerSeries.times[timeIndex];
    const frameTimeMs = new Date(frameTime).getTime();
    const points: RadarPoint[] = [];

    successful.forEach(({ node, series }) => {
      const seriesIndex = findNearestTimeIndex(series.times, frameTimeMs);
      if (seriesIndex < 0) return;

      const temperature = series.temperature[seriesIndex] ?? Number.NaN;
      const precipitation = series.precipitation[seriesIndex] ?? Number.NaN;
      const wind = series.wind[seriesIndex] ?? Number.NaN;
      const cloudCover = series.cloudCover[seriesIndex] ?? Number.NaN;

      if (![temperature, precipitation, wind, cloudCover].every((value) => Number.isFinite(value))) {
        return;
      }

      const risk = clamp((temperature - 26) * 3 + precipitation * 6 + (cloudCover / 100) * 12 + (wind >= 30 ? 8 : 0), 0, 100);
      points.push({
        id: node.id,
        label: node.label,
        x: node.x,
        y: node.y,
        temperature,
        precipitation,
        wind,
        cloudCover,
        risk,
      });
    });

    return {
      time: frameTime,
      points,
      coverage: nodes.length ? points.length / nodes.length : 0,
    };
  });

  const validFrames = frames.filter((frame) => frame.points.length > 0);
  if (!validFrames.length) {
    throw new Error("Radar fields are incomplete for this city.");
  }

  const confidence = Math.round(
    clamp(
      validFrames.reduce((sum, frame) => sum + frame.coverage, 0) / Math.max(1, validFrames.length) * 100,
      45,
      99,
    ),
  );

  return { frames: validFrames, confidence };
}

function isAutocompleteCityOption(
  value: AutocompleteGeoResult,
): value is AutocompleteGeoResult & { name: string; country: string; latitude: number; longitude: number } {
  return (
    typeof value.name === "string" &&
    typeof value.country === "string" &&
    typeof value.latitude === "number" &&
    typeof value.longitude === "number"
  );
}

function buildHydrationGuidance(avgRisk: number, hottestTemp: number, audience: string): string {
  const audienceBoost =
    audience === "Construction teams" || audience === "Outdoor workers" || audience === "Delivery drivers"
      ? 1.2
      : audience === "Elderly residents"
        ? 1.1
        : 1;
  const riskBoost = avgRisk >= 70 ? 1.4 : avgRisk >= 50 ? 1.2 : 1;
  const tempBoost = hottestTemp >= 40 ? 1.3 : hottestTemp >= 34 ? 1.15 : 1;
  const liters = (2.2 * audienceBoost * riskBoost * tempBoost).toFixed(1);

  return `Target daily hydration: ${liters}L. Use a 30-minute reminder cycle, add oral rehydration salts during peak heat, and increase cool-down breaks between ${hottestTemp >= 35 ? "11 AM and 4 PM" : "12 PM and 3 PM"}.`;
}

function findSafeWindows(points: HourPoint[]): string[] {
  const safe = points.filter((point) => point.risk < 40);
  if (!safe.length) return ["No low-risk blocks in the next 24 hours. Prefer essential activity only."];

  const windows: string[] = [];
  let start = safe[0];
  let previous = safe[0];

  for (let i = 1; i < safe.length; i += 1) {
    const current = safe[i];
    const gap = new Date(current.time).getTime() - new Date(previous.time).getTime();
    if (gap > 60 * 60 * 1000) {
      windows.push(`${formatHour(start.time)} - ${formatHour(previous.time)}`);
      start = current;
    }
    previous = current;
  }
  windows.push(`${formatHour(start.time)} - ${formatHour(previous.time)}`);

  return windows.slice(0, 3);
}

function buildFallbackPlan(points: HourPoint[], city: string, audience: string): string {
  const sorted = [...points].sort((a, b) => a.risk - b.risk);
  const safest = sorted.slice(0, 3);
  const highest = points.reduce((acc, curr) => (curr.risk > acc.risk ? curr : acc), points[0]);
  const worstAqi = points.reduce((acc, curr) => (curr.aqi > acc.aqi ? curr : acc), points[0]);

  return [
    `For ${audience} in ${city}, prioritize tasks around ${safest.map((point) => formatHour(point.time)).join(", ")}.`,
    `Peak combined risk is around ${formatHour(highest.time)}. Shift heavy activity away from that hour.`,
    `AQI may reach ${Math.round(worstAqi.aqi)}. Keep masks ready for sensitive groups and rotate indoor recovery breaks.`,
    "Use buddy checks every 2 hours and stop outdoor duty if signs of heat stress appear.",
  ].join("\n");
}

function buildShiftOptimizer(points: HourPoint[]): string[] {
  const heavyTaskHours = points.filter((point) => point.risk < 35).slice(0, 4);
  const moderateTaskHours = points.filter((point) => point.risk >= 35 && point.risk < 55).slice(0, 4);
  const noGoHours = points.filter((point) => point.risk >= 75).slice(0, 3);

  return [
    heavyTaskHours.length
      ? `Heavy work window: ${heavyTaskHours.map((point) => formatHour(point.time)).join(", ")}.`
      : "Heavy work window: none in the next 24 hours. Use only emergency duty.",
    moderateTaskHours.length
      ? `Moderate work window: ${moderateTaskHours.map((point) => formatHour(point.time)).join(", ")}.`
      : "Moderate work window: limited. Keep rotations short and supervised.",
    noGoHours.length
      ? `No-go hours for outdoor strain: ${noGoHours.map((point) => formatHour(point.time)).join(", ")}.`
      : "No-go hours: not detected, but continue hourly monitoring.",
  ];
}

function buildRiskDrivers(points: HourPoint[]): string[] {
  let heatHits = 0;
  let uvHits = 0;
  let airHits = 0;
  let humidityHits = 0;

  points.forEach((point) => {
    if (point.temperature >= 35) heatHits += 1;
    if (point.uvIndex >= 8) uvHits += 1;
    if (point.aqi >= 100) airHits += 1;
    if (point.humidity >= 80 && point.temperature >= 30) humidityHits += 1;
  });

  const drivers = [
    { name: "Extreme heat load", value: heatHits },
    { name: "UV exposure", value: uvHits },
    { name: "Air-quality stress", value: airHits },
    { name: "Humidity discomfort", value: humidityHits },
  ]
    .sort((a, b) => b.value - a.value)
    .filter((item) => item.value > 0)
    .slice(0, 3)
    .map((item) => `${item.name} present in ${item.value} of next 24 hours.`);

  return drivers.length ? drivers : ["No major risk driver spikes detected in the next 24 hours."];
}

function buildSimulation(points: HourPoint[]): SimulationBrief {
  const baseAverage = Math.round(points.reduce((sum, point) => sum + point.risk, 0) / points.length);
  const adjusted = points.map((point) => {
    let loweredRisk = point.risk;
    if (point.temperature >= 32) loweredRisk -= 10;
    if (point.uvIndex >= 8) loweredRisk -= 7;
    if (point.aqi >= 100) loweredRisk -= 6;
    return Math.max(0, loweredRisk);
  });
  const projectedAverageRisk = Math.round(adjusted.reduce((sum, risk) => sum + risk, 0) / adjusted.length);

  return {
    projectedAverageRisk,
    reduction: Math.max(0, baseAverage - projectedAverageRisk),
    noGoHours: points.filter((point) => point.risk >= 75).length,
  };
}

function buildChecklist(avgRisk: number, audience: string, peakAqi: number, hottestTemp: number): string[] {
  const checklist: string[] = [];
  checklist.push("Assign a safety lead and enforce check-ins every 2 hours.");
  if (avgRisk >= 60) checklist.push("Activate 20-minute cool-down breaks after each 40 minutes of outdoor duty.");
  if (hottestTemp >= 38) checklist.push("Set up shaded hydration stations within 100 meters of work zones.");
  if (peakAqi >= 120) checklist.push("Issue N95 masks and move sensitive members indoors during AQI spikes.");
  if (audience === "School children") checklist.push("Reschedule sports to early morning and keep indoor backup activities ready.");
  if (audience === "Elderly residents") checklist.push("Run midday wellness calls for elderly households and keep emergency contacts active.");
  return checklist;
}

function buildFallbackAlert(cityLabel: string, risk: number, safeWindows: string[]): string {
  return `Heat Alert ${cityLabel}: 24h risk ${risk}/100. Avoid heavy outdoor activity in peak hours. Safest windows: ${safeWindows.join(
    ", ",
  )}. Hydrate regularly and report dizziness immediately.`;
}

function buildWeatherAlerts(points: HourPoint[]): string[] {
  const alerts: string[] = [];
  const thunderHours = points.filter((point) => [95, 96, 99].includes(point.weatherCode));
  const heavyRainHours = points.filter((point) => point.precipitationProbability >= 70 || point.precipitation >= 5);
  const strongWindHours = points.filter((point) => point.wind >= 35);

  if (thunderHours.length) {
    alerts.push(
      `Thunderstorm signal around ${formatHour(thunderHours[0].time)}. Pause exposed outdoor tasks and secure electrical tools.`,
    );
  }
  if (heavyRainHours.length) {
    alerts.push(
      `High rain chance near ${formatHour(heavyRainHours[0].time)}. Keep backup indoor routes and waterproof equipment ready.`,
    );
  }
  if (strongWindHours.length) {
    alerts.push(
      `Strong winds expected around ${formatHour(strongWindHours[0].time)}. Avoid elevated platform work and loose signage.`,
    );
  }

  return alerts.length ? alerts : ["No severe weather disruptions detected in the next 24 hours."];
}

function buildComfortWindows(points: HourPoint[]): string[] {
  const comfort = points.filter(
    (point) =>
      point.risk < 45 &&
      point.precipitationProbability < 35 &&
      point.temperature >= 20 &&
      point.temperature <= 33 &&
      point.wind < 30,
  );

  if (!comfort.length) return ["No ideal comfort slots detected. Use short rotations and shaded breaks."];

  return comfort.slice(0, 4).map((point) => `${formatHour(point.time)} (${getWeatherLabel(point.weatherCode)})`);
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function getDistanceKm(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const earthRadiusKm = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLon = toRad(toLon - fromLon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function getNewsImpactBoost(news: WeatherNewsItem[]): number {
  if (!news.length) return 0;
  return news.reduce((sum, item) => {
    const recencyBoost = item.daysAgo <= 1 ? 7 : item.daysAgo <= 3 ? 5 : 3;
    const proximityBoost = item.distanceKm <= 300 ? 6 : item.distanceKm <= 700 ? 4 : 2;
    return sum + recencyBoost + proximityBoost;
  }, 0);
}

function buildActionPlanIndex(
  points: HourPoint[],
  news: WeatherNewsItem[],
  cityLabel: string,
): ActionPlanIndexEntry[] {
  if (!points.length) return [];

  const averageRisk = points.reduce((sum, point) => sum + point.risk, 0) / points.length;
  const peakRisk = points.reduce((acc, point) => (point.risk > acc ? point.risk : acc), 0);
  const maxAqi = points.reduce((acc, point) => (point.aqi > acc ? point.aqi : acc), 0);
  const newsBoost = getNewsImpactBoost(news);

  const profiles: Array<{ category: string; heat: number; air: number; rain: number; uv: number }> = [
    { category: "Outdoor workers", heat: 1.2, air: 1.1, rain: 1, uv: 1.1 },
    { category: "School children", heat: 1.05, air: 1.1, rain: 1.05, uv: 1.15 },
    { category: "Elderly residents", heat: 1.15, air: 1.25, rain: 1, uv: 1 },
    { category: "Delivery drivers", heat: 1.1, air: 1.05, rain: 1.15, uv: 1.05 },
    { category: "Construction teams", heat: 1.25, air: 1.05, rain: 1.1, uv: 1.1 },
  ];

  return profiles.map((profile) => {
    const heatScore = clamp(averageRisk * profile.heat, 0, 100);
    const airScore = clamp((maxAqi - 35) * 0.35 * profile.air, 0, 30);
    const rainExposureHours = points.filter((point) => point.precipitationProbability >= 65).length;
    const rainScore = clamp(rainExposureHours * 1.8 * profile.rain, 0, 20);
    const uvHours = points.filter((point) => point.uvIndex >= 8).length;
    const uvScore = clamp(uvHours * 1.6 * profile.uv, 0, 16);
    const peakBoost = peakRisk >= 85 ? 8 : peakRisk >= 75 ? 5 : 2;
    const score = Math.round(clamp(heatScore + airScore + rainScore + uvScore + peakBoost + newsBoost, 0, 100));
    const level = getRiskLevel(score);

    return {
      category: profile.category,
      score,
      level,
      rationale: `${cityLabel}: heat ${heatScore.toFixed(0)}, AQI load ${airScore.toFixed(0)}, weather-news impact ${newsBoost}.`,
    };
  });
}

async function fetchDailyWeatherNews(location: CityOption): Promise<WeatherNewsItem[]> {
  try {
    const response = await fetch(
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=14&category=severeStorms,floods,wildfires,drought",
    );
    if (!response.ok) return [];

    const payload: unknown = await response.json();
    const events = (payload as { events?: unknown })?.events;
    if (!Array.isArray(events)) return [];

    const nowMs = Date.now();
    const mapped: WeatherNewsItem[] = [];

    events.forEach((event) => {
      if (!event || typeof event !== "object") return;
      const title = (event as { title?: unknown }).title;
      const categories = (event as { categories?: unknown }).categories;
      const geometries = (event as { geometry?: unknown }).geometry;
      if (typeof title !== "string" || !Array.isArray(categories) || !Array.isArray(geometries)) return;

      const categoryTitle = categories
        .map((item) => (item && typeof item === "object" ? (item as { title?: unknown }).title : undefined))
        .find((item): item is string => typeof item === "string");

      geometries.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const date = (entry as { date?: unknown }).date;
        const coordinates = (entry as { coordinates?: unknown }).coordinates;
        if (typeof date !== "string" || !Array.isArray(coordinates) || coordinates.length < 2) return;

        const [lon, lat] = coordinates;
        if (typeof lat !== "number" || typeof lon !== "number") return;

        const dateMs = new Date(date).getTime();
        if (!Number.isFinite(dateMs)) return;
        const daysAgo = Math.floor((nowMs - dateMs) / 86400000);
        if (daysAgo < 0 || daysAgo > 7) return;

        const distanceKm = getDistanceKm(location.latitude, location.longitude, lat, lon);
        if (distanceKm > 1200) return;

        mapped.push({
          title,
          category: categoryTitle ?? "Weather event",
          daysAgo,
          distanceKm: Math.round(distanceKm),
        });
      });
    });

    return mapped
      .sort((a, b) => a.daysAgo - b.daysAgo || a.distanceKm - b.distanceKm)
      .slice(0, 4);
  } catch {
    return [];
  }
}

async function resolveCity(cityName: string): Promise<CityOption> {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=10&language=en&format=json`,
  );
  if (!response.ok) {
    throw new Error("Could not reach location service. Please try again.");
  }
  const data = await response.json();
  const results: Array<{
    name: string;
    country: string;
    country_code?: string;
    admin1?: string;
    timezone?: string;
    latitude: number;
    longitude: number;
    population?: number;
  }> = data?.results ?? [];

  const normalizedInput = cityName.trim().toLowerCase();
  const exactMatches = results.filter((item) => item.name.trim().toLowerCase() === normalizedInput);
  const pool = exactMatches.length ? exactMatches : results;
  const firstResult = pool.sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0];

  if (!firstResult) {
    throw new Error(`Location \"${cityName}\" not found. Try another city name.`);
  }

  return {
    name: firstResult.name,
    country: firstResult.country,
    countryCode: firstResult.country_code,
    admin1: firstResult.admin1,
    timezone: firstResult.timezone,
    latitude: firstResult.latitude,
    longitude: firstResult.longitude,
  };
}

async function resolveLocationFromCoordinates(latitude: number, longitude: number): Promise<CityOption> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`,
    );
    if (!response.ok) {
      throw new Error("Reverse lookup unavailable");
    }

    const data = await response.json();
    const firstResult = data?.results?.[0];

    if (firstResult) {
      return {
        name: firstResult.name,
        country: firstResult.country,
        countryCode: firstResult.country_code,
        admin1: firstResult.admin1,
        timezone: firstResult.timezone,
        latitude,
        longitude,
      };
    }
  } catch {
    // Fall back to neutral label while still using precise GPS coordinates.
  }

  return {
    name: "Your location",
    country: "Live GPS",
    latitude,
    longitude,
  };
}

async function fetchRiskPoints(
  location: CityOption,
): Promise<{ points: HourPoint[]; outlook: DayOutlook[]; current: CurrentWeatherSnapshot; source: string }> {
  const [weatherResponse, airResponse, metHours, indiaAqiOverride] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,uv_index,wind_speed_10m,precipitation_probability,precipitation,weather_code&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,weather_code&timezone=auto&forecast_days=3`,
    ),
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}&hourly=us_aqi&timezone=auto&forecast_days=2`,
    ),
    fetchMetNoHours(location).catch(() => [] as MetNoHour[]),
    fetchIndiaAqiOverride(location),
  ]);

  if (!weatherResponse.ok) {
    throw new Error("Weather API is unavailable right now.");
  }
  if (!airResponse.ok) {
    throw new Error("Air-quality API is unavailable right now.");
  }

  const weather = await weatherResponse.json();
  const air = await airResponse.json();
  const now = new Date();
  const weatherTimes: string[] = weather?.hourly?.time ?? [];
  const temperatureSeries: number[] = weather?.hourly?.temperature_2m ?? [];
  const apparentSeries: number[] = weather?.hourly?.apparent_temperature ?? [];
  const humiditySeries: number[] = weather?.hourly?.relative_humidity_2m ?? [];
  const uvSeries: number[] = weather?.hourly?.uv_index ?? [];
  const windSeries: number[] = weather?.hourly?.wind_speed_10m ?? [];
  const precipProbSeries: number[] = weather?.hourly?.precipitation_probability ?? [];
  const precipSeries: number[] = weather?.hourly?.precipitation ?? [];
  const weatherCodeSeries: number[] = weather?.hourly?.weather_code ?? [];

  const hasValidWeatherStructure =
    Array.isArray(weatherTimes) &&
    weatherTimes.length > 0 &&
    hasSeriesData(temperatureSeries) &&
    hasSeriesData(apparentSeries) &&
    hasSeriesData(humiditySeries) &&
    hasSeriesData(uvSeries) &&
    hasSeriesData(windSeries) &&
    hasSeriesData(precipProbSeries) &&
    hasSeriesData(precipSeries) &&
    hasSeriesData(weatherCodeSeries);

  if (!hasValidWeatherStructure) {
    throw new Error("Weather API returned incomplete data for this location.");
  }

  if (
    ![
      temperatureSeries.length,
      apparentSeries.length,
      humiditySeries.length,
      uvSeries.length,
      windSeries.length,
      precipProbSeries.length,
      precipSeries.length,
      weatherCodeSeries.length,
    ].every((length) => length >= weatherTimes.length)
  ) {
    throw new Error("Weather API returned misaligned hourly data.");
  }

  const airTimes: string[] = air?.hourly?.time ?? [];
  const airAqiSeries: number[] = air?.hourly?.us_aqi ?? [];
  const airByTime = new Map<string, number>();
  const airTimeline: Array<{ timeMs: number; aqi: number }> = [];
  airTimes.forEach((time, index) => {
    const value = airAqiSeries[index];
    if (typeof value === "number" && Number.isFinite(value)) {
      airByTime.set(time, value);
      const timeMs = new Date(time).getTime();
      if (Number.isFinite(timeMs)) {
        airTimeline.push({ timeMs, aqi: value });
      }
    }
  });

  function getAqiForTime(targetIsoTime: string): number {
    const exact = airByTime.get(targetIsoTime);
    if (typeof exact === "number") return exact;

    const targetMs = new Date(targetIsoTime).getTime();
    if (!Number.isFinite(targetMs) || airTimeline.length === 0) return 40;

    let nearest = airTimeline[0];
    let smallestGap = Math.abs(airTimeline[0].timeMs - targetMs);
    for (let i = 1; i < airTimeline.length; i += 1) {
      const gap = Math.abs(airTimeline[i].timeMs - targetMs);
      if (gap < smallestGap) {
        smallestGap = gap;
        nearest = airTimeline[i];
      }
    }

    return nearest.aqi;
  }

  const nowWithTolerance = now.getTime() - 30 * 60 * 1000;

  const next24Indexes = weatherTimes
    .map((time, index) => ({ time: new Date(time), index }))
    .filter((entry) => Number.isFinite(entry.time.getTime()) && entry.time.getTime() >= nowWithTolerance)
    .slice(0, 24)
    .map((entry) => entry.index);

  const current = weather?.current;
  if (
    !current ||
    typeof current.temperature_2m !== "number" ||
    typeof current.apparent_temperature !== "number" ||
    typeof current.relative_humidity_2m !== "number" ||
    typeof current.precipitation !== "number" ||
    typeof current.weather_code !== "number" ||
    typeof current.wind_speed_10m !== "number" ||
    typeof current.is_day !== "number" ||
    typeof current.time !== "string"
  ) {
    throw new Error("Current weather data is unavailable for this city.");
  }

  const nowIndex = weatherTimes.findIndex((time) => time === current.time);
  const nearestNowIndex = nowIndex >= 0 ? nowIndex : next24Indexes[0] ?? 0;
  const currentTimeMs = new Date(current.time).getTime();
  const baseCurrentAqi = getNearestAqiFromTimeline(currentTimeMs, airTimeline, 40);
  const adjustedCurrentAqi = indiaAqiOverride?.aqi ?? baseCurrentAqi;
  const aqiCorrection = adjustedCurrentAqi - baseCurrentAqi;
  const tempBias = clamp(current.temperature_2m - (temperatureSeries[nearestNowIndex] ?? current.temperature_2m), -4, 4);
  const apparentBias = clamp(current.apparent_temperature - (apparentSeries[nearestNowIndex] ?? current.apparent_temperature), -4, 4);
  const humidityBias = clamp(current.relative_humidity_2m - (humiditySeries[nearestNowIndex] ?? current.relative_humidity_2m), -15, 15);
  const windBias = clamp(current.wind_speed_10m - (windSeries[nearestNowIndex] ?? current.wind_speed_10m), -12, 12);
  const precipitationBias = clamp(current.precipitation - (precipSeries[nearestNowIndex] ?? current.precipitation), -2, 2);

  let metMatches = 0;
  const points = next24Indexes.map((index, hourOffset): HourPoint => {
    const hourTime = weatherTimes[index];
    const hourMs = new Date(hourTime).getTime();
    const metHour = findNearestMetHour(hourMs, metHours);
    const decay12h = clamp(1 - hourOffset / 12, 0, 1);
    const decay6h = clamp(1 - hourOffset / 6, 0, 1);
    const blendWeight = hourOffset < 12 ? 0.35 : 0.2;
    const baseTemperature = temperatureSeries[index] ?? 0;
    const baseApparent = apparentSeries[index] ?? baseTemperature;
    const baseHumidity = humiditySeries[index] ?? 0;
    let temperature = baseTemperature + tempBias * decay12h;
    let apparentTemperature = baseApparent + apparentBias * decay12h;
    let humidity = clamp(baseHumidity + humidityBias * decay12h, 1, 100);
    const uvIndex = uvSeries[index] ?? 0;
    let precipitationProbability = clamp(
      (precipProbSeries[index] ?? 0) + (precipitationBias > 0 ? precipitationBias * 8 * decay6h : 0),
      0,
      100,
    );
    let precipitation = Math.max(0, (precipSeries[index] ?? 0) + precipitationBias * decay6h);
    let weatherCode = weatherCodeSeries[index] ?? 0;
    let aqi = getAqiForTime(hourTime);
    let wind = Math.max(0, (windSeries[index] ?? 0) + windBias * decay12h);

    if (indiaAqiOverride) {
      aqi = clamp(aqi + aqiCorrection * decay12h, 0, 500);
    }

    if (metHour) {
      metMatches += 1;
      if (typeof metHour.temperature === "number") {
        temperature = temperature * (1 - blendWeight) + metHour.temperature * blendWeight;
        apparentTemperature = apparentTemperature * (1 - blendWeight) + metHour.temperature * blendWeight;
      }
      if (typeof metHour.humidity === "number") {
        humidity = clamp(humidity * (1 - blendWeight) + metHour.humidity * blendWeight, 1, 100);
      }
      if (typeof metHour.wind === "number") {
        wind = Math.max(0, wind * (1 - blendWeight) + metHour.wind * blendWeight);
      }
      if (typeof metHour.precipitation === "number") {
        precipitation = Math.max(0, precipitation * (1 - blendWeight) + metHour.precipitation * blendWeight);
        precipitationProbability = clamp(
          Math.max(precipitationProbability, metHour.precipitation > 0 ? 55 : precipitationProbability),
          0,
          100,
        );
      }
      if (typeof metHour.weatherCode === "number") {
        weatherCode = metHour.weatherCode;
      }
    }

    const blendedHeatIndex = calculateHeatIndexC(temperature, humidity);

    const tempLoad = clamp((apparentTemperature - 24) * 2.4, 0, 38);
    const heatIndexLoad = clamp((blendedHeatIndex - 27) * 1.8, 0, 20);
    const uvLoad = clamp(uvIndex * 2.2, 0, 24);
    const airLoad = clamp((aqi - 35) * 0.24, 0, 22);
    const humidityLoad = humidity >= 70 && temperature >= 28 ? clamp((humidity - 70) * 0.3, 0, 8) : 0;
    const rainLoad = precipitationProbability >= 65 && humidity >= 75 ? 3 : 0;
    const windRelief = clamp((wind - 12) * 0.35, 0, 7);
    const risk = clamp(5 + tempLoad + heatIndexLoad + uvLoad + airLoad + humidityLoad + rainLoad - windRelief, 0, 100);

    return {
      time: hourTime,
      temperature,
      apparentTemperature,
      heatIndex: blendedHeatIndex,
      uvIndex,
      humidity,
      precipitationProbability,
      precipitation,
      weatherCode,
      wind,
      aqi,
      risk: Number(risk.toFixed(1)),
    };
  });

  const dayTimes: string[] = weather?.daily?.time ?? [];
  if (!Array.isArray(dayTimes)) {
    throw new Error("Daily weather outlook is unavailable for this city.");
  }
  const baseOutlook = dayTimes.slice(0, 3).map((date, index) => ({
    date,
    maxTemp: weather?.daily?.temperature_2m_max?.[index] ?? 0,
    minTemp: weather?.daily?.temperature_2m_min?.[index] ?? 0,
    rainChance: weather?.daily?.precipitation_probability_max?.[index] ?? 0,
    sunrise: weather?.daily?.sunrise?.[index] ?? "",
    sunset: weather?.daily?.sunset?.[index] ?? "",
    weatherCode: weather?.daily?.weather_code?.[index] ?? 0,
  }));

  const moonSeries = await Promise.all(
    baseOutlook.map((day) => {
      const middayUnix = Math.floor(new Date(`${day.date}T12:00:00Z`).getTime() / 1000);
      return fetchMoonPhaseInfo(middayUnix);
    }),
  );

  const outlook: DayOutlook[] = baseOutlook.map((day, index) => ({
    ...day,
    moonPhase: moonSeries[index]?.phase ?? "Moon phase unavailable",
    moonIllumination: moonSeries[index]?.illumination ?? 0,
  }));

  if (!points.length) {
    throw new Error("No forecast data available for this city right now.");
  }

  const currentSnapshot: CurrentWeatherSnapshot = {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    precipitation: current.precipitation,
    weatherCode: current.weather_code,
    wind: current.wind_speed_10m,
    aqi: adjustedCurrentAqi,
    time: current.time,
    isDay: current.is_day === 1,
  };

  const currentMet = findNearestMetHour(currentTimeMs, metHours, 2 * 60 * 60 * 1000);
  if (currentMet) {
    const nowBlendWeight = 0.4;
    if (typeof currentMet.temperature === "number") {
      currentSnapshot.temperature = currentSnapshot.temperature * (1 - nowBlendWeight) + currentMet.temperature * nowBlendWeight;
      currentSnapshot.apparentTemperature =
        currentSnapshot.apparentTemperature * (1 - nowBlendWeight) + currentMet.temperature * nowBlendWeight;
    }
    if (typeof currentMet.humidity === "number") {
      currentSnapshot.humidity =
        currentSnapshot.humidity * (1 - nowBlendWeight) + currentMet.humidity * nowBlendWeight;
    }
    if (typeof currentMet.wind === "number") {
      currentSnapshot.wind = currentSnapshot.wind * (1 - nowBlendWeight) + currentMet.wind * nowBlendWeight;
    }
    if (typeof currentMet.precipitation === "number") {
      currentSnapshot.precipitation =
        currentSnapshot.precipitation * (1 - nowBlendWeight) + currentMet.precipitation * nowBlendWeight;
    }
    if (typeof currentMet.weatherCode === "number") {
      currentSnapshot.weatherCode = currentMet.weatherCode;
    }
  }

  const metCoverage = next24Indexes.length ? Math.round((metMatches / next24Indexes.length) * 100) : 0;
  const weatherSource = metCoverage >= 30
    ? `Open-Meteo + MET Norway blend (${metCoverage}% cross-source overlap)`
    : "Open-Meteo primary (MET Norway overlap unavailable)";
  const aqiSource = indiaAqiOverride
    ? `AQI source: ${indiaAqiOverride.sourceLabel} + Open-Meteo Air Quality calibration`
    : "AQI source: Open-Meteo Air Quality";
  const source = `${weatherSource} | ${aqiSource}`;

  return { points, outlook, current: currentSnapshot, source };
}

export default function App() {
  const [city, setCity] = useState("Delhi");
  const [compareCity, setCompareCity] = useState("");
  const [audience, setAudience] = useState("Outdoor workers");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hourlyRisk, setHourlyRisk] = useState<HourPoint[]>([]);
  const [resolvedCity, setResolvedCity] = useState("");
  const [aiPlan, setAiPlan] = useState("");
  const [usedFallback, setUsedFallback] = useState(false);
  const [safeWindows, setSafeWindows] = useState<string[]>([]);
  const [hydrationPlan, setHydrationPlan] = useState("");
  const [comparisons, setComparisons] = useState<ComparisonBrief[]>([]);
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [copyMessage, setCopyMessage] = useState("");
  const [shiftPlan, setShiftPlan] = useState<string[]>([]);
  const [riskDrivers, setRiskDrivers] = useState<string[]>([]);
  const [simulation, setSimulation] = useState<SimulationBrief | null>(null);
  const [readinessChecklist, setReadinessChecklist] = useState<string[]>([]);
  const [alertMessage, setAlertMessage] = useState("");
  const [dailyOutlook, setDailyOutlook] = useState<DayOutlook[]>([]);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherSnapshot | null>(null);
  const [activeLocation, setActiveLocation] = useState<CityOption | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<string[]>([]);
  const [comfortWindows, setComfortWindows] = useState<string[]>([]);
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported" | "error">("idle");
  const [geoMessage, setGeoMessage] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [weatherSource, setWeatherSource] = useState("Open-Meteo primary");
  const [weatherNews, setWeatherNews] = useState<WeatherNewsItem[]>([]);
  const [actionPlanIndex, setActionPlanIndex] = useState<ActionPlanIndexEntry[]>([]);
  const [actionPlanDate, setActionPlanDate] = useState("");
  const [showAstronomyPage, setShowAstronomyPage] = useState(false);
  const [astroFocus, setAstroFocus] = useState<"sun" | "moon">("sun");
  const [showRadarPage, setShowRadarPage] = useState(false);
  const [radarLayer, setRadarLayer] = useState<RadarLayer>("temperature");
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
  const [radarFrameIndex, setRadarFrameIndex] = useState(0);
  const [radarPlaying, setRadarPlaying] = useState(false);
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [radarConfidence, setRadarConfidence] = useState(0);
  const [radarLastUpdated, setRadarLastUpdated] = useState("");
  const [radarLocationKey, setRadarLocationKey] = useState("");
  const [radarFetchedAtMs, setRadarFetchedAtMs] = useState(0);
  const [selectedRadarPointId, setSelectedRadarPointId] = useState("c");

  const averageRisk = useMemo(() => {
    if (!hourlyRisk.length) return 0;
    return Math.round(hourlyRisk.reduce((sum, point) => sum + point.risk, 0) / hourlyRisk.length);
  }, [hourlyRisk]);

  const precisionConfidence = useMemo(() => getForecastPrecision(hourlyRisk), [hourlyRisk]);
  const sunCycle = useMemo(() => {
    if (!currentWeather || !dailyOutlook[0]) {
      return { label: "Earth rotation cycle", percent: 0 };
    }
    return getSunCycleSummary(
      currentWeather.time,
      dailyOutlook[0].sunrise,
      dailyOutlook[0].sunset,
      dailyOutlook[1]?.sunrise,
    );
  }, [currentWeather, dailyOutlook]);
  const orbitPosition = useMemo(
    () => getOrbitPosition(sunCycle.percent, currentWeather?.isDay ?? true),
    [sunCycle.percent, currentWeather?.isDay],
  );
  const oppositeOrbitPosition = useMemo(
    () => getOppositeOrbitPosition(sunCycle.percent, currentWeather?.isDay ?? true),
    [sunCycle.percent, currentWeather?.isDay],
  );
  const tiltIndicator = useMemo(() => {
    if (!activeLocation) return null;
    return getTiltIndicator(activeLocation.latitude, currentWeather?.time ?? new Date().toISOString());
  }, [activeLocation, currentWeather?.time]);
  const nextFullMoon = useMemo(() => {
    const parsedTimeMs = currentWeather?.time ? new Date(currentWeather.time).getTime() : Number.NaN;
    const baseMs = Number.isFinite(parsedTimeMs) ? parsedTimeMs : Date.now();
    const nextFullMoonMs = getNextFullMoonTimestamp(baseMs);
    const diffDays = Math.max(0, Math.round((nextFullMoonMs - baseMs) / 86400000));

    return {
      dateLabel: formatDateTimeInZone(nextFullMoonMs, activeLocation?.timezone),
      inDaysLabel: diffDays === 0 ? "today" : `in ${diffDays} day${diffDays > 1 ? "s" : ""}`,
    };
  }, [activeLocation?.timezone, currentWeather?.time]);
  const lunarMetrics = useMemo(() => {
    const parsedTimeMs = currentWeather?.time ? new Date(currentWeather.time).getTime() : Number.NaN;
    const baseMs = Number.isFinite(parsedTimeMs) ? parsedTimeMs : Date.now();
    return getLunarCycleMetrics(baseMs);
  }, [currentWeather?.time]);
  const moonAroundEarth = useMemo(
    () => getCircularOrbitPosition(lunarMetrics.cyclePercent, 15, 80, 72),
    [lunarMetrics.cyclePercent],
  );
  const astronomyInsights = useMemo(() => {
    if (!activeLocation || !dailyOutlook[0]) return null;
    return buildAstronomyInsights(
      activeLocation.latitude,
      dailyOutlook[0].sunrise,
      dailyOutlook[0].sunset,
      dailyOutlook[1]?.sunrise,
    );
  }, [activeLocation, dailyOutlook]);
  const skyVisibilityIndex = useMemo(() => {
    const nightWeight = astronomyInsights ? clamp((astronomyInsights.nightLengthMs / (12 * 60 * 60 * 1000)) * 55, 15, 55) : 30;
    const moonDarknessWeight = clamp((1 - (dailyOutlook[0]?.moonIllumination ?? 0.5)) * 35, 0, 35);
    const airPenalty = clamp(((currentWeather?.aqi ?? 70) / 200) * 20, 4, 20);
    return Math.round(clamp(nightWeight + moonDarknessWeight - airPenalty + 20, 10, 98));
  }, [astronomyInsights, currentWeather?.aqi, dailyOutlook]);
  const goldenWindows = useMemo(() => {
    if (!dailyOutlook[0]) return null;

    const sunriseMs = new Date(dailyOutlook[0].sunrise).getTime();
    const sunsetMs = new Date(dailyOutlook[0].sunset).getTime();
    if (![sunriseMs, sunsetMs].every((value) => Number.isFinite(value))) return null;

    const morningStart = sunriseMs - 45 * 60 * 1000;
    const morningEnd = sunriseMs + 45 * 60 * 1000;
    const eveningStart = sunsetMs - 45 * 60 * 1000;
    const eveningEnd = sunsetMs + 45 * 60 * 1000;

    return {
      morning: `${formatDateTimeInZone(morningStart, activeLocation?.timezone)} - ${formatDateTimeInZone(morningEnd, activeLocation?.timezone)}`,
      evening: `${formatDateTimeInZone(eveningStart, activeLocation?.timezone)} - ${formatDateTimeInZone(eveningEnd, activeLocation?.timezone)}`,
    };
  }, [activeLocation?.timezone, dailyOutlook]);
  const orbitStars = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
        id: index,
        left: (index * 29) % 100,
        top: (index * 17 + 11) % 100,
        duration: 2.8 + (index % 5) * 0.7,
        delay: (index % 9) * 0.35,
      })),
    [],
  );
  const currentRadarFrame = useMemo(() => radarFrames[radarFrameIndex] ?? null, [radarFrames, radarFrameIndex]);
  const radarFieldBackground = useMemo(
    () => buildRadarGradientField(currentRadarFrame, radarLayer),
    [currentRadarFrame, radarLayer],
  );
  const radarTopZones = useMemo(() => {
    if (!currentRadarFrame?.points.length) return [];
    return [...currentRadarFrame.points]
      .sort((a, b) => getRadarPointValue(b, radarLayer) - getRadarPointValue(a, radarLayer))
      .slice(0, 3);
  }, [currentRadarFrame, radarLayer]);
  const radarWindyUrl = useMemo(() => {
    if (!activeLocation) return "";
    return buildRadarWindyUrl(activeLocation, radarLayer);
  }, [activeLocation, radarLayer]);
  const radarSelectedPoint = useMemo(() => {
    if (!currentRadarFrame?.points.length) return null;
    return currentRadarFrame.points.find((point) => point.id === selectedRadarPointId) ?? currentRadarFrame.points.find((point) => point.id === "c") ?? currentRadarFrame.points[0];
  }, [currentRadarFrame, selectedRadarPointId]);
  const radarLayerContext = useMemo(() => getRadarLayerContext(radarLayer), [radarLayer]);
  const radarLayerStats = useMemo(() => {
    if (!currentRadarFrame?.points.length) return null;
    const values = currentRadarFrame.points.map((point) => getRadarPointValue(point, radarLayer));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { min, max, avg };
  }, [currentRadarFrame, radarLayer]);

  const riskLevel = getRiskLevel(averageRisk);

  useEffect(() => {
    if (!radarPlaying || radarFrames.length < 2) return;
    const timer = window.setInterval(() => {
      setRadarFrameIndex((prev) => (prev + 1) % radarFrames.length);
    }, 900);
    return () => window.clearInterval(timer);
  }, [radarPlaying, radarFrames.length]);

  useEffect(() => {
    if (!showRadarPage) {
      setRadarPlaying(false);
    }
  }, [showRadarPage]);

  useEffect(() => {
    if (!showRadarPage || !activeLocation) return;
    const timer = window.setInterval(() => {
      void openRadarPage(true);
    }, 20 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [activeLocation, showRadarPage]);

  useEffect(() => {
    if (!currentRadarFrame?.points.length) return;
    const exists = currentRadarFrame.points.some((point) => point.id === selectedRadarPointId);
    if (!exists) {
      const centerPoint = currentRadarFrame.points.find((point) => point.id === "c");
      setSelectedRadarPointId(centerPoint?.id ?? currentRadarFrame.points[0].id);
    }
  }, [currentRadarFrame, selectedRadarPointId]);

  function openAstronomyPage(focus?: "sun" | "moon") {
    if (!currentWeather || !dailyOutlook[0]) return;
    const activeBody = currentWeather.isDay ? "sun" : "moon";
    setAstroFocus(focus ?? activeBody);
    setShowAstronomyPage(true);
  }

  async function openRadarPage(forceRefresh = false) {
    if (!activeLocation) return;

    setShowRadarPage(true);
    const locationKey = `${activeLocation.latitude.toFixed(3)},${activeLocation.longitude.toFixed(3)}`;
    const isFresh = Date.now() - radarFetchedAtMs < 20 * 60 * 1000;
    if (!forceRefresh && radarFrames.length > 0 && radarLocationKey === locationKey && isFresh) {
      return;
    }

    setRadarLoading(true);
    setRadarError(null);
    setRadarFrameIndex(0);
    try {
      const radar = await fetchRadarFrames(activeLocation);
      setRadarFrames(radar.frames);
      setRadarConfidence(radar.confidence);
      setRadarLocationKey(locationKey);
      setRadarFetchedAtMs(Date.now());
      setRadarLastUpdated(new Date().toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
    } catch (err) {
      setRadarFrames([]);
      setRadarError(err instanceof Error ? err.message : "Radar feed unavailable right now.");
    } finally {
      setRadarLoading(false);
    }
  }

  function clearAnalysis() {
    setHourlyRisk([]);
    setResolvedCity("");
    setLastUpdatedAt("");
    setWeatherSource("Open-Meteo primary");
    setAiPlan("");
    setUsedFallback(false);
    setActiveLocation(null);
    setSafeWindows([]);
    setHydrationPlan("");
    setShiftPlan([]);
    setRiskDrivers([]);
    setSimulation(null);
    setReadinessChecklist([]);
    setAlertMessage("");
    setDailyOutlook([]);
    setCurrentWeather(null);
    setWeatherAlerts([]);
    setComfortWindows([]);
    setComparisons([]);
    setWeatherNews([]);
    setActionPlanIndex([]);
    setActionPlanDate("");
    setShowAstronomyPage(false);
    setShowRadarPage(false);
    setRadarFrames([]);
    setRadarFrameIndex(0);
    setRadarError(null);
    setRadarConfidence(0);
    setRadarLastUpdated("");
    setRadarLocationKey("");
    setRadarFetchedAtMs(0);
    setSelectedRadarPointId("c");
  }

  async function runSharedAnalysis(
    location: CityOption,
    points: HourPoint[],
    outlook: DayOutlook[],
    current: CurrentWeatherSnapshot,
    source: string,
  ) {
    setHourlyRisk(points);
    setActiveLocation(location);
    const labelParts = [location.name, location.admin1, location.country].filter(Boolean);
    setResolvedCity(labelParts.join(", "));
    setLastUpdatedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    setSafeWindows(findSafeWindows(points));
    setShiftPlan(buildShiftOptimizer(points));
    setRiskDrivers(buildRiskDrivers(points));
    setSimulation(buildSimulation(points));
    setDailyOutlook(outlook);
    setCurrentWeather(current);
    setWeatherSource(source);
    setWeatherAlerts(buildWeatherAlerts(points));
    setComfortWindows(buildComfortWindows(points));
    setActionPlanDate(new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }));

    const hottest = points.reduce((acc, curr) => (curr.temperature > acc.temperature ? curr : acc), points[0]);
    const worstAqi = points.reduce((acc, curr) => (curr.aqi > acc.aqi ? curr : acc), points[0]);
    const pointAverageRisk = Math.round(points.reduce((sum, p) => sum + p.risk, 0) / points.length);
    setHydrationPlan(buildHydrationGuidance(pointAverageRisk, hottest.temperature, audience));
    setReadinessChecklist(buildChecklist(pointAverageRisk, audience, worstAqi.aqi, hottest.temperature));

    const highest = points.reduce((acc, curr) => (curr.risk > acc.risk ? curr : acc), points[0]);
    const dailyNews = await fetchDailyWeatherNews(location);
    setWeatherNews(dailyNews);
    const indexRows = buildActionPlanIndex(points, dailyNews, `${location.name}, ${location.country}`);
    setActionPlanIndex(indexRows);
    const selectedAudienceIndex =
      indexRows.find((item) => item.category === audience) ?? indexRows.find((item) => item.category === "Outdoor workers");

    const prompt = `You are a climate-risk operations assistant. Write an Action Plan for ${audience} in ${location.name}, ${location.country}.\nAverage risk score: ${pointAverageRisk}/100 (${getRiskLevel(pointAverageRisk)}). Peak risk hour: ${new Date(highest.time).toLocaleTimeString([], {
      hour: "numeric",
    })} at ${Math.round(highest.temperature)}C, UV ${Math.round(highest.uvIndex)}, AQI ${Math.round(highest.aqi)}.\nDaily Action Plan Index for ${audience}: ${selectedAudienceIndex?.score ?? pointAverageRisk}/100 (${selectedAudienceIndex?.level ?? getRiskLevel(pointAverageRisk)}).\nDaily weather news signals: ${
      dailyNews.length
        ? dailyNews.map((item) => `${item.title} (${item.category}, ${item.daysAgo}d ago, ${item.distanceKm}km)`).join(" | ")
        : "No nearby severe weather events in free weather-news feed today"
    }.\nReturn plain text in this exact format:\nAction Plan\n1. ...\n2. ...\n3. ...\n4. ...\n5. ...\nInclude hydration, timing, PPE, and escalation guidance.`;

    try {
      const aiResponse = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
      if (!aiResponse.ok) throw new Error("AI service unavailable");
      const text = (await aiResponse.text()).trim();
      if (!text) throw new Error("Empty AI response");
      setAiPlan(text);
      setUsedFallback(false);
    } catch {
      setAiPlan(buildFallbackPlan(points, location.name, audience));
      setUsedFallback(true);
    }

    try {
      const alertPrompt = `Write one emergency heat advisory SMS in less than 240 characters for ${location.name}, ${location.country}. Include risk ${pointAverageRisk}/100 and one clear public action.`;
      const alertResponse = await fetch(`https://text.pollinations.ai/${encodeURIComponent(alertPrompt)}`);
      if (!alertResponse.ok) throw new Error("Alert AI unavailable");
      const alertText = (await alertResponse.text()).trim();
      if (!alertText) throw new Error("Empty alert");
      setAlertMessage(alertText.slice(0, 240));
    } catch {
      setAlertMessage(buildFallbackAlert(`${location.name}, ${location.country}`, pointAverageRisk, findSafeWindows(points)));
    }
  }

  async function requestLocationForecast() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      setGeoMessage("Location is not supported in this browser. Enter a city manually.");
      return;
    }

    setError(null);
    setGeoStatus("requesting");
    setGeoMessage("Requesting location permission for precise weather now...");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      const location = await resolveLocationFromCoordinates(latitude, longitude);
      const forecast = await fetchRiskPoints(location);
      await runSharedAnalysis(location, forecast.points, forecast.outlook, forecast.current, forecast.source);
      setCity(location.name);
      setGeoStatus("granted");
      setGeoMessage("Live GPS permission granted. Weather now is showing your precise location forecast.");
      setError(null);
    } catch (err) {
      const geoError = err as { code?: number };
      if (geoError?.code === 1) {
        setGeoStatus("denied");
        setGeoMessage("Location permission denied. Enter any city manually to continue.");
        setError(null);
        return;
      }

      setGeoStatus("error");
      setGeoMessage("Could not load GPS weather right now. You can retry or use manual city analysis.");
      setError("Unable to load GPS forecast right now. Please retry or enter a city manually.");
    }
  }

  useEffect(() => {
    requestLocationForecast();
  }, []);

  useEffect(() => {
    if (city.trim().length < 2) {
      setCityOptions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setCityOptions([]);
          return;
        }
        const data = await response.json();
        const optionsWithPopulation = ((data?.results ?? []) as AutocompleteGeoResult[])
          .filter(isAutocompleteCityOption)
          .map((item) => ({
            name: item.name,
            country: item.country,
            countryCode: item.country_code,
            admin1: item.admin1,
            timezone: item.timezone,
            latitude: item.latitude,
            longitude: item.longitude,
            population: item.population,
          }))
          .sort((a, b) => (b.population ?? 0) - (a.population ?? 0));

        const options: CityOption[] = optionsWithPopulation.map(({ population: _population, ...item }) => item);
        setCityOptions(options);
      } catch {
        setCityOptions([]);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [city]);

  async function analyzeCity(
    targetCity: string,
  ): Promise<{
    location: CityOption;
    points: HourPoint[];
    outlook: DayOutlook[];
    current: CurrentWeatherSnapshot;
    source: string;
  }> {
    const location = await resolveCity(targetCity);
    const forecast = await fetchRiskPoints(location);
    return { location, points: forecast.points, outlook: forecast.outlook, current: forecast.current, source: forecast.source };
  }

  function buildDownloadText(): string {
    const lines = [
      `CivicShield AI Briefing`,
      `City: ${resolvedCity || city}`,
      `Audience: ${audience}`,
      `Average 24h risk: ${averageRisk}/100 (${riskLevel})`,
      `Forecast precision confidence: ${precisionConfidence}%`,
      `Weather data source: ${weatherSource}`,
      `Next full moon (${activeLocation?.timezone || "local time"}): ${nextFullMoon.dateLabel} (${nextFullMoon.inDaysLabel})`,
      `Safe windows: ${safeWindows.join(" | ")}`,
      `Hydration strategy: ${hydrationPlan}`,
      `Shift optimizer: ${shiftPlan.join(" | ")}`,
      `Risk drivers: ${riskDrivers.join(" | ")}`,
      `Weather disruption alerts: ${weatherAlerts.join(" | ")}`,
      `Comfort weather windows: ${comfortWindows.join(" | ")}`,
      `Daily action-plan index date: ${actionPlanDate || "N/A"}`,
      `Daily action-plan index: ${actionPlanIndex.map((item) => `${item.category} ${item.score}/100 (${item.level})`).join(" | ")}`,
      `Daily weather news: ${weatherNews.map((item) => `${item.title} (${item.category}, ${item.daysAgo}d, ${item.distanceKm}km)`).join(" | ") || "No nearby severe-weather events today"}`,
      `Emergency alert draft: ${alertMessage}`,
      "",
      "Action Plan:",
      aiPlan,
    ];

    comparisons.forEach((item) => {
      lines.push(
        "",
        `Comparison city: ${item.label}`,
        `Comparison avg risk: ${item.averageRisk}/100`,
        `Comparison peak risk: ${item.peakRisk}/100`,
        `Comparison high exposure hours: ${item.highExposureHours}`,
        `Comparison peak heat index: ${item.peakHeatIndex}C`,
      );
    });

    return lines.join("\n");
  }

  function downloadBriefing() {
    const report = buildDownloadText();
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `civicshield-${(resolvedCity || city).toLowerCase().replace(/\s+/g, "-")}-briefing.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function copyBriefing() {
    try {
      if (!("clipboard" in navigator)) {
        throw new Error("Clipboard unsupported");
      }
      await navigator.clipboard.writeText(buildDownloadText());
      setCopyMessage("Briefing copied.");
    } catch {
      setCopyMessage("Clipboard access blocked by browser.");
    }
  }

  async function createPlan(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setCopyMessage("");
    setAlertMessage("");

    try {
      const { location, points, outlook, current, source } = await analyzeCity(city);
      await runSharedAnalysis(location, points, outlook, current, source);
      setGeoStatus("idle");
      setGeoMessage("");

      const compareTargets = parseComparisonCities(compareCity, city);
      if (compareTargets.length) {
        const compareResults = await Promise.all(compareTargets.map((cityName) => analyzeCity(cityName)));
        const mappedComparisons: ComparisonBrief[] = compareResults.map((result) => {
          const compareAverage = Math.round(result.points.reduce((sum, item) => sum + item.risk, 0) / result.points.length);
          const comparePeak = Number(result.points.reduce((acc, curr) => (curr.risk > acc ? curr.risk : acc), 0).toFixed(1));
          const peakHeatIndex = Number(
            result.points.reduce((acc, curr) => (curr.heatIndex > acc ? curr.heatIndex : acc), result.points[0]?.heatIndex ?? 0).toFixed(1),
          );

          return {
            label: `${result.location.name}, ${result.location.country}`,
            averageRisk: compareAverage,
            peakRisk: comparePeak,
            highExposureHours: getHighExposureHours(result.points),
            peakHeatIndex,
          };
        });
        setComparisons(mappedComparisons);
      } else {
        setComparisons([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while building your safety plan.");
      clearAnalysis();
    } finally {
      setLoading(false);
    }
  }

  async function handleCitySelection(option: CityOption) {
    if (!Number.isFinite(option.latitude) || !Number.isFinite(option.longitude)) {
      setError("Selected city has invalid coordinates. Please choose another option.");
      return;
    }
    setCity(option.name);
    setCityOptions([]);
    setLoading(true);
    setError(null);
    setCopyMessage("");

    try {
      const forecast = await fetchRiskPoints(option);
      await runSharedAnalysis(option, forecast.points, forecast.outlook, forecast.current, forecast.source);
      setComparisons([]);
      setGeoStatus("idle");
      setGeoMessage("City selected. Weather now is locked to this city forecast.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load selected city forecast.");
      clearAnalysis();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#0f3a4b_0%,#020617_38%,#020617_100%)] text-white">
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <img
          src="/images/civicshield-hero.jpg"
          alt="Heatwave response scene in a city"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="sky-pulse absolute -left-28 top-16 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="sky-float absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative mx-auto w-full max-w-6xl px-6 py-20 md:px-12"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">CivicShield AI</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-tight md:text-7xl">
            AI heat-risk planner for cities, teams, and field operations.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-200 md:text-xl">
            Turn free weather and air-quality APIs into actionable plans that reduce heatstroke risk for workers,
            students, and vulnerable residents.
          </p>
          <motion.a
            href="#planner"
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-8 inline-block rounded-full bg-cyan-300 px-7 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_35px_rgba(103,232,249,0.4)] transition hover:bg-cyan-200"
          >
            Build live safety plan
          </motion.a>
        </motion.div>
      </section>

      <section id="planner" className="mx-auto w-full max-w-6xl px-6 py-14 md:px-12">
        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr]">
          <form
            onSubmit={createPlan}
            className="space-y-6 rounded-3xl border border-cyan-200/20 bg-slate-900/70 p-6 shadow-[0_20px_60px_rgba(8,47,73,0.45)] backdrop-blur"
          >
            <div>
              <h2 className="text-2xl font-semibold">Create a city risk briefing</h2>
              <p className="mt-2 text-sm text-slate-300">Free APIs used: Open-Meteo, MET Norway, Open-Meteo Air Quality, WAQI (India override), NASA EONET weather-news feed, FarmSense Moon API, Pollinations AI, Windy radar embed.</p>
            </div>

            <div className="rounded-2xl border border-cyan-300/35 bg-cyan-950/40 px-4 py-3 text-sm text-cyan-100 shadow-[inset_0_0_20px_rgba(34,211,238,0.14)]">
              <p className="font-medium">Location mode: {geoStatus}</p>
              <p className="mt-1 text-xs text-cyan-200/90">
                {geoMessage || "On entry, the app requests location permission to show your precise real-time weather forecast."}
              </p>
              <button
                type="button"
                onClick={requestLocationForecast}
                className="mt-3 rounded-lg border border-cyan-200/35 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
              >
                Use my current location
              </button>
            </div>

            <div className="relative">
              <label className="block text-sm text-slate-300">
                City
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                    className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/90 px-4 py-3 text-white outline-none ring-cyan-300/60 placeholder:text-slate-500 transition focus:border-cyan-300/70 focus:ring"
                  placeholder="Enter a city"
                />
              </label>
              {cityOptions.length > 0 ? (
                <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-white/15 bg-slate-900">
                  {cityOptions.slice(0, 4).map((option) => (
                    <button
                      type="button"
                      key={`${option.name}-${option.latitude}`}
                      onClick={() => {
                        void handleCitySelection(option);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                    >
                      {option.name}
                      {option.admin1 ? `, ${option.admin1}` : ""}, {option.country}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <label className="block text-sm text-slate-300">
              Optional comparison cities
              <input
                value={compareCity}
                onChange={(e) => setCompareCity(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/90 px-4 py-3 text-white outline-none ring-cyan-300/60 placeholder:text-slate-500 transition focus:border-cyan-300/70 focus:ring"
                placeholder="Example: Dubai, Singapore, Phoenix"
              />
            </label>

            <label className="block text-sm text-slate-300">
              At-risk group
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/90 px-4 py-3 text-white outline-none ring-cyan-300/60 transition focus:border-cyan-300/70 focus:ring"
              >
                <option>Outdoor workers</option>
                <option>School children</option>
                <option>Elderly residents</option>
                <option>Delivery drivers</option>
                <option>Construction teams</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.35)] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Analyzing live data..." : "Generate Action Plan"}
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={!hourlyRisk.length}
                onClick={downloadBriefing}
                className="w-full rounded-xl border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Export briefing
              </button>
              <button
                type="button"
                disabled={!hourlyRisk.length}
                onClick={copyBriefing}
                className="w-full rounded-xl border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Copy summary
              </button>
            </div>
            {copyMessage ? <p className="text-xs text-cyan-300">{copyMessage}</p> : null}

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </form>

          <div className="space-y-6">
            {hourlyRisk[0] ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="rounded-3xl border border-cyan-200/20 bg-slate-900/70 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.5)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-300">Weather now</p>
                  <button
                    type="button"
                    onClick={() => {
                      void openRadarPage();
                    }}
                    className="rounded-lg border border-cyan-300/35 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/15"
                  >
                    Weather radar
                  </button>
                </div>
                <p className="mt-1 text-xs text-cyan-200">Source: {resolvedCity || "Awaiting location/city input"}</p>
                <p className="mt-1 text-xs text-slate-300">Forecast stack: {weatherSource}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Updated: {lastUpdatedAt || "--"}
                  {currentWeather?.time
                    ? ` (${formatTimeLabel(currentWeather.time, { hour: "numeric", minute: "2-digit" })})`
                    : ""}
                </p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-bold text-cyan-300">{Math.round(currentWeather?.temperature ?? hourlyRisk[0].temperature)}C</p>
                    <p className="text-sm text-slate-300">
                      Feels like {Math.round(currentWeather?.apparentTemperature ?? hourlyRisk[0].apparentTemperature)}C
                    </p>
                    <p className="mt-1 text-xs text-cyan-200">
                      {currentWeather?.isDay ? "Sun above horizon" : "Moon above horizon"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAstronomyPage()}
                    className="flex items-center gap-2 rounded-xl border border-cyan-300/35 px-2 py-1 transition hover:bg-cyan-400/10"
                    title="Open sun and moon orbit page"
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {currentWeather?.isDay ? "☀" : "🌙"}
                    </span>
                    <img
                      src={getWeatherIconUrl(currentWeather?.weatherCode ?? hourlyRisk[0].weatherCode)}
                      alt={getWeatherLabel(currentWeather?.weatherCode ?? hourlyRisk[0].weatherCode)}
                      className="h-12 w-12"
                      loading="lazy"
                    />
                    <p className="text-sm font-medium text-cyan-100">
                      {getWeatherLabel(currentWeather?.weatherCode ?? hourlyRisk[0].weatherCode)}
                    </p>
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-3 text-sm text-slate-200">
                  <p>Rain {Math.round(currentWeather?.precipitation ?? hourlyRisk[0].precipitation)} mm</p>
                  <p>Wind {Math.round(currentWeather?.wind ?? hourlyRisk[0].wind)} km/h</p>
                  <p>Humidity {Math.round(currentWeather?.humidity ?? hourlyRisk[0].humidity)}%</p>
                  <p>AQI {Math.round(currentWeather?.aqi ?? hourlyRisk[0].aqi)}</p>
                </div>
                {dailyOutlook[0] ? (
                  <>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <svg viewBox="0 0 100 100" className="h-40 w-full" role="img" aria-label="Sun moon and Earth orbit view">
                        <defs>
                          <radialGradient id="earthGrad" cx="50%" cy="40%" r="60%">
                            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
                          </radialGradient>
                          <radialGradient id="sunGrad" cx="50%" cy="50%" r="60%">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="100%" stopColor="#f59e0b" />
                          </radialGradient>
                          <radialGradient id="moonGrad" cx="50%" cy="50%" r="60%">
                            <stop offset="0%" stopColor="#e2e8f0" />
                            <stop offset="100%" stopColor="#a78bfa" />
                          </radialGradient>
                        </defs>

                        <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="rgba(251,191,36,0.45)" strokeWidth="1.8" />
                        <path d="M90 50 A40 40 0 0 1 10 50" fill="none" stroke="rgba(129,140,248,0.45)" strokeWidth="1.8" />

                        <text x="8" y="53" fontSize="4.4" fill="rgba(226,232,240,0.8)">Sunrise</text>
                        <text x="82" y="53" fontSize="4.4" fill="rgba(226,232,240,0.8)">Sunset</text>

                        <motion.g
                          animate={{ rotate: 360 }}
                          transition={{ duration: 16, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                          style={{ transformOrigin: "50px 50px" }}
                        >
                          <circle cx="50" cy="50" r="8.2" fill="url(#earthGrad)" />
                          <path d="M44 46 Q50 50 56 54" stroke="rgba(147,197,253,0.55)" strokeWidth="1.1" fill="none" />
                          <path d="M46 53 C48 51,52 51,54 53" stroke="rgba(125,211,252,0.45)" strokeWidth="0.9" fill="none" />
                        </motion.g>
                        <motion.line
                          x1="45"
                          y1="59"
                          x2="55"
                          y2="41"
                          stroke="rgba(224,231,255,0.75)"
                          strokeWidth="0.9"
                          strokeDasharray="1.4 1.2"
                          animate={{ opacity: [0.55, 0.95, 0.55] }}
                          transition={{ duration: 3.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        />
                        <text x="46.4" y="64" fontSize="4.1" fill="rgba(186,230,253,0.9)">Earth</text>
                        <text x="58" y="44" fontSize="3.6" fill="rgba(226,232,240,0.82)">23.4 deg axis</text>

                        <motion.circle
                          animate={{ cx: orbitPosition.x, cy: orbitPosition.y, opacity: currentWeather?.isDay ? 1 : 0.35 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          r="5.1"
                          fill="url(#sunGrad)"
                          stroke="rgba(254,240,138,0.85)"
                          strokeWidth="0.8"
                          className="cursor-pointer"
                          onClick={() => openAstronomyPage("sun")}
                        />
                        <motion.circle
                          animate={{ cx: oppositeOrbitPosition.x, cy: oppositeOrbitPosition.y, opacity: currentWeather?.isDay ? 0.35 : 1 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          r="4.4"
                          fill="url(#moonGrad)"
                          stroke="rgba(196,181,253,0.9)"
                          strokeWidth="0.8"
                          className="cursor-pointer"
                          onClick={() => openAstronomyPage("moon")}
                        />
                      </svg>
                      <p className="text-xs text-slate-300">
                        Orbit view: {currentWeather?.isDay ? "sun track is active over this city" : "moon track is active over this city"}
                      </p>
                    </div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800/90">
                      <div
                        style={{ width: `${sunCycle.percent}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-300 via-cyan-300 to-indigo-300"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-300">
                      {sunCycle.label}: {Math.round(sunCycle.percent)}% | Sunrise{" "}
                      {formatTimeLabel(dailyOutlook[0].sunrise, { hour: "numeric", minute: "2-digit" })} | Sunset{" "}
                      {formatTimeLabel(dailyOutlook[0].sunset, { hour: "numeric", minute: "2-digit" })}
                    </p>
                    <p className="mt-1 text-xs text-cyan-200">
                      {getMoonPhaseEmoji(dailyOutlook[0].moonPhase)} {dailyOutlook[0].moonPhase} ({Math.round(dailyOutlook[0].moonIllumination * 100)}%
                      lit)
                    </p>
                    {tiltIndicator ? (
                      <p className="mt-1 text-xs text-cyan-100">
                        Seasonal tilt indicator: {tiltIndicator.hemisphere} Hemisphere {tiltIndicator.seasonLabel} | Solar declination {tiltIndicator.solarDeclination.toFixed(1)} deg | Local tilt effect {tiltIndicator.localEffect.toFixed(1)} deg.
                      </p>
                    ) : null}
                  </>
                ) : null}
              </motion.div>
            ) : null}

            <motion.div
              key={averageRisk}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-3xl border border-cyan-200/20 bg-slate-900/70 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.5)]"
            >
              <p className="text-sm uppercase tracking-[0.18em] text-slate-300">24-hour risk index</p>
              <p className="mt-1 text-xs text-cyan-200">Forecast precision confidence: {precisionConfidence}%</p>
              <div className="mt-4 flex items-end justify-between">
                <p className="text-5xl font-bold text-cyan-300">{averageRisk || "--"}</p>
                <p className="text-lg font-medium text-slate-200">{hourlyRisk.length ? riskLevel : "No data"}</p>
              </div>
              <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-slate-800/90">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${averageRisk}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-rose-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                />
              </div>
            </motion.div>

            {comparisons.length > 0 ? (
              <div className="rounded-3xl border border-cyan-200/20 bg-slate-900/70 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.5)]">
                <p className="text-sm uppercase tracking-[0.18em] text-slate-300">Comparison cities</p>
                <div className="mt-3 space-y-3">
                  {comparisons.map((item) => (
                    <div key={item.label} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="text-sm text-slate-300">
                        Avg {item.averageRisk}/100, peak {item.peakRisk}/100, high-exposure hours {item.highExposureHours}, peak heat index {" "}
                        {item.peakHeatIndex}C.
                      </p>
                      <p className="text-xs text-cyan-200">
                        {item.averageRisk > averageRisk
                          ? "Primary city is safer than this city for next 24h operations."
                          : item.averageRisk < averageRisk
                            ? "This city is safer than the primary city for next 24h operations."
                            : "This city has near-equal risk to the primary city."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <AnimatePresence mode="wait">
              {hourlyRisk.length > 0 ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-3xl border border-cyan-200/20 bg-slate-900/70 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.5)]"
                >
                  <h3 className="text-lg font-semibold">Precise hourly heat exposure preview (24h)</h3>
                  <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-white/10">
                    <div className="grid grid-cols-[62px_repeat(7,minmax(0,1fr))] gap-2 border-b border-white/10 bg-slate-900/70 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-slate-300">
                      <span>Hour</span>
                      <span>Sky</span>
                      <span>Temp</span>
                      <span>Feels</span>
                      <span>Heat idx</span>
                      <span>UV</span>
                      <span>AQI</span>
                      <span>Risk</span>
                    </div>
                    {hourlyRisk.map((point) => (
                      <div
                        key={point.time}
                        className="grid grid-cols-[62px_repeat(7,minmax(0,1fr))] gap-2 border-b border-white/5 px-3 py-2 text-xs text-slate-100 last:border-0"
                      >
                        <span>{formatTimeLabel(point.time, { hour: "numeric" })}</span>
                        <span>
                          <img
                            src={getWeatherIconUrl(point.weatherCode)}
                            alt={getWeatherLabel(point.weatherCode)}
                            className="h-6 w-6"
                            loading="lazy"
                          />
                        </span>
                        <span>{point.temperature.toFixed(1)}C</span>
                        <span>{point.apparentTemperature.toFixed(1)}C</span>
                        <span>{point.heatIndex.toFixed(1)}C</span>
                        <span>{point.uvIndex.toFixed(1)}</span>
                        <span>{point.aqi.toFixed(0)}</span>
                        <span className="font-semibold text-cyan-200">{point.risk.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {dailyOutlook.length > 0 ? (
              <div className="rounded-3xl border border-cyan-200/20 bg-slate-900/70 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.5)]">
                <p className="text-sm uppercase tracking-[0.18em] text-slate-300">3-day weather outlook</p>
                <div className="mt-4 space-y-3">
                  {dailyOutlook.map((day) => (
                    <div key={day.date} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-white">{formatDateLabel(day.date, { weekday: "short", month: "short", day: "numeric" })}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <img
                          src={getWeatherIconUrl(day.weatherCode)}
                          alt={getWeatherLabel(day.weatherCode)}
                          className="h-8 w-8"
                          loading="lazy"
                        />
                        <p className="text-sm text-slate-200">
                          {Math.round(day.minTemp)}C - {Math.round(day.maxTemp)}C, rain {Math.round(day.rainChance)}%, {getWeatherLabel(day.weatherCode)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400">
                        Sunrise {formatTimeLabel(day.sunrise, { hour: "numeric", minute: "2-digit" })} | Sunset{" "}
                        {formatTimeLabel(day.sunset, { hour: "numeric", minute: "2-digit" })}
                      </p>
                      <p className="text-xs text-cyan-200">
                        {getMoonPhaseEmoji(day.moonPhase)} {day.moonPhase} ({Math.round(day.moonIllumination * 100)}% lit)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-cyan-300/30 bg-cyan-950/35 p-6 shadow-[0_20px_60px_rgba(8,47,73,0.35)]">
          <h3 className="text-xl font-semibold text-cyan-200">Action Plan</h3>
          {resolvedCity ? <p className="mt-1 text-sm text-cyan-100">Live city: {resolvedCity}</p> : null}
          <p className="mt-2 whitespace-pre-line text-slate-100">
            {aiPlan || "Your personalized action plan will appear here after analysis."}
          </p>
          {usedFallback ? (
            <p className="mt-3 text-xs text-cyan-300">Using local fallback action plan because AI API is rate-limited.</p>
          ) : null}

          {safeWindows.length > 0 ? (
            <div className="mt-5 border-t border-cyan-200/20 pt-5">
              <p className="text-sm font-semibold text-cyan-100">Safest windows</p>
              <p className="mt-2 text-sm text-slate-100">{safeWindows.join(" | ")}</p>
            </div>
          ) : null}

          {hydrationPlan ? (
            <div className="mt-5 border-t border-cyan-200/20 pt-5">
              <p className="text-sm font-semibold text-cyan-100">Hydration protocol</p>
              <p className="mt-2 text-sm text-slate-100">{hydrationPlan}</p>
            </div>
          ) : null}

          {shiftPlan.length > 0 ? (
            <div className="mt-5 border-t border-cyan-200/20 pt-5">
              <p className="text-sm font-semibold text-cyan-100">AI shift optimizer</p>
              <p className="mt-2 text-sm text-slate-100 whitespace-pre-line">{shiftPlan.join("\n")}</p>
            </div>
          ) : null}

          {riskDrivers.length > 0 ? (
            <div className="mt-5 border-t border-cyan-200/20 pt-5">
              <p className="text-sm font-semibold text-cyan-100">Top risk drivers</p>
              <p className="mt-2 text-sm text-slate-100 whitespace-pre-line">{riskDrivers.join("\n")}</p>
            </div>
          ) : null}

          {actionPlanIndex.length > 0 ? (
            <div className="mt-5 border-t border-cyan-200/20 pt-5">
              <p className="text-sm font-semibold text-cyan-100">Daily action-plan index by category</p>
              <p className="mt-1 text-xs text-cyan-300">Updated: {actionPlanDate}</p>
              <div className="mt-2 space-y-2 text-sm text-slate-100">
                {actionPlanIndex.map((item) => (
                  <p key={item.category}>
                    {item.category}: <span className="font-semibold text-cyan-200">{item.score}/100 ({item.level})</span> - {item.rationale}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 border-t border-cyan-200/20 pt-5">
            <p className="text-sm font-semibold text-cyan-100">Daily weather news signals (free API)</p>
            {weatherNews.length ? (
              <div className="mt-2 space-y-2 text-sm text-slate-100">
                {weatherNews.map((item, index) => (
                  <p key={`${item.title}-${index}`}>
                    {item.title} ({item.category}) - {item.daysAgo}d ago, {item.distanceKm} km from selected city.
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-100">No nearby severe weather events were found in today&apos;s open weather-news feed.</p>
            )}
          </div>

          {weatherAlerts.length > 0 ? (
            <div className="mt-5 border-t border-cyan-200/20 pt-5">
              <p className="text-sm font-semibold text-cyan-100">Weather disruption alerts</p>
              <p className="mt-2 text-sm text-slate-100 whitespace-pre-line">{weatherAlerts.join("\n")}</p>
            </div>
          ) : null}

          {comfortWindows.length > 0 ? (
            <div className="mt-5 border-t border-cyan-200/20 pt-5">
              <p className="text-sm font-semibold text-cyan-100">Best comfort weather windows</p>
              <p className="mt-2 text-sm text-slate-100">{comfortWindows.join(" | ")}</p>
            </div>
          ) : null}

          {simulation ? (
            <div className="mt-5 border-t border-cyan-200/20 pt-5">
              <p className="text-sm font-semibold text-cyan-100">Intervention simulator</p>
              <p className="mt-2 text-sm text-slate-100">
                If cooling tents, PPE, and break rotations are deployed, projected risk can drop to {simulation.projectedAverageRisk}/100
                (improvement: -{simulation.reduction}). Current no-go hours detected: {simulation.noGoHours}.
              </p>
            </div>
          ) : null}

          {readinessChecklist.length > 0 ? (
            <div className="mt-5 border-t border-cyan-200/20 pt-5">
              <p className="text-sm font-semibold text-cyan-100">Readiness checklist</p>
              <p className="mt-2 text-sm text-slate-100 whitespace-pre-line">{readinessChecklist.join("\n")}</p>
            </div>
          ) : null}

          {alertMessage ? (
            <div className="mt-5 border-t border-cyan-200/20 pt-5">
              <p className="text-sm font-semibold text-cyan-100">Emergency alert draft</p>
              <p className="mt-2 text-sm text-slate-100">{alertMessage}</p>
            </div>
          ) : null}
        </div>
      </section>

      <AnimatePresence>
        {showAstronomyPage && currentWeather && dailyOutlook[0] ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-auto bg-slate-950 p-6 md:p-10"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(129,140,248,0.16),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(14,116,144,0.25),transparent_50%)]" />
              {orbitStars.map((star) => (
                <motion.span
                  key={star.id}
                  className="absolute h-1 w-1 rounded-full bg-cyan-100/90"
                  style={{ left: `${star.left}%`, top: `${star.top}%` }}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.9, 1.25, 0.9] }}
                  transition={{ duration: star.duration, delay: star.delay, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                />
              ))}
            </div>

            <div className="relative mx-auto w-full max-w-6xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-cyan-300">AI Orbit Index</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Astronomy Mode - {resolvedCity || city}</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    {currentWeather.isDay ? "Solar daylight geometry" : "Lunar night geometry"} | Opened from {astroFocus} visual | Local time{" "}
                    {formatTimeLabel(currentWeather.time, { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAstronomyPage(false)}
                  className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/10"
                >
                  Back to Home
                </button>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-3xl border border-cyan-200/20 bg-slate-900/55 p-6 backdrop-blur">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
                    <span className="rounded-full border border-amber-300/40 bg-amber-200/10 px-3 py-1">Sun path {Math.round(sunCycle.percent)}%</span>
                    <span className="rounded-full border border-violet-300/40 bg-violet-200/10 px-3 py-1">Moon cycle {lunarMetrics.cyclePercent.toFixed(1)}%</span>
                    <span className="rounded-full border border-cyan-300/40 bg-cyan-200/10 px-3 py-1">Sky visibility {skyVisibilityIndex}/100</span>
                  </div>

                  <svg viewBox="0 0 160 140" className="mt-4 h-[26rem] w-full" role="img" aria-label="Detailed orbit view">
                    <defs>
                      <radialGradient id="orbitEarthGrad" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
                      </radialGradient>
                      <radialGradient id="orbitSunGrad" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </radialGradient>
                      <radialGradient id="orbitMoonGrad" cx="50%" cy="50%" r="65%">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="100%" stopColor="#a78bfa" />
                      </radialGradient>
                      <linearGradient id="sunBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(253,230,138,0.6)" />
                        <stop offset="100%" stopColor="rgba(253,230,138,0)" />
                      </linearGradient>
                    </defs>

                    <circle cx="80" cy="72" r="58" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="0.8" strokeDasharray="2.2 3" />
                    <circle cx="80" cy="72" r="44" fill="none" stroke="rgba(71,85,105,0.45)" strokeWidth="0.8" />
                    <path d="M22 72 A58 58 0 0 1 138 72" fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth="2" />
                    <path d="M138 72 A58 58 0 0 1 22 72" fill="none" stroke="rgba(129,140,248,0.75)" strokeWidth="2" />
                    <text x="18" y="76" fontSize="4.2" fill="rgba(226,232,240,0.84)">Sunrise</text>
                    <text x="132" y="76" fontSize="4.2" fill="rgba(226,232,240,0.84)">Sunset</text>

                    <motion.line
                      x1={orbitPosition.x}
                      y1={orbitPosition.y}
                      x2="80"
                      y2="72"
                      stroke="url(#sunBeam)"
                      strokeWidth="4"
                      animate={{ opacity: [0.45, 0.8, 0.45] }}
                      transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY }}
                    />

                    <motion.g
                      animate={{ rotate: 360 }}
                      transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      style={{ transformOrigin: "80px 72px" }}
                    >
                      <circle cx="80" cy="72" r="10" fill="url(#orbitEarthGrad)" />
                      <path d="M73 70 Q80 72 87 74" stroke="rgba(147,197,253,0.65)" strokeWidth="1.15" fill="none" />
                      <path d="M75 76 Q80 74 84 78" stroke="rgba(125,211,252,0.46)" strokeWidth="0.95" fill="none" />
                    </motion.g>
                    <line x1="74" y1="82" x2="86" y2="62" stroke="rgba(224,231,255,0.82)" strokeDasharray="1.3 1.2" strokeWidth="1" />
                    <text x="71" y="90" fontSize="3.8" fill="rgba(186,230,253,0.95)">Earth axis 23.4 deg</text>

                    <motion.circle
                      animate={{ cx: orbitPosition.x + 30, cy: orbitPosition.y + 22, scale: astroFocus === "sun" ? 1.12 : 1 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      r="7"
                      fill="url(#orbitSunGrad)"
                      stroke="rgba(254,240,138,0.95)"
                      strokeWidth="1"
                    />
                    <motion.circle
                      animate={{ cx: oppositeOrbitPosition.x + 30, cy: oppositeOrbitPosition.y + 22, scale: astroFocus === "moon" ? 1.1 : 1 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      r="6"
                      fill="url(#orbitMoonGrad)"
                      stroke="rgba(196,181,253,0.95)"
                      strokeWidth="1"
                    />

                    <circle cx="80" cy="72" r="15" fill="none" stroke="rgba(168,85,247,0.45)" strokeDasharray="1.2 1.2" strokeWidth="0.9" />
                    <motion.circle
                      animate={{ cx: moonAroundEarth.x, cy: moonAroundEarth.y }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      r="2.4"
                      fill="rgba(226,232,240,0.9)"
                    />
                    <text x="93" y="57" fontSize="3.8" fill="rgba(192,132,252,0.85)">Moon around Earth</text>
                  </svg>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Sunrise</p>
                      <p className="mt-1 text-sm font-semibold text-amber-200">
                        {formatTimeLabel(dailyOutlook[0].sunrise, { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Solar Noon</p>
                      <p className="mt-1 text-sm font-semibold text-cyan-200">
                        {astronomyInsights
                          ? formatDateTimeInZone(astronomyInsights.solarNoonMs, activeLocation?.timezone)
                          : "Unavailable"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Sunset</p>
                      <p className="mt-1 text-sm font-semibold text-violet-200">
                        {formatTimeLabel(dailyOutlook[0].sunset, { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-cyan-200/20 bg-slate-900/55 p-6 backdrop-blur">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-300">Astronomy details</p>
                  <p className="mt-1 text-xs text-cyan-300">Free APIs: Open-Meteo + FarmSense.</p>
                  <p className="mt-4 text-sm text-slate-100">
                    Active sky body: <span className="font-semibold text-cyan-200">{currentWeather.isDay ? "Sun" : "Moon"}</span>
                  </p>
                  <p className="mt-2 text-sm text-slate-100">
                    Next full moon ({activeLocation?.timezone || "local"}): <span className="font-semibold text-cyan-200">{nextFullMoon.dateLabel}</span>
                  </p>
                  <p className="mt-1 text-xs text-cyan-300">Arrival: {nextFullMoon.inDaysLabel}</p>

                  <div className="mt-4 space-y-3 text-xs text-slate-200">
                    <p>
                      Moon phase: <span className="text-cyan-200">{getMoonPhaseEmoji(dailyOutlook[0].moonPhase)} {dailyOutlook[0].moonPhase}</span>
                    </p>
                    <p>
                      Moon illumination: <span className="text-cyan-200">{Math.round(dailyOutlook[0].moonIllumination * 100)}%</span>
                    </p>
                    <p>
                      Moon age: <span className="text-cyan-200">{lunarMetrics.ageDays.toFixed(1)} days</span>
                    </p>
                    <p>
                      Next new moon: <span className="text-cyan-200">{formatDateTimeInZone(lunarMetrics.nextNewMoonMs, activeLocation?.timezone)}</span>
                    </p>
                    {astronomyInsights ? (
                      <>
                        <p>
                          Day length: <span className="text-cyan-200">{formatDurationLabel(astronomyInsights.dayLengthMs)}</span>
                        </p>
                        <p>
                          Night length: <span className="text-cyan-200">{formatDurationLabel(astronomyInsights.nightLengthMs)}</span>
                        </p>
                        <p>
                          Max solar elevation: <span className="text-cyan-200">{astronomyInsights.maxSolarElevationDeg.toFixed(1)} deg</span>
                        </p>
                        <p>
                          Stargazing window: <span className="text-cyan-200">{formatDateTimeInZone(astronomyInsights.stargazingStartMs, activeLocation?.timezone)}</span>
                          {" - "}
                          <span className="text-cyan-200">{formatDateTimeInZone(astronomyInsights.stargazingEndMs, activeLocation?.timezone)}</span>
                        </p>
                      </>
                    ) : null}
                    {goldenWindows ? (
                      <>
                        <p>
                          Morning golden window: <span className="text-cyan-200">{goldenWindows.morning}</span>
                        </p>
                        <p>
                          Evening golden window: <span className="text-cyan-200">{goldenWindows.evening}</span>
                        </p>
                      </>
                    ) : null}
                    {tiltIndicator ? (
                      <p>
                        {tiltIndicator.hemisphere} Hemisphere {tiltIndicator.seasonLabel} | Solar declination {tiltIndicator.solarDeclination.toFixed(1)} deg | Local tilt effect {tiltIndicator.localEffect.toFixed(1)} deg.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showRadarPage ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-auto bg-slate-950/95 p-4 md:p-8"
          >
            <div className="mx-auto w-full max-w-6xl">
              <div className="flex items-center justify-between rounded-2xl border border-cyan-200/20 bg-slate-900/85 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Weather radar</p>
                  <p className="mt-1 text-lg font-semibold text-white">{resolvedCity || city}</p>
                  <p className="text-xs text-slate-300">Live radar map + AI blended regional field from free weather sources</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRadarPage(false)}
                  className="rounded-lg border border-cyan-300/35 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/15"
                >
                  Close radar
                </button>
              </div>

              <div className="mt-4">
                <div className="rounded-2xl border border-cyan-200/20 bg-slate-900/88 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/85 p-2">
                    <div className="flex flex-wrap gap-2">
                      {([
                        { key: "temperature", icon: "Temp" },
                        { key: "rain", icon: "Rain" },
                        { key: "wind", icon: "Wind" },
                        { key: "cloud", icon: "Cloud" },
                      ] as Array<{ key: RadarLayer; icon: string }>).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setRadarLayer(item.key)}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            radarLayer === item.key
                              ? "bg-amber-300 text-slate-900"
                              : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                          }`}
                        >
                          {item.icon}
                        </button>
                      ))}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-cyan-200">Layer: {getRadarLayerName(radarLayer)}</p>
                      <p className="text-[11px] text-slate-300">Precision {radarConfidence}% | Updated {radarLastUpdated || "--"}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
                    <div className="relative h-[28rem] overflow-hidden rounded-2xl border border-cyan-200/20 bg-slate-950">
                      {radarWindyUrl ? (
                        <iframe
                          key={`${radarLayer}-${activeLocation?.latitude}-${activeLocation?.longitude}`}
                          src={radarWindyUrl}
                          className="h-full w-full"
                          title="Live weather radar map"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-slate-300">Select a city to load live radar.</div>
                      )}
                      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-cyan-200/25 bg-slate-950/75 px-3 py-1 text-[11px] text-cyan-100">
                        Live radar layer (Windy free embed)
                      </div>
                    </div>

                    <div className="relative h-[28rem] overflow-hidden rounded-2xl border border-cyan-200/25 bg-slate-950">
                      <div className="absolute inset-0" style={{ background: radarFieldBackground }} />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0)_38%,rgba(2,6,23,0.62)_100%)]" />
                      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-45">
                        <path d="M8 25 C25 18, 34 20, 50 30 C66 40, 78 36, 92 28" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="0.5" />
                        <path d="M12 52 C26 40, 40 44, 56 58 C72 72, 82 64, 94 56" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="0.5" />
                        <path d="M10 76 C24 70, 38 72, 52 80 C67 88, 80 84, 94 76" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="0.5" />
                        <line x1="50" y1="6" x2="50" y2="94" stroke="rgba(148,163,184,0.18)" strokeWidth="0.45" strokeDasharray="2 2" />
                        <line x1="8" y1="50" x2="92" y2="50" stroke="rgba(148,163,184,0.18)" strokeWidth="0.45" strokeDasharray="2 2" />
                      </svg>

                      <div className="absolute left-3 top-3 rounded-lg border border-cyan-200/25 bg-slate-950/75 px-3 py-1 text-[11px] text-cyan-100">
                        AI interpolated regional field
                      </div>
                      <div className="absolute right-3 top-3 rounded-lg border border-cyan-200/25 bg-slate-950/75 px-3 py-1 text-[11px] text-slate-200">
                        Tap a zone for details
                      </div>

                      {radarLoading ? (
                        <div className="absolute inset-0 grid place-items-center text-sm text-cyan-200">Loading AI radar field...</div>
                      ) : null}

                      {!radarLoading && radarError ? (
                        <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-rose-300">{radarError}</div>
                      ) : null}

                      {!radarLoading && !radarError && currentRadarFrame
                        ? currentRadarFrame.points.map((point) => {
                            const value = getRadarPointValue(point, radarLayer);
                            const bubbleSize = 14 + clamp(value, 0, 50) * 0.62;
                            const color = getRadarPointColor(radarLayer, value);
                            const isCenter = point.id === "c";
                            const isSelected = point.id === radarSelectedPoint?.id;

                            return (
                              <motion.button
                                key={`${currentRadarFrame.time}-${point.id}`}
                                type="button"
                                initial={{ scale: 0.92, opacity: 0.6 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.38 }}
                                onClick={() => setSelectedRadarPointId(point.id)}
                                className="absolute -translate-x-1/2 -translate-y-1/2 text-left"
                                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                              >
                                <div
                                  className={`grid place-items-center rounded-full border text-[10px] font-semibold text-white shadow-[0_0_24px_rgba(15,23,42,0.65)] transition ${
                                    isSelected ? "border-white ring-2 ring-cyan-300/70" : "border-white/35"
                                  }`}
                                  style={{
                                    width: `${bubbleSize}px`,
                                    height: `${bubbleSize}px`,
                                    background: color,
                                  }}
                                >
                                  {formatRadarValue(value, radarLayer)}
                                </div>
                                <span className="mt-1 block text-center text-[10px] font-medium text-white/90">{point.label}</span>
                                {isCenter ? <div className="mx-auto mt-0.5 h-1.5 w-1.5 rounded-full bg-rose-400" /> : null}
                              </motion.button>
                            );
                          })
                        : null}

                      <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg border border-cyan-200/20 bg-slate-950/72 p-2">
                        <div className="h-2 rounded-full" style={{
                          background: `linear-gradient(90deg, ${getRadarPointColor(radarLayer, radarLayerContext.low)} 0%, ${getRadarPointColor(radarLayer, radarLayerContext.mid)} 52%, ${getRadarPointColor(radarLayer, radarLayerContext.high)} 100%)`,
                        }} />
                        <div className="mt-1 flex justify-between text-[10px] text-slate-200">
                          <span>Low {radarLayerContext.low}{getRadarLayerUnit(radarLayer)}</span>
                          <span>Mid {radarLayerContext.mid}{getRadarLayerUnit(radarLayer)}</span>
                          <span>High {radarLayerContext.high}{getRadarLayerUnit(radarLayer)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                    <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Field insights</p>
                      <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                        <div className="rounded-lg border border-cyan-300/20 bg-slate-900/80 p-2 text-cyan-100">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">Selected zone</p>
                          {radarSelectedPoint ? (
                            <p className="mt-1 font-semibold">
                              {radarSelectedPoint.label}: {formatRadarValue(getRadarPointValue(radarSelectedPoint, radarLayer), radarLayer)}{getRadarLayerUnit(radarLayer)}
                            </p>
                          ) : (
                            <p className="mt-1 text-slate-300">No selected zone.</p>
                          )}
                        </div>
                        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-2 text-slate-100">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Regional spread</p>
                          {radarLayerStats ? (
                            <p className="mt-1">
                              {formatRadarValue(radarLayerStats.min, radarLayer)} - {formatRadarValue(radarLayerStats.max, radarLayer)}{getRadarLayerUnit(radarLayer)}
                              <span className="ml-2 text-slate-400">avg {formatRadarValue(radarLayerStats.avg, radarLayer)}{getRadarLayerUnit(radarLayer)}</span>
                            </p>
                          ) : (
                            <p className="mt-1 text-slate-300">Waiting for data.</p>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-400">{radarLayerContext.helper}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {radarTopZones.length ? radarTopZones.map((zone) => (
                          <span key={zone.id} className="rounded-md border border-cyan-200/25 bg-slate-900 px-2 py-1 text-cyan-100">
                            {zone.label} {formatRadarValue(getRadarPointValue(zone, radarLayer), radarLayer)}{getRadarLayerUnit(radarLayer)}
                          </span>
                        )) : <span className="text-slate-300">No zone data yet.</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void openRadarPage(true);
                      }}
                      className="rounded-xl border border-cyan-300/35 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/10"
                    >
                      Refresh now
                    </button>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/80 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-2 text-xs font-semibold">
                        <button type="button" className="rounded-md bg-sky-800 px-3 py-1 text-sky-100">30 min</button>
                        <button type="button" className="rounded-md bg-sky-800 px-3 py-1 text-sky-100">60 min</button>
                      </div>
                      <div className="text-xs text-slate-300">
                        {currentRadarFrame
                          ? `Frame ${radarFrameIndex + 1}/${radarFrames.length} | ${formatTimeLabel(currentRadarFrame.time, { hour: "numeric", minute: "2-digit" })}`
                          : "No radar frame"}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={Math.max(0, radarFrames.length - 1)}
                        value={radarFrameIndex}
                        onChange={(event) => setRadarFrameIndex(Number(event.target.value))}
                        className="h-2 w-full cursor-pointer accent-cyan-300"
                        disabled={!radarFrames.length}
                      />
                      <button
                        type="button"
                        onClick={() => setRadarPlaying((prev) => !prev)}
                        disabled={radarFrames.length < 2}
                        className="rounded-full border border-cyan-300/40 px-3 py-1 text-xs font-semibold text-cyan-200 disabled:opacity-50"
                      >
                        {radarPlaying ? "Pause" : "Play"}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setRadarFrameIndex(0)}
                        className="rounded-md bg-slate-800 px-3 py-1 text-slate-100"
                      >
                        now
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toDateString();
                          const index = radarFrames.findIndex((frame) => new Date(frame.time).toDateString() === today);
                          setRadarFrameIndex(index >= 0 ? index : 0);
                        }}
                        className="rounded-md bg-slate-800 px-3 py-1 text-slate-100"
                      >
                        today
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrowDate = new Date();
                          tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                          const target = tomorrowDate.toDateString();
                          const index = radarFrames.findIndex((frame) => new Date(frame.time).toDateString() === target);
                          setRadarFrameIndex(index >= 0 ? index : Math.max(0, radarFrames.length - 1));
                        }}
                        className="rounded-md bg-slate-800 px-3 py-1 text-slate-100"
                      >
                        tomorrow
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

    </div>
  );
}
