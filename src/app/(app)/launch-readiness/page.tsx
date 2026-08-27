import type { Metadata } from "next";
import {
  approveLaunch,
  createPilotRun,
  reportPilotIssue,
  setPilotStatus,
  updateChecklistItem,
  updatePilotIssue,
} from "@/app/actions/launch-readiness";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";
import { db } from "@/lib/db";
import { launchBlockers } from "@/lib/launch-readiness";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Launch readiness" };
export const dynamic = "force-dynamic";

type AutomatedCheck = [label: string, pass: boolean, detail: string];

export default async function LaunchReadinessPage() {
  const viewer = await requirePermission("launch.read");
  const schoolId = viewer.membership.schoolId;
  const owner = viewer.membership.role === "OWNER";

  const [run, allCampuses, counts] = await Promise.all([
    db.pilotRun.findFirst({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    }),
    db.campus.findMany({
      where: { schoolId },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    Promise.all([
      db.schoolMembership.count({
        where: { schoolId, role: "OWNER", status: "ACTIVE" },
      }),
      db.campus.count({ where: { schoolId, isActive: true } }),
      db.academicSession.count({ where: { schoolId, isCurrent: true } }),
      db.term.count({ where: { campus: { schoolId }, isCurrent: true } }),
      db.student.count({ where: { schoolId, status: "ACTIVE" } }),
      db.feeStructure.count({ where: { schoolId, isActive: true } }),
      db.gradingScheme.count({ where: { schoolId, isDefault: true } }),
    ]),
  ]);

  const [checklist, issues, approval] = run
    ? await Promise.all([
        db.pilotChecklistItem.findMany({
          where: { pilotRunId: run.id },
          orderBy: [{ area: "asc" }, { createdAt: "asc" }],
        }),
        db.pilotIssue.findMany({
          where: {
            pilotRunId: run.id,
            ...(owner
              ? {}
              : {
                  OR: [
                    { campusId: null },
                    { campusId: viewer.membership.campusId ?? "__none__" },
                  ],
                }),
          },
          orderBy: { createdAt: "desc" },
        }),
        db.launchApproval.findUnique({ where: { pilotRunId: run.id } }),
      ])
    : [[], [], null];

  const reporterIds = [...new Set(issues.map((issue) => issue.reportedById))];
  const reporters = reporterIds.length
    ? await db.user.findMany({
        where: { id: { in: reporterIds } },
        select: { id: true, name: true },
      })
    : [];
  const reporterNames = new Map(reporters.map((user) => [user.id, user.name]));
  const campusNames = new Map(
    allCampuses.map((campus) => [campus.id, campus.name]),
  );
  const visibleCampuses = allCampuses.filter(
    (campus) =>
      campus.isActive && (owner || campus.id === viewer.membership.campusId),
  );

  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  const checks: AutomatedCheck[] = [
    ["Database connection", true, "The readiness page loaded from PostgreSQL."],
    ["Owner access", counts[0] > 0, `${counts[0]} active owner account(s)`],
    ["Campus setup", counts[1] >= 2, `${counts[1]} active campus(es)`],
    ["Current session", counts[2] === 1, `${counts[2]} current session(s)`],
    [
      "Current terms",
      counts[3] >= counts[1],
      `${counts[3]} current campus term(s)`,
    ],
    ["Student register", counts[4] > 0, `${counts[4]} active student(s)`],
    ["Fee setup", counts[5] > 0, `${counts[5]} active fee structure(s)`],
    [
      "Grading setup",
      counts[6] > 0,
      `${counts[6]} default grading scheme(s)`,
    ],
    [
      "Authentication secret",
      Boolean(
        process.env.BETTER_AUTH_SECRET &&
          process.env.BETTER_AUTH_SECRET.length >= 32,
      ),
      "Secret is present with minimum length",
    ],
    [
      "Approved deployment branch",
      !branch || branch === "phase-6/integration" || branch === "main",
      branch ? `Current branch: ${branch}` : "Local or non-Vercel environment",
    ],
  ];

  const canApprove = hasPermission(viewer.membership.role, "launch.approve");
  const blockers = run ? launchBlockers(checklist, issues) : [];

  return (
    <div>
      <PageHeading
        eyebrow="Phase 6 integration"
        title="Pilot & launch readiness"
        description="Website corrections, admissions, portals, operational testing, defects, backup verification and final owner approval are controlled from one gate."
      />

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {checks.map(([label, pass, detail]) => (
          <article className="card p-4" key={label}>
            <span className="pill" data-tone={pass ? "success" : "brand"}>
              {pass ? "PASS" : "ACTION"}
            </span>
            <p className="mt-2 font-black">{label}</p>
            <p className="mt-1 text-xs leading-5 text-[#68707d]">{detail}</p>
          </article>
        ))}
      </section>

      {!run && canApprove && (
        <section className="card mt-5 p-5">
          <h2 className="font-black">Start the Phase 6 acceptance pilot</h2>
          <p className="mt-1 text-sm text-[#68707d]">
            The generated checklist includes the requested website-corrections
            gate before admissions, portal and operational sign-off.
          </p>
          <form
            action={createPilotRun}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <input
              name="name"
              defaultValue="Petra Academy Phase 6 acceptance pilot"
              required
            />
            <textarea
              name="notes"
              placeholder="Pilot participants, website correction scope and test environment"
            />
            <input type="datetime-local" name="startsAt" />
            <input type="datetime-local" name="endsAt" />
            <button className="button sm:col-span-2" type="submit">
              Create acceptance checklist
            </button>
          </form>
        </section>
      )}

      {run && (
        <>
          <section className="card mt-5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Current pilot</p>
                <h2 className="mt-1 text-xl font-black">{run.name}</h2>
                <p className="mt-1 text-sm text-[#68707d]">
                  {run.notes ?? "No pilot notes recorded."}
                </p>
              </div>
              <div className="flex gap-2">
                <span className="pill">{run.status}</span>
                <span
                  className="pill"
                  data-tone={approval?.status === "APPROVED" ? "success" : undefined}
                >
                  Launch {approval?.status ?? "DRAFT"}
                </span>
              </div>
            </div>
            {canApprove && (
              <form
                action={setPilotStatus.bind(null, run.id)}
                className="mt-4 flex flex-wrap gap-2"
              >
                <select name="status" defaultValue={run.status}>
                  <option value="PLANNED">Planned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <button className="button-secondary button" type="submit">
                  Update pilot status
                </button>
              </form>
            )}
          </section>

          <section className="card mt-5 overflow-hidden">
            <div className="border-b border-[#e5e7eb] p-5">
              <h2 className="font-black">Owner-led acceptance checklist</h2>
              <p className="mt-1 text-sm text-[#68707d]">
                {checklist.filter((item) => item.status === "PASSED").length} of{" "}
                {checklist.length} passed. Website corrections must be approved
                before launch.
              </p>
            </div>
            <div className="divide-y divide-[#eceef1]">
              {checklist.map((item) => (
                <form
                  action={updateChecklistItem.bind(null, item.id)}
                  className="grid gap-3 p-4 md:grid-cols-[9rem_1fr_11rem_1fr_auto]"
                  key={item.id}
                >
                  <span className="pill self-center">{item.area}</span>
                  <p className="self-center text-sm font-bold">{item.label}</p>
                  <select name="status" defaultValue={item.status}>
                    <option value="NOT_STARTED">Not started</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                  <input
                    name="evidence"
                    defaultValue={item.evidence ?? ""}
                    placeholder="Evidence, URL, count or reviewer note"
                  />
                  <button className="button-secondary button" type="submit">
                    Save
                  </button>
                </form>
              ))}
            </div>
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-black">Record correction or defect</h2>
              <p className="mt-1 text-sm text-[#68707d]">
                Website changes can be recorded here before broader acceptance
                begins. Use high or critical only for launch-blocking problems.
              </p>
              <form
                action={reportPilotIssue.bind(null, run.id)}
                className="mt-4 grid gap-3"
              >
                <input name="title" placeholder="Short correction or issue title" required />
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Requested change, steps, expected result and actual result"
                  required
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <select name="severity" defaultValue="MEDIUM">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                  <select
                    name="campusId"
                    defaultValue={viewer.membership.campusId ?? ""}
                  >
                    <option value="">School-wide</option>
                    {visibleCampuses.map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                  <input name="route" placeholder="/affected-route" />
                </div>
                <button className="button" type="submit">
                  Record item
                </button>
              </form>
            </section>

            <section className="card p-5">
              <h2 className="font-black">Final launch gate</h2>
              <p className="mt-2 text-sm text-[#68707d]">
                {blockers.length
                  ? `${blockers.length} blocker(s) remain. Every checklist item must pass and all high/critical issues must be resolved.`
                  : "No manual blockers remain."}
              </p>
              {canApprove && approval?.status !== "APPROVED" && (
                <form
                  action={approveLaunch.bind(null, run.id)}
                  className="mt-4 grid gap-3"
                >
                  <textarea
                    name="summary"
                    rows={4}
                    placeholder="Owner approval summary, corrections completed, pilot dates and release decision"
                    required
                  />
                  <button
                    className="button"
                    disabled={blockers.length > 0}
                    type="submit"
                  >
                    Approve production launch
                  </button>
                </form>
              )}
              {approval?.status === "APPROVED" && (
                <p className="mt-4 rounded-xl bg-[#e8f7ef] p-4 font-black text-[#14804a]">
                  Launch approved with recorded evidence.
                </p>
              )}
            </section>
          </div>

          <section className="card mt-5 overflow-hidden">
            <div className="border-b border-[#e5e7eb] p-5">
              <h2 className="font-black">Corrections and pilot issues</h2>
            </div>
            <div className="divide-y divide-[#eceef1]">
              {issues.map((issue) => (
                <article className="p-5" key={issue.id}>
                  <div className="flex flex-wrap gap-2">
                    <span className="pill">{issue.severity}</span>
                    <span className="pill">{issue.status}</span>
                    {issue.campusId && (
                      <span className="pill">
                        {campusNames.get(issue.campusId) ?? "Campus"}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-black">{issue.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#68707d]">
                    {issue.description}
                  </p>
                  <p className="mt-1 text-xs text-[#8a919b]">
                    Reported by {reporterNames.get(issue.reportedById) ?? "Staff"}
                    {issue.route ? ` · ${issue.route}` : ""}
                  </p>
                  {(owner || issue.campusId === viewer.membership.campusId) && (
                    <form
                      action={updatePilotIssue.bind(null, issue.id)}
                      className="mt-3 grid gap-2 sm:grid-cols-[12rem_1fr_auto]"
                    >
                      <select name="status" defaultValue={issue.status}>
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="ACCEPTED_RISK">Accepted risk</option>
                      </select>
                      <input
                        name="resolution"
                        defaultValue={issue.resolution ?? ""}
                        placeholder="Resolution or accepted-risk reason"
                      />
                      <button className="button-secondary button" type="submit">
                        Update
                      </button>
                    </form>
                  )}
                </article>
              ))}
              {!issues.length && (
                <p className="empty-state">No corrections or pilot issues recorded.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
