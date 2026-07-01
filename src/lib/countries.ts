// ISO 3166-1 alpha-2 codes. Names and flags are derived at runtime so we
// only need to maintain the code list, not a hand-typed name table.
const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AS", "AT", "AU", "AW",
  "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BM", "BN",
  "BO", "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CD", "CF", "CG", "CH", "CI",
  "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CY", "CZ", "DE", "DJ", "DK",
  "DM", "DO", "DZ", "EC", "EE", "EG", "ER", "ES", "ET", "FI", "FJ", "FM", "FO",
  "FR", "GA", "GB", "GD", "GE", "GG", "GH", "GI", "GL", "GM", "GN", "GQ", "GR",
  "GT", "GU", "GW", "GY", "HK", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM",
  "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH",
  "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK",
  "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MR", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PR", "PS", "PT", "PW", "PY", "QA",
  "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SI", "SK", "SL",
  "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SY", "SZ", "TC", "TD", "TG", "TH",
  "TJ", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "US",
  "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WS", "YE", "ZA", "ZM",
  "ZW",
] as const

export type CountryCode = (typeof COUNTRY_CODES)[number]

export function countryFlagEmoji(code: string): string {
  if (code.length !== 2) return ""
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

let displayNames: Intl.DisplayNames | null = null
function getDisplayNames() {
  if (!displayNames) {
    try {
      displayNames = new Intl.DisplayNames(["en"], { type: "region" })
    } catch {
      displayNames = null
    }
  }
  return displayNames
}

export function countryName(code: string): string {
  return getDisplayNames()?.of(code) ?? code
}

export interface CountryOption {
  code: string
  name: string
  flag: string
}

let cachedCountries: CountryOption[] | null = null

export function getCountries(): CountryOption[] {
  if (!cachedCountries) {
    cachedCountries = COUNTRY_CODES.map((code) => ({
      code,
      name: countryName(code),
      flag: countryFlagEmoji(code),
    })).sort((a, b) => a.name.localeCompare(b.name))
  }
  return cachedCountries
}
