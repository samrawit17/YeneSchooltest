
export const SCHOOL_WEEK_DAYS = [
  { value: 1, name: "Monday", shortName: "Mon" },
  { value: 2, name: "Tuesday", shortName: "Tue" },
  { value: 3, name: "Wednesday", shortName: "Wed" },
  { value: 4, name: "Thursday", shortName: "Thu" },
  { value: 5, name: "Friday", shortName: "Fri" },
] as const;

export const DEFAULT_SCHOOL_START_TIME = "08:30";
export const DEFAULT_SCHOOL_END_TIME = "15:30";
export const DEFAULT_PERIOD_DURATION = 45;

/**
 * Ethiopian School Structure:
 * 1. 3 Periods (45 mins each)
 * 2. Short Break (15 mins)
 * 3. 2 Periods (45 mins each)
 * 4. Lunch Break (75 mins / 1hr 15min)
 * 5. 2 Periods (45 mins each) -> Ends approx 15:30
 */
const ETHIOPIAN_SESSION_STRUCTURE = [
  { type: 'period', count: 3 },
  { type: 'break', duration: 15, label: 'Short Break' },
  { type: 'period', count: 2 },
  { type: 'break', duration: 75, label: 'Lunch' },
  { type: 'period', count: 2 },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidTimeString = (value?: string | null): value is string =>
  Boolean(value && TIME_PATTERN.test(value));

export const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const toTimeString = (minutes: number) => {
  const safeMinutes = Math.max(0, minutes % 1440); // Wrap around 24h if necessary
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

/**
 * Generates the full Ethiopian school day slots including breaks.
 */
export const getEthiopianSchedule = (
  startTime = DEFAULT_SCHOOL_START_TIME,
  periodDuration = DEFAULT_PERIOD_DURATION
) => {
  const slots: { start: string; end: string; label: string; type: 'period' | 'break' }[] = [];
  let currentMinutes = toMinutes(startTime);
  let periodCount = 1;

  ETHIOPIAN_SESSION_STRUCTURE.forEach((session) => {
    if (session.type === 'period' && session.count) {
      for (let i = 0; i < session.count; i++) {
        const start = toTimeString(currentMinutes);
        currentMinutes += periodDuration;
        const end = toTimeString(currentMinutes);
        
        slots.push({
          start,
          end,
          label: `Period ${periodCount++}`,
          type: 'period'
        });
      }
    } else if (session.type === 'break' && session.duration) {
      const start = toTimeString(currentMinutes);
      currentMinutes += session.duration;
      const end = toTimeString(currentMinutes);

      slots.push({
        start,
        end,
        label: session.label || 'Break',
        type: 'break'
      });
    }
  });

  return slots;
};

/**
 * Filtered version that only returns teaching periods for the timetable grid
 */
export const getTeachingSlots = (startTime?: string) => {
  return getEthiopianSchedule(startTime).filter(slot => slot.type === 'period');
};

/**
 * Extracts school start and end time bounds from school settings
 */
export const getSchoolTimeBounds = (schoolSettings: Record<string, any>): { startTime: string; endTime: string } => {
  const startTime = schoolSettings?.schoolStartTime || DEFAULT_SCHOOL_START_TIME;
  const endTime = schoolSettings?.schoolEndTime || DEFAULT_SCHOOL_END_TIME;
  return { startTime, endTime };
};

/**
 * Generates time slot ranges between start and end time
 * Uses the Ethiopian schedule structure by default
 */
export const getSlotRanges = (startTime: string, endTime: string) => {
  const schedule = getEthiopianSchedule(startTime);
  const endMinutes = toMinutes(endTime);
  
  return schedule
    .filter(slot => slot.type === 'period' && toMinutes(slot.start) < endMinutes)
    .map(slot => ({
      start: slot.start,
      end: toMinutes(slot.end) <= endMinutes ? slot.end : endTime,
    }));
};

/**
 * Gets unique slot ranges from an array of timetable slots
 */
export const getUniqueSlotRanges = (slots: { startTime: string; endTime: string }[]) => {
  const uniqueMap = new Map<string, { start: string; end: string }>();
  
  slots.forEach(slot => {
    const key = `${slot.startTime}-${slot.endTime}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, { start: slot.startTime, end: slot.endTime });
    }
  });
  
  return Array.from(uniqueMap.values()).sort((a, b) => a.start.localeCompare(b.start));
};

/**
 * Generates time options for select inputs between start and end time
 */
export const generateTimeOptions = (startTime: string, endTime: string) => {
  const options: { value: string; label: string }[] = [];
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 5) {
    const time = toTimeString(minutes);
    options.push({ value: time, label: time });
  }
  
  return options;
};