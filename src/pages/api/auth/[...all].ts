import type { APIRoute } from "astro";

import { getAuth } from "@/auth";

export const prerender = false;

export const ALL: APIRoute = async ({ request, locals }) => getAuth(locals).handler(request);
