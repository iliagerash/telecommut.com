import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ params, url, redirect }) => {
  const token = (params.token ?? "").trim();
  if (!token) {
    return redirect("/password/reset", 302);
  }

  const target = new URL("/reset-password", url.origin);
  target.searchParams.set("token", token);

  const callbackURL = (url.searchParams.get("callbackURL") ?? "").trim();
  if (callbackURL) {
    target.searchParams.set("callbackURL", callbackURL);
  }

  return redirect(target.toString(), 302);
};

