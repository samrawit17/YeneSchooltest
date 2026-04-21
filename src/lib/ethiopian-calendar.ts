
/**
 * Simple Ethiopian Calendar Utilities
 * 
 * Note: This is a simplified implementation focused on Year and Month identification.
 * For production-grade date arithmetic, it's recommended to use a verified library.
 */

const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 
  'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehasse', 'Pagume'
];

/**
 * Converts a Gregorian date to basic Ethiopian year/month
 * Approximately 7-8 years behind Gregorian.
 */
export function getEthiopianDate(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Simple approximation: 
  // Before Sept 11 (approx), it's year - 8
  // After Sept 11, it's year - 7
  
  let ethiopianYear = year - 8;
  
  // Meskerem 1 is usually Sept 11
  if (month > 9 || (month === 9 && day >= 11)) {
    ethiopianYear = year - 7;
  }

  return {
    year: ethiopianYear,
    // Note: Month and day conversion is much more complex for exact EC, 
    // we'll stick to Year for the unified management labels for now.
    label: `${ethiopianYear} E.C.`
  };
}

export function formatAcademicYear(year: any) {
  if (year.calendarType === 'ETHIOPIAN') {
    return `${year.name} (E.C.)`;
  }
  return `${year.name} (G.C.)`;
}
