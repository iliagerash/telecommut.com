type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

export const WORLDWIDE_APPLICANT_COUNTRY_CODES = ["US", "CA", "GB", "AU", "NZ", "SG", "ZA"] as const;

export type JsonLdCountry = {
  "@type": "Country";
  name: string;
};

function toCountryRequirement(name: string): JsonLdCountry {
  return { "@type": "Country", name };
}

export function buildApplicantLocationRequirements(input: {
  countryId?: number | null;
  countryCode?: string | null;
  countryName?: string | null;
}): JsonLdCountry[] {
  if ((input.countryId ?? 0) > 0) {
    const code = (input.countryCode ?? "").trim().toUpperCase();
    if (code) {
      return [toCountryRequirement(code)];
    }

    const name = (input.countryName ?? "").trim();
    if (name) {
      return [toCountryRequirement(name)];
    }
  }

  return WORLDWIDE_APPLICANT_COUNTRY_CODES.map((code) => toCountryRequirement(code));
}

function getSiteOrigin(): string {
  const fromPublic = import.meta.env.PUBLIC_APP_URL;
  if (fromPublic && fromPublic.trim() !== "") {
    return fromPublic.replace(/\/+$/, "");
  }

  const fromAuth = import.meta.env.BETTER_AUTH_URL;
  if (fromAuth && fromAuth.trim() !== "") {
    return fromAuth.replace(/\/+$/, "");
  }

  return "http://localhost:4321";
}

export function toAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${getSiteOrigin()}${normalizedPath}`;
}

export function serializeJsonLd(input: JsonLd | undefined): string | null {
  if (!input) {
    return null;
  }

  return JSON.stringify(input);
}
