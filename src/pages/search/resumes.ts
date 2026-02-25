import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  const next = new URL("/resumes/search", url);

  const position = (url.searchParams.get("position") ?? url.searchParams.get("q") ?? "").trim();
  const categoryId = (url.searchParams.get("category_id") ?? "").trim();
  const countryId = (url.searchParams.get("country_id") ?? "").trim();
  const page = (url.searchParams.get("page") ?? "").trim();

  if (position) {
    next.searchParams.set("position", position);
  }
  if (categoryId) {
    next.searchParams.set("category_id", categoryId);
  }
  if (countryId) {
    next.searchParams.set("country_id", countryId);
  }
  if (page && page !== "1") {
    next.searchParams.set("page", page);
  }

  return redirect(`${next.pathname}${next.search}`, 308);
};
