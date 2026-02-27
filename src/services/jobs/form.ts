import type { InferSelectModel } from "drizzle-orm";

import { contracts } from "@/db/schema";

export const JOB_SALARY_PERIODS = ["hour", "day", "week", "month", "year"] as const;

export type JobSalaryPeriod = (typeof JOB_SALARY_PERIODS)[number];
export type ContractRow = InferSelectModel<typeof contracts>;

export type JobFormPayload = {
  companyName: string;
  position: string;
  categoryId: number;
  countryId: number;
  countryGroups: string;
  salaryMin: number;
  salaryMax: number;
  salaryPeriod: JobSalaryPeriod;
  currency: string;
  contractCode: string;
  skills: string;
  description: string;
  applyText: string;
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

function sanitizePlain(value: string): string {
  return stripTags(value);
}

function normalizeCountryGroups(formData: FormData): string {
  const isAnywhere = trimText(formData.get("country_groups_all")) === "1";
  if (isAnywhere) {
    return "";
  }

  const isEmployerCountry = trimText(formData.get("country_groups_employer")) === "1";
  if (isEmployerCountry) {
    return "0";
  }

  const selectedRegionIds: string[] = [];
  for (const [key, rawValue] of formData.entries()) {
    if (key === "country_groups_arr[]") {
      const parsedId = parseId(trimText(rawValue));
      if (parsedId) {
        selectedRegionIds.push(String(parsedId));
      }
      continue;
    }

    if (key.startsWith("country_groups_arr[")) {
      if (trimText(rawValue) !== "1") {
        continue;
      }

      const match = key.match(/^country_groups_arr\[(\d+)\]$/);
      if (match?.[1]) {
        selectedRegionIds.push(match[1]);
      }
    }
  }

  if (selectedRegionIds.length === 0) {
    return "";
  }

  return Array.from(new Set(selectedRegionIds)).join(",");
}

export function parseJobForm(formData: FormData): { payload: JobFormPayload | null; errors: string[] } {
  const companyName = trimText(formData.get("company_name"));
  const position = trimText(formData.get("position"));
  const description = sanitizeDescription(trimText(formData.get("description")));
  const applyText = sanitizePlain(trimText(formData.get("apply_text")));
  const categoryId = parseId(trimText(formData.get("category_id")));
  const countryId = parseId(trimText(formData.get("country_id")));
  const salaryMin = parseMoney(trimText(formData.get("salary_min")));
  const salaryMax = parseMoney(trimText(formData.get("salary_max")));
  const salaryPeriodRaw = trimText(formData.get("salary_period")).toLowerCase();
  const currency = trimText(formData.get("currency")).toUpperCase();
  const contractCode = trimText(formData.get("contract_code"));
  const skills = normalizeSkills(trimText(formData.get("skills")));
  const countryGroups = normalizeCountryGroups(formData);

  const errors: string[] = [];
  if (!companyName) errors.push("Company name is required.");
  if (!position) errors.push("Position is required.");
  if (stripTags(description).length < 100) errors.push("Job text must be at least 100 characters.");
  if (!categoryId) errors.push("Category is required.");
  if (!countryId) errors.push("Employer country is required.");
  if (salaryMin === null) errors.push("Salary from must be a number.");
  if (salaryMax === null) errors.push("Salary to must be a number.");
  if (skills.length > 255) errors.push("Skills must be 255 characters or less.");
  if (!currency) errors.push("Currency is required.");
  if (!contractCode) errors.push("Employment type is required.");

  const salaryPeriod = JOB_SALARY_PERIODS.includes(salaryPeriodRaw as JobSalaryPeriod)
    ? (salaryPeriodRaw as JobSalaryPeriod)
    : "hour";

  if (errors.length > 0 || !categoryId || !countryId || salaryMin === null || salaryMax === null) {
    return { payload: null, errors };
  }

  return {
    payload: {
      companyName,
      position,
      categoryId,
      countryId,
      countryGroups,
      salaryMin,
      salaryMax,
      salaryPeriod,
      currency,
      contractCode,
      skills,
      description,
      applyText,
    },
    errors,
  };
}

export function jobNow(): Date {
  return new Date();
}

export function jobExpiresInDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
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
