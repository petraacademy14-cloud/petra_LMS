import type { Metadata } from "next";
import { Award, BookOpenCheck, CalendarClock, ClipboardList, UsersRound } from "lucide-react";
import {
  addEntranceExamQuestion,
  closeEntranceExamPaper,
  createEntranceExamPaper,
  markOnsiteExamAttendance,
  publishEntranceExamPaper,
  recordOnsiteExamScore,
} from "@/app/actions/entrance-exams";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { examLabel } from "@/lib/entrance-exam";

export const metadata: Metadata = { title: "Entrance examinations" };

type PaperRow = {
  id: string;
  campusId: string;
  campusName: string;
  className: string;
  title: string;
  mode: "ONLINE" | "ONSITE";
  instructions: string;
  durationMinutes: number;
  questionCount: number;
  passMark: unknown;
  opensAt: Date | null;
  closesAt: Date | null;
  scheduledAt: Date | null;
  venue: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  activeQuestions: bigint;
  candidateCount: bigint;
};

type QuestionRow = {
  id: string;
  paperId: string;
  prompt: string;
  correctOption: string;
  marks: unknown;
  sortOrder: number;
};

type CandidateRow = {
  id: string;
  candidateNumber: string;
  seatNumber: string | null;
  status: string;
  attendanceStatus: string;
  score: unknown;
  maximumScore: unknown;
  percentage: unknown;
  passed: boolean | null;
  studentFirstName: string | null;
  studentLastName: string | null;
  applicationNumber: string;
  paperTitle: string;
  mode: "ONLINE" | "ONSITE";
  campusName: string;
  className: string;
  scheduledAt: Date | null;
};

export default async function EntranceExamsAdminPage() {
  const viewer = await requirePermission("admissions.read");
  const canManage = viewer.membership.role === "OWNER" || viewer.membership.role === "ADMIN";
  const isOwner = viewer.membership.role === "OWNER";
  const campusId = viewer.membership.campusId;

  const [campuses, classLevels, papers, questions, candidates] = await Promise.all([
    db.campus.findMany({
      where: {
        schoolId: viewer.membership.schoolId,
        isActive: true,
        ...(isOwner ? {} : { id: campusId ?? "__none__" }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.classLevel.findMany({
      where: { schoolId: viewer.membership.schoolId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    db.$queryRaw<PaperRow[]>`
      SELECT p."id", p."campusId", c."name" AS "campusName", l."name" AS "className",
        p."title", p."mode"::text AS "mode", p."instructions", p."durationMinutes",
        p."questionCount", p."passMark", p."opensAt", p."closesAt", p."scheduledAt",
        p."venue", p."status"::text AS "status",
        COUNT(DISTINCT q."id") FILTER (WHERE q."isActive")::bigint AS "activeQuestions",
        COUNT(DISTINCT r."id")::bigint AS "candidateCount"
      FROM "entrance_exam_papers" p
      JOIN "campuses" c ON c."id" = p."campusId"
      JOIN "class_levels" l ON l."id" = p."classLevelId"
      LEFT JOIN "entrance_exam_questions" q ON q."paperId" = p."id"
      LEFT JOIN "applicant_exam_registrations" r ON r."paperId" = p."id"
      WHERE p."schoolId" = ${viewer.membership.schoolId}
        AND (${isOwner} OR p."campusId" = ${campusId})
      GROUP BY p."id", c."name", l."name"
      ORDER BY p."createdAt" DESC
    `,
    db.$queryRaw<QuestionRow[]>`
      SELECT q."id", q."paperId", q."prompt", q."correctOption"::text AS "correctOption",
        q."marks", q."sortOrder"
      FROM "entrance_exam_questions" q
      JOIN "entrance_exam_papers" p ON p."id" = q."paperId"
      WHERE q."schoolId" = ${viewer.membership.schoolId}
        AND (${isOwner} OR p."campusId" = ${campusId})
        AND q."isActive" = TRUE
      ORDER BY q."paperId", q."sortOrder"
    `,
    db.$queryRaw<CandidateRow[]>`
      SELECT r."id", r."candidateNumber", r."seatNumber", r."status"::text AS "status",
        r."attendanceStatus"::text AS "attendanceStatus", r."score", r."maximumScore",
        r."percentage", r."passed", a."studentFirstName", a."studentLastName",
        a."applicationNumber", p."title" AS "paperTitle", p."mode"::text AS "mode",
        c."name" AS "campusName", l."name" AS "className", p."scheduledAt"
      FROM "applicant_exam_registrations" r
      JOIN "admission_applications" a ON a."id" = r."applicationId"
      JOIN "entrance_exam_papers" p ON p."id" = r."paperId"
      JOIN "campuses" c ON c."id" = p."campusId"
      JOIN "class_levels" l ON l."id" = p."classLevelId"
      WHERE a."schoolId" = ${viewer.membership.schoolId}
        AND (${isOwner} OR p."campusId" = ${campusId})
      ORDER BY COALESCE(p."scheduledAt", p."opensAt") ASC, r."candidateNumber" ASC
      LIMIT 250
    `,
  ]);

  const published = papers.filter((paper) => paper.status === "PUBLISHED").length;
  const awaiting = candidates.filter((candidate) => candidate.status === "SCHEDULED").length;
  const scored = candidates.filter((candidate) => candidate.status === "SCORED").length;

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">Phase 6A entrance examinations</p>
        <h1 className="page-title">Question bank, schedules and candidates</h1>
        <p className="page-subtitle">Publish controlled online or onsite entrance examinations, record attendance and review automatically or manually scored results.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="card p-5"><BookOpenCheck size={21} /><strong className="mt-3 block text-2xl">{papers.length}</strong><p className="text-sm text-[#6f7782]">Examination papers</p></article>
        <article className="card p-5"><ClipboardList size={21} /><strong className="mt-3 block text-2xl">{published}</strong><p className="text-sm text-[#6f7782]">Published papers</p></article>
        <article className="card p-5"><UsersRound size={21} /><strong className="mt-3 block text-2xl">{awaiting}</strong><p className="text-sm text-[#6f7782]">Candidates awaiting exam</p></article>
        <article className="card p-5"><Award size={21} /><strong className="mt-3 block text-2xl">{scored}</strong><p className="text-sm text-[#6f7782]">Scored candidates</p></article>
      </section>

      {canManage && (
        <section className="card p-6">
          <h2 className="text-xl font-black">Create examination paper</h2>
          <p className="mt-1 text-sm text-[#6f7782]">A draft cannot be published until its active question bank meets the selected question count.</p>
          <form action={createEntranceExamPaper} className="mt-5 grid gap-4 lg:grid-cols-4">
            <label>Campus<select name="campusId" required><option value="">Select campus</option>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></label>
            <label>Class<select name="classLevelId" required><option value="">Select class</option>{classLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}</select></label>
            <label>Mode<select name="mode" required><option value="ONLINE">Online</option><option value="ONSITE">Onsite</option></select></label>
            <label>Title<input name="title" required placeholder="2026 entrance assessment" /></label>
            <label>Duration (minutes)<input name="durationMinutes" required type="number" min="10" max="240" defaultValue="45" /></label>
            <label>Questions per candidate<input name="questionCount" required type="number" min="1" max="200" defaultValue="20" /></label>
            <label>Pass mark (%)<input name="passMark" required type="number" min="0" max="100" step="0.01" defaultValue="50" /></label>
            <label>Online opens<input name="opensAt" type="datetime-local" /></label>
            <label>Online closes<input name="closesAt" type="datetime-local" /></label>
            <label>Onsite date and time<input name="scheduledAt" type="datetime-local" /></label>
            <label>Onsite venue<input name="venue" placeholder="Petra Academy hall" /></label>
            <label className="lg:col-span-4">Candidate instructions<textarea name="instructions" required rows={3} defaultValue="Read every question carefully. Select one answer for each question and submit before the timer ends." /></label>
            <button className="button lg:col-span-1" type="submit">Create draft paper</button>
          </form>
        </section>
      )}

      <section className="space-y-5">
        {papers.map((paper) => {
          const paperQuestions = questions.filter((question) => question.paperId === paper.id);
          return (
            <article className="card overflow-hidden" key={paper.id}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5e7eb] p-6">
                <div>
                  <div className="flex flex-wrap gap-2"><span className="pill" data-tone="brand">{examLabel(paper.mode)}</span><span className="pill" data-tone={paper.status === "PUBLISHED" ? "success" : "brand"}>{examLabel(paper.status)}</span></div>
                  <h2 className="mt-3 text-xl font-black">{paper.title}</h2>
                  <p className="mt-1 text-sm text-[#6f7782]">{paper.campusName} · {paper.className} · {paper.durationMinutes} minutes · pass mark {Number(paper.passMark)}%</p>
                </div>
                <div className="text-right"><strong className="text-2xl">{Number(paper.activeQuestions)}/{paper.questionCount}</strong><p className="text-xs text-[#6f7782]">active questions · {Number(paper.candidateCount)} candidates</p></div>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[1fr_23rem]">
                <div>
                  <h3 className="font-black">Question bank</h3>
                  <ol className="mt-3 space-y-3">
                    {paperQuestions.map((question) => <li className="rounded-xl border border-[#e5e7eb] p-4 text-sm" key={question.id}><strong>{question.sortOrder}. {question.prompt}</strong><p className="mt-1 text-[#6f7782]">Correct answer: {question.correctOption} · {Number(question.marks)} mark(s)</p></li>)}
                    {!paperQuestions.length && <li className="empty-state">No questions have been added.</li>}
                  </ol>
                </div>

                {canManage && paper.status === "DRAFT" ? (
                  <aside>
                    <form action={addEntranceExamQuestion.bind(null, paper.id)} className="space-y-3 rounded-2xl bg-[#f7f7f8] p-4">
                      <h3 className="font-black">Add multiple-choice question</h3>
                      <label>Question<textarea name="prompt" required rows={3} /></label>
                      <label>Option A<input name="optionA" required /></label>
                      <label>Option B<input name="optionB" required /></label>
                      <label>Option C<input name="optionC" required /></label>
                      <label>Option D<input name="optionD" required /></label>
                      <div className="grid grid-cols-2 gap-3"><label>Correct<select name="correctOption" required><option>A</option><option>B</option><option>C</option><option>D</option></select></label><label>Marks<input name="marks" type="number" min="0.01" step="0.01" defaultValue="1" required /></label></div>
                      <button className="button w-full" type="submit">Add question</button>
                    </form>
                    <form action={publishEntranceExamPaper.bind(null, paper.id)} className="mt-3"><button className="button button-secondary w-full" type="submit">Publish paper</button></form>
                  </aside>
                ) : (
                  <aside className="rounded-2xl bg-[#f7f7f8] p-4 text-sm text-[#5f6670]">
                    <strong className="text-[#252a31]">Schedule</strong>
                    <p className="mt-2">{paper.mode === "ONLINE" ? `${paper.opensAt?.toLocaleString("en-NG")} – ${paper.closesAt?.toLocaleString("en-NG")}` : `${paper.scheduledAt?.toLocaleString("en-NG")} · ${paper.venue}`}</p>
                    {canManage && paper.status === "PUBLISHED" && <form action={closeEntranceExamPaper.bind(null, paper.id)} className="mt-4"><button className="button button-secondary w-full" type="submit">Close paper</button></form>}
                  </aside>
                )}
              </div>
            </article>
          );
        })}
        {!papers.length && <div className="card empty-state">No entrance examination paper has been created.</div>}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[#e5e7eb] p-5"><h2 className="text-xl font-black">Candidate register</h2><p className="mt-1 text-sm text-[#6f7782]">Online papers score automatically. Onsite candidates require attendance and a manual score.</p></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Candidate</th><th>Paper</th><th>Status</th><th>Result</th><th>Onsite action</th></tr></thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td><strong>{candidate.studentFirstName ?? "Applicant"} {candidate.studentLastName ?? ""}</strong><small className="block text-[#747c87]">{candidate.candidateNumber} · {candidate.applicationNumber}</small><small className="block text-[#747c87]">{candidate.seatNumber ?? "Online candidate"}</small></td>
                  <td>{candidate.paperTitle}<small className="block text-[#747c87]">{candidate.campusName} · {candidate.className} · {examLabel(candidate.mode)}</small></td>
                  <td><span className="pill" data-tone={candidate.status === "SCORED" ? "success" : "brand"}>{examLabel(candidate.status)}</span><small className="block text-[#747c87]">Attendance: {examLabel(candidate.attendanceStatus)}</small></td>
                  <td>{candidate.status === "SCORED" ? <><strong>{Number(candidate.score)}/{Number(candidate.maximumScore)}</strong><small className="block text-[#747c87]">{Number(candidate.percentage).toFixed(2)}% · {candidate.passed ? "Passed" : "Below pass mark"}</small></> : "Pending"}</td>
                  <td>
                    {canManage && candidate.mode === "ONSITE" && candidate.status === "SCHEDULED" ? (
                      <div className="min-w-64 space-y-2">
                        {candidate.attendanceStatus === "NOT_MARKED" ? (
                          <form action={markOnsiteExamAttendance.bind(null, candidate.id)} className="flex gap-2"><select name="attendance" required defaultValue=""><option value="" disabled>Attendance</option><option value="PRESENT">Present</option><option value="ABSENT">Absent</option></select><button className="button" type="submit">Save</button></form>
                        ) : candidate.attendanceStatus === "PRESENT" ? (
                          <form action={recordOnsiteExamScore.bind(null, candidate.id)} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input name="score" type="number" min="0" step="0.01" placeholder="Score" required /><input name="maximumScore" type="number" min="0.01" step="0.01" placeholder="Maximum" required /><button className="button" type="submit">Record</button></form>
                        ) : <span className="text-sm text-[#747c87]">Marked absent</span>}
                      </div>
                    ) : <span className="text-sm text-[#747c87]">No action required</span>}
                  </td>
                </tr>
              ))}
              {!candidates.length && <tr><td colSpan={5}><div className="empty-state">No candidate registrations yet.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
