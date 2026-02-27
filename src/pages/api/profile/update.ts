import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { authUsers, jobs, resumes } from "@/db/schema";
import { extractMediaKeyFromUrl } from "@/services/profile/images";

export const prerender = false;

function normalizeOptionalString(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function normalizeOptionalNullableString(input: unknown): string | null {
  if (input === null) {
    return null;
  }

  if (typeof input !== "string") {
    return "";
  }

  return input.trim();
}

function isChecked(input: unknown): boolean {
  return input === true || input === 1 || input === "1";
}

function normalizeStoredRole(input: unknown): "admin" | "candidate" | "employer" {
  const normalized = String(input ?? "").trim().toLowerCase();
  if (normalized === "admin" || normalized === "candidate" || normalized === "employer") {
    return normalized;
  }

  return "candidate";
}

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = getAuth(locals);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session?.id || !session.user?.id) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const requestedRole = normalizeOptionalString(payload.role).toLowerCase();
  const candidateName = normalizeOptionalString(payload.candidateName);
  const candidatePhone = normalizeOptionalString(payload.candidatePhone);
  const companyName = normalizeOptionalString(payload.companyName);
  const companyPhone = normalizeOptionalString(payload.companyPhone);
  const companyContact = normalizeOptionalString(payload.companyContact);
  const companyDescription = normalizeOptionalNullableString(payload.companyDescription);
  const subscribe = isChecked(payload.subscribe) ? 1 : 0;
  const subscribePartners = isChecked(payload.subscribePartners) ? 1 : 0;

  const db = getRequestDb(locals);
  const userId = Number(session.user.id);
  const [existingUser] = await db.select().from(authUsers).where(eq(authUsers.id, userId)).limit(1);
  if (!existingUser) {
    return new Response(JSON.stringify({ message: "User not found." }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const currentRole = normalizeStoredRole(existingUser.role);
  let nextRole: "admin" | "candidate" | "employer" = currentRole;

  if (currentRole !== "admin" && (requestedRole === "candidate" || requestedRole === "employer")) {
    nextRole = requestedRole;
  }

  if (currentRole !== nextRole) {
    const imageKey = extractMediaKeyFromUrl(existingUser.image);
    if (imageKey) {
      return new Response(JSON.stringify({ message: "Role cannot be changed while profile image exists." }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    }
  }

  if (currentRole === "candidate" && nextRole === "employer") {
    const [existingResume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .limit(1);
    if (existingResume) {
      return new Response(JSON.stringify({ message: "Role cannot be changed while candidate resumes exist." }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    }
  }

  if (currentRole === "employer" && nextRole === "candidate") {
    const [existingJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .limit(1);
    if (existingJob) {
      return new Response(JSON.stringify({ message: "Role cannot be changed while employer jobs exist." }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    }
  }

  if (nextRole === "candidate" && candidateName.length === 0) {
    return new Response(JSON.stringify({ message: "Name is required." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (nextRole === "employer" && companyName.length === 0) {
    return new Response(JSON.stringify({ message: "Company name is required." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  await db
    .update(authUsers)
    .set({
      role: nextRole,
      candidateName: nextRole === "candidate" ? candidateName : "",
      candidatePhone: nextRole === "candidate" ? candidatePhone : "",
      companyName: nextRole === "employer" ? companyName : "",
      companyPhone: nextRole === "employer" ? companyPhone : "",
      companyContact: nextRole === "employer" ? companyContact : "",
      companyDescription: nextRole === "employer" ? companyDescription : "",
      subscribe,
      subscribePartners,
      updatedAt: Date.now(),
    })
    .where(eq(authUsers.id, userId));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
