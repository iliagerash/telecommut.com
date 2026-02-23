import type { APIRoute } from "astro";

import { auth } from "@/auth";

export const ALL: APIRoute = async ({ request }) => auth.handler(request);
