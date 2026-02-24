export type ModerationEntity = "jobs" | "resumes";
export type ModerationAction = "approve" | "ban" | "restore";

export type ModerationDecision = {
  status: number;
  message: string;
  patch: Record<string, string | number | null>;
};

export function buildModerationDecision(action: ModerationAction): ModerationDecision {
  switch (action) {
    case "approve":
      return {
        status: 1,
        message: "approved",
        patch: {
          status: 1,
          deletedAt: null,
        },
      };
    case "ban":
      return {
        status: 0,
        message: "banned",
        patch: {
          status: 0,
          deletedAt: new Date().toISOString(),
        },
      };
    case "restore":
      return {
        status: 1,
        message: "restored",
        patch: {
          status: 1,
          deletedAt: null,
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
