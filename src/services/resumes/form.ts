export const RESUME_SALARY_PERIODS = ["hour", "day", "week", "month", "year"] as const;

export type ResumeSalaryPeriod = (typeof RESUME_SALARY_PERIODS)[number];

export type ResumeFormPayload = {
  position: string;
  categoryId: number;
  countryId: number;
  salaryMin: number;
  salaryPeriod: ResumeSalaryPeriod;
  currency: string;
  contractCode: string;
  skills: string;
  description: string;
};

function trimText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseMoney(value: string): number | null {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function normalizeSkills(value: string): string {
  if (!value) {
    return "";
  }

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(items)).join(",");
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeDescription(value: string): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\sjavascript:/gi, "")
    .trim();
}

export function parseResumeForm(formData: FormData): { payload: ResumeFormPayload | null; errors: string[] } {
  const position = trimText(formData.get("position"));
  const description = sanitizeDescription(trimText(formData.get("description")));
  const categoryId = parseId(trimText(formData.get("category_id")));
  const countryId = parseId(trimText(formData.get("country_id")));
  const salaryMin = parseMoney(trimText(formData.get("salary_min")));
  const salaryPeriodRaw = trimText(formData.get("salary_period")).toLowerCase();
  const currency = trimText(formData.get("currency")).toUpperCase();
  const contractCode = trimText(formData.get("contract_code"));
  const skills = normalizeSkills(trimText(formData.get("skills")));

  const errors: string[] = [];
  if (!position) errors.push("Resume position is required.");
  if (stripTags(description).length < 100) errors.push("CV text must be at least 100 characters.");
  if (!categoryId) errors.push("Category is required.");
  if (!countryId) errors.push("Candidate country is required.");
  if (salaryMin === null) errors.push("Salary from must be a number.");
  if (skills.length > 255) errors.push("Skills must be 255 characters or less.");
  if (!currency) errors.push("Currency is required.");
  if (!contractCode) errors.push("Employment type is required.");

  const salaryPeriod = RESUME_SALARY_PERIODS.includes(salaryPeriodRaw as ResumeSalaryPeriod)
    ? (salaryPeriodRaw as ResumeSalaryPeriod)
    : "hour";

  if (errors.length > 0 || !categoryId || !countryId || salaryMin === null) {
    return { payload: null, errors };
  }

  return {
    payload: {
      position,
      categoryId,
      countryId,
      salaryMin,
      salaryPeriod,
      currency,
      contractCode,
      skills,
      description,
    },
    errors,
  };
}

export function resumeNow(): Date {
  return new Date();
}

export function resolveRelativeReturnTo(rawPath: string | null, fallbackPath: string): string {
  const path = (rawPath ?? "").trim();
  if (!path.startsWith("/") || path.startsWith("//")) {
    return fallbackPath;
  }

  return path;
}

export function appendNotice(path: string, key: "success" | "error", value: string): string {
  const url = new URL(path, "http://local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}
