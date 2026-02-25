import { and, asc, eq, sql } from "drizzle-orm";
import type { APIRoute } from "astro";

import { getRequestDb } from "@/db/request";
import { jobs, resumes } from "@/db/schema";

export const prerender = false;

function normalizeSuggestion(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const firstWords = trimmed.split(/\s+/).slice(0, 4).join(" ");
  const lastChar = firstWords.slice(-1);
  const cleaned = [",", ".", "-"].includes(lastChar) ? firstWords.slice(0, -1).trim() : firstWords;

  return cleaned || null;
}

export const GET: APIRoute = async ({ url, locals }) => {
  const term = (url.searchParams.get("term") ?? "").trim();
  const loweredTerm = term.toLowerCase();
  const type = (url.searchParams.get("type") ?? "jobs").toLowerCase();

  if (term.length < 3) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const db = getRequestDb(locals);
  const rows =
    type === "resumes"
      ? await db
          .select()
          .from(resumes)
          .where(and(eq(resumes.status, 1), sql`lower(${resumes.position}) like ${`%${loweredTerm}%`}`))
          .orderBy(asc(resumes.position))
          .limit(30)
      : await db
          .select()
          .from(jobs)
          .where(and(eq(jobs.status, 1), sql`lower(${jobs.position}) like ${`%${loweredTerm}%`}`))
          .orderBy(asc(jobs.position))
          .limit(30);

  const unique = new Set<string>();
  for (const row of rows) {
    const normalized = normalizeSuggestion(row.position);
    if (normalized) {
      unique.add(normalized);
    }
    if (unique.size >= 5) {
      break;
    }
  }

  return new Response(JSON.stringify(Array.from(unique)), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
