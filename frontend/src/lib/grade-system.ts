export type GradeRange = {
  min: number;
  max: number;
};

const GRADE_SYSTEM_RANGES: Record<string, GradeRange> = {
  "KG_TO_12": { min: 0, max: 12 },
  "KG-12": { min: 0, max: 12 },
  "K-12": { min: 0, max: 12 },
  "PRE-K-12": { min: -1, max: 12 },
  "1-12": { min: 1, max: 12 },
  "1-10": { min: 1, max: 10 },
  "1-8": { min: 1, max: 8 },
  "1-5": { min: 1, max: 5 },
  "9-12": { min: 9, max: 12 },
};

export const getGradeRangeFromSystem = (gradeSystem?: string | null): GradeRange => {
  if (!gradeSystem) return { min: 1, max: 12 };
  return GRADE_SYSTEM_RANGES[gradeSystem] || { min: 1, max: 12 };
};

export const getGradeNumbersFromSystem = (gradeSystem?: string | null) => {
  const range = getGradeRangeFromSystem(gradeSystem);
  const start = Math.max(1, range.min);
  return Array.from({ length: range.max - start + 1 }, (_, index) => start + index);
};

export const isPrimaryMiddleGradeSystem = (gradeSystem?: string | null) =>
  getGradeRangeFromSystem(gradeSystem).max <= 8;
