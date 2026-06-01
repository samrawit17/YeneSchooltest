import { convertToEthiopian, getLocalizedEthiopianMonthName } from "@/lib/calendar-utils";

type CalendarType = "ETHIOPIAN" | "GREGORIAN";

const titleCase = (value: string) =>
  value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const getInstallmentIndexFromFeeType = (feeType?: string | null) => {
  const match = String(feeType || "").match(/_INSTALLMENT_(\d+)$/i);
  return match ? Number(match[1]) : null;
};

export const formatBaseFeeTypeName = (feeType?: string | null) => {
  const raw = String(feeType || "").trim();
  if (!raw) return "Fee";

  return titleCase(
    raw
      .replace(/_INSTALLMENT_\d+$/i, "")
      .replace(/_ANNUAL$/i, ""),
  );
};

export const getInstallmentMonthName = (
  installmentNumber: number,
  academicYearStartDate?: string | null,
  calendarType: CalendarType = "ETHIOPIAN",
) => {
  const startDate = academicYearStartDate ? new Date(academicYearStartDate) : null;

  if (!startDate || Number.isNaN(startDate.getTime())) {
    if (calendarType === "ETHIOPIAN") {
      return getLocalizedEthiopianMonthName(installmentNumber) || `Month ${installmentNumber}`;
    }

    return new Date(2000, installmentNumber - 1, 1).toLocaleDateString("en-US", { month: "long" });
  }

  const monthDate = new Date(startDate);
  monthDate.setMonth(startDate.getMonth() + installmentNumber - 1);

  if (calendarType === "GREGORIAN") {
    return monthDate.toLocaleDateString("en-US", { month: "long" });
  }

  return convertToEthiopian(monthDate).monthName || `Month ${installmentNumber}`;
};

export const formatFinanceFeeItemLabel = (
  feeType?: string | null,
  options: {
    academicYearStartDate?: string | null;
    calendarType?: CalendarType;
    periodLabel?: string | null;
  } = {},
) => {
  const baseName = formatBaseFeeTypeName(feeType);
  const installmentIndex = getInstallmentIndexFromFeeType(feeType);

  if (installmentIndex == null) return baseName;

  const periodLabel =
    options.periodLabel ||
    getInstallmentMonthName(
      installmentIndex,
      options.academicYearStartDate,
      options.calendarType || "ETHIOPIAN",
    );

  return `${baseName} - ${periodLabel}`;
};
