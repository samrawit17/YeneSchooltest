/**
 * Generate translated messages.json files for all languages.
 * Uses a comprehensive key-by-key mapping approach.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const translationsDir = join(__dirname, '..', 'src', 'core', 'localization', 'translations');

const enMessages = JSON.parse(readFileSync(join(translationsDir, 'en', 'messages.json'), 'utf-8'));

// Comprehensive Amharic translations for common patterns
function translateAm(text) {
  const patterns = [
    [/does not belong to this school/g, 'የዚህ ትምህርት ቤት አይደለም'],
    [/already linked to this parent/g, 'ቀድሞውኑ ከዚህ ወላጅ ጋር ተገናኝቷል'],
    [/Parent not found/g, 'ወላጅ አልተገኘም'],
    [/Parent profile not found/g, 'የወላጅ መገለጫ አልተገኘም'],
    [/Student profile not found/g, 'የተማሪ መገለጫ አልተገኘም'],
    [/Academic year not found/g, 'የትምህርት ዘመን አልተገኘም'],
    [/Access denied/g, 'መዳረሻ ተከልክሏል'],
    [/Enrollment not found/g, 'ምዝገባ አልተገኘም'],
    [/Exam not found/g, 'ፈተና አልተገኘም'],
    [/Subject not found/g, 'ትምህርት አልተገኘም'],
    [/Class not found/g, 'ክፍል አልተገኘም'],
    [/Student not found/g, 'ተማሪ አልተገኘም'],
    [/Teacher not found/g, 'መምህር አልተገኘም'],
    [/School not found/g, 'ትምህርት ቤት አልተገኘም'],
    [/not found for this school/g, 'ለዚህ ትምህርት ቤት አልተገኘም'],
    [/not found/g, 'አልተገኘም'],
    [/is required/g, 'ያስፈልጋል'],
    [/already exists/g, 'አስቀድሞ አለ'],
    [/already taken/g, 'ቀድሞውኑ ተይዟል'],
    [/cannot/g, 'አይቻልም'],
    [/Invalid/g, 'ልክ ያልሆነ'],
    [/invalid_credentials/g, 'ልክ ያልሆነ መታወቂያ'],
    [/Current password is incorrect/g, 'የአሁኑ የይለፍ ቃል ትክክል አይደለም'],
    [/Invalid credentials/g, 'ልክ ያልሆነ መታወቂያ'],
    [/Invalid or expired/g, 'ልክ ያልሆነ ወይም ጊዜው ያለፈ'],
    [/Invalid amount/g, 'ልክ ያልሆነ መጠን'],
    [/Invalid role/g, 'ልክ ያልሆነ ሚና'],
    [/Invalid grade/g, 'ልክ ያልሆነ የክፍል ደረጃ'],
    [/Invalid school ID/g, 'ልክ ያልሆነ የትምህርት ቤት መታወቂያ'],
    [/School ID is required/g, 'የትምህርት ቤት መታወቂያ ያስፈልጋል'],
    [/Invalid enrollment key/g, 'ልክ ያልሆነ የምዝገባ ቁልፍ'],
    [/Invalid exam access code/g, 'ልክ ያልሆነ የፈተና መዳረሻ ኮድ'],
    [/Invalid attendance status/g, 'ልክ ያልሆነ የመገኘት ሁኔታ'],
    [/Invalid discount policy/g, 'ልክ ያልሆነ የቅናሽ ፖሊሲ'],
    [/Invalid input/g, 'ልክ ያልሆነ ግቤት'],
    [/Invalid calendar type/g, 'ልክ ያልሆነ የቀን መቁጠሪያ አይነት'],
    [/Invalid curriculum type/g, 'ልክ ያልሆነ የስርዓተ ትምህርት አይነት'],
    [/Not assigned/g, 'አልተመደበም'],
    [/Not found/g, 'አልተገኘም'],
    [/Not visible/g, 'የማይታይ'],
    [/No grades to submit/g, 'ለማስገባት ውጤት የለም'],
    [/No active academic year/g, 'ንቁ የትምህርት ዘመን የለም'],
    [/No enrolled students/g, 'የተመዘገቡ ተማሪዎች የሉም'],
    [/no student IDs/g, 'ምንም የተማሪ መታወቂያዎች የሉም'],
    [/No students found/g, 'ምንም ተማሪ አልተገኘም'],
    [/Only admins/g, 'አስተዳዳሪዎች ብቻ'],
    [/You are not linked to this student/g, 'ከዚህ ተማሪ ጋር አልተገናኙም'],
    [/Student stream must be SOCIAL or NATURAL/g, 'የተማሪ ዥረት ማህበራዊ ወይም ተፈጥሯዊ መሆን አለበት'],
    [/Payroll already exists/g, 'የደመወዝ ክፍያ አስቀድሞ አለ'],
    [/Fee does not match/g, 'ክፍያ አይዛመድም'],
    [/start date must be before end date/g, 'የመጀመሪያ ቀን ከማጠናቀቂያ ቀን በፊት መሆን አለበት'],
    [/Message content is required/g, 'የመልዕክት ይዘት ያስፈልጋል'],
    [/A recipient is required/g, 'ተቀባይ ያስፈልጋል'],
    [/School context is required/g, 'የትምህርት ቤት አውድ ያስፈልጋል'],
    [/Online enrollment is currently closed/g, 'የመስመር ላይ ምዝገባ በአሁኑ ጊዜ ተዘግቷል'],
    [/School is not active/g, 'ትምህርት ቤቱ ንቁ አይደለም'],
    [/Cannot cancel an approved enrollment/g, 'የጸደቀ ምዝገባ መሰረዝ አይቻልም'],
    [/Conversation not found/g, 'ውይይት አልተገኘም'],
    [/Enrollment is not pending/g, 'ምዝገባ በመጠባበቅ ላይ አይደለም'],
    [/Duplicate candidate numbers/g, 'ተደጋጋሚ የእጩ ቁጥሮች'],
    [/Selected section is already at capacity/g, 'የተመረጠው ክፍልፋይ አቅሙ ሞልቷል'],
    [/at least one period requirement/g, 'ቢያንስ አንድ የወቅት መስፈርት ያስፈልጋል'],
    [/Class and section are required/g, 'ክፍል እና ክፍልፋይ ያስፈልጋሉ'],
    [/Capacity must be at least 1/g, 'አቅም ቢያንስ 1 መሆን አለበት'],
    [/Section stream must be/g, 'የክፍልፋይ ዥረት መሆን አለበት'],
    [/Grade is not available in this school's grade system/g, 'ደረጃ በዚህ ትምህርት ቤት የክፍል ስርዓት ውስጥ አይገኝም'],
    [/Create the online exam/g, 'የመስመር ላይ ፈተናውን ይፍጠሩ'],
    [/Add at least one active question/g, 'ቢያንስ አንድ ንቁ ጥያቄ ያክሉ'],
    [/Online exams with student attempts cannot be deleted/g, 'የተማሪ ሙከራ ያላቸው የመስመር ላይ ፈተናዎች መሰረዝ አይቻልም'],
    [/Question changes are locked/g, 'የጥያቄ ለውጦች ተቆልፈዋል'],
    [/This exam has no active questions/g, 'ይህ ፈተና ንቁ ጥያቄዎች የሉትም'],
    [/Multiple choice questions require all/g, 'ባለብዙ ምርጫ ጥያቄዎች ሁሉንም አማራጮች ይፈልጋሉ'],
    [/Only creator can/g, 'ፈጣሪ ብቻ ይችላል'],
    [/Only draft lessons can be submitted/g, 'ረቂቅ ትምህርቶች ብቻ መቅረብ ይችላሉ'],
    [/Only pending review can be/g, 'በጥናት ላይ ያሉ ብቻ ይችላሉ'],
    [/Only the lesson teacher/g, 'የትምህርቱ መምህር ብቻ'],
    [/This lesson does not have homework/g, 'ይህ ትምህርት የቤት ስራ የለውም'],
    [/Linked child profile is incomplete/g, 'የተገናኘው የልጅ መገለጫ ያልተሟላ ነው'],
    [/No linked child found for this parent/g, 'ለዚህ ወላጅ የተገናኘ ልጅ አልተገኘም'],
    [/Authentication required/g, 'ማረጋገጫ ያስፈልጋል'],
    [/Active plan not found/g, 'ንቁ እቅድ አልተገኘም'],
    [/Plan not found/g, 'እቅድ አልተገኘም'],
    [/must be a valid date/g, 'የሚሰራ ቀን መሆን አለበት'],
    [/Start date must be before end date/g, 'የመጀመሪያ ቀን ከማጠናቀቂያ ቀን በፊት መሆን አለበት'],
    [/Must be a JSON object/g, 'JSON ነገር መሆን አለበት'],
    [/Setting key is required/g, 'የቅንብር ቁልፍ ያስፈልጋል'],
    [/Exam setup fields are locked/g, 'የፈተና ዝግጅት መስኮች ተቆልፈዋል'],
    [/Question type must be/g, 'የጥያቄ አይነት መሆን አለበት'],
    [/Short answer questions require a correct answer/g, 'አጭር መልስ ጥያቄዎች ትክክለኛ መልስ ያስፈልጋቸዋል'],
    [/True\/false correct answer must be True or False/g, 'እውነት/ሐሰት ትክክለኛ መልስ እውነት ወይም ሐሰት መሆን አለበት'],
    [/Student enrollment not found/g, 'የተማሪ ምዝገባ አልተገኘም'],
    [/Watermark must be a PNG, JPG, or WEBP image/g, 'የውኃ ምልክት PNG፣ JPG፣ ወይም WEBP ምስል መሆን አለበት'],
    [/Document must be a PDF, PNG, JPG, or WEBP file/g, 'ሰነድ PDF፣ PNG፣ JPG፣ ወይም WEBP ፋይል መሆን አለበት'],
    [/Logo must be less than 2MB/g, 'ሎጎ ከ2ሜባ ያነሰ መሆን አለበት'],
    [/Login image must be less than 5MB/g, 'የመግቢያ ምስል ከ5ሜባ ያነሰ መሆን አለበት'],
    [/fields must be an array/g, 'መስኮች ዝርዝር መሆን አለባቸው'],
    [/Template not found/g, 'አብነት አልተገኘም'],
    [/Price must be a positive number/g, 'ዋጋ አዎንታዊ ቁጥር መሆን አለበት'],
    [/Staff member not found/g, 'የሰራተኛ አባል አልተገኘም'],
    [/Payroll run must move from DRAFT to APPROVED/g, 'የደመወዝ ክፍያ ሂደት ከረቂቅ ወደ ጸድቋል መሄድ አለበት'],
    [/Paid payroll entries cannot be reopened/g, 'የተከፈሉ የደመወዝ ክፍያ ግቤቶች እንደገና መከፈት አይችሉም'],
    [/Paid payroll runs cannot be changed/g, 'የተከፈሉ የደመወዝ ክፍያ ሂደቶች መለወጥ አይችሉም'],
    [/Approve the payroll run/g, 'የደመወዝ ክፍያ ሂደቱን ያረጋግጡ'],
    [/Unsupported school setting/g, 'የማይደገፍ የትምህርት ቤት ቅንብር'],
    [/Unsupported backup type/g, 'የማይደገፍ የመጠባበቂያ አይነት'],
    [/Siren hardware config not found/g, 'የሳይረን ሃርድዌር ውቅር አልተገኘም'],
    [/Siren schedule not found/g, 'የሳይረን መርሐ ግብር አልተገኘም'],
    [/Event not found/g, 'ክስተት አልተገኘም'],
    [/Target academic year not found/g, 'የታለመው የትምህርት ዘመን አልተገኘም'],
    [/Target class must be different/g, 'የታለመው ክፍል ከምንጭ ክፍል የተለየ መሆን አለበት'],
    [/No report card IDs provided/g, 'ምንም የውጤት ካርድ መታወቂያዎች አልተሰጡም'],
    [/No report cards found/g, 'ምንም የውጤት ካርዶች አልተገኙም'],
    [/Destination grade must be the next grade level/g, 'የመድረሻ ክፍል የሚቀጥለው የክፍል ደረጃ መሆን አለበት'],
    [/Source class is required/g, 'ምንጭ ክፍል ያስፈልጋል'],
    [/Source class not found/g, 'ምንጭ ክፍል አልተገኘም'],
    [/for ID card/g, 'መታወቂያ ካርድ'],
    [/end date cannot be before start date/g, 'የማጠናቀቂያ ቀን ከመጀመሪያ ቀን በፊት መሆን አይችልም'],
    [/Grade is the final grade/g, 'ደረጃ የዚህ ትምህርት ቤት የመጨረሻ ክፍል ነው'],
    [/total period weight cannot exceed/g, 'አጠቃላይ የወቅት ክብደት መብለጥ አይችልም'],
    [/at least one active staff salary/g, 'ቢያንስ አንድ ንቁ የሰራተኛ ደሞዝ ያክሉ'],
    [/Payroll has no payable entries/g, 'እንደ ተከፋይ ምልክት የሚደረግ የደመወዝ ክፍያ ግቤቶች የሉም'],
    [/Cancelled payroll runs cannot be changed/g, 'የተሰረዙ የደመወዝ ክፍያ ሂደቶች መለወጥ አይችሉም'],
    [/Entries cannot be changed after the payroll run is final/g, 'የደመወዝ ክፍያ ሂደት ከተጠናቀቀ በኋላ ግቤቶች መለወጥ አይችሉም'],
    [/Selected payment period does not match/g, 'የተመረጠው የክፍያ ወቅት አይዛመድም'],
    [/Attendance cutoff must be an object/g, 'የመገኘት ቆራጭ ነገር መሆን አለበት'],
    [/STORAGE_CONFIG must be a JSON object/g, 'STORAGE_CONFIG JSON ነገር መሆን አለበት'],
    [/at least one action is required/g, 'ቢያንስ አንድ እርምጃ ያስፈልጋል'],
    [/Automation rule not found/g, 'የአውቶሜሽን ህግ አልተገኘም'],
    [/eventTrigger must be in format/g, 'eventTrigger በቅርጸት መሆን አለበት'],
    [/Execution log not found/g, 'የማስፈጸሚያ ምዝግብ አልተገኘም'],
    [/must be an array/g, 'ዝርዝር መሆን አለበት'],
    [/must be at least/g, 'ቢያንስ መሆን አለበት'],
    [/must be between/g, 'መካከል መሆን አለበት'],
    [/must be a positive integer/g, 'አዎንታዊ ቁጥር መሆን አለበት'],
    [/must be SOCIAL or NATURAL/g, 'ማህበራዊ ወይም ተፈጥሯዊ መሆን አለበት'],
    [/must be a PNG, JPG, or WEBP/g, 'PNG፣ JPG፣ ወይም WEBP መሆን አለበት'],
    [/must be a PDF, PNG, JPG/g, 'PDF፣ PNG፣ JPG፣ መሆን አለበት'],
    [/must be between 0 and 100/g, 'በ0 እና 100 መካከል መሆን አለበት'],
    [/must be between 1 and 12/g, 'በ1 እና 12 መካከል መሆን አለበት'],
    [/must be an object/g, 'ነገር መሆን አለበት'],
    [/must be less than/g, 'ያነሰ መሆን አለበት'],
    [/must be an array/g, 'ድርድር መሆን አለበት'],
    [/must have/g, 'መያዝ አለበት'],
    [/must contain/g, 'መያዝ አለበት'],
    [/must include/g, 'ማካተት አለበት'],
    [/Must be at least/g, 'ቢያንስ መሆን አለበት'],
    [/No valid period requirements/g, 'ምንም ልክ የወቅት መስፈርቶች አልተሰጡም'],
    [/Authenticated school and user/g, 'የተረጋገጠ ትምህርት ቤት እና ተጠቃሚ ያስፈልጋሉ'],
    [/Conflict not found/g, 'ግጭት አልተገኘም'],
    [/Student is not enrolled in this class/g, 'ተማሪ በዚህ ክፍል ውስጥ አልተመዘገበም'],
    [/are required/g, 'ያስፈልጋሉ'],
    [/Period already exists/g, 'ወቅት አስቀድሞ አለ'],
    [/Start time must be before end time/g, 'የመጀመሪያ ሰአት ከማጠናቀቂያ ሰአት በፊት መሆን አለበት'],
    [/Document file is required/g, 'የሰነድ ፋይል ያስፈልጋል'],
    [/Azure Translator returned/g, 'የአዙሬ ተርጉም መለሰ'],
    [/Google Translation returned/g, 'የጉግል ትርጉም መለሰ'],
  ];
  
  let result = text;
  for (const [pattern, replacement] of patterns) {
    if (result.match(pattern)) {
      result = result.replace(pattern, replacement);
    }
  }
  return result;
}

// Oromo translations
function translateOm(text) {
  const patterns = [
    [/Parent profile not found/g, 'Piroofayliin matii hin argamne'],
    [/Student profile not found/g, 'Piroofayliin barataa hin argamne'],
    [/Academic year not found/g, 'Bara barumsaa hin argamne'],
    [/Access denied/g, 'Seenya dhorkame'],
    [/Enrollment not found/g, 'Galmeen hin argamne'],
    [/Exam not found/g, 'Qormaanni hin argamne'],
    [/Subject not found/g, 'Koreen hin argamne'],
    [/Class not found/g, 'Kutaan hin argamne'],
    [/Student not found/g, 'Barataan hin argamne'],
    [/Teacher not found/g, 'Barsitsaan hin argamne'],
    [/School not found/g, 'Manni barumsaa hin argamne'],
    [/not found for this school/g, 'mana barumsaa kanaaf hin argamne'],
    [/not found/g, 'hin argamne'],
    [/is required/g, 'barbaachisa'],
    [/already exists/g, 'duraanuu jira'],
    [/cannot/g, 'hin danda\u2019amu'],
    [/Invalid/g, 'Sirrii miti'],
    [/Invalid credentials/g, 'Mirkaneessa sirrii miti'],
    [/Invalid amount/g, 'Hamma sirrii miti'],
    [/Invalid role/g, 'Gahee sirrii miti'],
    [/Invalid grade/g, 'Sadarkaa sirrii miti'],
    [/Invalid school ID/g, 'Eenyummaa mana barumsaa sirrii miti'],
    [/School ID is required/g, 'Eenyummaa mana barumsaa barbaachisa'],
    [/Invalid enrollment key/g, 'Furtuu galmee sirrii miti'],
    [/Invalid exam access code/g, 'Koodii seenaa qormaataa sirrii miti'],
    [/Invalid attendance status/g, 'Haala dhufaatii sirrii miti'],
    [/Parent not found/g, 'Maatiin hin argamne'],
    [/Not assigned/g, 'Hin ramadamne'],
    [/Not found/g, 'Hin argamne'],
    [/You are not linked to this student/g, 'Barataa kana waliin hin hidhamne'],
    [/Student stream must be SOCIAL or NATURAL/g, 'Yaanni barataa SOCIAL ykn NATURAL ta'uu qaba'],
    [/Fee does not match/g, 'Kaffaltiin wal hin fakkaatu'],
    [/Start date must be before end date/g, 'Guyyaa jalqabaa guyyaa dhumaatiin dura ta'uu qaba'],
    [/Message content is required/g, 'Qabiyyeen ergaa barbaachisa'],
    [/A recipient is required/g, 'Fudhataa barbaachisa'],
    [/Online enrollment is currently closed/g, 'Galmi baal'aa amma cufameera'],
    [/School is not active/g, 'Manni barumsaa socho'aa miti'],
    [/Cannot cancel an approved enrollment/g, 'Galmee mirkanaa'e haquu hin danda2019amu'],
    [/Selected section is already at capacity/g, 'Kutaan filame guuteera'],
    [/are required/g, 'barbaachisoo dha'],
    [/must be a valid date/g, 'guyyaa sirrii ta'uu qaba'],
    [/Unsupported/g, 'Hin deeggeramu'],
    [/Template not found/g, 'Templeetiin hin argamne'],
    [/Event not found/g, 'Gochaan hin argamne'],
    [/Target academic year not found/g, 'Bara barumsaa filatame hin argamne'],
    [/No students found/g, 'Barataan hin argamne'],
    [/No enrolled students/g, 'Barattoonni galmaa'an hin jiran'],
    [/No report cards found/g, 'Kardiin bu'aa hin jiran'],
    [/No valid period requirements/g, 'Baqaqaa yeroo sirrii hin kennamne'],
    [/Conflict not found/g, 'Walitti bu'in hin argamne'],
    [/Period already exists/g, 'Yeroon duraanuu jira'],
    [/Start time must be before end time/g, 'Sa'atiin jalqabaa sa'aatii dhumaatiin dura ta'uu qaba'],
  ];
  
  let result = text;
  for (const [pattern, replacement] of patterns) {
    if (result.match(pattern)) {
      result = result.replace(pattern, replacement);
    }
  }
  return result;
}

// Somali translations
function translateSo(text) {
  const patterns = [
    [/Parent profile not found/g, 'Profaylka waalidka lama helin'],
    [/Student profile not found/g, 'Profaylka ardayga lama helin'],
    [/Academic year not found/g, 'Sannadka dugsiga lama helin'],
    [/Access denied/g, 'Gelitaanka waa la diiday'],
    [/Enrollment not found/g, 'Diiwaangelinta lama helin'],
    [/Exam not found/g, 'Imtixaanka lama helin'],
    [/Subject not found/g, 'Maadada lama helin'],
    [/Class not found/g, 'Fasalka lama helin'],
    [/Student not found/g, 'Ardayga lama helin'],
    [/Teacher not found/g, 'Macallinka lama helin'],
    [/School not found/g, 'Dugsiga lama helin'],
    [/not found for this school/g, 'dugsigan looma helin'],
    [/not found/g, 'lama helin'],
    [/is required/g, 'ayaa loo baahan yahay'],
    [/already exists/g, 'horay ayaa u jira'],
    [/cannot/g, 'ma karo'],
    [/Invalid/g, 'Waa qalad'],
    [/Invalid credentials/g, 'Aqoonsiga waa qalad'],
    [/Invalid amount/g, 'Qadarku waa qalad'],
    [/Invalid role/g, 'Doorku waa qalad'],
    [/Invalid grade/g, 'Fasalku waa qalad'],
    [/Invalid school ID/g, 'Aqoonsiga dugsigu waa qalad'],
    [/School ID is required/g, 'Aqoonsiga dugsiga ayaa loo baahan yahay'],
    [/Parent not found/g, 'Waalidka lama helin'],
    [/Not assigned/g, 'Lama xilsaarin'],
    [/Not found/g, 'Lama helin'],
    [/You are not linked to this student/g, 'Kuma xidhna ardaygan'],
    [/Fee does not match/g, 'Lacagtu kuma habboona'],
    [/Template not found/g, 'Template-ka lama helin'],
    [/Event not found/g, 'Dhacdada lama helin'],
    [/No students found/g, 'Arday lama helin'],
    [/No enrolled students/g, 'Ma jiraan arday diiwaan gashan'],
    [/No report cards found/g, 'Qaarad buundo lama helin'],
    [/Conflict not found/g, 'Khilaafka lama helin'],
    [/Period already exists/g, 'Muddada horay ayaa u jirtay'],
  ];
  
  let result = text;
  for (const [pattern, replacement] of patterns) {
    if (result.match(pattern)) {
      result = result.replace(pattern, replacement);
    }
  }
  return result;
}

// Arabic translations
function translateAr(text) {
  const patterns = [
    [/Parent profile not found/g, 'ملف ولي الأمر غير موجود'],
    [/Student profile not found/g, 'ملف الطالب غير موجود'],
    [/Academic year not found/g, 'العام الدراسي غير موجود'],
    [/Access denied/g, 'تم رفض الوصول'],
    [/Enrollment not found/g, 'التسجيل غير موجود'],
    [/Exam not found/g, 'الامتحان غير موجود'],
    [/Subject not found/g, 'المادة غير موجودة'],
    [/Class not found/g, 'الفصل غير موجود'],
    [/Student not found/g, 'الطالب غير موجود'],
    [/Teacher not found/g, 'المعلم غير موجود'],
    [/School not found/g, 'المدرسة غير موجودة'],
    [/not found for this school/g, 'غير موجود لهذه المدرسة'],
    [/not found/g, 'غير موجود'],
    [/is required/g, 'مطلوب'],
    [/already exists/g, 'موجود بالفعل'],
    [/cannot/g, 'لا يمكن'],
    [/Invalid/g, 'غير صالح'],
    [/Invalid credentials/g, 'بيانات الدخول غير صالحة'],
    [/Invalid amount/g, 'المبلغ غير صالح'],
    [/Invalid role/g, 'الدور غير صالح'],
    [/Invalid grade/g, 'الصف غير صالح'],
    [/Invalid school ID/g, 'معرف المدرسة غير صالح'],
    [/School ID is required/g, 'معرف المدرسة مطلوب'],
    [/Parent not found/g, 'ولي الأمر غير موجود'],
    [/Not assigned/g, 'غير معين'],
    [/Not found/g, 'غير موجود'],
    [/You are not linked to this student/g, 'أنت غير مرتبط بهذا الطالب'],
    [/Student stream must be SOCIAL or NATURAL/g, 'يجب أن يكون تدفق الطالب اجتماعياً أو علمياً'],
    [/Template not found/g, 'القالب غير موجود'],
    [/Event not found/g, 'الحدث غير موجود'],
    [/No students found/g, 'لم يتم العثور على طلاب'],
    [/No enrolled students/g, 'لا يوجد طلاب مسجلون'],
    [/No report cards found/g, 'لم يتم العثور على كشوف درجات'],
    [/Conflict not found/g, 'لم يتم العثور على التعارض'],
    [/Period already exists/g, 'الفترة موجودة بالفعل'],
  ];
  
  let result = text;
  for (const [pattern, replacement] of patterns) {
    if (result.match(pattern)) {
      result = result.replace(pattern, replacement);
    }
  }
  return result;
}

const amMessages = {};
const omMessages = {};
const soMessages = {};
const arMessages = {};

for (const [key, text] of Object.entries(enMessages)) {
  amMessages[key] = translateAm(text);
  omMessages[key] = translateOm(text);
  soMessages[key] = translateSo(text);
  arMessages[key] = translateAr(text);
}

function writeMessages(lang, data) {
  const dir = join(translationsDir, lang);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'messages.json'), JSON.stringify(data, null, 2) + '\n');
  console.log(`Written ${Object.keys(data).length} keys to ${lang}/messages.json`);
}

writeMessages('am', amMessages);
writeMessages('om', omMessages);
writeMessages('so', soMessages);
writeMessages('ar', arMessages);
console.log('Translation generation complete!');
