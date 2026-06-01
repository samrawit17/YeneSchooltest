import type { AppLanguage } from "@/lib/languageStore";

type DisplayNotification = {
  title?: string | null;
  message?: string | null;
};

const titleMap: Record<AppLanguage, Record<string, string>> = {
  en: {},
  am: {
    "Attendance Cutoff Reached": "የመገኘት መጨረሻ ሰዓት አልፏል",
    "Your Class Has Ended": "ክፍልዎ ተጠናቋል",
    "Missing Attendance Reminder": "ያልተመዘገበ መገኘት ማስታወሻ",
    "Missing Attendance Alert": "ያልተመዘገበ መገኘት ማስጠንቀቂያ",
    "New Communication Entry": "አዲስ የኮሙኒኬሽን መረጃ",
    "Communication Closed": "ኮሙኒኬሽኑ ተዘግቷል",
    "Communication Acknowledged": "ኮሙኒኬሽኑ ተረጋግጧል",
    "Communication Reopened": "ኮሙኒኬሽኑ ድጋሚ ተከፍቷል",
    "New Reply to Communication": "ለኮሙኒኬሽኑ አዲስ ምላሽ",
    "Password Reset Requested": "የይለፍ ቃል መልሶ ማግኛ ተጠይቋል",
  },
  ar: {
    "Attendance Cutoff Reached": "انتهى وقت الحضور",
    "Your Class Has Ended": "انتهت حصتك",
    "Missing Attendance Reminder": "تذكير بالحضور المفقود",
    "Missing Attendance Alert": "تنبيه الحضور المفقود",
    "New Communication Entry": "إدخال اتصال جديد",
    "Communication Closed": "تم إغلاق الاتصال",
    "Communication Acknowledged": "تم تأكيد الاستلام",
    "Communication Reopened": "تم إعادة فتح الاتصال",
    "New Reply to Communication": "رد جديد على الاتصال",
    "Password Reset Requested": "تم طلب إعادة تعيين كلمة المرور",
  },
  om: {
    "Attendance Cutoff Reached": "Yeroon Galmee Argamaa Darbe",
    "Your Class Has Ended": "Kutaan Kee Xumurameera",
    "Missing Attendance Reminder": "Yaadachiisa Argamaa Hin Galmoofne",
    "Missing Attendance Alert": "Yaadachiisa Hir’ina Argamaa",
    "New Communication Entry": "Gabaasa Qunnamtii Haaraa",
    "Communication Closed": "Qunnamtii Cufame",
    "Communication Acknowledged": "Qunnamtii Hubatame",
    "Communication Reopened": "Qunnamtii Banameera",
    "New Reply to Communication": "Qunnamtii deebii haaraa",
    "Password Reset Requested": "Password deebisanii galchuu gaafatameera",
  },
  so: {
    "Attendance Cutoff Reached": "Waqtigii Xaadirinta Wuu Dhamaaday",
    "Your Class Has Ended": "Fasalkaagu Wuu Dhamaaday",
    "Missing Attendance Reminder": "Xusuusin Xaadirin Maqan",
    "Missing Attendance Alert": "Digniinta Xaadirinta Maqan",
    "New Communication Entry": "Gali Cusub ee Xiriirka",
    "Communication Closed": "Xiriirkii Waa La Xiray",
    "Communication Acknowledged": "Xiriirka Waa La Aqbalay",
    "Communication Reopened": "Xiriirka Waa La Furi Doonaa",
    "New Reply to Communication": "Jawaab Cusub oo Xiriir ah",
    "Password Reset Requested": "Codsashada Beddelka Furaha",
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
    return `${prefix[language] || prefix.en}: ${announcementTitle}`;
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

  // 4. Communication Reply Matcher
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

  // 5. Classes Missed Attendance Matcher
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
  return {
    title: translateTitle(String(notification.title || ""), language),
    message: translateMessage(String(notification.message || ""), language),
  };
}
