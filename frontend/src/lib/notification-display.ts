import type { AppLanguage } from "@/lib/languageStore";

type DisplayNotification = {
  title?: string | null;
  message?: string | null;
  type?: string | null;
  metadata?: unknown;
  actionUrl?: string | null;
};

type LocalizedNotification = {
  title: string;
  message: string;
};

type TemplateEntry = LocalizedNotification | ((...args: string[]) => LocalizedNotification);

type NotificationMetadata = Record<string, unknown>;

const emptyNotification: LocalizedNotification = { title: "", message: "" };

function parseMetadata(metadata: unknown): NotificationMetadata {
  if (!metadata) return {};
  if (typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as NotificationMetadata;
  }
  if (typeof metadata !== "string") return {};

  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as NotificationMetadata)
      : {};
  } catch {
    return {};
  }
}

function metadataText(metadata: NotificationMetadata, key: string, fallback = "") {
  const value = metadata[key];
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function hasText(...values: string[]) {
  return values.every((value) => value.trim().length > 0);
}

function formatAmount(value: string) {
  if (!value.trim()) return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;

  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatSirenLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const ethiopianMonthNames = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
];

function formatPayrollPeriod(month: string, year: string, calendarType: string) {
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  if (!Number.isFinite(monthNumber) || !Number.isFinite(yearNumber)) return "";
  if (calendarType === "ETHIOPIAN") {
    return `${ethiopianMonthNames[monthNumber - 1] || `Month ${monthNumber}`} ${yearNumber} E.C.`;
  }
  return new Date(yearNumber, monthNumber - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function safeTemplate(
  language: AppLanguage,
  key: string,
  ...args: string[]
) {
  const entry = notificationTemplates[language][key] || notificationTemplates.en[key];
  if (!entry) return emptyNotification;
  return typeof entry === "function" ? entry(...args) : entry;
}

const notificationTemplates: Record<AppLanguage, Record<string, TemplateEntry>> = {
  en: {
    pickupReminder: {
      title: "Pickup reminder",
      message: "Dear parent, the last class is about to end. Please come and pick your child.",
    },
    newEnrollment: (studentName, grade) => ({
      title: "New Enrollment Request",
      message: `${studentName} has submitted an enrollment request for Grade ${grade}`,
    }),
    enrollmentApproved: (studentName, className) => ({
      title: "Enrollment Approved",
      message: `Congratulations! ${studentName}'s enrollment has been approved for ${className}`,
    }),
    enrollmentRejected: (studentName, reason) => ({
      title: "Enrollment Update",
      message: `We regret to inform you that ${studentName}'s enrollment application was not approved.${reason ? ` Reason: ${reason}` : ""}`,
    }),
    attendanceAlert: (studentName, date, className) => ({
      title: "Attendance Alert",
      message: `${studentName} was marked absent in ${className} on ${date}`,
    }),
    lateArrival: (studentName, time, className) => ({
      title: "Late Arrival Notice",
      message: `${studentName} arrived late at ${time} for ${className}`,
    }),
    attendanceSessionOpened: (className, subject) => ({
      title: "Attendance Session Opened",
      message: `Attendance session is ready for ${className} - ${subject}`,
    }),
    attendanceReminder: (className, subject, startTime) => ({
      title: "Attendance Reminder",
      message: `Attendance for ${className} - ${subject} starts at ${startTime}. Don't forget to take attendance!`,
    }),
    missingAttendanceReminder: (className, grade, section, date) => ({
      title: "Missing Attendance Reminder",
      message: `Please take attendance for Grade ${grade} - ${section} (${className}) for ${date}. Attendance has not been recorded yet.`,
    }),
    newAssignment: (assignmentTitle, dueDate, className) => ({
      title: "New Assignment",
      message: `New assignment "${assignmentTitle}" has been posted for ${className}. Due: ${dueDate}`,
    }),
    assignmentForChild: (studentName, assignmentTitle, dueDate) => ({
      title: "New Assignment for Your Child",
      message: `${studentName} has a new assignment "${assignmentTitle}" due on ${dueDate}`,
    }),
    assignmentGraded: (assignmentTitle, grade, className) => ({
      title: "Assignment Graded",
      message: `Your assignment "${assignmentTitle}" for ${className} has been graded. Grade: ${grade}`,
    }),
    childAssignmentGraded: (studentName, assignmentTitle, grade) => ({
      title: "Child's Assignment Graded",
      message: `${studentName}'s assignment "${assignmentTitle}" has been graded. Grade: ${grade}`,
    }),
    resultsPublished: (term, className) => ({
      title: "Results Published",
      message: `Results for ${term} in ${className} have been published`,
    }),
    assessmentStarted: (assessmentType, assessmentTitle, className, subjectName) => ({
      title: "Assessment Started",
      message: `${assessmentType} "${assessmentTitle}" is now active for ${className} - ${subjectName}. Please enter scores.`,
    }),
    timetableUpdated: (className) => ({
      title: "Timetable Updated",
      message: `The timetable for ${className} has been updated. Please check your new schedule.`,
    }),
    feeReminder: (amount, dueDate, studentName) => ({
      title: "Fee Payment Reminder",
      message: `${studentName ? `Fee for ${studentName}: ` : ""}Payment of ${amount} is due on ${dueDate}`,
    }),
    periodFeeDue: (amount, studentName, termName) => ({
      title: `${termName} fee payment due`,
      message: `Please pay ${amount} for ${studentName || "your child"} for ${termName}.`,
    }),
    paymentReceived: (amount, receiptNumber) => ({
      title: "Payment Received",
      message: `Your payment of ${amount} has been received. Receipt #: ${receiptNumber}`,
    }),
    paymentRecorded: (amount, studentName, termName) => ({
      title: "Payment Recorded",
      message: `Payment of ${amount} has been recorded for ${studentName || "your child"}${termName ? ` for ${termName}` : ""}.`,
    }),
    classCancelled: (className, date, reason) => ({
      title: "Class Cancelled",
      message: `${className} on ${date} has been cancelled.${reason ? ` Reason: ${reason}` : ""}`,
    }),
    studentClassCancelled: (subject, className, date) => ({
      title: "Class Cancelled",
      message: `${subject} class for ${className} on ${date} has been cancelled`,
    }),
    accountActivated: {
      title: "Account Activated",
      message: "Your account has been activated. You can now log in.",
    },
    accountDeactivated: (reason) => ({
      title: "Account Deactivated",
      message: reason || "Your account has been deactivated. Please contact school administration for more information.",
    }),
    classStarting: {
      title: "Your Class Is Starting",
      message: "The bell has rung for your current class. Please proceed to your classroom.",
    },
    classEnded: {
      title: "Your Class Has Ended",
      message: "The bell has rung to end your current class.",
    },
    classBell: (sirenLabel) => ({
      title: "Class Bell",
      message: `${sirenLabel} bell has rung for your timetable.`,
    }),
    schoolBell: {
      title: "School Bell",
      message: "The school bell has been triggered.",
    },
    passwordResetRequested: (userName, username) => ({
      title: "Password Reset Requested",
      message: `${userName}${username ? ` (${username})` : ""} has requested a password reset.`,
    }),
    studentRankingUpdated: (term) => ({
      title: "Student Ranking Updated",
      message: `${term} rankings have been calculated and are available in your child results.`,
    }),
    lessonCreated: (teacherName, lessonTitle, subjectName) => ({
      title: "New Lesson Created",
      message: `${teacherName || "Teacher"} created "${lessonTitle}" for ${subjectName || "lesson"}.`,
    }),
    lessonPublished: (lessonTitle, grade, section, teacherName) => ({
      title: "New Lesson Published",
      message: `New lesson: ${lessonTitle} for Grade ${grade} ${section} by ${teacherName || "Teacher"}`,
    }),
    homeworkAssigned: (homeworkTitle, dueDate) => ({
      title: "New Homework Assigned",
      message: `New homework: ${homeworkTitle}. Due: ${dueDate || "No due date"}`,
    }),
    newCommunicationFor: (studentName, subject) => ({
      title: "New Communication Entry",
      message: `A new note has been added for ${studentName}: ${subject}`,
    }),
    newCommunication: (subject) => ({
      title: "New Communication Entry",
      message: `A new note has been added: ${subject}`,
    }),
    newCommunicationReply: (senderName, subject, preview) => ({
      title: "New Reply to Communication",
      message: `${senderName} replied to "${subject}": ${preview}`,
    }),
    newMessage: (senderName, preview) => ({
      title: "New message",
      message: preview ? `${senderName}: ${preview}` : `${senderName} sent you a message`,
    }),
    attendanceCutoffReached: (time, className, section) => ({
      title: "Attendance Cutoff Reached",
      message: `The attendance cutoff time (${time}) has passed. Please submit attendance for ${className} (Section ${section}) immediately.`,
    }),
    missingAttendanceAlert: (count, time, classes) => ({
      title: "Missing Attendance Alert",
      message: `${count} classes missed attendance after cutoff (${time}): ${classes}`,
    }),
    payrollRunRequired: (periodLabel) => ({
      title: `Create ${periodLabel} payroll run`,
      message: `No payroll run has been created for ${periodLabel}. Create the monthly run so salaries can be reviewed, approved, and paid.`,
    }),
    payrollPaymentDue: (periodLabel, daysBefore, paymentDate, amount) => ({
      title: `${periodLabel} payroll payment due in ${daysBefore} days`,
      message: `${periodLabel} payroll is scheduled for payment on ${paymentDate}. Net payroll: ${amount}.`,
    }),
    platformBackupOverdue: (days) => ({
      title: "Platform backup is overdue",
      message: `The last full platform backup was ${days} days ago. Download a fresh backup from Super Admin backups.`,
    }),
    platformBackupMissing: {
      title: "No platform backup has been recorded",
      message: "No full platform backup download has been recorded yet. Download a full platform backup from Super Admin backups.",
    },
    databaseSizeDanger: (size, threshold) => ({
      title: "Database size is above danger threshold",
      message: `The database is about ${size} MB, above the configured ${threshold} MB danger threshold. Review storage and backup status.`,
    }),
    weeklyPlatformSummary: (schools, users, databaseSize, backupLabel) => ({
      title: "Weekly platform status summary",
      message: `${schools} active schools, ${users} active users, database ${databaseSize} MB. Last platform backup: ${backupLabel}.`,
    }),
  },
  am: {
    pickupReminder: {
      title: "የመውሰድ ማስታወሻ",
      message: "ውድ ወላጅ ሆይ፣ የመጨረሻው ክፍል ሊያልቅ ነው። እባክዎ መጥተው ልጅዎን ይውሰዱ።",
    },
    newEnrollment: (studentName, grade) => ({ title: "አዲስ የምዝገባ ጥያቄ", message: `${studentName} ለክፍል ${grade} የምዝገባ ጥያቄ አስገብቷል` }),
    enrollmentApproved: (studentName, className) => ({ title: "ምዝገባ ጸድቋል", message: `እንኳን ደስ አለዎት! የ${studentName} ምዝገባ ለ${className} ጸድቋል` }),
    enrollmentRejected: (studentName, reason) => ({ title: "የምዝገባ ዝማኔ", message: `የ${studentName} የምዝገባ ማመልከቻ እንዳልጸደቀ ልናሳውቅዎ እንወዳለን።${reason ? ` ምክንያት፡ ${reason}` : ""}` }),
    attendanceAlert: (studentName, date, className) => ({ title: "የመገኘት ማስጠንቀቂያ", message: `${studentName} በ${date} በ${className} ውስጥ ባለመመዝገቡ ተመዝግቧል` }),
    lateArrival: (studentName, time, className) => ({ title: "ዘግይቶ መምጣት ማስታወሻ", message: `${studentName} በ${time} ለ${className} ዘግይቶ መጥቷል` }),
    attendanceSessionOpened: (className, subject) => ({ title: "የመገኘት ክፍለ ጊዜ ተከፍቷል", message: `የመገኘት ክፍለ ጊዜ ለ${className} - ${subject} ዝግጁ ነው` }),
    attendanceReminder: (className, subject, startTime) => ({ title: "የመገኘት ማስታወሻ", message: `የ${className} - ${subject} መገኘት በ${startTime} ይጀምራል። መገኘትን መመዝገብ አይርሱ!` }),
    missingAttendanceReminder: (className, grade, section, date) => ({ title: "ያልተመዘገበ መገኘት ማስታወሻ", message: `እባክዎ ለክፍል ${grade} - ${section} (${className}) ለ${date} መገኘት ይመዝግቡ። መገኘት እስካሁን አልተመዘገበም።` }),
    newAssignment: (assignmentTitle, dueDate, className) => ({ title: "አዲስ ሥራ", message: `አዲስ ሥራ "${assignmentTitle}" ለ${className} ተለጥፏል። የመጨረሻ ቀን፡ ${dueDate}` }),
    assignmentForChild: (studentName, assignmentTitle, dueDate) => ({ title: "አዲስ ሥራ ለልጅዎ", message: `${studentName} አዲስ ሥራ "${assignmentTitle}" አለው የመጨረሻ ቀን ${dueDate}` }),
    assignmentGraded: (assignmentTitle, grade, className) => ({ title: "ሥራ ተመዝኗል", message: `ሥራዎ "${assignmentTitle}" ለ${className} ተመዝኗል። ውጤት፡ ${grade}` }),
    childAssignmentGraded: (studentName, assignmentTitle, grade) => ({ title: "የልጅ ሥራ ተመዝኗል", message: `የ${studentName} ሥራ "${assignmentTitle}" ተመዝኗል። ውጤት፡ ${grade}` }),
    resultsPublished: (term, className) => ({ title: "ውጤቶች ታትመዋል", message: `የ${term} ውጤቶች በ${className} ታትመዋል` }),
    assessmentStarted: (assessmentType, assessmentTitle, className, subjectName) => ({ title: "ግምገማ ተጀምሯል", message: `${assessmentType} "${assessmentTitle}" አሁን ለ${className} - ${subjectName} ንቁ ነው። እባክዎ ነጥቦችን ያስገቡ።` }),
    timetableUpdated: (className) => ({ title: "የጊዜ ሰሌዳ ተዘምኗል", message: `የ${className} የጊዜ ሰሌዳ ተዘምኗል። እባክዎ አዲሱን ሰሌዳዎ ይመልከቱ።` }),
    feeReminder: (amount, dueDate, studentName) => ({ title: "የክፍያ ማስታወሻ", message: `${studentName ? `ለ${studentName} ክፍያ፡ ` : ""}የ${amount} ክፍያ በ${dueDate} ይደርሳል` }),
    periodFeeDue: (amount, studentName, termName) => ({ title: `የ${termName} ክፍያ ይከፈል`, message: `እባክዎ ${amount} ለ${studentName || "ልጅዎ"} ለ${termName} ይክፈሉ።` }),
    paymentReceived: (amount, receiptNumber) => ({ title: "ክፍያ ተቀብለናል", message: `የ${amount} ክፍያዎ ተቀብለናል። ደረሰኝ ቁጥር፡ ${receiptNumber}` }),
    paymentRecorded: (amount, studentName, termName) => ({ title: "ክፍያ ተመዝግቧል", message: `የ${amount} ክፍያ ለ${studentName || "ልጅዎ"}${termName ? ` ለ${termName}` : ""} ተመዝግቧል።` }),
    classCancelled: (className, date, reason) => ({ title: "ክፍል ተሰርዟል", message: `${className} በ${date} ተሰርዟል።${reason ? ` ምክንያት፡ ${reason}` : ""}` }),
    studentClassCancelled: (subject, className, date) => ({ title: "ክፍል ተሰርዟል", message: `የ${subject} ክፍል ለ${className} በ${date} ተሰርዟል` }),
    accountActivated: { title: "መለያ ተከፍቷል", message: "መለያዎ ተከፍቷል። አሁን መግባት ይችላሉ።" },
    accountDeactivated: (reason) => ({ title: "መለያ ተዘግቷል", message: reason || "መለያዎ ተዘግቷል። ለተጨማሪ መረጃ እባክዎ የትምህርት ቤቱን አስተዳደር ያግኙ።" }),
    classStarting: { title: "ክፍልዎ እየጀመረ ነው", message: "ለአሁኑ ክፍልዎ ደወል ተመቷል። እባክዎ ወደ ክፍልዎ ይሂዱ።" },
    classEnded: { title: "ክፍልዎ አልቋል", message: "የአሁኑ ክፍል ለማብቃት ደወል ተመቷል።" },
    classBell: (sirenLabel) => ({ title: "የክፍል ደወል", message: `የ${sirenLabel} ደወል ለጊዜ ሰሌዳዎ ተመቷል።` }),
    schoolBell: { title: "የትምህርት ቤት ደወል", message: "የትምህርት ቤቱ ደወል ተመቷል።" },
    passwordResetRequested: (userName, username) => ({ title: "የይለፍ ቃል መልሶ ማግኛ ተጠይቋል", message: `${userName}${username ? ` (${username})` : ""} የይለፍ ቃል መልሶ ማግኛ ጠይቋል።` }),
    studentRankingUpdated: (term) => ({ title: "የተማሪ ደረጃ ተዘምኗል", message: `የ${term} ደረጃዎች ተሰልተዋል እና በልጅዎ ውጤቶች ውስጥ ይገኛሉ።` }),
    lessonCreated: (teacherName, lessonTitle, subjectName) => ({ title: "አዲስ ትምህርት ተፈጥሯል", message: `${teacherName || "መምህር"} "${lessonTitle}" ለ${subjectName || "ትምህርት"} ፈጥሯል።` }),
    lessonPublished: (lessonTitle, grade, section, teacherName) => ({ title: "አዲስ ትምህርት ታትሟል", message: `አዲስ ትምህርት፡ ${lessonTitle} ለክፍል ${grade} ${section} በ${teacherName || "መምህር"}` }),
    homeworkAssigned: (homeworkTitle, dueDate) => ({ title: "አዲስ የቤት ሥራ ተሰጥቷል", message: `አዲስ የቤት ሥራ፡ ${homeworkTitle}። የመጨረሻ ቀን፡ ${dueDate || "የመጨረሻ ቀን የለም"}` }),
    newCommunicationFor: (studentName, subject) => ({ title: "አዲስ የኮሙኒኬሽን መረጃ", message: `ለ${studentName} አዲስ ማስታወሻ ታክሏል፡ ${subject}` }),
    newCommunication: (subject) => ({ title: "አዲስ የኮሙኒኬሽን መረጃ", message: `አዲስ ማስታወሻ ታክሏል፡ ${subject}` }),
    newCommunicationReply: (senderName, subject, preview) => ({ title: "ለኮሙኒኬሽኑ አዲስ ምላሽ", message: `${senderName} ለ"${subject}" ምላሽ ሰጥቷል፡ ${preview}` }),
    newMessage: (senderName, preview) => ({ title: "አዲስ መልዕክት", message: preview ? `${senderName}: ${preview}` : `${senderName} መልዕክት ልኮልዎታል` }),
    attendanceCutoffReached: (time, className, section) => ({ title: "የመገኘት መጨረሻ ሰዓት አልፏል", message: `የመገኘት መጨረሻ ሰዓት (${time}) አልፏል። እባክዎ ለ${className} (ክፍል ${section}) መገኘትን ወዲያውኑ ያስገቡ።` }),
    missingAttendanceAlert: (count, time, classes) => ({ title: "ያልተመዘገበ መገኘት ማስጠንቀቂያ", message: `${count} ክፍሎች ከማለቂያ ሰዓት (${time}) በኋላ መገኘት አልመዘገቡም፡ ${classes}` }),
    payrollRunRequired: (periodLabel) => ({ title: `የ${periodLabel} ደመወዝ ሂደት ይፍጠሩ`, message: `ለ${periodLabel} የደመወዝ ሂደት አልተፈጠረም። ደመወዞች እንዲገመገሙ፣ እንዲጸድቁ እና እንዲከፈሉ ወርሃዊውን ሂደት ይፍጠሩ።` }),
    payrollPaymentDue: (periodLabel, daysBefore, paymentDate, amount) => ({ title: `የ${periodLabel} ደመወዝ ክፍያ በ${daysBefore} ቀናት ውስጥ ይደርሳል`, message: `የ${periodLabel} ደመወዝ ክፍያ በ${paymentDate} ታቅዷል። የተጣራ ደመወዝ፡ ${amount}።` }),
    platformBackupOverdue: (days) => ({ title: "የመድረክ ምትኬ ዘግይቷል", message: `የመጨረሻው ሙሉ የመድረክ ምትኬ ${days} ቀናት በፊት ነበር። ከሱፐር አድሚን ምትኬዎች አዲስ ምትኬ ያውርዱ።` }),
    platformBackupMissing: { title: "የመድረክ ምትኬ አልተመዘገበም", message: "ምንም ሙሉ የመድረክ ምትኬ ማውረድ እስካሁን አልተመዘገበም። ከሱፐር አድሚን ምትኬዎች ሙሉ ምትኬ ያውርዱ።" },
    databaseSizeDanger: (size, threshold) => ({ title: "የዳታቤዝ መጠን ከአደጋ ገደብ በላይ ነው", message: `ዳታቤዙ በግምት ${size} MB ነው፣ ከተዋቀረው ${threshold} MB የአደጋ ገደብ በላይ። ማከማቻን እና ምትኬን ይመልከቱ።` }),
    weeklyPlatformSummary: (schools, users, databaseSize, backupLabel) => ({ title: "ሳምንታዊ የመድረክ ሁኔታ ማጠቃለያ", message: `${schools} ንቁ ትምህርት ቤቶች፣ ${users} ንቁ ተጠቃሚዎች፣ ዳታቤዝ ${databaseSize} MB። የመጨረሻ የመድረክ ምትኬ፡ ${backupLabel}።` }),
  },
  ar: {
    pickupReminder: { title: "تذكير بالاستلام", message: "ولي الأمر العزيز، الحصة الأخيرة على وشك الانتهاء. يرجى الحضور لاستلام طفلك." },
    newEnrollment: (studentName, grade) => ({ title: "طلب تسجيل جديد", message: `قدم ${studentName} طلب تسجيل للصف ${grade}` }),
    enrollmentApproved: (studentName, className) => ({ title: "تم قبول التسجيل", message: `تهانينا! تم قبول تسجيل ${studentName} في ${className}` }),
    enrollmentRejected: (studentName, reason) => ({ title: "تحديث التسجيل", message: `نأسف لإبلاغك بأن طلب تسجيل ${studentName} لم يتم قبوله.${reason ? ` السبب: ${reason}` : ""}` }),
    attendanceAlert: (studentName, date, className) => ({ title: "تنبيه الحضور", message: `تم تسجيل ${studentName} غائباً في ${className} بتاريخ ${date}` }),
    lateArrival: (studentName, time, className) => ({ title: "إشعار التأخر", message: `وصل ${studentName} متأخراً في ${time} لـ ${className}` }),
    attendanceSessionOpened: (className, subject) => ({ title: "تم فتح جلسة الحضور", message: `جلسة الحضور جاهزة لـ ${className} - ${subject}` }),
    attendanceReminder: (className, subject, startTime) => ({ title: "تذكير الحضور", message: `حضور ${className} - ${subject} يبدأ في ${startTime}. لا تنسَ تسجيل الحضور!` }),
    missingAttendanceReminder: (className, grade, section, date) => ({ title: "تذكير الحضور المفقود", message: `يرجى تسجيل الحضور للصف ${grade} - ${section} (${className}) بتاريخ ${date}. لم يتم تسجيل الحضور بعد.` }),
    newAssignment: (assignmentTitle, dueDate, className) => ({ title: "واجب جديد", message: `تم نشر واجب جديد "${assignmentTitle}" لـ ${className}. الموعد النهائي: ${dueDate}` }),
    assignmentForChild: (studentName, assignmentTitle, dueDate) => ({ title: "واجب جديد لطفلك", message: `${studentName} لديه واجب جديد "${assignmentTitle}" موعده ${dueDate}` }),
    assignmentGraded: (assignmentTitle, grade, className) => ({ title: "تم تصحيح الواجب", message: `تم تصحيح واجبك "${assignmentTitle}" لـ ${className}. الدرجة: ${grade}` }),
    childAssignmentGraded: (studentName, assignmentTitle, grade) => ({ title: "تم تصحيح واجب الطفل", message: `تم تصحيح واجب ${studentName} "${assignmentTitle}". الدرجة: ${grade}` }),
    resultsPublished: (term, className) => ({ title: "تم نشر النتائج", message: `تم نشر نتائج ${term} في ${className}` }),
    assessmentStarted: (assessmentType, assessmentTitle, className, subjectName) => ({ title: "بدأ التقييم", message: `${assessmentType} "${assessmentTitle}" نشط الآن لـ ${className} - ${subjectName}. يرجى إدخال الدرجات.` }),
    timetableUpdated: (className) => ({ title: "تم تحديث الجدول", message: `تم تحديث الجدول لـ ${className}. يرجى التحقق من جدولك الجديد.` }),
    feeReminder: (amount, dueDate, studentName) => ({ title: "تذكير بدفع الرسوم", message: `${studentName ? `رسوم ${studentName}: ` : ""}الدفع بمبلغ ${amount} مستحق في ${dueDate}` }),
    periodFeeDue: (amount, studentName, termName) => ({ title: `رسوم ${termName} مستحقة`, message: `يرجى دفع ${amount} لـ ${studentName || "طفلك"} عن ${termName}.` }),
    paymentReceived: (amount, receiptNumber) => ({ title: "تم استلام الدفع", message: `تم استلام دفعتك بمبلغ ${amount}. رقم الإيصال: ${receiptNumber}` }),
    paymentRecorded: (amount, studentName, termName) => ({ title: "تم تسجيل الدفع", message: `تم تسجيل دفع ${amount} لـ ${studentName || "طفلك"}${termName ? ` عن ${termName}` : ""}.` }),
    classCancelled: (className, date, reason) => ({ title: "تم إلغاء الحصة", message: `تم إلغاء ${className} في ${date}.${reason ? ` السبب: ${reason}` : ""}` }),
    studentClassCancelled: (subject, className, date) => ({ title: "تم إلغاء الحصة", message: `تم إلغاء حصة ${subject} لـ ${className} في ${date}` }),
    accountActivated: { title: "تم تفعيل الحساب", message: "تم تفعيل حسابك. يمكنك الآن تسجيل الدخول." },
    accountDeactivated: (reason) => ({ title: "تم تعطيل الحساب", message: reason || "تم تعطيل حسابك. يرجى الاتصال بإدارة المدرسة لمزيد من المعلومات." }),
    classStarting: { title: "حصتك على وشك البدء", message: "رن الجرس لحصتك الحالية. يرجى التوجه إلى فصلك." },
    classEnded: { title: "انتهت حصتك", message: "رن الجرس لإنهاء حصتك الحالية." },
    classBell: (sirenLabel) => ({ title: "جرس الحصة", message: `رن جرس ${sirenLabel} لجدولك.` }),
    schoolBell: { title: "جرس المدرسة", message: "تم تشغيل جرس المدرسة." },
    passwordResetRequested: (userName, username) => ({ title: "تم طلب إعادة تعيين كلمة المرور", message: `طلب ${userName}${username ? ` (${username})` : ""} إعادة تعيين كلمة المرور.` }),
    studentRankingUpdated: (term) => ({ title: "تم تحديث ترتيب الطالب", message: `تم حساب ترتيبات ${term} وهي متاحة في نتائج طفلك.` }),
    lessonCreated: (teacherName, lessonTitle, subjectName) => ({ title: "تم إنشاء درس جديد", message: `أنشأ ${teacherName || "المعلم"} "${lessonTitle}" لـ ${subjectName || "الدرس"}.` }),
    lessonPublished: (lessonTitle, grade, section, teacherName) => ({ title: "تم نشر درس جديد", message: `درس جديد: ${lessonTitle} للصف ${grade} ${section} بواسطة ${teacherName || "المعلم"}` }),
    homeworkAssigned: (homeworkTitle, dueDate) => ({ title: "تم تعيين واجب جديد", message: `واجب جديد: ${homeworkTitle}. الموعد النهائي: ${dueDate || "لا يوجد موعد نهائي"}` }),
    newCommunicationFor: (studentName, subject) => ({ title: "إدخال اتصال جديد", message: `تمت إضافة ملاحظة جديدة لـ ${studentName}: ${subject}` }),
    newCommunication: (subject) => ({ title: "إدخال اتصال جديد", message: `تمت إضافة ملاحظة جديدة: ${subject}` }),
    newCommunicationReply: (senderName, subject, preview) => ({ title: "رد جديد على الاتصال", message: `رد ${senderName} على "${subject}": ${preview}` }),
    newMessage: (senderName, preview) => ({ title: "رسالة جديدة", message: preview ? `${senderName}: ${preview}` : `${senderName} أرسل لك رسالة` }),
    attendanceCutoffReached: (time, className, section) => ({ title: "انتهى وقت الحضور", message: `انتهى وقت الحضور (${time}). يرجى إرسال حضور ${className} (القسم ${section}) فوراً.` }),
    missingAttendanceAlert: (count, time, classes) => ({ title: "تنبيه الحضور المفقود", message: `فشلت ${count} فصول في تسجيل الحضور بعد الوقت المحدد (${time}): ${classes}` }),
    payrollRunRequired: (periodLabel) => ({ title: `إنشاء مسير رواتب ${periodLabel}`, message: `لم يتم إنشاء مسير رواتب لـ ${periodLabel}. أنشئ المسير الشهري حتى تتم مراجعة الرواتب واعتمادها ودفعها.` }),
    payrollPaymentDue: (periodLabel, daysBefore, paymentDate, amount) => ({ title: `دفع رواتب ${periodLabel} مستحق خلال ${daysBefore} أيام`, message: `تمت جدولة رواتب ${periodLabel} للدفع في ${paymentDate}. صافي الرواتب: ${amount}.` }),
    platformBackupOverdue: (days) => ({ title: "نسخة المنصة الاحتياطية متأخرة", message: `كانت آخر نسخة احتياطية كاملة للمنصة قبل ${days} أيام. نزّل نسخة جديدة من نسخ المدير العام الاحتياطية.` }),
    platformBackupMissing: { title: "لم يتم تسجيل نسخة احتياطية للمنصة", message: "لم يتم تسجيل تنزيل نسخة احتياطية كاملة للمنصة بعد. نزّل نسخة احتياطية كاملة من نسخ المدير العام الاحتياطية." },
    databaseSizeDanger: (size, threshold) => ({ title: "حجم قاعدة البيانات فوق حد الخطر", message: `حجم قاعدة البيانات حوالي ${size} MB، وهو أعلى من حد الخطر ${threshold} MB. راجع التخزين وحالة النسخ الاحتياطي.` }),
    weeklyPlatformSummary: (schools, users, databaseSize, backupLabel) => ({ title: "ملخص حالة المنصة الأسبوعي", message: `${schools} مدارس نشطة، ${users} مستخدمين نشطين، قاعدة البيانات ${databaseSize} MB. آخر نسخة احتياطية للمنصة: ${backupLabel}.` }),
  },
  om: {
    pickupReminder: { title: "Yaadannoo Fudhachuu", message: "Maatii jaalatamoo, kutaa dhumaa xumuramaa jira. Maaloo dhufaa mucaa keessan fudhaa." },
    newEnrollment: (studentName, grade) => ({ title: "Gaaffii Galmee Haaraa", message: `${studentName} kutaa ${grade} tiif gaaffii galmee dhiyeesseera` }),
    enrollmentApproved: (studentName, className) => ({ title: "Galmee Mirkanaa'e", message: `Baga gammaddan! Galmee ${studentName} tiif ${className} mirkanaa'eera` }),
    enrollmentRejected: (studentName, reason) => ({ title: "Haala Galmee", message: `Galmeen ${studentName} akka hin mirkanoofne isin beeksisna.${reason ? ` Sababa: ${reason}` : ""}` }),
    attendanceAlert: (studentName, date, className) => ({ title: "Akeekkachiisa Argamaa", message: `${studentName} guyyaa ${date} kutaa ${className} keessatti hin argamne jedhamee galmaa'eera` }),
    lateArrival: (studentName, time, className) => ({ title: "Yaadannoo Dhiyeenya", message: `${studentName} sa'aatii ${time} irratti kutaa ${className} tiif dhiyeenyaan dhufeera` }),
    attendanceSessionOpened: (className, subject) => ({ title: "Sessiini Argamaa Banameera", message: `Sessiini argamaa ${className} - ${subject} tiif qophiidha` }),
    attendanceReminder: (className, subject, startTime) => ({ title: "Yaadannoo Argamaa", message: `Argamni ${className} - ${subject} sa'aatii ${startTime} jalqabama. Argama galmeessuu hin dagatinaa!` }),
    missingAttendanceReminder: (className, grade, section, date) => ({ title: "Yaadannoo Argamaa Dhabame", message: `Maaloo kutaa ${grade} - ${section} (${className}) guyyaa ${date} tiif argama galmeessaa. Argamni ammaatti hin galmoofne.` }),
    newAssignment: (assignmentTitle, dueDate, className) => ({ title: "Hojii Haaraa", message: `Hojiin haaraa "${assignmentTitle}" kutaa ${className} tiif maxxanfameera. Guyyaa xumuraa: ${dueDate}` }),
    assignmentForChild: (studentName, assignmentTitle, dueDate) => ({ title: "Hojii Haaraa Mucaa Keessaniif", message: `${studentName} hojii haaraa "${assignmentTitle}" qaba guyyaa xumuraa ${dueDate}` }),
    assignmentGraded: (assignmentTitle, grade, className) => ({ title: "Hojiin Sadarkaa Argateera", message: `Hojiin keessan "${assignmentTitle}" kutaa ${className} tiif sadarkaa argateera. Sadarkaa: ${grade}` }),
    childAssignmentGraded: (studentName, assignmentTitle, grade) => ({ title: "Hojiin Mucaa Sadarkaa Argateera", message: `Hojiin ${studentName} "${assignmentTitle}" sadarkaa argateera. Sadarkaa: ${grade}` }),
    resultsPublished: (term, className) => ({ title: "Bu'aan Maxxanfameera", message: `Bu'aan ${term} kutaa ${className} keessatti maxxanfameera` }),
    assessmentStarted: (assessmentType, assessmentTitle, className, subjectName) => ({ title: "Madaallii Jalqabameera", message: `${assessmentType} "${assessmentTitle}" amma ${className} - ${subjectName} tiif hojii irra jira. Maaloo qabxii galchaa.` }),
    timetableUpdated: (className) => ({ title: "Sagantaan Yeroo Haaromfameera", message: `Sagantaan yeroo ${className} tiif haaromfameera. Maaloo sagantaa haaraa keessan ilaalaa.` }),
    feeReminder: (amount, dueDate, studentName) => ({ title: "Yaadannoo Kaffaltii", message: `${studentName ? `Kaffaltii ${studentName}: ` : ""}Kaffaltiin ${amount} guyyaa ${dueDate} irratti ga'a` }),
    periodFeeDue: (amount, studentName, termName) => ({ title: `Kaffaltiin ${termName} ga'eera`, message: `Maaloo ${amount} ${studentName || "mucaa keessaniif"} ${termName} tiif kaffalaa.` }),
    paymentReceived: (amount, receiptNumber) => ({ title: "Kaffaltiin Fudhatameera", message: `Kaffaltiin keessan ${amount} fudhatameera. Lakkoofsa rasiitii: ${receiptNumber}` }),
    paymentRecorded: (amount, studentName, termName) => ({ title: "Kaffaltiin Galmaa'eera", message: `Kaffaltiin ${amount} ${studentName || "mucaa keessaniif"}${termName ? ` ${termName} tiif` : ""} galmaa'eera.` }),
    classCancelled: (className, date, reason) => ({ title: "Kutaan Haqameera", message: `${className} guyyaa ${date} haqameera.${reason ? ` Sababa: ${reason}` : ""}` }),
    studentClassCancelled: (subject, className, date) => ({ title: "Kutaan Haqameera", message: `Kutaa ${subject} kutaa ${className} tiif guyyaa ${date} haqameera` }),
    accountActivated: { title: "Akkaawuntii Hojii Irra Oole", message: "Akkaawuntiin keessan hojii irra ooleera. Amma seenaa dandeessu." },
    accountDeactivated: (reason) => ({ title: "Akkaawuntii Hojii Irraa Kaafame", message: reason || "Akkaawuntiin keessan hojii irraa kaafameera. Odeeffannoo dabalataaf bulchiinsa mana barumsaa qunnamaa." }),
    classStarting: { title: "Kutaan Keessan Jalqabamaa Jira", message: "Bellii kutaa ammaaf rukutameera. Maaloo gara kutaa keessan deemsisaa." },
    classEnded: { title: "Kutaan Keessan Xumurameera", message: "Bellii kutaa ammaa xumuruuf rukutameera." },
    classBell: (sirenLabel) => ({ title: "Bellii Kutaa", message: `Bellii ${sirenLabel} sagantaa yeroo keessaniif rukutameera.` }),
    schoolBell: { title: "Bellii Mana Barumsaa", message: "Bellii mana barumsaa hojii irra ooleera." },
    passwordResetRequested: (userName, username) => ({ title: "Password deebisanii galchuu gaafatameera", message: `${userName}${username ? ` (${username})` : ""} password deebisanii galchuu gaafateera.` }),
    studentRankingUpdated: (term) => ({ title: "Sadarkaan Barataa Haaromfameera", message: `Sadarkaan ${term} shallagamee bu'aa mucaa keessanii keessatti ni argama.` }),
    lessonCreated: (teacherName, lessonTitle, subjectName) => ({ title: "Barnoonni Haaraan Uumameera", message: `${teacherName || "Barsiisaan"} "${lessonTitle}" ${subjectName || "barnoota"} tiif uumeera.` }),
    lessonPublished: (lessonTitle, grade, section, teacherName) => ({ title: "Barnoonni Haaraan Maxxanfameera", message: `Barnoota haaraa: ${lessonTitle} kutaa ${grade} ${section} tiif ${teacherName || "Barsiisaa"} irraa` }),
    homeworkAssigned: (homeworkTitle, dueDate) => ({ title: "Hojiin Manaa Haaraan Kennamameera", message: `Hojii manaa haaraa: ${homeworkTitle}. Guyyaa xumuraa: ${dueDate || "Guyyaan xumuraa hin jiru"}` }),
    newCommunicationFor: (studentName, subject) => ({ title: "Gabaasa Qunnamtii Haaraa", message: `${studentName} tiif yaadannoon haaraan dabalameera: ${subject}` }),
    newCommunication: (subject) => ({ title: "Gabaasa Qunnamtii Haaraa", message: `Yaadannoon haaraan dabalameera: ${subject}` }),
    newCommunicationReply: (senderName, subject, preview) => ({ title: "Qunnamtii deebii haaraa", message: `${senderName} "${subject}" irratti deebii kenneera: ${preview}` }),
    newMessage: (senderName, preview) => ({ title: "Ergaa Haaraa", message: preview ? `${senderName}: ${preview}` : `${senderName} ergaa isiniif ergeera` }),
    attendanceCutoffReached: (time, className, section) => ({ title: "Yeroon Galmee Argamaa Darbe", message: `Yeroon galmee argamaa (${time}) darbeera. Maaloo argamaa ${className} (Kutaa ${section}) battalumatti galchi.` }),
    missingAttendanceAlert: (count, time, classes) => ({ title: "Yaadachiisa Hir'ina Argamaa", message: `Kutaaleen ${count} yeroo murtaa'aan booda (${time}) argamaa hin galmeessine: ${classes}` }),
    payrollRunRequired: (periodLabel) => ({ title: `Adeemsa mindaa ${periodLabel} uumi`, message: `Adeemsi mindaa ${periodLabel} hin uumamne. Mindaan ilaalamee, mirkanaa'ee fi kaffalamuuf adeemsa ji'aa uumi.` }),
    payrollPaymentDue: (periodLabel, daysBefore, paymentDate, amount) => ({ title: `Kaffaltiin mindaa ${periodLabel} guyyaa ${daysBefore} keessatti ga'a`, message: `Mindaan ${periodLabel} guyyaa ${paymentDate} kaffalamuuf saganteeffameera. Mindaa qulqulluu: ${amount}.` }),
    platformBackupOverdue: (days) => ({ title: "Backup platformii yeroo darbeera", message: `Backup guutuun platformii dhumaa guyyaa ${days} dura ture. Backup haaraa Super Admin irraa buusi.` }),
    platformBackupMissing: { title: "Backup platformii hin galmoofne", message: "Backup guutuu platformii buusuun hanga ammaatti hin galmoofne. Backup guutuu Super Admin irraa buusi." },
    databaseSizeDanger: (size, threshold) => ({ title: "Hammamni database daangaa balaa caaleera", message: `Databasen tilmaamaan ${size} MB dha, daangaa balaa ${threshold} MB caaleera. Kuusaa fi haala backup ilaali.` }),
    weeklyPlatformSummary: (schools, users, databaseSize, backupLabel) => ({ title: "Cuunfaa haala platformii torbanichaa", message: `${schools} manneen barnootaa hojiirra jiran, ${users} fayyadamtoota hojiirra jiran, database ${databaseSize} MB. Backup platformii dhumaa: ${backupLabel}.` }),
  },
  so: {
    pickupReminder: { title: "Xusuusin Qaadeyn", message: "Waalidka qaali ah, fasalka ugu dambeeya wuu dhammaanayaa. Fadlan kaalay oo qaado ilmahaaga." },
    newEnrollment: (studentName, grade) => ({ title: "Codsiga Diiwaangelin Cusub", message: `${studentName} wuxuu soo gudbiyay codsi diiwaangelin fasalka ${grade}` }),
    enrollmentApproved: (studentName, className) => ({ title: "Diiwaangelinta La Ansixiyay", message: `Hambalyo! Diiwaangelinta ${studentName} ee ${className} waa la ansixiyay` }),
    enrollmentRejected: (studentName, reason) => ({ title: "Cusbooneysiinta Diiwaangelinta", message: `Waan ka xunnahay inaan kuu sheegno in codsiga diiwaangelinta ${studentName} aan la ansixin.${reason ? ` Sababta: ${reason}` : ""}` }),
    attendanceAlert: (studentName, date, className) => ({ title: "Digniin Imaansho", message: `${studentName} waa la qoray inuu maqnaa ${className} taariikhda ${date}` }),
    lateArrival: (studentName, time, className) => ({ title: "Ogeysiis Daahitaan", message: `${studentName} wuxuu yimid daahitaan saacadda ${time} ee ${className}` }),
    attendanceSessionOpened: (className, subject) => ({ title: "Fadhiga Imaansho Waa La Furay", message: `Fadhiga imaansho waa diyaar ${className} - ${subject}` }),
    attendanceReminder: (className, subject, startTime) => ({ title: "Xusuusin Imaansho", message: `Imaanshaha ${className} - ${subject} wuxuu bilaabmaa saacadda ${startTime}. Ha illaawin inaad qorto imaanshaha!` }),
    missingAttendanceReminder: (className, grade, section, date) => ({ title: "Xusuusin Imaansho La'aan", message: `Fadlan qor imaanshaha fasalka ${grade} - ${section} (${className}) taariikhda ${date}. Imaansho weli lama qorin.` }),
    newAssignment: (assignmentTitle, dueDate, className) => ({ title: "Hawl Cusub", message: `Hawl cusub "${assignmentTitle}" ayaa la soo dhigay ${className}. Waqtiga ugu dambeeya: ${dueDate}` }),
    assignmentForChild: (studentName, assignmentTitle, dueDate) => ({ title: "Hawl Cusub Oo Ilmahaaga Ah", message: `${studentName} wuxuu leeyahay hawl cusub "${assignmentTitle}" waqtiga ugu dambeeya ${dueDate}` }),
    assignmentGraded: (assignmentTitle, grade, className) => ({ title: "Hawsha La Qiimeeyay", message: `Hawshaada "${assignmentTitle}" ee ${className} waa la qiimeeyay. Darajo: ${grade}` }),
    childAssignmentGraded: (studentName, assignmentTitle, grade) => ({ title: "Hawsha Ilmaha La Qiimeeyay", message: `Hawsha ${studentName} "${assignmentTitle}" waa la qiimeeyay. Darajo: ${grade}` }),
    resultsPublished: (term, className) => ({ title: "Natiijooyinka La Daabacay", message: `Natiijooyinka ${term} ee ${className} waa la daabacay` }),
    assessmentStarted: (assessmentType, assessmentTitle, className, subjectName) => ({ title: "Qiimeynta La Bilaabay", message: `${assessmentType} "${assessmentTitle}" hadda waa firfircoon yahay ${className} - ${subjectName}. Fadlan geli dhibcaha.` }),
    timetableUpdated: (className) => ({ title: "Jadwalka La Cusbooneysiiyay", message: `Jadwalka ${className} waa la cusbooneysiiyay. Fadlan eeg jadwalkaaga cusub.` }),
    feeReminder: (amount, dueDate, studentName) => ({ title: "Xusuusin Lacag Bixinta", message: `${studentName ? `Lacagta ${studentName}: ` : ""}Lacagta ${amount} waa la gaaray ${dueDate}` }),
    periodFeeDue: (amount, studentName, termName) => ({ title: `Lacagta ${termName} waa la gaaray`, message: `Fadlan bixi ${amount} ee ${studentName || "ilmahaaga"} ee ${termName}.` }),
    paymentReceived: (amount, receiptNumber) => ({ title: "Lacagta La Helay", message: `Lacagtaada ${amount} waa la helay. Lambarka rasiidka: ${receiptNumber}` }),
    paymentRecorded: (amount, studentName, termName) => ({ title: "Lacag Bixin La Diiwaangeliyay", message: `Lacag bixinta ${amount} ee ${studentName || "ilmahaaga"}${termName ? ` ee ${termName}` : ""} waa la diiwaangeliyay.` }),
    classCancelled: (className, date, reason) => ({ title: "Fasalka La Joojiyay", message: `${className} ee ${date} waa la joojiyay.${reason ? ` Sababta: ${reason}` : ""}` }),
    studentClassCancelled: (subject, className, date) => ({ title: "Fasalka La Joojiyay", message: `Fasalka ${subject} ee ${className} taariikhda ${date} waa la joojiyay` }),
    accountActivated: { title: "Koontada La Dhaqaajiyay", message: "Koontadaada waa la dhaqaajiyay. Hadda waad geli kartaa." },
    accountDeactivated: (reason) => ({ title: "Koontada La Damay", message: reason || "Koontadaada waa la damiyay. Fadlan la xiriir maamulka dugsiga macluumaad dheeraad ah." }),
    classStarting: { title: "Fasalkaagu Wuu Bilaabmayaa", message: "Geeska ayaa loo tumay fasalkaaga hadda. Fadlan u soco fasalkaaga." },
    classEnded: { title: "Fasalkaagu Wuu Dhamaaday", message: "Geeska ayaa loo tumay si fasalkaaga hadda loo dhameeyo." },
    classBell: (sirenLabel) => ({ title: "Geeska Fasalka", message: `Geeska ${sirenLabel} ayaa loo tumay jadwalkaaga.` }),
    schoolBell: { title: "Geeska Dugsiga", message: "Geeska dugsiga waa la tumay." },
    passwordResetRequested: (userName, username) => ({ title: "Codsashada Beddelka Furaha", message: `${userName}${username ? ` (${username})` : ""} wuxuu codsaday beddelka furaha.` }),
    studentRankingUpdated: (term) => ({ title: "Darajada Ardayga Waa La Cusbooneysiiyay", message: `Darajooyinka ${term} waa la xisaabiyay waxayna ku jiraan natiijooyinka ilmahaaga.` }),
    lessonCreated: (teacherName, lessonTitle, subjectName) => ({ title: "Cashar Cusub Ayaa La Abuuray", message: `${teacherName || "Macalinka"} wuxuu abuuray "${lessonTitle}" ee ${subjectName || "casharka"}.` }),
    lessonPublished: (lessonTitle, grade, section, teacherName) => ({ title: "Cashar Cusub Ayaa La Daabacay", message: `Cashar cusub: ${lessonTitle} ee fasalka ${grade} ${section} by ${teacherName || "Macalin"}` }),
    homeworkAssigned: (homeworkTitle, dueDate) => ({ title: "Shaqo Guri Cusub Ayaa La Bixiyay", message: `Shaqo guri cusub: ${homeworkTitle}. Waqtiga ugu dambeeya: ${dueDate || "Ma jiro waqti dambe"}` }),
    newCommunicationFor: (studentName, subject) => ({ title: "Gali Cusub ee Xiriirka", message: `Qoraal cusub ayaa lagu daray ${studentName}: ${subject}` }),
    newCommunication: (subject) => ({ title: "Gali Cusub ee Xiriirka", message: `Qoraal cusub ayaa lagu daray: ${subject}` }),
    newCommunicationReply: (senderName, subject, preview) => ({ title: "Jawaab Cusub oo Xiriir ah", message: `${senderName} wuxuu u jawaabay "${subject}": ${preview}` }),
    newMessage: (senderName, preview) => ({ title: "Fariin Cusub", message: preview ? `${senderName}: ${preview}` : `${senderName} wuxuu kuu soo diray fariin` }),
    attendanceCutoffReached: (time, className, section) => ({ title: "Waqtigii Xaadirinta Wuu Dhamaaday", message: `Waqtigii xaadirinta (${time}) wuu dhaafay. Fadlan isla markiiba gudbi xaadirinta ${className} (Qaybta ${section}).` }),
    missingAttendanceAlert: (count, time, classes) => ({ title: "Digniinta Xaadirinta Maqan", message: `${count} fasal ayaa seegay xaadirinta ka dib waqtiga xaddidan (${time}): ${classes}` }),
    payrollRunRequired: (periodLabel) => ({ title: `Abuur socodka mushaharka ${periodLabel}`, message: `Socod mushahar looma abuurin ${periodLabel}. Abuur socodka bilaha si mushaharrada loo eego, loo ansixiyo, loona bixiyo.` }),
    payrollPaymentDue: (periodLabel, daysBefore, paymentDate, amount) => ({ title: `Bixinta mushaharka ${periodLabel} waxay ku egtahay ${daysBefore} maalmood`, message: `Mushaharka ${periodLabel} waxaa loo qorsheeyay bixinta ${paymentDate}. Mushaharka saafiga ah: ${amount}.` }),
    platformBackupOverdue: (days) => ({ title: "Kaydka platform-ka wuu daahay", message: `Kaydkii buuxa ee platform-ka ugu dambeeyay wuxuu ahaa ${days} maalmood kahor. Ka soo deji kayd cusub kaydka Super Admin.` }),
    platformBackupMissing: { title: "Kayd platform lama diiwaangelin", message: "Soo dejin kayd buuxa oo platform ah wali lama diiwaangelin. Ka soo deji kayd buuxa kaydka Super Admin." },
    databaseSizeDanger: (size, threshold) => ({ title: "Cabbirka database-ka wuxuu ka sarreeyaa xadka khatarta", message: `Database-ku waa qiyaastii ${size} MB, wuxuu ka sarreeyaa xadka khatarta ${threshold} MB. Dib u eeg kaydinta iyo xaaladda backup-ka.` }),
    weeklyPlatformSummary: (schools, users, databaseSize, backupLabel) => ({ title: "Soo koobidda xaaladda platform-ka toddobaadlaha", message: `${schools} dugsi oo firfircoon, ${users} isticmaale oo firfircoon, database ${databaseSize} MB. Kaydkii platform-ka ugu dambeeyay: ${backupLabel}.` }),
  },
};

const titleMap: Record<AppLanguage, Record<string, string>> = {
  en: {},
  am: {
    "Attendance Alert": "የመገኘት ማስጠንቀቂያ",
    "Attendance Cutoff Reached": "የመገኘት መጨረሻ ሰዓት አልፏል",
    "Your Class Has Ended": "ክፍልዎ ተጠናቋል",
    "Missing Attendance Reminder": "ያልተመዘገበ መገኘት ማስታወሻ",
    "Missing Attendance Alert": "ያልተመዘገበ መገኘት ማስጠንቀቂያ",
    "Pickup reminder": "የመውሰድ ማስታወሻ",
    "New Communication Entry": "አዲስ የኮሙኒኬሽን መረጃ",
    "Communication Closed": "ኮሙኒኬሽኑ ተዘግቷል",
    "Communication Acknowledged": "ኮሙኒኬሽኑ ተረጋግጧል",
    "Communication Reopened": "ኮሙኒኬሽኑ ድጋሚ ተከፍቷል",
    "New Reply to Communication": "ለኮሙኒኬሽኑ አዲስ ምላሽ",
    "Password Reset Requested": "የይለፍ ቃል መልሶ ማግኛ ተጠይቋል",
  },
  ar: {
    "Attendance Alert": "تنبيه الحضور",
    "Attendance Cutoff Reached": "انتهى وقت الحضور",
    "Your Class Has Ended": "انتهت حصتك",
    "Missing Attendance Reminder": "تذكير بالحضور المفقود",
    "Missing Attendance Alert": "تنبيه الحضور المفقود",
    "Pickup reminder": "تذكير بالاستلام",
    "New Communication Entry": "إدخال اتصال جديد",
    "Communication Closed": "تم إغلاق الاتصال",
    "Communication Acknowledged": "تم تأكيد الاستلام",
    "Communication Reopened": "تم إعادة فتح الاتصال",
    "New Reply to Communication": "رد جديد على الاتصال",
    "Password Reset Requested": "تم طلب إعادة تعيين كلمة المرور",
  },
  om: {
    "Attendance Alert": "Akeekkachiisa Argamaa",
    "Attendance Cutoff Reached": "Yeroon Galmee Argamaa Darbe",
    "Your Class Has Ended": "Kutaan Kee Xumurameera",
    "Missing Attendance Reminder": "Yaadachiisa Argamaa Hin Galmoofne",
    "Missing Attendance Alert": "Yaadachiisa Hir’ina Argamaa",
    "Pickup reminder": "Yaadannoo Fudhachuu",
    "New Communication Entry": "Gabaasa Qunnamtii Haaraa",
    "Communication Closed": "Qunnamtii Cufame",
    "Communication Acknowledged": "Qunnamtii Hubatame",
    "Communication Reopened": "Qunnamtii Banameera",
    "New Reply to Communication": "Qunnamtii deebii haaraa",
    "Password Reset Requested": "Password deebisanii galchuu gaafatameera",
  },
  so: {
    "Attendance Alert": "Digniin Imaansho",
    "Attendance Cutoff Reached": "Waqtigii Xaadirinta Wuu Dhamaaday",
    "Your Class Has Ended": "Fasalkaagu Wuu Dhamaaday",
    "Missing Attendance Reminder": "Xusuusin Xaadirin Maqan",
    "Missing Attendance Alert": "Digniinta Xaadirinta Maqan",
    "Pickup reminder": "Xusuusin Qaadeyn",
    "New Communication Entry": "Gali Cusub ee Xiriirka",
    "Communication Closed": "Xiriirkii Waa La Xiray",
    "Communication Acknowledged": "Xiriirka Waa La Aqbalay",
    "Communication Reopened": "Xiriirka Waa La Furi Doonaa",
    "New Reply to Communication": "Jawaab Cusub oo Xiriir ah",
    "Password Reset Requested": "Codsashada Beddelka Furaha",
  },
};

function localizeStructuredNotification<T extends DisplayNotification>(
  notification: T,
  language: AppLanguage,
): LocalizedNotification | null {
  const metadata = parseMetadata(notification.metadata);
  const type = String(notification.type || "").toUpperCase();
  const title = String(notification.title || "");
  const message = String(notification.message || "");
  const actionUrl = String(notification.actionUrl || "");

  const studentName = metadataText(metadata, "studentName");
  const className = metadataText(metadata, "className");
  const date = metadataText(metadata, "displayDate") || metadataText(metadata, "date");
  const grade = metadataText(metadata, "grade");
  const section = metadataText(metadata, "section");
  const subject = metadataText(metadata, "subject");
  const subjectName = metadataText(metadata, "subjectName");
  const assignmentTitle = metadataText(metadata, "assignmentTitle");
  const dueDate = metadataText(metadata, "dueDate");
  const assessmentTitle = metadataText(metadata, "assessmentTitle");
  const assessmentType = metadataText(metadata, "assessmentType");
  const term = metadataText(metadata, "term") || metadataText(metadata, "termName");
  const amount = metadataText(metadata, "amount") || formatAmount(metadataText(metadata, "amountDue") || metadataText(metadata, "amountPaid"));

  switch (type) {
    case "PICKUP_REMINDER":
      return safeTemplate(language, "pickupReminder");
    case "ENROLLMENT_PENDING":
      if (hasText(studentName, grade)) return safeTemplate(language, "newEnrollment", studentName, grade);
      break;
    case "ENROLLMENT_APPROVED":
      if (hasText(studentName, className)) return safeTemplate(language, "enrollmentApproved", studentName, className);
      break;
    case "ENROLLMENT_REJECTED":
      if (studentName) return safeTemplate(language, "enrollmentRejected", studentName, metadataText(metadata, "reason"));
      break;
    case "ATTENDANCE_ABSENT":
      if (hasText(studentName, date, className)) return safeTemplate(language, "attendanceAlert", studentName, date, className);
      break;
    case "ATTENDANCE_LATE": {
      const time = metadataText(metadata, "time");
      if (hasText(studentName, time, className)) return safeTemplate(language, "lateArrival", studentName, time, className);
      break;
    }
    case "ATTENDANCE_SESSION_OPENED": {
      const startTime = metadataText(metadata, "startTime");
      const cutoffTime = metadataText(metadata, "cutoffTime");
      if (hasText(cutoffTime, className, section)) {
        return safeTemplate(language, "attendanceCutoffReached", cutoffTime, className, section);
      }
      if (hasText(className, grade, section, date)) {
        return safeTemplate(language, "missingAttendanceReminder", className, grade, section, date);
      }
      if (hasText(className, subject, startTime)) {
        return safeTemplate(language, "attendanceReminder", className, subject, startTime);
      }
      if (hasText(className, subject)) {
        return safeTemplate(language, "attendanceSessionOpened", className, subject);
      }
      break;
    }
    case "ASSIGNMENT_CREATED":
      if (hasText(studentName, assignmentTitle, dueDate)) {
        return safeTemplate(language, "assignmentForChild", studentName, assignmentTitle, dueDate);
      }
      if (hasText(assignmentTitle, dueDate, className)) {
        return safeTemplate(language, "newAssignment", assignmentTitle, dueDate, className);
      }
      break;
    case "ASSIGNMENT_GRADED":
      if (hasText(studentName, assignmentTitle, grade)) {
        return safeTemplate(language, "childAssignmentGraded", studentName, assignmentTitle, grade);
      }
      if (hasText(assignmentTitle, grade, className)) {
        return safeTemplate(language, "assignmentGraded", assignmentTitle, grade, className);
      }
      break;
    case "RESULT_PUBLISHED":
      if (hasText(term, className)) return safeTemplate(language, "resultsPublished", term, className);
      break;
    case "ASSESSMENT_CREATED":
      if (hasText(assessmentType, assessmentTitle, className, subjectName)) {
        return safeTemplate(language, "assessmentStarted", assessmentType, assessmentTitle, className, subjectName);
      }
      break;
    case "TIMETABLE_UPDATED":
      if (className) return safeTemplate(language, "timetableUpdated", className);
      break;
    case "CLASS_CANCELLED":
      if (hasText(subject, className, date)) return safeTemplate(language, "studentClassCancelled", subject, className, date);
      if (hasText(className, date)) return safeTemplate(language, "classCancelled", className, date, metadataText(metadata, "reason"));
      break;
    case "FEE_DUE": {
      const termName = metadataText(metadata, "termName");
      const centralDueDate = metadataText(metadata, "dueDate");
      if (hasText(amount, centralDueDate)) {
        return safeTemplate(language, "feeReminder", amount, centralDueDate, studentName);
      }
      if (hasText(amount, termName)) {
        return safeTemplate(language, "periodFeeDue", amount, studentName, termName);
      }
      break;
    }
    case "PAYMENT_RECEIVED": {
      const receiptNumber = metadataText(metadata, "receiptNumber") || metadataText(metadata, "paymentReference") || metadataText(metadata, "transactionReference");
      const termName = metadataText(metadata, "termName");
      if (metadataText(metadata, "amountPaid")) {
        return safeTemplate(language, "paymentRecorded", amount, studentName, termName);
      }
      if (hasText(amount, receiptNumber)) return safeTemplate(language, "paymentReceived", amount, receiptNumber);
      break;
    }
    case "PAYROLL_RUN_REQUIRED": {
      const periodLabel =
        title.match(/^Create (.+) payroll run$/)?.[1] ||
        formatPayrollPeriod(
          metadataText(metadata, "periodMonth"),
          metadataText(metadata, "periodYear"),
          metadataText(metadata, "periodCalendarType"),
        );
      if (periodLabel) return safeTemplate(language, "payrollRunRequired", periodLabel);
      break;
    }
    case "PAYROLL_PAYMENT_DUE": {
      const titleMatch = title.match(/^(.+) payroll payment due in (.+) days$/);
      const messageMatch = message.match(/^.+ payroll is scheduled for payment on (.+)\. Net payroll: (.+)\.$/);
      const periodLabel =
        titleMatch?.[1] ||
        formatPayrollPeriod(
          metadataText(metadata, "periodMonth"),
          metadataText(metadata, "periodYear"),
          metadataText(metadata, "periodCalendarType"),
        );
      const daysBefore = metadataText(metadata, "daysBefore") || titleMatch?.[2] || "";
      const paymentDate = messageMatch?.[1] || metadataText(metadata, "paymentDate", "the scheduled payment date");
      const payrollAmount = messageMatch?.[2] || metadataText(metadata, "amount", "");
      if (hasText(periodLabel, daysBefore, paymentDate)) {
        return safeTemplate(language, "payrollPaymentDue", periodLabel, daysBefore, paymentDate, payrollAmount);
      }
      break;
    }
    case "GRADE_UPDATED":
      if (term || title === "Student Ranking Updated") {
        return safeTemplate(language, "studentRankingUpdated", term || "Student");
      }
      break;
    case "LESSON": {
      const lessonTitle = metadataText(metadata, "lessonTitle");
      const teacherName = metadataText(metadata, "teacherName");
      if (lessonTitle && subjectName) {
        if (title === "New Lesson Published") {
          return safeTemplate(language, "lessonPublished", lessonTitle, grade, section, teacherName || "Teacher");
        }
        return safeTemplate(language, "lessonCreated", teacherName || "Teacher", lessonTitle, subjectName);
      }
      const lessonMatch = message.match(/^(.+) created "([^"]+)" for (.+)\.$/);
      if (lessonMatch) {
        return safeTemplate(language, "lessonCreated", lessonMatch[1], lessonMatch[2], lessonMatch[3]);
      }
      const publishedMatch = message.match(/^New lesson: (.+) for Grade (.+) (.+) by (.+)$/);
      if (publishedMatch) {
        return safeTemplate(language, "lessonPublished", publishedMatch[1], publishedMatch[2], publishedMatch[3], publishedMatch[4]);
      }
      break;
    }
    case "HOMEWORK": {
      const homeworkMatch = message.match(/^New homework: (.+)\. Due: (.+)$/);
      if (homeworkMatch) return safeTemplate(language, "homeworkAssigned", homeworkMatch[1], homeworkMatch[2]);
      break;
    }
    case "COMMUNICATION": {
      const forMatch = message.match(/^A new note has been added for (.+): (.+)$/);
      if (forMatch) return safeTemplate(language, "newCommunicationFor", forMatch[1], forMatch[2]);
      const noteMatch = message.match(/^A new note has been added: (.+)$/);
      if (noteMatch) return safeTemplate(language, "newCommunication", noteMatch[1]);
      break;
    }
    case "MESSAGE_RECEIVED": {
      const replyMatch = message.match(/^(.+) replied to "([^"]+)": (.+)$/);
      if (replyMatch) return safeTemplate(language, "newCommunicationReply", replyMatch[1], replyMatch[2], replyMatch[3]);
      const messageMatch = message.match(/^(.+): (.+)$/);
      if (messageMatch) return safeTemplate(language, "newMessage", messageMatch[1], messageMatch[2]);
      const sentMatch = message.match(/^(.+) sent you a message$/);
      if (sentMatch) return safeTemplate(language, "newMessage", sentMatch[1], "");
      break;
    }
    case "PASSWORD_RESET": {
      const userName = metadataText(metadata, "userName");
      const username = metadataText(metadata, "userUsername");
      if (userName) return safeTemplate(language, "passwordResetRequested", userName, username);
      break;
    }
    case "SIREN_ALERT": {
      const sirenType = metadataText(metadata, "sirenType");
      const triggerType = metadataText(metadata, "triggerType");
      if (triggerType !== "DYNAMIC") return safeTemplate(language, "schoolBell");
      if (sirenType === "PERIOD_START") return safeTemplate(language, "classStarting");
      if (sirenType === "PERIOD_END") return safeTemplate(language, "classEnded");
      if (sirenType) return safeTemplate(language, "classBell", formatSirenLabel(sirenType));
      break;
    }
    case "WARNING": {
      const cutoffTime = metadataText(metadata, "cutoffTime");
      const count = metadataText(metadata, "missingClassCount");
      const classes = Array.isArray(metadata.classes)
        ? metadata.classes
            .map((item) => {
              if (!item || typeof item !== "object") return "";
              const classItem = item as NotificationMetadata;
              const name = metadataText(classItem, "name");
              const classSection = metadataText(classItem, "section");
              return classSection ? `${name} (${classSection})` : name;
            })
            .filter(Boolean)
            .join(", ")
        : "";
      if (title === "Missing Attendance Alert" && hasText(count, cutoffTime)) {
        return safeTemplate(language, "missingAttendanceAlert", count, cutoffTime, classes);
      }
      break;
    }
    case "INFO":
      if (title === "Account Activated" || actionUrl === "/login") return safeTemplate(language, "accountActivated");
      if (title === "Weekly platform status summary") {
        return safeTemplate(
          language,
          "weeklyPlatformSummary",
          metadataText(metadata, "activeSchools"),
          metadataText(metadata, "activeUsers"),
          metadataText(metadata, "databaseSizeMb", "unknown"),
          metadataText(metadata, "lastBackupLabel"),
        );
      }
      break;
    case "ALERT":
      if (title === "Account Deactivated" || actionUrl === "/profile") {
        return safeTemplate(language, "accountDeactivated", metadataText(metadata, "reason"));
      }
      if (title === "Platform backup is overdue") {
        return safeTemplate(language, "platformBackupOverdue", metadataText(metadata, "daysSinceLastBackup"));
      }
      if (title === "No platform backup has been recorded") return safeTemplate(language, "platformBackupMissing");
      break;
    case "SYSTEM_ALERT":
      if (title === "Database size is above danger threshold") {
        return safeTemplate(
          language,
          "databaseSizeDanger",
          metadataText(metadata, "databaseSizeMb"),
          metadataText(metadata, "thresholdMb"),
        );
      }
      break;
    default:
      break;
  }

  return null;
}

function translateTitle(title: string, language: AppLanguage) {
  if (language === "en") return title;
  if (title.startsWith("New Announcement: ")) {
    const announcementTitle = title.replace("New Announcement: ", "");
    const prefix: Record<AppLanguage, string> = {
      en: "New Announcement",
      am: "አዲስ ማስታወቂያ",
      ar: "إعلان جديد",
      om: "Beeksisa Haaraa",
      so: "Ogeysiis Cusub",
    };
    return `${prefix[language] || prefix.en}: ${announcementTitle}`;
  }
  if (title.startsWith("New Event: ")) {
    const eventTitle = title.replace("New Event: ", "");
    const prefix: Record<AppLanguage, string> = {
      en: "New Event",
      am: "አዲስ ዝግጅት",
      ar: "حدث جديد",
      om: "Taatee Haaraa",
      so: "Dhacdo Cusub",
    };
    return `${prefix[language] || prefix.en}: ${eventTitle}`;
  }
  return titleMap[language]?.[title] || title;
}

function translateMessage(message: string, language: AppLanguage) {
  if (language === "en") return message;

  // 1. Cutoff Attendance Matcher
  const cutoffMatch = message.match(
    /^The attendance cutoff time \(([^)]+)\) has passed\. Please submit attendance for (.+) \(Section (.+)\) immediately\.$/,
  );
  if (cutoffMatch) {
    const [, time, className, section] = cutoffMatch;
    const templates: Record<AppLanguage, string> = {
      en: message,
      am: `የመገኘት መጨረሻ ሰዓት (${time}) አልፏል። እባክዎ ለ${className} (ክፍል ${section}) መገኘትን ወዲያውኑ ያስገቡ።`,
      ar: `انتهى وقت الحضور (${time}). يرجى إرسال حضور ${className} (القسم ${section}) فوراً.`,
      om: `Yeroon galmee argamaa (${time}) darbeera. Maaloo argamaa ${className} (Kutaa ${section}) battalumatti galchi.`,
      so: `Waqtigii xaadirinta (${time}) wuu dhaafay. Fadlan isla markiiba gudbi xaadirinta ${className} (Qaybta ${section}).`,
    };
    return templates[language] || message;
  }

  // 2. Missing Attendance Matcher
  const missingMatch = message.match(
    /^Please take attendance for Grade (.+) - (.+) \((.+)\) for (.+)\. Attendance has not been recorded yet\.$/,
  );
  if (missingMatch) {
    const [, grade, section, className, date] = missingMatch;
    const templates: Record<AppLanguage, string> = {
      en: message,
      am: `እባክዎ ለክፍል ${grade} - ${section} (${className}) ለ${date} መገኘት ይመዝግቡ። መገኘት እስካሁን አልተመዘገበም።`,
      ar: `يرجى تسجيل حضور الصف ${grade} - ${section} (${className}) ليوم ${date}. لم يتم تسجيل الحضور بعد.`,
      om: `Maaloo argamaa Kutaa ${grade} - ${section} (${className}) guyyaa ${date} galchi. Argamaan hanga ammaatti hin galmoofne.`,
      so: `Fadlan qaad xaadirinta Fasalka ${grade} - ${section} (${className}) ee ${date}. Xaadirinta wali lama diiwaangelin.`,
    };
    return templates[language] || message;
  }

  // 3. Bell Ring Matcher
  if (message === "The bell has rung to end your current class.") {
    const templates: Record<AppLanguage, string> = {
      en: message,
      am: "የአሁኑን ክፍልዎን ለማጠናቀቅ ደወሉ ተደውሏል።",
      ar: "رُن الجرس لإنهاء حصتك الحالية.",
      om: "Bilbilli kutaa kee ammaa xumuruuf bilbilameera.",
      so: "Gambaleelka ayaa dhacay si loo dhammeeyo fasalkaaga hadda.",
    };
    return templates[language] || message;
  }

  // 4. Parent pickup reminder
  if (message === "Dear parent, the last class is about to end. Please come and pick your child.") {
    const templates: Record<AppLanguage, string> = {
      en: message,
      am: "ውድ ወላጅ ሆይ፣ የመጨረሻው ክፍል ሊያልቅ ነው። እባክዎ መጥተው ልጅዎን ይውሰዱ።",
      ar: "ولي الأمر العزيز، الحصة الأخيرة على وشك الانتهاء. يرجى الحضور لاستلام طفلك.",
      om: "Maatii jaalatamoo, kutaa dhumaa xumuramaa jira. Maaloo dhufaa mucaa keessan fudhaa.",
      so: "Waalidka qaali ah, fasalka ugu dambeeya wuu dhammaanayaa. Fadlan kaalay oo qaado ilmahaaga.",
    };
    return templates[language] || message;
  }

  // 5. Parent absence alert
  const absenceMatch = message.match(/^(.+) was marked absent in (.+) on (.+)$/);
  if (absenceMatch) {
    const [, studentName, className, date] = absenceMatch;
    const templates: Record<AppLanguage, string> = {
      en: message,
      am: `${studentName} በ${date} በ${className} ውስጥ ባለመመዝገቡ ተመዝግቧል`,
      ar: `تم تسجيل ${studentName} غائباً في ${className} بتاريخ ${date}`,
      om: `${studentName} guyyaa ${date} kutaa ${className} keessatti hin argamne jedhamee galmaa'eera`,
      so: `${studentName} waa la qoray inuu maqnaa ${className} taariikhda ${date}`,
    };
    return templates[language] || message;
  }

  // 6. Communication Reply Matcher
  const replyMatch = message.match(/^(.+) replied to "([^"]+)": (.+)$/);
  if (replyMatch) {
    const [, senderName, subject, preview] = replyMatch;
    const templates: Record<AppLanguage, string> = {
      en: message,
      am: `${senderName} ለ "${subject}" ምላሽ ሰጥቷል: ${preview}`,
      ar: `قام ${senderName} بالرد على "${subject}": ${preview}`,
      om: `${senderName} "${subject}" irratti deebii kenneera: ${preview}`,
      so: `${senderName} wuxuu u jawaabay "${subject}": ${preview}`,
    };
    return templates[language] || message;
  }

  // 7. Classes Missed Attendance Matcher
  const missingAlertMatch = message.match(
    /^(\d+) classes missed attendance after cutoff \(([^)]+)\):? (.*)$/
  );
  if (missingAlertMatch) {
    const [, count, time, classes] = missingAlertMatch;
    const templates: Record<AppLanguage, string> = {
      en: message,
      am: `${count} ክፍሎች ከማለቂያ ሰዓት (${time}) በኋላ መገኘት አልመዘገቡም: ${classes}`,
      ar: `فشلت ${count} فصول في تسجيل الحضور بعد الوقت المحدد (${time}): ${classes}`,
      om: `Kutaaleen ${count} yeroo murtaa'aan booda (${time}) argamaa hin galmeessine: ${classes}`,
      so: `${count} fasal ayaa seegay xaadirinta ka dib waqtiga xaddidan (${time}): ${classes}`,
    };
    return templates[language] || message;
  }

  return message;
}

export function localizeNotificationText<T extends DisplayNotification>(notification: T, language: AppLanguage) {
  const structured = localizeStructuredNotification(notification, language);
  if (structured) return structured;

  return {
    title: translateTitle(String(notification.title || ""), language),
    message: translateMessage(String(notification.message || ""), language),
  };
}
