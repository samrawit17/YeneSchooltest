/**
 * Generate a secure enrollment key for schools
 * Format: SCH_X8K29KSLD_2026
 */
export function generateEnrollmentKey(schoolName?: string): string {
  const currentYear = new Date().getFullYear();
  const randomPart = generateRandomString(8);

  // Sanitize school name (take first 4 letters, uppercase, no spaces)
  const sanitizedName = schoolName
    ? schoolName
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 4) + '_'
    : '';

  return `SCH_${sanitizedName}${randomPart}_${currentYear}`;
}

/**
 * Generate a random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing characters like I, O, 0, 1
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}
