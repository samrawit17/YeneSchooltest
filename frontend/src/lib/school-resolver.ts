export interface PublicSchoolSummary {
  id: string;
  name: string;
  code: string | null;
  publicUrlSlug?: string | null;
  logoUrl?: string | null;
  accentColor?: string | null;
}

export function normalizeSchoolUrlSlug(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || "";
}

export function getHostSchoolSlug() {
  if (typeof window === "undefined") return "";

  const host = window.location.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return "";

  const firstLabel = host.split(".")[0];
  return ["www", "app", "sms", "schools"].includes(firstLabel)
    ? ""
    : normalizeSchoolUrlSlug(firstLabel);
}

export function findSchoolByUrlSlug(
  schools: PublicSchoolSummary[],
  requestedSlug: string,
) {
  const normalizedSlug = normalizeSchoolUrlSlug(requestedSlug);
  if (!normalizedSlug) return undefined;

  return schools.find(
    (school) =>
      normalizeSchoolUrlSlug(school.publicUrlSlug) === normalizedSlug ||
      normalizeSchoolUrlSlug(school.name) === normalizedSlug,
  );
}
