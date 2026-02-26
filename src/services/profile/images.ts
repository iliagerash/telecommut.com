const MEDIA_PREFIX = "/media/";

function encodePathSegments(input: string): string {
  return input
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildMediaUrlFromKey(key: string): string {
  return `${MEDIA_PREFIX}${encodePathSegments(key)}`;
}

export function extractMediaKeyFromUrl(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized.startsWith(MEDIA_PREFIX)) {
    return null;
  }

  const encodedKey = normalized.slice(MEDIA_PREFIX.length);
  if (!encodedKey) {
    return null;
  }

  try {
    return encodedKey
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
  } catch {
    return null;
  }
}

export function resolveImageExtension(contentType: string): string | null {
  const normalized = contentType.trim().toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") {
    return "jpg";
  }
  if (normalized === "image/png") {
    return "png";
  }
  if (normalized === "image/gif") {
    return "gif";
  }
  if (normalized === "image/webp") {
    return "webp";
  }

  return null;
}
