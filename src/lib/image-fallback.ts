export const CANDIDATE_FALLBACK_IMAGE = "/images/candidate.png";
export const EMPLOYER_FALLBACK_IMAGE = "/images/employer.png";

function normalizeImage(input: string | null | undefined): string {
  return typeof input === "string" ? input.trim() : "";
}

export function resolveCandidateImage(input: string | null | undefined): string {
  const normalized = normalizeImage(input);
  return normalized || CANDIDATE_FALLBACK_IMAGE;
}

export function resolveEmployerImage(input: string | null | undefined): string {
  const normalized = normalizeImage(input);
  return normalized || EMPLOYER_FALLBACK_IMAGE;
}
