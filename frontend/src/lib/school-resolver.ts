export interface PublicSchoolSummary {
  id: string;
  name: string;
  code: string | null;
  publicUrlSlug?: string | null;
  logoUrl?: string | null;
  accentColor?: string | null;
  loginImageUrl?: string | null;
}

const SCHOOL_LOGIN_CONTEXT_STORAGE_KEY = "sms-school-login-context";

export function normalizeSchoolUrlSlug(value: string | null | undefined) {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

const safeReadCachedSchools = () => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SCHOOL_LOGIN_CONTEXT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PublicSchoolSummary[]) : [];
  } catch {
    return [];
  }
};

export function readCachedSchoolLoginContext(params?: {
  schoolId?: string | null;
  slug?: string | null;
  fallbackToLast?: boolean;
}) {
  const schools = safeReadCachedSchools();
  if (schools.length === 0) return undefined;

  const requestedSchoolId = params?.schoolId || "";
  const requestedSlug = normalizeSchoolUrlSlug(params?.slug);

  if (requestedSchoolId) {
    const byId = schools.find((school) => school.id === requestedSchoolId);
    if (byId) return byId;
  }

  if (requestedSlug) {
    const bySlug = findSchoolByUrlSlug(schools, requestedSlug);
    if (bySlug) return bySlug;
  }

  return params?.fallbackToLast ? schools[0] : undefined;
}

export function writeCachedSchoolLoginContext(school?: PublicSchoolSummary | null) {
  if (typeof window === "undefined" || !school?.id) return;

  try {
    const schools = safeReadCachedSchools();
    const existingIndex = schools.findIndex((item) => item.id === school.id);
    const existing = existingIndex >= 0 ? schools[existingIndex] : undefined;
    const merged: PublicSchoolSummary = {
      ...existing,
      ...school,
      logoUrl: school.logoUrl ?? existing?.logoUrl ?? null,
      accentColor: school.accentColor ?? existing?.accentColor ?? null,
      loginImageUrl: school.loginImageUrl ?? existing?.loginImageUrl ?? null,
      publicUrlSlug: school.publicUrlSlug ?? existing?.publicUrlSlug ?? null,
      code: school.code ?? existing?.code ?? null,
    };
    const nextSchools = [merged, ...schools.filter((item) => item.id !== school.id)].slice(0, 8);
    window.localStorage.setItem(SCHOOL_LOGIN_CONTEXT_STORAGE_KEY, JSON.stringify(nextSchools));
  } catch {
    // Ignore storage failures; fresh school data will still be fetched on sign-in.
  }
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
