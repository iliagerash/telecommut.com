import type { APIRoute } from "astro";

import { eq } from "drizzle-orm";

import { getRequestDb } from "@/db/request";
import { categories } from "@/db/schema";

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect, locals }) => {
  const next = new URL("/search/jobs", url);

  const position = (url.searchParams.get("position") ?? url.searchParams.get("q") ?? "").trim();
  const category = (url.searchParams.get("category_id") ?? url.searchParams.get("category") ?? "").trim();
  const page = (url.searchParams.get("page") ?? "").trim();
  const parsedCategoryId = Number.parseInt(category, 10);
  const categoryId = Number.isFinite(parsedCategoryId) && parsedCategoryId > 0 ? parsedCategoryId : null;

  if (!position && categoryId !== null) {
    const db = getRequestDb(locals);
    const categoryRows = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
    const categorySegment = categoryRows[0]?.slug?.trim();
    if (categorySegment) {
      return redirect(`/category/${encodeURIComponent(categorySegment)}`, 307);
    }
  }

  if (position) {
    next.searchParams.set("q", position);
  }
  if (categoryId !== null) {
    next.searchParams.set("category", String(categoryId));
  }
  if (page && page !== "1") {
    next.searchParams.set("page", page);
  }

  return redirect(`${next.pathname}${next.search}`, 307);
};
