import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/runtime";
import { jobRemovals, jobs, resumes } from "@/db/schema";

export type ModerationEntity = "jobs" | "resumes";
export type ModerationAction = "approve" | "ban" | "restore";

export type ModerationDecision = {
  status: number;
  message: string;
  patch: Record<string, string | number>;
};

export function buildModerationDecision(action: ModerationAction): ModerationDecision {
  switch (action) {
    case "approve":
      return {
        status: 1,
        message: "approved",
        patch: {
          status: 1,
        },
      };
    case "ban":
      return {
        status: 0,
        message: "banned",
        patch: {
          status: 0,
        },
      };
    case "restore":
      return {
        status: 1,
        message: "restored",
        patch: {
          status: 1,
        },
      };
  }
}

export function parseModerationAction(value: unknown): ModerationAction | null {
  if (value === "approve" || value === "ban" || value === "restore") {
    return value;
  }

  return null;
}

export function parseEntityId(value: unknown): number | null {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export type ApplyModerationOptions = {
  db?: ReturnType<typeof getDb>;
};

export type ApplyModerationResult = {
  found: boolean;
  beforeStatus: number | null;
  afterStatus: number | null;
  updatedAt: Date | null;
  sideEffects: string[];
};

export function computeModerationSideEffects(
  entity: ModerationEntity,
  action: ModerationAction,
): string[] {
  if (entity === "jobs" && action === "ban") {
    return ["job_removals.insert"];
  }

  if (entity === "jobs" && action === "restore") {
    return ["job_removals.resolve"];
  }

  return [];
}

export async function applyModerationAction(
  entity: ModerationEntity,
  entityId: number,
  action: ModerationAction,
  options: ApplyModerationOptions = {},
): Promise<ApplyModerationResult> {
  const db = options.db ?? getDb();
  const decision = buildModerationDecision(action);
  const now = new Date();

  if (entity === "jobs") {
    const existing = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, entityId))
      .limit(1);

    if (existing.length === 0) {
      return {
        found: false,
        beforeStatus: null,
        afterStatus: null,
        updatedAt: null,
        sideEffects: [],
      };
    }

    await db
      .update(jobs)
      .set({
        status: decision.status,
        updatedAt: now,
      })
      .where(eq(jobs.id, entityId));

    const sideEffects = computeModerationSideEffects("jobs", action);

    if (action === "ban") {
      await db.insert(jobRemovals).values({
        categoryId: existing[0]?.categoryId ?? 0,
        position: existing[0]?.position ?? "",
        expiredAt: now,
        indexed: 0,
      });
    }

    if (action === "restore") {
      await db
        .update(jobRemovals)
        .set({ indexed: 1 })
        .where(
          and(
            eq(jobRemovals.categoryId, existing[0]?.categoryId ?? 0),
            eq(jobRemovals.position, existing[0]?.position ?? ""),
            eq(jobRemovals.indexed, 0),
          ),
        );
    }

    return {
      found: true,
      beforeStatus: existing[0]?.status ?? null,
      afterStatus: decision.status,
      updatedAt: now,
      sideEffects,
    };
  }

  const existing = await db
    .select()
    .from(resumes)
    .where(eq(resumes.id, entityId))
    .limit(1);

  if (existing.length === 0) {
    return {
      found: false,
      beforeStatus: null,
      afterStatus: null,
      updatedAt: null,
      sideEffects: [],
    };
  }

  await db
    .update(resumes)
    .set({
      status: decision.status,
      updatedAt: now,
    })
    .where(eq(resumes.id, entityId));

  return {
    found: true,
    beforeStatus: existing[0]?.status ?? null,
    afterStatus: decision.status,
    updatedAt: now,
    sideEffects: computeModerationSideEffects("resumes", action),
  };
}
