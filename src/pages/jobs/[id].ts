import type { APIRoute } from "astro";

import { evaluateJobHttpSemantics, type JobState } from "@/services/crawler/http-semantics";

export const prerender = false;

function parseState(value: string | null): JobState {
  if (value === "expired" || value === "removed") {
    return value;
  }

  return "active";
}

function parseUpdatedAt(value: string | null): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function renderHtml(input: { id: string; status: number; state: JobState }): string {
  const title = input.status === 410 ? "Job No Longer Available" : `Job ${input.id}`;
  const subtitle = input.status === 410
    ? "This job was removed or expired."
    : `Job detail scaffold for id ${input.id}.`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${title} | Telecommut</title>
  </head>
  <body>
    <main style="max-width: 720px; margin: 0 auto; padding: 2rem; font-family: sans-serif;">
      <h1>${title}</h1>
      <p>${subtitle}</p>
      <p>State: <code>${input.state}</code></p>
      <p><a href="/search/jobs">Back to jobs</a></p>
    </main>
  </body>
</html>`;
}

export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id ?? "unknown";
  const state = parseState(new URL(request.url).searchParams.get("state"));
  const updatedAt = parseUpdatedAt(new URL(request.url).searchParams.get("updatedAt"));

  const semantics = evaluateJobHttpSemantics(
    {
      id,
      state,
      updatedAt,
    },
    request,
  );

  const headers = {
    etag: semantics.etag,
    "last-modified": semantics.lastModified,
    "cache-control": semantics.cacheControl,
    "x-robots-tag": semantics.robots,
    "x-telecommut-job-state": state,
  };

  if (semantics.status === 304) {
    return new Response(null, {
      status: 304,
      headers,
    });
  }

  return new Response(renderHtml({ id, status: semantics.status, state }), {
    status: semantics.status,
    headers: {
      ...headers,
      "content-type": "text/html; charset=utf-8",
    },
  });
};
