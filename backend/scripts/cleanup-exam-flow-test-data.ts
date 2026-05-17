import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_POOL_URL || process.env.DATABASE_URL,
  allowExitOnIdle: true,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('begin');

    const assessmentSubjects = await client.query<{ id: string }>(
      `
        select s.id
        from "AssessmentSubject" s
        join "Assessment" a on a.id = s."assessmentId"
        where a.title like 'PW %' or a.title like 'Playwright %'
      `,
    );
    const assessmentSubjectIds = assessmentSubjects.rows.map((row) => row.id);

    if (assessmentSubjectIds.length > 0) {
      await client.query(
        `delete from "StudentAssessmentScore" where "assessmentSubjectId" = any($1)`,
        [assessmentSubjectIds],
      );
      await client.query(
        `delete from "AssessmentSubject" where id = any($1)`,
        [assessmentSubjectIds],
      );
    }

    const deletedAssessments = await client.query(
      `delete from "Assessment" where title like 'PW %' or title like 'Playwright %'`,
    );

    const subjectIdsResult = await client.query<{ id: string }>(
      `select id from "Subject" where name like 'PW %' or code like 'PW%'`,
    );
    const subjectIds = subjectIdsResult.rows.map((row) => row.id);
    if (subjectIds.length > 0) {
      await client.query(`delete from "ClassSubject" where "subjectId" = any($1)`, [subjectIds]);
      await client.query(`delete from "Subject" where id = any($1)`, [subjectIds]);
    }

    const userIdsResult = await client.query<{ id: string }>(
      `
        select id
        from "User"
        where email like 'pw.teacher.%@springfieldhigh.edu'
           or name like 'PW Assessment Teacher%'
      `,
    );
    const userIds = userIdsResult.rows.map((row) => row.id);
    if (userIds.length > 0) {
      await client.query(`delete from "TeacherProfile" where "userId" = any($1)`, [userIds]);
      await client.query(`delete from "PendingCredential" where "userId" = any($1)`, [userIds]);
      await client.query(`delete from "User" where id = any($1)`, [userIds]);
    }

    await client.query('commit');
    console.log(
      JSON.stringify(
        {
          deletedAssessments: deletedAssessments.rowCount,
          deletedAssessmentSubjects: assessmentSubjectIds.length,
          deletedSubjects: subjectIds.length,
          deletedUsers: userIds.length,
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
