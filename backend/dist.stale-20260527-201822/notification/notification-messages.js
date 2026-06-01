"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationMessages = void 0;
exports.notificationMessages = {
    en: {
        pickupReminder: {
            title: 'Pickup reminder',
            message: 'Dear parent, the last class is about to end. Please come and pick your child.',
        },
        newEnrollment: (studentName, grade) => ({
            title: 'New Enrollment Request',
            message: `${studentName} has submitted an enrollment request for Grade ${grade}`,
        }),
        enrollmentApproved: (studentName, className) => ({
            title: 'Enrollment Approved',
            message: `Congratulations! ${studentName}'s enrollment has been approved for ${className}`,
        }),
        enrollmentRejected: (studentName, reason) => ({
            title: 'Enrollment Update',
            message: `We regret to inform you that ${studentName}'s enrollment application was not approved. ${reason ? `Reason: ${reason}` : ''}`,
        }),
        attendanceAlert: (studentName, date, className) => ({
            title: 'Attendance Alert',
            message: `${studentName} was marked absent in ${className} on ${date}`,
        }),
        lateArrival: (studentName, time, className) => ({
            title: 'Late Arrival Notice',
            message: `${studentName} arrived late at ${time} for ${className}`,
        }),
        attendanceSessionOpened: (className, subject) => ({
            title: 'Attendance Session Opened',
            message: `Attendance session is ready for ${className} - ${subject}`,
        }),
        attendanceReminder: (className, subject, startTime) => ({
            title: 'Attendance Reminder',
            message: `Attendance for ${className} - ${subject} starts at ${startTime}. Don't forget to take attendance!`,
        }),
        missingAttendanceReminder: (className, grade, section, date) => ({
            title: 'Missing Attendance Reminder',
            message: `Please take attendance for Grade ${grade} - ${section} (${className}) for ${date}. Attendance has not been recorded yet.`,
        }),
        newAssignment: (assignmentTitle, dueDate, className) => ({
            title: 'New Assignment',
            message: `New assignment "${assignmentTitle}" has been posted for ${className}. Due: ${dueDate}`,
        }),
        assignmentForChild: (studentName, assignmentTitle, dueDate) => ({
            title: 'New Assignment for Your Child',
            message: `${studentName} has a new assignment "${assignmentTitle}" due on ${dueDate}`,
        }),
        assignmentGraded: (assignmentTitle, grade, className) => ({
            title: 'Assignment Graded',
            message: `Your assignment "${assignmentTitle}" for ${className} has been graded. Grade: ${grade}`,
        }),
        childAssignmentGraded: (studentName, assignmentTitle, grade) => ({
            title: "Child's Assignment Graded",
            message: `${studentName}'s assignment "${assignmentTitle}" has been graded. Grade: ${grade}`,
        }),
        resultsPublished: (term, className) => ({
            title: 'Results Published',
            message: `Results for ${term} in ${className} have been published`,
        }),
        assessmentStarted: (assessmentType, assessmentTitle, className, subjectName) => ({
            title: 'Assessment Started',
            message: `${assessmentType} "${assessmentTitle}" is now active for ${className} - ${subjectName}. Please enter scores.`,
        }),
        scheduleChange: {
            title: 'Schedule Change',
            message: '',
        },
        timetableUpdated: (className) => ({
            title: 'Timetable Updated',
            message: `The timetable for ${className} has been updated. Please check your new schedule.`,
        }),
        feeReminder: (amount, dueDate, studentName) => ({
            title: 'Fee Payment Reminder',
            message: `${studentName ? `Fee for ${studentName}: ` : ''}Payment of ${amount} is due on ${dueDate}`,
        }),
        paymentReceived: (amount, receiptNumber) => ({
            title: 'Payment Received',
            message: `Your payment of ${amount} has been received. Receipt #: ${receiptNumber}`,
        }),
        newMessage: (senderName, preview) => ({
            title: 'New Message',
            message: `${senderName}: ${preview}`,
        }),
        welcome: (tempPasswordStr) => {
            const isTemp = tempPasswordStr === 'true';
            return {
                title: 'Welcome to School Management System',
                message: isTemp
                    ? 'Your account has been created. Please check your email for login credentials.'
                    : 'Your account has been created. You can now log in.',
            };
        },
        classCancelled: (className, date, reason) => ({
            title: 'Class Cancelled',
            message: `${className} on ${date} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
        }),
        studentClassCancelled: (subject, className, date) => ({
            title: 'Class Cancelled',
            message: `${subject} class for ${className} on ${date} has been cancelled`,
        }),
        accountDeactivated: (reason) => ({
            title: 'Account Deactivated',
            message: reason || 'Your account has been deactivated. Please contact school administration for more information.',
        }),
        accountActivated: {
            title: 'Account Activated',
            message: 'Your account has been activated. You can now log in.',
        },
        classStarting: {
            title: 'Your Class Is Starting',
            message: 'The bell has rung for your current class. Please proceed to your classroom.',
        },
        classEnded: {
            title: 'Your Class Has Ended',
            message: 'The bell has rung to end your current class.',
        },
        classBell: (sirenLabel) => ({
            title: 'Class Bell',
            message: `${sirenLabel} bell has rung for your timetable.`,
        }),
        schoolBell: {
            title: 'School Bell',
            message: 'The school bell has been triggered.',
        },
    },
    am: {
        pickupReminder: {
            title: 'የመውሰድ ማስታወሻ',
            message: 'ውድ ወላጅ ሆይ፣ የመጨረሻው ክፍል ሊያልቅ ነው። እባክዎ መጥተው ልጅዎን ይውሰዱ።',
        },
        newEnrollment: (studentName, grade) => ({
            title: 'አዲስ የምዝገባ ጥያቄ',
            message: `${studentName} ለክፍል ${grade} የምዝገባ ጥያቄ አስገብቷል`,
        }),
        enrollmentApproved: (studentName, className) => ({
            title: 'ምዝገባ ጸድቋል',
            message: `እንኳን ደስ አለዎት! የ${studentName} ምዝገባ ለ${className} ጸድቋል`,
        }),
        enrollmentRejected: (studentName, reason) => ({
            title: 'የምዝገባ ዝማኔ',
            message: `የ${studentName} የምዝገባ ማመልከቻ እንዳልጸደቀ ልናሳውቅዎ እንወዳለን። ${reason ? `ምክንያት፡ ${reason}` : ''}`,
        }),
        attendanceAlert: (studentName, date, className) => ({
            title: 'የመገኘት ማስጠንቀቂያ',
            message: `${studentName} በ${date} በ${className} ውስጥ ባለመመዝገቡ ተመዝግቧል`,
        }),
        lateArrival: (studentName, time, className) => ({
            title: 'ዘግይቶ መምጣት ማስታወሻ',
            message: `${studentName} በ${time} ለ${className} ዘግይቶ መጥቷል`,
        }),
        attendanceSessionOpened: (className, subject) => ({
            title: 'የመገኘት ክፍለ ጊዜ ተከፍቷል',
            message: `የመገኘት ክፍለ ጊዜ ለ${className} - ${subject} ዝግጁ ነው`,
        }),
        attendanceReminder: (className, subject, startTime) => ({
            title: 'የመገኘት ማስታወሻ',
            message: `የ${className} - ${subject} መገኘት በ${startTime} ይጀምራል። መገኘትን መመዝገት አይርሱ!`,
        }),
        missingAttendanceReminder: (className, grade, section, date) => ({
            title: 'ያልተመዘገበ መገኘት ማስታወሻ',
            message: `እባክዎ ለክፍል ${grade} - ${section} (${className}) ለ${date} መገኘት ይመዝግቡ። መገኘት እስካሁን አልተመዘገበም።`,
        }),
        newAssignment: (assignmentTitle, dueDate, className) => ({
            title: 'አዲስ ሥራ',
            message: `አዲስ ሥራ "${assignmentTitle}" ለ${className} ተለጥᏋል። የመጨረሻ ቀን፡ ${dueDate}`,
        }),
        assignmentForChild: (studentName, assignmentTitle, dueDate) => ({
            title: 'አዲስ ሥራ ለልጅዎ',
            message: `${studentName} አዲስ ሥራ "${assignmentTitle}" አለው የመጨረሻ ቀን ${dueDate}`,
        }),
        assignmentGraded: (assignmentTitle, grade, className) => ({
            title: 'ሥራ ተመዝኗል',
            message: `ሥራዎ "${assignmentTitle}" ለ${className} ተመዝኗል። ውጤት፡ ${grade}`,
        }),
        childAssignmentGraded: (studentName, assignmentTitle, grade) => ({
            title: 'የልጅ ሥራ ተመዝኗል',
            message: `የ${studentName} ሥራ "${assignmentTitle}" ተመዝኗል። ውጤት፡ ${grade}`,
        }),
        resultsPublished: (term, className) => ({
            title: 'ውጤቶች ታትመዋል',
            message: `የ${term} ውጤቶች በ${className} ታትመዋል`,
        }),
        assessmentStarted: (assessmentType, assessmentTitle, className, subjectName) => ({
            title: 'ግምገማ ተጀምሯል',
            message: `${assessmentType} "${assessmentTitle}" አሁን ለ${className} - ${subjectName} ንቁ ነው። እባክዎ ነጥቦችን ያስገቡ።`,
        }),
        scheduleChange: {
            title: 'የሰሌዳ ለውጥ',
            message: '',
        },
        timetableUpdated: (className) => ({
            title: 'የጊዜ ሰሌዳ ተዘምኗል',
            message: `የ${className} የጊዜ ሰሌዳ ተዘምኗል። እባክዎ አዲሱን ሰሌዳዎ ይመልከቱ።`,
        }),
        feeReminder: (amount, dueDate, studentName) => ({
            title: 'የክፍያ ማስታወሻ',
            message: `${studentName ? `ለ${studentName} ክፍያ፡ ` : ''}የ${amount} ክፍያ በ${dueDate} ይደርሳል`,
        }),
        paymentReceived: (amount, receiptNumber) => ({
            title: 'ክፍያ ተቀብለናል',
            message: `የ${amount} ክፍያዎ ተቀብለናል። ደረሰኝ ቁጥር፡ ${receiptNumber}`,
        }),
        newMessage: (senderName, preview) => ({
            title: 'አዲስ መልዕክት',
            message: `${senderName}: ${preview}`,
        }),
        welcome: (tempPasswordStr) => {
            const isTemp = tempPasswordStr === 'true';
            return {
                title: 'እንኳን ወደ ትምህርት ቤት አስተዳደር ስርዓት በደህና መጡ',
                message: isTemp
                    ? 'መለያዎ ተፈጥሯል። እባክዎ ለመግቢያ መረጃ ኢሜይልዎን ይመልከቱ።'
                    : 'መለያዎ ተፈጥሯል። አሁን መግባት ይችላሉ።',
            };
        },
        classCancelled: (className, date, reason) => ({
            title: 'ክፍል ተሰርዟል',
            message: `${className} በ${date} ተሰርዟል። ${reason ? `ምክንያት፡ ${reason}` : ''}`,
        }),
        studentClassCancelled: (subject, className, date) => ({
            title: 'ክፍል ተሰርዟል',
            message: `የ${subject} ክፍል ለ${className} በ${date} ተሰርዟል`,
        }),
        accountDeactivated: (reason) => ({
            title: 'መለያ ተዘግቷል',
            message: reason || 'መለያዎ ተዘግቷል። ለተጨማሪ መረጃ እባክዎ የትምህርት ቤቱን አስተዳደር ያግኙ።',
        }),
        accountActivated: {
            title: 'መለያ ተከፍቷል',
            message: 'መለያዎ ተከፍቷል። አሁን መግባት ይችላሉ።',
        },
        classStarting: {
            title: 'ክፍልዎ እየጀመረ ነው',
            message: 'ለአሁኑ ክፍልዎ ደወል ተመቷል። እባክዎ ወደ ክፍልዎ ይሂዱ።',
        },
        classEnded: {
            title: 'ክፍልዎ አልቋል',
            message: 'የአሁኑ ክፍል ለማብቃት ደወል ተመቷል።',
        },
        classBell: (sirenLabel) => ({
            title: 'የክፍል ደወል',
            message: `የ${sirenLabel} ደወል ለጊዜ ሰሌዳዎ ተመቷል።`,
        }),
        schoolBell: {
            title: 'የትምህርት ቤት ደወል',
            message: 'የትምህርት ቤቱ ደወል ተመቷል።',
        },
    },
    ar: {
        pickupReminder: {
            title: 'تذكير بالاستلام',
            message: 'ولي الأمر العزيز، الحصة الأخيرة على وشك الانتهاء. يرجى الحضور لاستلام طفلك.',
        },
        newEnrollment: (studentName, grade) => ({
            title: 'طلب تسجيل جديد',
            message: `قدم ${studentName} طلب تسجيل للصف ${grade}`,
        }),
        enrollmentApproved: (studentName, className) => ({
            title: 'تم قبول التسجيل',
            message: `تهانينا! تم قبول تسجيل ${studentName} في ${className}`,
        }),
        enrollmentRejected: (studentName, reason) => ({
            title: 'تحديث التسجيل',
            message: `نأسف لإبلاغك بأن طلب تسجيل ${studentName} لم يتم قبوله. ${reason ? `السبب: ${reason}` : ''}`,
        }),
        attendanceAlert: (studentName, date, className) => ({
            title: 'تنبيه الحضور',
            message: `تم تسجيل ${studentName} غائباً في ${className} بتاريخ ${date}`,
        }),
        lateArrival: (studentName, time, className) => ({
            title: 'إشعار التأخر',
            message: `وصل ${studentName} متأخراً في ${time} لـ ${className}`,
        }),
        attendanceSessionOpened: (className, subject) => ({
            title: 'تم فتح جلسة الحضور',
            message: `جلسة الحضور جاهزة لـ ${className} - ${subject}`,
        }),
        attendanceReminder: (className, subject, startTime) => ({
            title: 'تذكير الحضور',
            message: `حضور ${className} - ${subject} يبدأ في ${startTime}. لا تنسَ تسجيل الحضور!`,
        }),
        missingAttendanceReminder: (className, grade, section, date) => ({
            title: 'تذكير الحضور المفقود',
            message: `يرجى تسجيل الحضور للصف ${grade} - ${section} (${className}) بتاريخ ${date}. لم يتم تسجيل الحضور بعد.`,
        }),
        newAssignment: (assignmentTitle, dueDate, className) => ({
            title: 'واجب جديد',
            message: `تم نشر واجب جديد "${assignmentTitle}" لـ ${className}. الموعد النهائي: ${dueDate}`,
        }),
        assignmentForChild: (studentName, assignmentTitle, dueDate) => ({
            title: 'واجب جديد لطفلك',
            message: `${studentName} لديه واجب جديد "${assignmentTitle}" موعد النهائي ${dueDate}`,
        }),
        assignmentGraded: (assignmentTitle, grade, className) => ({
            title: 'تم تصحيح الواجب',
            message: `تم تصحيح واجبك "${assignmentTitle}" لـ ${className}. الدرجة: ${grade}`,
        }),
        childAssignmentGraded: (studentName, assignmentTitle, grade) => ({
            title: 'تم تصحيح واجب الطفل',
            message: `تم تصحيح واجب ${studentName} "${assignmentTitle}". الدرجة: ${grade}`,
        }),
        resultsPublished: (term, className) => ({
            title: 'تم نشر النتائج',
            message: `تم نشر نتائج ${term} في ${className}`,
        }),
        assessmentStarted: (assessmentType, assessmentTitle, className, subjectName) => ({
            title: 'بدأ التقييم',
            message: `${assessmentType} "${assessmentTitle}" نشط الآن لـ ${className} - ${subjectName}. يرجى إدخال الدرجات.`,
        }),
        scheduleChange: {
            title: 'تغيير الجدول',
            message: '',
        },
        timetableUpdated: (className) => ({
            title: 'تم تحديث الجدول',
            message: `تم تحديث الجدول لـ ${className}. يرجى التحقق من جدولك الجديد.`,
        }),
        feeReminder: (amount, dueDate, studentName) => ({
            title: 'تذكير بدفع الرسوم',
            message: `${studentName ? `رسوم ${studentName}: ` : ''}الدفع بمبلغ ${amount} مستحق في ${dueDate}`,
        }),
        paymentReceived: (amount, receiptNumber) => ({
            title: 'تم استلام الدفع',
            message: `تم استلام دفعتك بمبلغ ${amount}. رقم الإيصال: ${receiptNumber}`,
        }),
        newMessage: (senderName, preview) => ({
            title: 'رسالة جديدة',
            message: `${senderName}: ${preview}`,
        }),
        welcome: (tempPasswordStr) => {
            const isTemp = tempPasswordStr === 'true';
            return {
                title: 'مرحباً بك في نظام إدارة المدرسة',
                message: isTemp
                    ? 'تم إنشاء حسابك. يرجى التحقق من بريدك الإلكتروني للحصول على بيانات الدخول.'
                    : 'تم إنشاء حسابك. يمكنك الآن تسجيل الدخول.',
            };
        },
        classCancelled: (className, date, reason) => ({
            title: 'تم إلغاء الحصة',
            message: `تم إلغاء ${className} في ${date}. ${reason ? `السبب: ${reason}` : ''}`,
        }),
        studentClassCancelled: (subject, className, date) => ({
            title: 'تم إلغاء الحصة',
            message: `تم إلغاء حصة ${subject} لـ ${className} في ${date}`,
        }),
        accountDeactivated: (reason) => ({
            title: 'تم تعطيل الحساب',
            message: reason || 'تم تعطيل حسابك. يرجى الاتصال بإدارة المدرسة لمزيد من المعلومات.',
        }),
        accountActivated: {
            title: 'تم تفعيل الحساب',
            message: 'تم تفعيل حسابك. يمكنك الآن تسجيل الدخول.',
        },
        classStarting: {
            title: 'حصتك على وشك البدء',
            message: 'رن الجرس لحصتك الحالية. يرجى التوجه إلى فصلك.',
        },
        classEnded: {
            title: 'انتهت حصتك',
            message: 'رن الجرس لإنهاء حصتك الحالية.',
        },
        classBell: (sirenLabel) => ({
            title: 'جرس الحصة',
            message: `رن جرس ${sirenLabel} لجدولك.`,
        }),
        schoolBell: {
            title: 'جرس المدرسة',
            message: 'تم تشغيل جرس المدرسة.',
        },
    },
    om: {
        pickupReminder: {
            title: 'Yaadannoo Fudhachuu',
            message: 'Maatii jaalatamoo, kutaa dhumaa xumuramaa jira. Maaloo dhufaa mucaa keessan fudhaa.',
        },
        newEnrollment: (studentName, grade) => ({
            title: 'Gaaffii Galmee Haaraa',
            message: `${studentName} kutaa ${grade} tiif gaaffii galmee dhiyeesseera`,
        }),
        enrollmentApproved: (studentName, className) => ({
            title: 'Galmee Mirkanaa\'e',
            message: `Baga gammaddan! Galmee ${studentName} tiif ${className} mirkanaa\'eera`,
        }),
        enrollmentRejected: (studentName, reason) => ({
            title: 'Haala Galmee',
            message: `Galmee ${studentName} akka hin mirkanoofne isin beeksisuu ni jaallanna. ${reason ? `Sababa: ${reason}` : ''}`,
        }),
        attendanceAlert: (studentName, date, className) => ({
            title: 'Akeekkachiisa Argamaa',
            message: `${studentName} guyyaa ${date} kutaa ${className} keessatti hin argamne jedhamee galmaa\'eera`,
        }),
        lateArrival: (studentName, time, className) => ({
            title: 'Yaadannoo Dhiyeenya',
            message: `${studentName} sa\'aatii ${time} irratti kutaa ${className} tiif dhiyeenyaan dhufeera`,
        }),
        attendanceSessionOpened: (className, subject) => ({
            title: 'Sessiini Argamaa Banameera',
            message: `Sessiini argamaa ${className} - ${subject} tiif qophiidha`,
        }),
        attendanceReminder: (className, subject, startTime) => ({
            title: 'Yaadannoo Argamaa',
            message: `Argamni ${className} - ${subject} sa\'aatii ${startTime} jalqabama. Argama galmeessuu hin dagatinaa!`,
        }),
        missingAttendanceReminder: (className, grade, section, date) => ({
            title: 'Yaadannoo Argamaa Dhabame',
            message: `Maaloo kutaa ${grade} - ${section} (${className}) guyyaa ${date} tiif argama galmeessaa. Argamni ammaatti hin galmoofne.`,
        }),
        newAssignment: (assignmentTitle, dueDate, className) => ({
            title: 'Hojii Haaraa',
            message: `Hojiin haaraa "${assignmentTitle}" kutaa ${className} tiif maxxanfameera. Guyyaa xumuraa: ${dueDate}`,
        }),
        assignmentForChild: (studentName, assignmentTitle, dueDate) => ({
            title: 'Hojii Haaraa Mucaa Keessaniif',
            message: `${studentName} hojii haaraa "${assignmentTitle}" qaba guyyaa xumuraa ${dueDate}`,
        }),
        assignmentGraded: (assignmentTitle, grade, className) => ({
            title: 'Hojiin Sadarkaa Argateera',
            message: `Hojiin keessan "${assignmentTitle}" kutaa ${className} tiif sadarkaa argateera. Sadarkaa: ${grade}`,
        }),
        childAssignmentGraded: (studentName, assignmentTitle, grade) => ({
            title: 'Hojiin Mucaa Sadarkaa Argateera',
            message: `Hojiin ${studentName} "${assignmentTitle}" sadarkaa argateera. Sadarkaa: ${grade}`,
        }),
        resultsPublished: (term, className) => ({
            title: 'Bu\'aan Maxxanfameera',
            message: `Bu\'aan ${term} kutaa ${className} keessatti maxxanfameera`,
        }),
        assessmentStarted: (assessmentType, assessmentTitle, className, subjectName) => ({
            title: 'Madaallii Jalqabameera',
            message: `${assessmentType} "${assessmentTitle}" amma ${className} - ${subjectName} tiif hojii irra jira. Maaloo qabxii galchaa.`,
        }),
        scheduleChange: {
            title: 'Jijjiirama Sagantaa',
            message: '',
        },
        timetableUpdated: (className) => ({
            title: 'Sagantaan Yeroo Haaromfameera',
            message: `Sagantaan yeroo ${className} tiif haaromfameera. Maaloo sagantaa haaraa keessan ilaalaa.`,
        }),
        feeReminder: (amount, dueDate, studentName) => ({
            title: 'Yaadannoo Kaffaltii',
            message: `${studentName ? `Kaffaltii ${studentName}: ` : ''}Kaffaltii ${amount} guyyaa ${dueDate} irratti ga\'a`,
        }),
        paymentReceived: (amount, receiptNumber) => ({
            title: 'Kaffaltiin Fudhatameera',
            message: `Kaffaltii keessan ${amount} fudhatameera. Lakkoofsa rasiitii: ${receiptNumber}`,
        }),
        newMessage: (senderName, preview) => ({
            title: 'Ergaa Haaraa',
            message: `${senderName}: ${preview}`,
        }),
        welcome: (tempPasswordStr) => {
            const isTemp = tempPasswordStr === 'true';
            return {
                title: 'Baga Gara Sirna Bulchiinsa Mana Barumsaa Dhuftan',
                message: isTemp
                    ? 'Akkaawuntiin keessan uumameera. Maaloo odeeffannoo seensaa tiif email keessan ilaalaa.'
                    : 'Akkaawuntiin keessan uumameera. Amma seenaa dandeessu.',
            };
        },
        classCancelled: (className, date, reason) => ({
            title: 'Kutaan Haqameera',
            message: `${className} guyyaa ${date} haqameera. ${reason ? `Sababa: ${reason}` : ''}`,
        }),
        studentClassCancelled: (subject, className, date) => ({
            title: 'Kutaan Haqameera',
            message: `Kutaa ${subject} kutaa ${className} tiif guyyaa ${date} haqameera`,
        }),
        accountDeactivated: (reason) => ({
            title: 'Akkaawuntii Hojii Irraa Kaafame',
            message: reason || 'Akkaawuntiin keessan hojii irraa kaafameera. Odeeffannoo dabalataaf maatii mana barumsaa qunnamuu.',
        }),
        accountActivated: {
            title: 'Akkaawuntii Hojii Irra Oole',
            message: 'Akkaawuntiin keessan hojii irra ooleera. Amma seenaa dandeessu.',
        },
        classStarting: {
            title: 'Kutaan Keessan Jalqabamaa Jira',
            message: 'Bellii kutaa ammaaf rukutameera. Maaloo gara kutaa keessan deemsisaa.',
        },
        classEnded: {
            title: 'Kutaan Keessan Xumurameera',
            message: 'Bellii kutaa ammaa xuruuruuf rukutameera.',
        },
        classBell: (sirenLabel) => ({
            title: 'Bellii Kutaa',
            message: `Bellii ${sirenLabel} sagantaa yeroo keessaniif rukutameera.`,
        }),
        schoolBell: {
            title: 'Bellii Mana Barumsaa',
            message: 'Bellii mana barumsaa hojii irra ooleera.',
        },
    },
    so: {
        pickupReminder: {
            title: 'Xusuusin Qaadeyn',
            message: 'Waalidka qaali ah, fasalka ugu dambeeya wuu dhammaanayaa. Fadlan kaalay oo qaado ilmahaaga.',
        },
        newEnrollment: (studentName, grade) => ({
            title: 'Codsiga Diiwaangelin Cusub',
            message: `${studentName} wuxuu soo gudbiyay codsi diiwaangelin fasalka ${grade}`,
        }),
        enrollmentApproved: (studentName, className) => ({
            title: 'Diiwaangelinta La Ansixiyay',
            message: `Hambalyo! Diiwaangelinta ${studentName} ee ${className} waa la ansixiyay`,
        }),
        enrollmentRejected: (studentName, reason) => ({
            title: 'Cusbooneysiinta Diiwaangelinta',
            message: `Waan ka xunnahay inaan kuu sheegno in codsiga diiwaangelinta ${studentName} aan la ansixin. ${reason ? `Sababta: ${reason}` : ''}`,
        }),
        attendanceAlert: (studentName, date, className) => ({
            title: 'Digniin Imaansho',
            message: `${studentName} waa la qoray inuu maqnaa ${className} taariikhda ${date}`,
        }),
        lateArrival: (studentName, time, className) => ({
            title: 'Ogeysiis Daahitaan',
            message: `${studentName} wuxuu yimid daahitaan saacadda ${time} ee ${className}`,
        }),
        attendanceSessionOpened: (className, subject) => ({
            title: 'Fadhiga Imaansho Waa La Furay',
            message: `Fadhiga imaansho waa diyaar ${className} - ${subject}`,
        }),
        attendanceReminder: (className, subject, startTime) => ({
            title: 'Xusuusin Imaansho',
            message: `Imaanshaha ${className} - ${subject} wuxuu bilaabmaa saacadda ${startTime}. Ha illaawin inaad qorto imaanshaha!`,
        }),
        missingAttendanceReminder: (className, grade, section, date) => ({
            title: 'Xusuusin Imaansho La\'aan',
            message: `Fadlan qor imaanshaha fasalka ${grade} - ${section} (${className}) taariikhda ${date}. Imaansho weli lama qorin.`,
        }),
        newAssignment: (assignmentTitle, dueDate, className) => ({
            title: 'Hawl Cusub',
            message: `Hawl cusub "${assignmentTitle}" ayaa la soo dhigay ${className}. Waqtiga ugu dambeeya: ${dueDate}`,
        }),
        assignmentForChild: (studentName, assignmentTitle, dueDate) => ({
            title: 'Hawl Cusub Oo Ilmahaaga Ah',
            message: `${studentName} wuxuu leeyahay hawl cusub "${assignmentTitle}" waqtiga ugu dambeeya ${dueDate}`,
        }),
        assignmentGraded: (assignmentTitle, grade, className) => ({
            title: 'Hawsha La Qiimeeyay',
            message: `Hawshaada "${assignmentTitle}" ee ${className} waa la qiimeeyay. Darajo: ${grade}`,
        }),
        childAssignmentGraded: (studentName, assignmentTitle, grade) => ({
            title: 'Hawsha Ilmaha La Qiimeeyay',
            message: `Hawsha ${studentName} "${assignmentTitle}" waa la qiimeeyay. Darajo: ${grade}`,
        }),
        resultsPublished: (term, className) => ({
            title: 'Natiijooyinka La Daabacay',
            message: `Natiijooyinka ${term} ee ${className} waa la daabacay`,
        }),
        assessmentStarted: (assessmentType, assessmentTitle, className, subjectName) => ({
            title: 'Qiimeynta La Bilaabay',
            message: `${assessmentType} "${assessmentTitle}" hadda waa firfircoon yahay ${className} - ${subjectName}. Fadlan geli dhibcaha.`,
        }),
        scheduleChange: {
            title: 'Isbeddelka Jadwalka',
            message: '',
        },
        timetableUpdated: (className) => ({
            title: 'Jadwalka La Cusbooneysiiyay',
            message: `Jadwalka ${className} waa la cusbooneysiiyay. Fadlan eeg jadwalkaaga cusub.`,
        }),
        feeReminder: (amount, dueDate, studentName) => ({
            title: 'Xusuusin Lacag Bixinta',
            message: `${studentName ? `Lacagta ${studentName}: ` : ''}Lacagta ${amount} waa la gaaray ${dueDate}`,
        }),
        paymentReceived: (amount, receiptNumber) => ({
            title: 'Lacagta La Helay',
            message: `Lacagtaada ${amount} waa la helay. Lambarka rasiidka: ${receiptNumber}`,
        }),
        newMessage: (senderName, preview) => ({
            title: 'Fariin Cusub',
            message: `${senderName}: ${preview}`,
        }),
        welcome: (tempPasswordStr) => {
            const isTemp = tempPasswordStr === 'true';
            return {
                title: 'Ku Soo Dhawoow Nidaamka Maamulka Dugsiga',
                message: isTemp
                    ? 'Koontadaada waa la abuuray. Fadlan eeg emailkaaga si aad u hesho xogta gelitaanka.'
                    : 'Koontadaada waa la abuuray. Hadda waad geli kartaa.',
            };
        },
        classCancelled: (className, date, reason) => ({
            title: 'Fasalka La Joojiyay',
            message: `${className} ee ${date} waa la joojiyay. ${reason ? `Sababta: ${reason}` : ''}`,
        }),
        studentClassCancelled: (subject, className, date) => ({
            title: 'Fasalka La Joojiyay',
            message: `Fasalka ${subject} ee ${className} taariikhda ${date} waa la joojiyay`,
        }),
        accountDeactivated: (reason) => ({
            title: 'Koontada La Damay',
            message: reason || 'Koontadaada waa la damiyay. Fadlan la xiriir maamulka dugsiga macluumaad dheeraad ah.',
        }),
        accountActivated: {
            title: 'Koontada La Dhaqaajiyay',
            message: 'Koontadaada waa la dhaqaajiyay. Hadda waad geli kartaa.',
        },
        classStarting: {
            title: 'Fasalkaagu Wuu Bilaabmayaa',
            message: 'Geeska ayaa loo tumay fasalkaaga hadda. Fadlan u soco fasalkaaga.',
        },
        classEnded: {
            title: 'Fasalkaagu Wuu Dhamaaday',
            message: 'Geeska ayaa loo tumay si fasalkaaga hadda loo dhameeyo.',
        },
        classBell: (sirenLabel) => ({
            title: 'Geeska Fasalka',
            message: `Geeska ${sirenLabel} ayaa loo tumay jadwalkaaga.`,
        }),
        schoolBell: {
            title: 'Geeska Dugsiga',
            message: 'Geeska dugsiga waa la tumay.',
        },
    },
};
//# sourceMappingURL=notification-messages.js.map