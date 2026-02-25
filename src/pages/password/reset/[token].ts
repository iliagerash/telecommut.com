import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ params, redirect }) => {
  const token = (params.token ?? "").trim();
  if (!token) {
    return redirect("/password/reset", 302);
  }

  return redirect(`/reset-password?token=${encodeURIComponent(token)}`, 302);
};
