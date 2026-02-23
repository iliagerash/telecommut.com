type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

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
