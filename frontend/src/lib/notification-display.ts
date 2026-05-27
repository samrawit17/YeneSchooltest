import type { AppLanguage } from "@/lib/languageStore";

type DisplayNotification = {
  title?: string | null;
  message?: string | null;
};

const titleMap: Record<AppLanguage, Record<string, string>> = {
  en: {},
  am: {
    "Attendance Cutoff Reached": "የመገኘት መጨረሻ ሰዓት ደርሷል",
    "Your Class Has Ended": "ክፍልዎ ተጠናቋል",
    "Missing Attendance Reminder": "ያልተመዘገበ መገኘት ማስታወሻ",
  },
  ar: {
    "Attendance Cutoff Reached": "انتهى وقت الحضور",
    "Your Class Has Ended": "انتهى حصتك",
    "Missing Attendance Reminder": "تذكير بالحضور المفقود",
  },
  om: {
    "Attendance Cutoff Reached": "Yeroon Galmee Argamaa Darbe",
    "Your Class Has Ended": "Kutaan Kee Xumurameera",
    "Missing Attendance Reminder": "Yaadachiisa Argamaa Hin Galmoofne",
  },
  so: {
    "Attendance Cutoff Reached": "Waqtigii Xaadirinta Wuu Dhamaaday",
    "Your Class Has Ended": "Fasalkaagu Wuu Dhamaaday",
    "Missing Attendance Reminder": "Xusuusin Xaadirin Maqan",
  },
};

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
    return `${prefix[language]}: ${announcementTitle}`;
  }
  return titleMap[language]?.[title] || title;
}

function translateMessage(message: string, language: AppLanguage) {
  if (language === "en") return message;

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
    return templates[language];
  }

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
    return templates[language];
  }

  if (message === "The bell has rung to end your current class.") {
    const templates: Record<AppLanguage, string> = {
      en: message,
      am: "የአሁኑን ክፍልዎን ለማጠናቀቅ ደወሉ ተደውሏል።",
      ar: "رُن الجرس لإنهاء حصتك الحالية.",
      om: "Bilbilli kutaa kee ammaa xumuruuf bilbilameera.",
      so: "Gambaleelka ayaa dhacay si loo dhammeeyo fasalkaaga hadda.",
    };
    return templates[language];
  }

  return message;
}

export function localizeNotificationText<T extends DisplayNotification>(notification: T, language: AppLanguage) {
  return {
    title: translateTitle(String(notification.title || ""), language),
    message: translateMessage(String(notification.message || ""), language),
  };
}
