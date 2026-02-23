export function isHoneypotTripped(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

export function isPlausibleEmail(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sanitizeFreeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}
