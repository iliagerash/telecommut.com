import { createHash } from "node:crypto";

export type JobState = "active" | "expired" | "removed";

export type JobHttpSemanticsInput = {
  id: string;
  state: JobState;
  updatedAt: Date;
};

export type JobHttpSemantics = {
  status: 200 | 304 | 410;
  etag: string;
  lastModified: string;
  cacheControl: string;
  robots: string;
};

function buildEtag(input: JobHttpSemanticsInput): string {
  const hash = createHash("sha1")
    .update(`${input.id}:${input.state}:${input.updatedAt.toISOString()}`)
    .digest("hex");

  return `W/"${hash}"`;
}

function isConditionalNotModified(request: Request, etag: string, updatedAt: Date): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return true;
  }

  const ifModifiedSince = request.headers.get("if-modified-since");
  if (!ifModifiedSince) {
    return false;
  }

  const since = new Date(ifModifiedSince);
  if (Number.isNaN(since.getTime())) {
    return false;
  }

  return since.getTime() >= updatedAt.getTime();
}

export function evaluateJobHttpSemantics(input: JobHttpSemanticsInput, request: Request): JobHttpSemantics {
  const etag = buildEtag(input);
  const lastModified = input.updatedAt.toUTCString();

  if (input.state === "expired" || input.state === "removed") {
    return {
      status: 410,
      etag,
      lastModified,
      cacheControl: "public, max-age=300",
      robots: "noindex,nofollow",
    };
  }

  if (isConditionalNotModified(request, etag, input.updatedAt)) {
    return {
      status: 304,
      etag,
      lastModified,
      cacheControl: "public, max-age=300",
      robots: "index,follow",
    };
  }

  return {
    status: 200,
    etag,
    lastModified,
    cacheControl: "public, max-age=300",
    robots: "index,follow",
  };
}
