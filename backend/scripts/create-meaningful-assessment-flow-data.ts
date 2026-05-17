import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_POOL_URL || process.env.DATABASE_URL,
  allowExitOnIdle: true,
});

const target = {
  schoolId: 'school-001',
  academicYearId: 'cmojyvohq0003sk70rdj2a978',
  academicYearName: '2018',
  termId: 'cmojyw09h000ask70fs85c6fo',
  termName: 'Term 3',
  classId: 'cmojz1x0c005i136xa4jk2rzj',
  sectionId: 'cmojz1x0g005k136xdw0gm9zc',
  subjectId: 'subj-english-new',
  teacherId: 'cmnte97ov0080pp1e7rabj6e8',
  adminId: 'cmnsz7mgv006410jprakk268d',
};

const assessmentTitle = 'Grade 10A Term 3 English Reading and Writing Assessment';
const examTitle = 'Grade 10A Term 3 English Final Examination';

const scores = [
  { score: 34, exam: 86 },
  { score: 32, exam: 82 },
  { score: 31, exam: 79 },
  { score: 30, exam: 76 },
  { score: 29, exam: 73 },
];

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function letter(percentage: number) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  return 'D';
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('begin');

    const studentsResult = await client.query<{
      studentId: string;
      name: string;
      profileId: string;
    }>(
      `
        select sc."studentId", u.name, sp.id as "profileId"
        from "StudentClass" sc
        join "User" u on u.id = sc."studentId"
        left join "StudentProfile" sp on sp."userId" = u.id
        where sc."classId" = $1 and sc."sectionId" = $2
        order by u.name
      `,
      [target.classId, target.sectionId],
    );

    if (studentsResult.rowCount !== 5) {
      throw new Error(`Expected 5 Grade 10A students, found ${studentsResult.rowCount}`);
    }

    const existingAssessments = await client.query<{ id: string }>(
      `select id from "Assessment" where title = any($1)`,
      [[assessmentTitle, examTitle]],
    );
    const existingAssessmentIds = existingAssessments.rows.map((row) => row.id);
    if (existingAssessmentIds.length > 0) {
      const existingSubjects = await client.query<{ id: string }>(
        `select id from "AssessmentSubject" where "assessmentId" = any($1)`,
        [existingAssessmentIds],
      );
      const existingSubjectIds = existingSubjects.rows.map((row) => row.id);
      if (existingSubjectIds.length > 0) {
        await client.query(
          `delete from "StudentAssessmentScore" where "assessmentSubjectId" = any($1)`,
          [existingSubjectIds],
        );
        await client.query(`delete from "AssessmentSubject" where id = any($1)`, [
          existingSubjectIds,
        ]);
      }
      await client.query(`delete from "Assessment" where id = any($1)`, [
        existingAssessmentIds,
      ]);
    }

    const existingExams = await client.query<{ id: string }>(
      `select id from "Exam" where title = $1 and "classId" = $2 and "sectionId" = $3`,
      [examTitle, target.classId, target.sectionId],
    );
    const existingExamIds = existingExams.rows.map((row) => row.id);
    if (existingExamIds.length > 0) {
      await client.query(`delete from "ExamResult" where "examId" = any($1)`, [
        existingExamIds,
      ]);
      await client.query(`delete from "Exam" where id = any($1)`, [existingExamIds]);
    }

    const assessmentId = id('assess');
    const assessmentSubjectId = id('assess_subject');
    await client.query(
      `
        insert into "Assessment"
          (id, "schoolId", "academicYearId", "termId", title, type, status, "startDate", "endDate", "createdBy", "createdAt", "updatedAt")
        values
          ($1, $2, $3, $4, $5, 'CLASS_ASSESSMENT', 'ACTIVE', now() - interval '1 day', now() + interval '10 days', $6, now(), now())
      `,
      [
        assessmentId,
        target.schoolId,
        target.academicYearId,
        target.termId,
        assessmentTitle,
        target.adminId,
      ],
    );
    await client.query(
      `
        insert into "AssessmentSubject"
          (id, "assessmentId", "subjectId", "classId", "sectionId", "teacherId", "maxScore", "passMark", "createdAt", "updatedAt")
        values
          ($1, $2, $3, $4, $5, $6, 40, 20, now(), now())
      `,
      [
        assessmentSubjectId,
        assessmentId,
        target.subjectId,
        target.classId,
        target.sectionId,
        target.teacherId,
      ],
    );

    const examAssessmentId = id('assess');
    const examAssessmentSubjectId = id('assess_subject');
    await client.query(
      `
        insert into "Assessment"
          (id, "schoolId", "academicYearId", "termId", title, type, status, "startDate", "endDate", "createdBy", "createdAt", "updatedAt")
        values
          ($1, $2, $3, $4, $5, 'FINAL_EXAM', 'ACTIVE', now(), now() + interval '14 days', $6, now(), now())
      `,
      [
        examAssessmentId,
        target.schoolId,
        target.academicYearId,
        target.termId,
        examTitle,
        target.adminId,
      ],
    );
    await client.query(
      `
        insert into "AssessmentSubject"
          (id, "assessmentId", "subjectId", "classId", "sectionId", "teacherId", "maxScore", "passMark", "createdAt", "updatedAt")
        values
          ($1, $2, $3, $4, $5, $6, 100, 50, now(), now())
      `,
      [
        examAssessmentSubjectId,
        examAssessmentId,
        target.subjectId,
        target.classId,
        target.sectionId,
        target.teacherId,
      ],
    );

    const examId = id('exam');
    await client.query(
      `
        insert into "Exam"
          (id, "schoolId", "classId", "sectionId", "subjectId", type, title, date, "maxMarks", weightage, description, published, "createdAt", "updatedAt")
        values
          ($1, $2, $3, $4, $5, 'FINAL', $6, now() + interval '14 days', 100, 1, 'Final English examination for Grade 10A Term 3.', true, now(), now())
      `,
      [
        examId,
        target.schoolId,
        target.classId,
        target.sectionId,
        target.subjectId,
        examTitle,
      ],
    );

    const ranked = studentsResult.rows
      .map((student, index) => {
        const studentScore = scores[index];
        const assessmentPercent = (studentScore.score / 40) * 100;
        const percentage = Math.round(((assessmentPercent + studentScore.exam) / 2) * 10) / 10;
        return { ...student, ...studentScore, percentage };
      })
      .sort((a, b) => b.percentage - a.percentage);

    for (const [index, result] of ranked.entries()) {
      await client.query(
        `
          insert into "StudentAssessmentScore"
            (id, "assessmentSubjectId", "studentId", score, "isAbsent", status, remarks, "enteredBy", "enteredAt", "updatedAt")
          values
            ($1, $2, $3, $4, false, 'SUBMITTED', 'Submitted from full assessment flow test.', $5, now(), now())
        `,
        [id('score'), assessmentSubjectId, result.studentId, result.score, target.teacherId],
      );
      await client.query(
        `
          insert into "StudentAssessmentScore"
            (id, "assessmentSubjectId", "studentId", score, "isAbsent", status, remarks, "enteredBy", "enteredAt", "updatedAt")
          values
            ($1, $2, $3, $4, false, 'SUBMITTED', 'Submitted from full exam flow test.', $5, now(), now())
        `,
        [id('score'), examAssessmentSubjectId, result.studentId, result.exam, target.teacherId],
      );
      await client.query(
        `
          insert into "ExamResult"
            (id, "examId", "studentId", marks, grade, remarks, "isAbsent", "createdAt", "updatedAt")
          values
            ($1, $2, $3, $4, $5, 'Published final exam result.', false, now(), now())
        `,
        [id('exam_result'), examId, result.studentId, result.exam, letter(result.exam)],
      );

      const gradeDetails = [
        {
          subjectId: target.subjectId,
          subject: 'English',
          assessmentTitle,
          assessmentScore: result.score,
          assessmentMaxScore: 40,
          finalExamTitle: examTitle,
          finalExamScore: result.exam,
          finalExamMaxScore: 100,
          percentage: result.percentage,
          grade: letter(result.percentage),
        },
      ];

      await client.query(
        `
          insert into "ReportCard"
            (id, "schoolId", "studentId", "classId", "sectionId", "academicYear", term, status, "totalMarks", percentage, "overallGrade", "rankInClass", "gradeDetails", "teacherRemarks", "principalRemarks", "generatedById", "publishedAt", "studentProfileId", "createdAt", "updatedAt")
          values
            ($1, $2, $3, $4, $5, $6, $7, 'PUBLISHED', $8, $9, $10, $11, $12, 'Good progress in English literacy skills.', 'Published after Term 3 English assessment and final examination.', $13, now(), $14, now(), now())
          on conflict ("studentId", "academicYear", term)
          do update set
            "classId" = excluded."classId",
            "sectionId" = excluded."sectionId",
            status = 'PUBLISHED',
            "totalMarks" = excluded."totalMarks",
            percentage = excluded.percentage,
            "overallGrade" = excluded."overallGrade",
            "rankInClass" = excluded."rankInClass",
            "gradeDetails" = excluded."gradeDetails",
            "teacherRemarks" = excluded."teacherRemarks",
            "principalRemarks" = excluded."principalRemarks",
            "generatedById" = excluded."generatedById",
            "publishedAt" = now(),
            "studentProfileId" = excluded."studentProfileId",
            "updatedAt" = now()
        `,
        [
          id('report_card'),
          target.schoolId,
          result.studentId,
          target.classId,
          target.sectionId,
          target.academicYearName,
          target.termName,
          result.score + result.exam,
          result.percentage,
          letter(result.percentage),
          index + 1,
          JSON.stringify(gradeDetails),
          target.adminId,
          result.profileId,
        ],
      );
    }

    const feeGate = await client.query<{
      studentId: string;
      name: string;
      status: string;
      finalAmount: number;
      term3Paid: number;
    }>(
      `
        select sf."studentId", u.name, sf.status, sf."finalAmount",
          coalesce(sum(p."amountPaid") filter (where p."termId" = $1), 0)::float as "term3Paid"
        from "StudentFee" sf
        join "User" u on u.id = sf."studentId"
        left join "Payment" p on p."studentFeeId" = sf.id
        where sf."academicYearId" = $2
          and sf."studentId" = any($3)
        group by sf.id, u.name
        order by u.name
      `,
      [
        target.termId,
        target.academicYearId,
        studentsResult.rows.map((student) => student.studentId),
      ],
    );

    await client.query('commit');
    console.log(
      JSON.stringify(
        {
          createdAssessments: [assessmentTitle, examTitle],
          createdExam: examTitle,
          class: 'Grade 10 - A',
          subject: 'English',
          studentsScored: studentsResult.rowCount,
          reportCardsPublished: ranked.length,
          parentFeeRequirement: feeGate.rows.map((row) => ({
            student: row.name,
            status: row.status,
            term3Paid: row.term3Paid,
            requiredForTerm3: Number(row.finalAmount) / 3,
            parentResultAccess:
              row.term3Paid + 0.0001 >= Number(row.finalAmount) / 3
                ? 'allowed'
                : 'blocked until Term 3 fee is paid',
          })),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
