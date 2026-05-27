export function formatStudentDisplayCode(code?: string | null, academicYear?: string | null) {
  return formatUserDisplayCode(code, academicYear);
}

export function formatUserDisplayCode(code?: string | null, academicYear?: string | null) {
  const cleanCode = String(code || "").trim();
  if (!cleanCode) return "-";

  const cleanYear = String(academicYear || "").trim();
  if (!cleanYear) return cleanCode;

  if (cleanCode.startsWith(`${cleanYear}-`)) return cleanCode;
  return `${cleanYear}-${cleanCode}`;
}
