import path from "node:path";

const IMAGE_PREFIXES = ["/images/candidates/", "/images/employers/"] as const;
const PUBLIC_ROOT = path.resolve(process.cwd(), "public");

function encodePathSegments(input: string): string {
  return input
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildMediaUrlFromKey(key: string): string {
  const encoded = encodePathSegments(key);
  return encoded.startsWith("/") ? encoded : `/${encoded}`;
}

export function resolveMediaFilePath(key: string): string {
  const normalized = key
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");

  if (!normalized || normalized.includes("..") || normalized.includes("\\")) {
    throw new Error("Invalid media key");
  }

  return path.join(PUBLIC_ROOT, normalized);
}

export function extractMediaKeyFromUrl(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  let pathname = normalized;
  if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return null;
    }
  }

  const matchingPrefix = IMAGE_PREFIXES.find((prefix) => pathname.startsWith(prefix));
  if (matchingPrefix) {
    const encodedKey = pathname.slice(1);
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
  return null;
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
