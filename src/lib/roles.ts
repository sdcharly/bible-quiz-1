export type UserRole = "educator" | "student";

export function isEducator(role: string | undefined | null): boolean {
  return role === "educator";
}

export function isStudent(role: string | undefined | null): boolean {
  return role === "student";
}

export function getDefaultDashboardPath(role: string | undefined | null): string {
  if (isEducator(role)) {
    return "/educator/dashboard";
  }
  return "/student/dashboard";
}