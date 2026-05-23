// Frontend alias map (mirror of backend ALIAS_MAP) for client-side validation hints.
export const COUNTRY_ALIASES: Record<string, string> = {
  uk: "GB",
  england: "GB",
  britain: "GB",
  "great britain": "GB",
  "united kingdom": "GB",
  usa: "US",
  america: "US",
  "united states": "US",
  "south korea": "KR",
  korea: "KR",
  uae: "AE",
  "united arab emirates": "AE",
  russia: "RU",
  czechia: "CZ",
  "czech republic": "CZ",
  vietnam: "VN",
};

export function normalizeCountryCode(input: string): string {
  const lower = input.toLowerCase().trim();
  if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower];
  return input.toUpperCase();
}
